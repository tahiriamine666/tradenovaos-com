export interface ProviderSubscription {
  subscription_id: string; customer: { customer_id: string }; product_id: string; status: string;
  created_at: string; next_billing_date?: string; trial_period_days?: number; trial_end?: string;
  has_payment_method?: boolean; cancel_at_next_billing_date?: boolean; cancelled_at?: string;
  metadata?: Record<string,string>;
}
export function normalizeSubscription(sub: ProviderSubscription, plan: { plan: string; billing: string }, now=Date.now()) {
  const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const created = Date.parse(sub.created_at), days = Number(sub.trial_period_days ?? 0);
  const trialEnd = date(sub.trial_end) ?? (days>0 && Number.isFinite(created) ? new Date(created+days*86400000).toISOString() : null);
  let status = ({ active:'active', trialing:'trialing', on_trial:'trialing', on_hold:'past_due', past_due:'past_due', cancelled:'canceled', canceled:'canceled' } as Record<string,string>)[sub.status] ?? 'inactive';
  if (status==='active' && trialEnd && Date.parse(trialEnd)>now) status='trialing';
  const periodEnd=date(sub.next_billing_date);
  if (sub.has_payment_method===false || (status==='trialing' && (!trialEnd || Date.parse(trialEnd)<=now)) || (status==='active' && (!periodEnd || Date.parse(periodEnd)<=now))) status='inactive';
  return { subscription_id:sub.subscription_id,customer_id:sub.customer.customer_id,product_id:sub.product_id,plan:plan.plan,billing_interval:plan.billing,status,trial_end:trialEnd,current_period_end:periodEnd,ends_at:date(sub.cancelled_at),cancel_at_period_end:sub.cancel_at_next_billing_date===true };
}
export function ownsSubscription(sub: ProviderSubscription,userId:string,customerId?:string|null,subscriptionId?:string|null) {
  if (sub.metadata?.user_id && sub.metadata.user_id!==userId) return false;
  if (customerId && sub.customer?.customer_id!==customerId) return false;
  if (subscriptionId && sub.subscription_id!==subscriptionId) return false;
  return Boolean((customerId && subscriptionId) || sub.metadata?.user_id===userId);
}
