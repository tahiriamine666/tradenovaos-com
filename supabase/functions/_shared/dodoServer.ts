import { createClient } from 'npm:@supabase/supabase-js@2.105.1';
import { dodoApiBase,dodoAuthHeaders,planFromProductId } from './dodo.ts';
import { normalizeSubscription,ownsSubscription,type ProviderSubscription } from './billingState.ts';
export const cors = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' };
export const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
export async function authenticate(req:Request) {
  const header=req.headers.get('Authorization')??'';
  if(!header.startsWith('Bearer ')) return null;
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:header}}});
  const {data,error}=await client.auth.getUser();
  return error?null:data.user;
}
export class ProviderError extends Error {
  constructor(public status:number) { super('Billing provider request failed'); }
}
export async function provider(path:string,init:RequestInit={}) {
  if(!Deno.env.get('DODO_API_KEY')) throw new Error('Billing is not configured');
  const response=await fetch(`${dodoApiBase()}${path}`,{...init,headers:{...dodoAuthHeaders(),...init.headers},signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new ProviderError(response.status);
  return await response.json();
}
export async function reconcile(subscriptionId:string,userId:string,customerId?:string|null,eventId?:string,attemptId?:string|null) {
  const observedAt=new Date().toISOString();
  const sub:ProviderSubscription=await provider(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if(!ownsSubscription(sub,userId,customerId,subscriptionId)) throw new Error('Subscription ownership could not be verified');
  const plan=planFromProductId(sub.product_id);
  if(!plan) throw new Error('Unknown subscription product');
  const snapshot=normalizeSubscription(sub,plan);
  const {error}=await admin().rpc('apply_dodo_snapshot',{p_user:userId,p_snapshot:snapshot,p_observed_at:observedAt,p_event_id:eventId??null,p_attempt_id:attemptId??null});
  if(error) throw new Error('Subscription update failed');
  return snapshot;
}
