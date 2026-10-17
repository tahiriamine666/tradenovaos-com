// Isolated PostgreSQL/WASM tests. No production connection or network requests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const trader = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const unverified = '00000000-0000-4000-8000-000000000004';
let checks = 0;
function check(value, expected, label) { assert.deepEqual(value, expected, label); checks++; console.log(`PASS ${label}`); }
const sql = (file) => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.user_roles(user_id uuid,role text);
CREATE FUNCTION public.is_admin(_uid uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role='admin') $$;
CREATE FUNCTION public.has_internal_access(_uid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,plan_type text DEFAULT 'free',subscription_plan text DEFAULT 'free',subscription_status text DEFAULT 'inactive',
trial_ends_at timestamptz,current_period_end timestamptz,upgraded_manually boolean DEFAULT false,upgraded_at timestamptz,updated_at timestamptz,created_at timestamptz DEFAULT now(),display_name text,full_name text,last_seen_at timestamptz);
CREATE TABLE public.billing_subscriptions(user_id uuid PRIMARY KEY,provider text,plan text,status text,trial_ends_at timestamptz,renews_at timestamptz,customer_id text,subscription_id text,variant_id text,ends_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
INSERT INTO auth.users VALUES ('${admin}','admin@example.test',now(),now()),('${trader}','trader@example.test',now(),now()),('${other}','other@example.test',now(),now()),('${unverified}','unverified@example.test',NULL,now());
INSERT INTO public.profiles(id,email) SELECT id,email FROM auth.users;
INSERT INTO public.user_roles VALUES('${admin}','admin');
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role,anon;
`);
await db.exec(await sql('drizzle/migrations/0016_admin_panel_overrides_audit.sql'));
await db.exec(`CREATE TRIGGER protect_billing BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_billing_self_update();`);
await db.exec(await sql('drizzle/migrations/0021_plan_welcome_emails.sql'));
await db.exec(await sql('docs/sql/trader-invitations.sql'));
async function service(name, args, types) {
  await db.exec('SET ROLE service_role');
  try { return (await db.query(`SELECT public.${name}(${args.map((_,i)=>`$${i+1}::${types[i]}`).join(',')}) AS result`,args)).rows[0].result; }
  finally { await db.exec('RESET ROLE'); }
}
const manage = (action,payload={},actor=admin) => service('manage_trader_invitation',[actor,action,JSON.stringify(payload)],['uuid','text','jsonb']);
const redeem = (hash,user=trader) => service('redeem_trader_invitation',[user,hash],['uuid','text']);
let sequence=1;
const hash=()=>String(sequence++).padStart(64,'0');
const create = (email='trader@example.test',extra={}) => manage('create',{email,plan:'pro',reason:'Partnership',duration_days:30,token_hash:hash(),...extra});
const row = async id => (await db.query('SELECT * FROM tradenova_private.trader_invitations WHERE id=$1',[id])).rows[0];
const info = async () => (await db.query('SELECT public.plan_info_for($1) AS v',[trader])).rows[0].v;
await db.exec('SET ROLE authenticated');
await assert.rejects(db.query('SELECT public.redeem_trader_invitation($1,$2)',[trader,hash()]),/permission denied/); checks++;
await assert.rejects(db.query('SELECT * FROM tradenova_private.trader_invitations'),/permission denied/); checks++;
await db.exec('RESET ROLE');
check((await manage('list',{},trader)).error,'admin_required','non-admin cannot manage invitations');
check((await create('bad email')).error,'invalid_invitation','invalid address rejected');
check((await create(undefined,{plan:'admin'})).error,'invalid_invitation','unsupported plan rejected');
const first=(await create('  TRADER@example.test  ')).invitation;
check(first.email,'trader@example.test','normalize email');
check('token_hash' in first,false,'no hash in admin response');
const rls=(await db.query("SELECT bool_and(relrowsecurity) enabled FROM pg_class WHERE oid IN ('tradenova_private.trader_invitations'::regclass,'tradenova_private.invitation_attempts'::regclass)")).rows[0];
check(rls.enabled,true,'RLS enabled on private invitation tables');
check((await create()).error,'invitation_already_exists','duplicate open invitation rejected');
check((await redeem((await row(first.id)).token_hash,other)).error,'invited_email_required','wrong email rejected');
check((await redeem((await row(first.id)).token_hash,unverified)).error,'verified_email_required','unverified ownership rejected');
const firstHash=(await row(first.id)).token_hash;
check((await redeem(firstHash)).accepted,true,'existing verified account redeems');
check((await info()).source,'admin_override','canonical manual override used');
check((await info()).plan,'pro','correct plan activated');
const before=(await row(first.id)).access_expires_at;
check((await redeem(firstHash)).already_accepted,true,'same-recipient retry idempotent');
check((await row(first.id)).access_expires_at,before,'retry never extends access');
check(Number((await db.query('SELECT count(*) n FROM public.plan_welcome_emails')).rows[0].n),1,'welcome outbox remains deduplicated');
check(Number((await db.query('SELECT count(*) n FROM public.billing_subscriptions')).rows[0].n),0,'no fake billing transaction');
await manage('revoke',{id:first.id});
check((await info()).is_free,true,'revocation removes invitation override');
check((await redeem(firstHash)).error,'invitation_expired_or_used','revoked token rejected');
const second=(await create()).invitation;
const secondHash=(await row(second.id)).token_hash;
await db.query("UPDATE tradenova_private.trader_invitations SET last_sent_at=now()-interval '6 minutes' WHERE id=$1",[second.id]);
await manage('resend',{id:second.id,token_hash:hash()});
check((await redeem(secondHash)).error,'invalid_invitation','resend invalidates earlier token');
check((await manage('resend',{id:second.id,token_hash:hash()})).error,'resend_cooldown','resend throttled');
await db.query("UPDATE tradenova_private.trader_invitations SET expires_at=now()-interval '1 minute' WHERE id=$1",[second.id]);
check((await redeem((await row(second.id)).token_hash)).error,'invitation_expired_or_used','expired link rejected');
const third=(await create()).invitation;
await redeem((await row(third.id)).token_hash);
await db.exec(`SELECT set_config('request.jwt.claim.sub','${admin}',false); SET ROLE authenticated; SELECT public.admin_set_plan('${trader}','elite',now()+interval '60 days','Independent grant'); RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false);`);
await manage('revoke',{id:third.id});
check((await info()).plan,'elite','revocation preserves newer independent admin grant');
await db.exec(`SELECT set_config('request.jwt.claim.sub','${admin}',false); SET ROLE authenticated; SELECT public.admin_remove_override('${trader}','Test cleanup'); RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false);`);
const fourth=(await create()).invitation;
await redeem((await row(fourth.id)).token_hash);
await db.query("UPDATE public.profiles SET manual_override_expires_at=now()-interval '1 minute' WHERE id=$1",[trader]);
check((await info()).is_free,true,'canonical entitlement expires without a scheduler');
await manage('revoke',{id:fourth.id});
await db.query("INSERT INTO public.billing_subscriptions(user_id,provider,plan,status,subscription_id) VALUES($1,'dodo','elite','active','fixture_subscription')",[trader]);
const billingBefore=(await db.query('SELECT * FROM public.billing_subscriptions')).rows;
const paid=(await create()).invitation;
check((await redeem((await row(paid.id)).token_hash)).error,'existing_access_requires_admin_review','active paid access is not overwritten');
await manage('revoke',{id:paid.id});
check((await db.query('SELECT * FROM public.billing_subscriptions')).rows,billingBefore,'billing rows unchanged after invitation/revocation');
check((await db.query('SELECT status FROM public.billing_subscriptions')).rows[0].status,'active','paid status preserved');
check((await create('custom@example.test',{duration_days:null,access_expires_at:'2000-01-01'})).error,'invalid_expiration','past custom expiry rejected');
const custom=(await create('custom@example.test',{duration_days:null,access_expires_at:new Date(Date.now()+86400000).toISOString()})).invitation;
check(custom.duration_days,null,'custom expiration supported');
// Prove grants and audit commit atomically: an injected late audit failure must
// roll back the canonical profile update and the single-use state transition.
const atomic=(await create('other@example.test')).invitation;
await db.exec("ALTER TABLE public.admin_audit_log ADD CONSTRAINT fail_accept_test CHECK (action <> 'invitation_accepted') NOT VALID");
await assert.rejects(redeem((await row(atomic.id)).token_hash,other),/fail_accept_test/); checks++;
check((await row(atomic.id)).status,'pending','late failure rolls back token consumption');
check((await db.query('SELECT upgraded_manually FROM public.profiles WHERE id=$1',[other])).rows[0].upgraded_manually,false,'late failure rolls back plan activation');
await db.exec('ALTER TABLE public.admin_audit_log DROP CONSTRAINT fail_accept_test');
const atomicHash=(await row(atomic.id)).token_hash;
const concurrent=[await redeem(atomicHash,other),await redeem(atomicHash,other)];
check(concurrent.every(result=>result.accepted),true,'duplicate redemptions succeed idempotently');
check(Number((await db.query("SELECT count(*) n FROM public.admin_audit_log WHERE target_user_id=$1 AND action='invitation_accepted'",[other])).rows[0].n),1,'only one successful activation audit');
await db.exec(`DELETE FROM public.user_roles WHERE user_id='${admin}'`);
check((await manage('revoke',{id:custom.id})).error,'admin_required','removed admin loses management access immediately');
await db.exec(`INSERT INTO public.user_roles VALUES('${admin}','admin')`);
for(let i=0;i<35;i++) await create('invalid');
check((await create('limit@example.test')).error,'rate_limited','admin send rate limit enforced');
for(let i=0;i<22;i++) await redeem(hash(),other);
check((await redeem(hash(),other)).error,'rate_limited','redemption attempts rate limited');
console.log(`${checks} database checks passed; no external systems contacted.`);
await db.close();


