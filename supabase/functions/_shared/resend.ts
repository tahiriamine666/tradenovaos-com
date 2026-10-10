// Server-only. Do not import from src/ or expose credentials through VITE_*.
export type WelcomePlan = "pro" | "elite";

export interface WelcomeEmail {
  to: string;
  firstName?: string | null;
  plan: WelcomePlan;
  idempotencyKey: string;
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retryable: boolean };

export function resolveFirstName(profile: {
  display_name?: unknown;
  full_name?: unknown;
  email?: unknown;
}): string {
  for (const value of [profile.display_name, profile.full_name]) {
    if (typeof value === "string" && value.trim()) return value.trim().split(/\s+/)[0].slice(0, 100);
  }
  if (typeof profile.email === "string") {
    const local = profile.email.split("@")[0].trim();
    if (local) return local.slice(0, 100);
  }
  return "Trader";
}

export function welcomePayload(email: WelcomeEmail) {
  const firstName = resolveFirstName({ display_name: email.firstName }).replace(/[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
  return {
    from: "TradeNova <hello@tradenovaos.com>",
    reply_to: "tradenova111@gmail.com",
    to: [email.to],
    template: {
      id: email.plan === "pro" ? "tradenova-pro-welcome" : "tradenova-elite-welcome",
      // FIRST_NAME is reserved by Resend. Both existing templates were updated
      // with user approval to this custom variable, with fallback "Trader".
      variables: { USER_FIRST_NAME: firstName },
    },
  };
}

export async function sendPlanWelcome(
  email: WelcomeEmail,
  dependencies: { getSecret: () => string | undefined; fetch?: typeof fetch },
): Promise<SendResult> {
  const key = dependencies.getSecret();
  if (!key) return { ok: false, error: "resend_not_configured", retryable: true };
  if (!email.to || !["pro", "elite"].includes(email.plan) || !email.idempotencyKey) {
    return { ok: false, error: "invalid_welcome_payload", retryable: false };
  }
  try {
    const response = await (dependencies.fetch ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify(welcomePayload(email)),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      // Do not persist provider bodies: they can include addresses or credentials.
      return {
        ok: false,
        error: `resend_http_${response.status}`,
        retryable: response.status === 429 || response.status === 409 || response.status >= 500,
      };
    }
    const result: unknown = await response.json();
    if (result && typeof result === "object" && "id" in result && typeof result.id === "string") {
      return { ok: true, id: result.id };
    }
    return { ok: false, error: "resend_invalid_response", retryable: true };
  } catch {
    return { ok: false, error: "resend_network_or_timeout", retryable: true };
  }
}
