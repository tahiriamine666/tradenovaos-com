import { FunctionsHttpError } from '@supabase/supabase-js';

/** On non-2xx, supabase.functions.invoke drops the JSON body; recover the server's steps/error from the response. */
export async function readFunctionResult<T extends object>(data: unknown, error: unknown): Promise<T & { error?: string }> {
  if (data && typeof data === 'object') return data as T & { error?: string };
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json();
      if (body && typeof body === 'object') return body;
    } catch { /* non-JSON body */ }
  }
  const message = error instanceof Error ? error.message : undefined;
  return (message ? { error: message } : {}) as T & { error?: string };
}

/** Turn known provider failures into actionable text; never includes credentials. */
export function friendlyConnectError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (/MetaApi 403/i.test(message) && /top up/i.test(message)) {
    return 'The MetaApi service account behind TradeNova needs to be topped up before new broker accounts can be connected. Your account details were saved — please contact support or try again later.';
  }
  return message;
}
