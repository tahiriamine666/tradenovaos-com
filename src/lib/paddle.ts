// Paddle.js loader + checkout helper.
// Fetches public config (client token, environment, price IDs) from the paddle-config
// edge function on first use, then initializes Paddle.js from the official CDN.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Paddle?: any;
  }
}

export type PaddlePlanId = "pro" | "elite";

interface PaddleConfig {
  clientToken: string;
  environment: "sandbox" | "production" | string;
  priceIds: { pro: string; elite: string };
}

let configPromise: Promise<PaddleConfig> | null = null;
let initialized = false;

async function fetchConfig(): Promise<PaddleConfig> {
  if (configPromise) return configPromise;
  configPromise = (async () => {
    const { data, error } = await supabase.functions.invoke("paddle-config", { method: "GET" });
    if (error) throw error;
    return data as PaddleConfig;
  })();
  return configPromise;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensurePaddle(): Promise<{ paddle: any; cfg: PaddleConfig }> {
  const cfg = await fetchConfig();
  if (!cfg.clientToken) throw new Error("Paddle client token not configured");

  await loadScript("https://cdn.paddle.com/paddle/v2/paddle.js");
  if (!window.Paddle) throw new Error("Paddle.js failed to load");

  if (!initialized) {
    const env = cfg.environment === "production" || cfg.environment === "live" ? "production" : "sandbox";
    if (env === "sandbox") window.Paddle.Environment.set("sandbox");
    window.Paddle.Initialize({ token: cfg.clientToken });
    initialized = true;
  }
  return { paddle: window.Paddle, cfg };
}

export async function openPaddleCheckout(opts: {
  plan: PaddlePlanId;
  userId: string;
  email: string;
  priceId?: string;
  theme?: "light" | "dark";
}): Promise<void> {
  const { paddle, cfg } = await ensurePaddle();
  const priceId =
    opts.priceId ?? (opts.plan === "pro" ? cfg.priceIds.pro : cfg.priceIds.elite);
  if (!priceId) throw new Error(`Paddle price ID not configured for plan: ${opts.plan}`);

  const origin = window.location.origin;
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: opts.email ? { email: opts.email } : undefined,
    customData: { user_id: opts.userId, plan: opts.plan },
    settings: {
      displayMode: "overlay",
      theme: opts.theme ?? "light",
      successUrl: `${origin}/billing/success`,
    },
  });
}

export async function openPaddlePortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("paddle-portal", { method: "POST" });
  if (error || !data?.url) throw new Error(error?.message ?? "Could not open billing portal");
  window.open(data.url as string, "_blank", "noopener,noreferrer");
}
