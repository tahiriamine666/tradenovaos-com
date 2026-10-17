import { describe, expect, it, vi } from 'vitest';
import { hashInvitationToken, invitationEmail, invitationHandler, makeInvitationToken, sendInvitation, type Invitation, type InvitationDependencies } from '../../supabase/functions/_shared/trader-invitations';
const invite: Invitation = { id:'fixture-id',email:'trader@example.test',plan:'elite',reason:'Partnership',notes:null,status:'pending',created_at:'2026-10-17T00:00:00Z',expires_at:'2026-10-24T00:00:00Z',duration_days:30,access_expires_at:null,accepted_at:null,delivery_error:null };
const token='a'.repeat(64);
const request = (body: unknown) => new Request('https://example.test', { method:'POST',headers:{Authorization:'Bearer fixture-jwt'},body:JSON.stringify(body) });
function setup() {
  const deps: InvitationDependencies = { authenticate:vi.fn(async()=> 'verified-user'), rpc:vi.fn(async()=>({data:{invitation:invite},error:null})), send:vi.fn(async()=>({ok:true as const,id:'message-id'})) };
  return { deps, handler:invitationHandler(deps) };
}
describe('invitation transport', () => {
  it('uses 256-bit random tokens and only passes hashes to the database', async()=>{
    expect(makeInvitationToken()).toMatch(/^[a-f0-9]{64}$/); expect(makeInvitationToken()).not.toBe(makeInvitationToken());
    expect(await hashInvitationToken(token)).not.toBe(token);
    const {deps,handler}=setup(); const response=await handler(request({action:'create',email:invite.email,plan:'elite',p_actor:'attacker',user_id:'attacker'}));
    const body=await response.json(); expect(body.sent).toBe(true); expect(body.token).toBeUndefined();
    expect(deps.rpc).toHaveBeenCalledWith('manage_trader_invitation',expect.objectContaining({p_actor:'verified-user',p_payload:expect.objectContaining({token_hash:expect.stringMatching(/^[a-f0-9]{64}$/)})}));
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  it('rejects unauthenticated requests without database or email access',async()=>{
    const {deps,handler}=setup(); vi.mocked(deps.authenticate).mockResolvedValue(null);
    expect((await handler(request({action:'create'}))).status).toBe(401); expect(deps.rpc).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled();
  });
  it('does not send when database authorization or duplicate validation rejects',async()=>{
    const {deps,handler}=setup(); vi.mocked(deps.rpc).mockResolvedValue({data:{error:'admin_required'},error:null});
    expect(await (await handler(request({action:'create'}))).json()).toEqual({error:'admin_required'}); expect(deps.send).not.toHaveBeenCalled();
  });
  it('redemption ignores user/plan/email claims and uses the verified identity',async()=>{
    const {deps,handler}=setup(); await handler(request({action:'redeem',token,user_id:'attacker',plan:'elite',email:'other@example.test'}));
    expect(deps.rpc).toHaveBeenCalledTimes(1);
    expect(deps.rpc).toHaveBeenCalledWith('redeem_trader_invitation',{p_user_id:'verified-user',p_token_hash:await hashInvitationToken(token)});
    expect(deps.send).not.toHaveBeenCalled();
  });
  it('rejects unknown actions and malformed tokens',async()=>{
    const {deps,handler}=setup(); expect((await handler(request({action:'delivery'}))).status).toBe(400);
    expect((await handler(request({action:'redeem',token:'bad'}))).status).toBe(400); expect(deps.rpc).not.toHaveBeenCalled();
  });
  it('records failed delivery and leaves the invitation retryable',async()=>{
    const {deps,handler}=setup(); vi.mocked(deps.send).mockResolvedValue({ok:false,error:'email_delivery_unconfirmed',retryable:true});
    const response=await (await handler(request({action:'resend',id:invite.id}))).json();
    expect(response.sent).toBe(false); expect(response.warning).toBe('email_delivery_unconfirmed');
    expect(deps.rpc).toHaveBeenLastCalledWith('manage_trader_invitation',expect.objectContaining({p_action:'delivery',p_payload:expect.objectContaining({sent:false})}));
  });
  it('does not disclose database/provider errors or credentials',async()=>{
    const {deps,handler}=setup(); vi.mocked(deps.rpc).mockResolvedValue({data:null,error:{message:'secret-sensitive-debug'}});
    expect(await (await handler(request({action:'list'}))).text()).not.toContain('secret-sensitive-debug');
    const fake=vi.fn(async()=>new Response('sensitive-provider-body',{status:500}));
    expect(await sendInvitation(invite,token,'fake-secret',fake)).toEqual({ok:false,error:'email_http_500',retryable:true});
  });
  it('uses the existing sender and a fragment link without internal notes',()=>{
    const email=invitationEmail({...invite,notes:'PRIVATE NOTE'},token);
    expect(email.html).toContain('/accept-invitation#invite='); expect(email.html).not.toContain('PRIVATE NOTE');
    expect(email.text).toContain('30 days after acceptance'); expect(email.from).toBe('TradeOS <hello@tradenovaos.com>');
  });
  it('never calls Resend without a configured secret',async()=>{
    const fake=vi.fn(); expect((await sendInvitation(invite,token,undefined,fake)).ok).toBe(false); expect(fake).not.toHaveBeenCalled();
  });
});
