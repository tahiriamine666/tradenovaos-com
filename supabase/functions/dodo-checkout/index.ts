import { admin,authenticate,cors,json,provider,ProviderError } from '../_shared/dodoServer.ts';
import { productIdForPlan } from '../_shared/dodo.ts';
const origins=new Set(['https://tradenovaos.com','https://www.tradenovaos.com','https://tradenovaos-com.lovable.app','https://id-preview--0ee4a120-abbf-401b-9623-1114b47e7fda.lovable.app','http://localhost:8080']);
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  let createdAttempt:string|null=null;
  try {
    const user=await authenticate(req);
    if(!user?.email) return json({error:'Unauthorized'},401);
    const body=await req.json().catch(()=>({})),db=admin();
    if(body.action==='status') {
      if(typeof body.attempt_id!=='string') return json({error:'invalid_attempt'},400);
      const {data,error}=await db.from('billing_checkout_attempts').select('status,plan,subscription_id').eq('id',body.attempt_id).eq('user_id',user.id).maybeSingle();
      if(error) throw error;
      if(!data) return json({error:'not_found'},404);
      const {data:sub,error:subError}=await db.from('subscriptions').select('status,trial_end,current_period_end').eq('user_id',user.id).eq('dodo_subscription_id',data.subscription_id??'').maybeSingle();
      if(subError) throw subError;
      const active=sub && ((sub.status==='active'&&Date.parse(sub.current_period_end)>Date.now())||(sub.status==='trialing'&&Date.parse(sub.trial_end)>Date.now()));
      return json({confirmed:data.status==='confirmed'&&Boolean(active),plan:data.plan});
    }
    if(body.action==='prices') {
      const prices:Record<string,unknown>={};
      await Promise.all((['pro','elite'] as const).flatMap(pl=>(['monthly','yearly'] as const).map(async bi=>{
        const id=productIdForPlan(pl,bi);
        if(!id) return;
        const product=await provider(`/products/${encodeURIComponent(id)}`);
        const price=product.price;
        if(typeof price?.price==='number') prices[`${pl}_${bi}`]={amount:price.price/100,currency:price.currency,trial_days:price.trial_period_days};
      })));
      return json({prices});
    }
    if(!['pro','elite'].includes(body.plan)) return json({error:'invalid_plan'},400);
    const plan=body.plan,billing=body.billing==='yearly'?'yearly':'monthly';
    const product=productIdForPlan(plan,billing);
    if(!product||!Deno.env.get('DODO_API_KEY')) return json({error:'Billing is not configured'},503);
    const {data:sub,error:subError}=await db.from('subscriptions').select('status,dodo_customer_id,dodo_subscription_id,trial_end,current_period_end').eq('user_id',user.id).maybeSingle();
    if(subError) throw subError;
    if(sub?.dodo_subscription_id&&['active','trialing','past_due','unpaid'].includes(sub.status)) return json({error:'Use Manage billing to change your existing subscription.'},409);
    const {data:pending,error:pendingError}=await db.from('billing_checkout_attempts').select('id,checkout_url,plan,billing').eq('user_id',user.id).eq('status','pending').maybeSingle();
    if(pendingError) throw pendingError;
    if(pending && (pending.plan!==plan||pending.billing!==billing)) return json({error:`A ${pending.plan} ${pending.billing} checkout is already pending. Resume that plan or contact support.`},409);
    if(pending) return pending.checkout_url?json({url:pending.checkout_url,attempt_id:pending.id}):json({error:'Your previous checkout is awaiting provider confirmation. Contact support before creating another.'},409);
    const {data:attempt,error:insertError}=await db.from('billing_checkout_attempts').insert({user_id:user.id,plan,billing}).select('id').single();
    if(insertError) return json({error:'A checkout is already being prepared. Please try again.'},409);
    createdAttempt=attempt.id;
    const origin=origins.has(req.headers.get('origin')??'')?req.headers.get('origin')!:'https://www.tradenovaos.com';
    const response=await provider('/checkouts',{method:'POST',body:JSON.stringify({
      product_cart:[{product_id:product,quantity:1}],
      customer:sub?.dodo_customer_id?{customer_id:sub.dodo_customer_id}:{email:user.email,name:typeof body.name==='string'?body.name.slice(0,100):user.email},
      feature_flags:{allow_customer_editing_email:false},
      subscription_data:{trial_period_days:sub?.dodo_subscription_id?0:14},
      return_url:`${origin}/billing/success?attempt=${attempt.id}`,cancel_url:`${origin}/billing/cancel`,
      metadata:{user_id:user.id,checkout_attempt_id:attempt.id,plan,billing}
    })});
    if(!response.checkout_url||!response.session_id) throw new Error('Missing checkout');
    const {error:saveError}=await db.from('billing_checkout_attempts').update({session_id:response.session_id,checkout_url:response.checkout_url}).eq('id',attempt.id);
    if(saveError) throw saveError;
    return json({url:response.checkout_url,attempt_id:attempt.id});
  } catch(error) {
    // Definitive rejections can retry. Ambiguous timeouts stay pending to avoid duplicate subscriptions.
    if(createdAttempt && error instanceof ProviderError && [400,401,403,404,422].includes(error.status)) {
      await admin().from('billing_checkout_attempts').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',createdAttempt);
    }
    return json({error:'Checkout could not be prepared safely. Please contact support if this persists.'},502);
  }
});
