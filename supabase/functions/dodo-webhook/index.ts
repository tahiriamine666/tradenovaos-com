import { verifyStandardWebhook } from '../_shared/dodo.ts';
import { admin,json,reconcile,provider } from '../_shared/dodoServer.ts';
Deno.serve(async req=>{
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  const secret=Deno.env.get('DODO_WEBHOOK_SECRET');
  if(!secret) return json({error:'not_configured'},503);
  const raw=await req.text();
  if(!await verifyStandardWebhook(raw,req.headers,secret)) return json({error:'invalid_signature'},401);
  try {
    const event=JSON.parse(raw);
    if(!String(event.type).startsWith('subscription.')&&!['payment.succeeded','payment.failed'].includes(event.type)) return json({ok:true,ignored:true});
    const subscriptionId=event.data?.subscription_id;
    if(!subscriptionId) return json({ok:true,ignored:true});
    const db=admin(),eventId=req.headers.get('webhook-id')!;
    const {data:processed,error:readError}=await db.from('billing_webhook_events').select('event_id').eq('event_id',eventId).maybeSingle();
    if(readError) throw readError;
    if(processed) return json({ok:true,duplicate:true});
    const {data:existing,error}=await db.from('subscriptions').select('user_id,dodo_customer_id').eq('dodo_subscription_id',subscriptionId).maybeSingle();
    if(error) throw error;
    const current=await provider(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    const userId=existing?.user_id??current.metadata?.user_id;
    if(!userId) return json({error:'unmatched_subscription'},422);
    const attemptId=current.metadata?.checkout_attempt_id??null;
    await reconcile(subscriptionId,userId,existing?.dodo_customer_id,eventId,attemptId);
    return json({ok:true});
  } catch { return json({error:'processing_failed'},500); }
});
