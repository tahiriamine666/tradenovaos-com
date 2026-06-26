// Loads Lemon.js once and exposes a helper to open the overlay checkout.
// Docs: https://docs.lemonsqueezy.com/help/lemonjs/what-is-lemonjs

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup: (opts: { eventHandler?: (event: { event: string; data?: any }) => void }) => void;
      Url: { Open: (url: string) => void; Close: () => void };
      Refresh: () => void;
    };
  }
}

let loadingPromise: Promise<void> | null = null;
let isSetup = false;

const SCRIPT_SRC = "https://app.lemonsqueezy.com/js/lemon.js";

export function loadLemonJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.LemonSqueezy) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Lemon.js failed to load")));
      if ((existing as any)._loaded) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.defer = true;
    script.onload = () => {
      (script as any)._loaded = true;
      try { window.createLemonSqueezy?.(); } catch { /* noop */ }
      resolve();
    };
    script.onerror = () => reject(new Error("Lemon.js failed to load"));
    document.body.appendChild(script);
  });

  return loadingPromise;
}

export type OverlayHandlers = {
  onSuccess?: (data?: any) => void;
  onClose?: () => void;
  onAny?: (event: string, data?: any) => void;
};

export async function openLemonOverlay(url: string, handlers: OverlayHandlers = {}): Promise<void> {
  await loadLemonJs();
  try { window.createLemonSqueezy?.(); } catch { /* noop */ }
  const ls = window.LemonSqueezy;
  if (!ls) throw new Error("Lemon.js not available");

  if (!isSetup) {
    ls.Setup({
      eventHandler: (event) => {
        handlers.onAny?.(event.event, event.data);
        if (event.event === "Checkout.Success") handlers.onSuccess?.(event.data);
        if (event.event === "PaymentMethodUpdate.Closed" || event.event === "Checkout.Closed") {
          handlers.onClose?.();
        }
      },
    });
    isSetup = true;
  }

  // Ensure the URL forces the overlay/embed mode.
  const finalUrl = url.includes("embed=") ? url : `${url}${url.includes("?") ? "&" : "?"}embed=1`;
  ls.Url.Open(finalUrl);
}

export function closeLemonOverlay() {
  window.LemonSqueezy?.Url.Close();
}
