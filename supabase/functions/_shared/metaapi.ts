// Thin MetaApi REST wrapper shared by the MT connect / sync functions.

export const PROVISIONING = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
export const clientApi = (region: string) =>
  `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

export function token(): string {
  const t = Deno.env.get('METAAPI_TOKEN');
  if (!t) throw new Error('METAAPI_TOKEN is not configured');
  return t;
}

async function req(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20000),
    headers: {
      'auth-token': token(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`MetaApi request failed (${res.status})`);
  }
  return body as any;
}

export interface ProvisionInput {
  name: string;
  transactionId: string;
  login: string;
  password: string;
  server: string;
  platform: 'mt4' | 'mt5';
  region?: string;
}

export async function createAccount(input: ProvisionInput): Promise<{ id: string }> {
  return await req(`${PROVISIONING}/users/current/accounts`, {
    method: 'POST',
    headers: {'transaction-id':input.transactionId},
    body: JSON.stringify({
      name: input.name,
      type: 'cloud',
      login: input.login,
      password: input.password,
      server: input.server,
      platform: input.platform,
      magic: 0,
      region: input.region ?? 'new-york',
      keywords: [],
      quoteStreamingIntervalInSeconds: 2.5,
      reliability: 'regular',
    }),
  });
}

export async function getAccount(id: string) {
  return await req(`${PROVISIONING}/users/current/accounts/${id}`);
}

export async function deployAccount(id: string) {
  return await req(`${PROVISIONING}/users/current/accounts/${id}/deploy`, { method: 'POST' });
}

export async function deleteAccount(id: string) {
  return await req(`${PROVISIONING}/users/current/accounts/${id}`, { method: 'DELETE' });
}

export async function accountInformation(id: string, region: string) {
  return await req(`${clientApi(region)}/users/current/accounts/${id}/account-information`);
}

export async function positions(id: string, region: string) {
  return await req(`${clientApi(region)}/users/current/accounts/${id}/positions`);
}

export async function historyDeals(id: string, region: string, fromISO: string, toISO: string) {
  const url = `${clientApi(region)}/users/current/accounts/${id}/history-deals/time/${encodeURIComponent(fromISO)}/${encodeURIComponent(toISO)}`;
  return await req(url);
}

export async function updateAccount(id: string, input: {name:string;server:string;password:string}) {
 return await req(PROVISIONING+'/users/current/accounts/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(input)});
}
export async function redeployAccount(id:string) {
 return await req(PROVISIONING+'/users/current/accounts/'+encodeURIComponent(id)+'/redeploy',{method:'POST'});
}
