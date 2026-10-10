import { admin,authenticate,cors,json,reconcile } from '../_shared/dodoServer.ts';
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  try {
    const user=await authenticate(req);
    if(!user) return json({error:'Unauthorized'},401);
    const {data:row,error}=await admin().from('subscriptions').select('dodo_customer_id,dodo_subscription_id').eq('user_id',user.id).maybeSingle();
    if(error) throw error;
    if(!row?.dodo_customer_id||!row?.dodo_subscription_id) return json({ok:false,reason:'awaiting_verified_webhook'});
    const snapshot=await reconcile(row.dodo_subscription_id,user.id,row.dodo_customer_id);
    return json({ok:true,plan:snapshot.plan,status:snapshot.status});
  } catch { return json({ok:false,error:'Subscription could not be verified. Please try again later.'},502); }
});
