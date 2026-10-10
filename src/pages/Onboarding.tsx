import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessState } from "@/hooks/useAccessState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import robotAsset from "@/assets/tradenova-robot-full.jpg.asset.json";

type Stage = "q1" | "q2" | "q3" | "setup" | "preview" | "plan" | "payment" | "confirming" | "success";

const MARKETS = ["Futures", "Forex", "Stocks", "Crypto"];
const EXPERIENCE = ["Just started", "Under 1 year", "1–3 years", "3+ years"];
const PROBLEMS = [
  "Revenge trading after a loss", "Overtrading / lack of patience", "Breaking my own rules",
  "Psychology / emotional decisions", "Poor risk management", "Inconsistent execution",
  "No idea — that's the problem",
];
const PLAN_FEATURES: Record<"pro" | "elite", string[]> = {
  pro: ["Journal, Trade Plan, checklists & analytics", "1 connected trading account", "NOVA AI — 500 credits / month"],
  elite: ["Everything in Pro", "Unlimited connected trading accounts", "NOVA AI — 1,000 credits / month", "Priority support"],
};

type Price = { amount: number | null; currency: string };

function Robot({ size = 110, bubble }: { size?: number; bubble?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {bubble && (
        <div className="relative max-w-xs rounded-xl border border-border bg-card px-4 py-2 text-center text-sm text-foreground">
          {bubble}
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />
        </div>
      )}
      <img src={robotAsset.url} alt="TradeNova robot" style={{ height: size }}
        className="w-auto object-contain mix-blend-screen animate-[tn-float_6s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

function Progress({ n }: { n: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full border transition-colors duration-300",
              i === n ? "border-primary bg-primary" : i < n ? "border-primary/60 bg-primary/40" : "border-border")} />
            {i < 3 && <span className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>
      <p className="text-[11px] tracking-[0.2em] text-muted-foreground">{n} OF 3</p>
    </div>
  );
}

function Option({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn("w-full rounded-xl border px-5 py-4 text-left text-sm transition-all duration-300",
        active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground/90 hover:border-primary/40")}>
      <span className="flex items-center justify-between">{label}{active && <Check className="h-4 w-4 text-primary" />}</span>
    </button>
  );
}

const fmt = (p?: Price) => p?.amount != null
  ? new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency || "USD" }).format(p.amount)
  : null;

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { state, loading, error: accessError, refresh } = useAccessState();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage | null>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [experience, setExperience] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [plan, setPlan] = useState<"pro" | "elite">("pro");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupTick, setSetupTick] = useState(0);

  // Decide starting stage from server state (resume where the user left off).
  useEffect(() => {
    if (!state || stage) return;
    if (params.get("checkout") === "done") { setStage("confirming"); return; }
    if (state.has_access) { setStage("success"); return; }
    if (state.selected_plan) setPlan(state.selected_plan);
    if (state.selected_billing) setBilling(state.selected_billing);
    if (state.onboarding_completed || params.get("step") === "plan") { setStage("plan"); return; }
    setStage((["q1", "q2", "q3"] as Stage[])[Math.max(0, Math.min((state.onboarding_step || 1) - 1, 2))]);
  }, [state, stage, params]);

  useEffect(() => {
    if (!user) return;
    supabase.from("onboarding_profiles").select("market_types, experience_level, main_trading_problem").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setMarkets((data as any).market_types ?? []);
        setExperience((data as any).experience_level ?? null);
        const pr = (data as any).main_trading_problem as string | null;
        if (pr) { if (PROBLEMS.includes(pr)) setProblem(pr); else { setProblem("Other"); setOther(pr); } }
      });
    supabase.functions.invoke("dodo-checkout", { body: { action: "prices" } })
      .then(({ data }) => setPrices(((data as any)?.prices ?? {}) as Record<string, Price>));
  }, [user]);

  // Setup transition: real save already happened; short sequential ticks (~1.8s total).
  useEffect(() => {
    if (stage !== "setup") return;
    setSetupTick(0);
    const ts = [500, 1100, 1700].map((ms, i) => setTimeout(() => setSetupTick(i + 1), ms));
    const done = setTimeout(() => setStage("preview"), 2100);
    return () => { ts.forEach(clearTimeout); clearTimeout(done); };
  }, [stage]);

  // After checkout: wait for the backend to confirm the trial/subscription.
  useEffect(() => {
    if (stage !== "confirming") return;
    let n = 0, stop = false;
    const tick = async () => {
      n++;
      if (n === 3) await supabase.functions.invoke("dodo-sync-subscription", { method: "POST" }).catch(() => {});
      const s = await refresh();
      if (stop) return;
      if (s?.has_access) { setStage("success"); return; }
      if (n >= 20) { setError("We couldn't confirm your trial yet. If you completed checkout, refresh in a minute."); setStage("plan"); return; }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { stop = true; };
  }, [stage, refresh]);

  const save = async (patch: Partial<{ step: number; markets: string[]; experience: string; problem: string; completed: boolean; plan: string; billing: string }>) => {
    const { error } = await (supabase.rpc as any)("save_onboarding", {
      p_step: patch.step ?? null, p_market_types: patch.markets ?? null, p_experience: patch.experience ?? null,
      p_problem: patch.problem ?? null, p_completed: patch.completed ?? null, p_plan: patch.plan ?? null, p_billing: patch.billing ?? null,
    });
    if (error) throw error;
  };

  const next = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message ?? "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  const startTrial = () => next(async () => {
    await save({ plan, billing });
    const { data, error } = await supabase.functions.invoke("dodo-checkout", { body: { plan, billing, onboarding: true } });
    if (error) throw new Error("Checkout could not be started. Please try again.");
    const url = (data as any)?.url;
    if (!url) throw new Error("Checkout could not be started. Please try again.");
    window.location.href = url;
  });

  const priceFor = (p: "pro" | "elite") => prices[`${p}_${billing}`];
  const period = billing === "monthly" ? "month" : "year";

  if (authLoading || loading) return <div className="min-h-screen bg-background" />;
  if (accessError) return <main className="min-h-screen flex flex-col items-center justify-center gap-4"><p role="alert">{accessError}</p><Button onClick={() => void refresh()}>Try again</Button></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (state?.internal) return <Navigate to="/app" replace />;

  const wrap = (content: React.ReactNode, wide = false) => (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div key={stage ?? ""} className={cn("mx-auto flex min-h-[80vh] flex-col items-center justify-center gap-7 animate-[tn-step_350ms_cubic-bezier(0.22,1,0.36,1)]", wide ? "max-w-3xl" : "max-w-md")}>
        {content}
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </div>
    </div>
  );

  switch (stage) {
    case "q1": return wrap(<>
      <Robot bubble="Three quick steps and I'll set things up for you." />
      <Progress n={1} />
      <h1 className="text-center font-heading text-2xl font-semibold">What do you trade?</h1>
      <p className="-mt-4 text-xs text-muted-foreground">Pick all that apply.</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {MARKETS.map((m) => <Option key={m} label={m} active={markets.includes(m)}
          onClick={() => setMarkets((s) => s.includes(m) ? s.filter((x) => x !== m) : [...s, m])} />)}
      </div>
      <Button className="w-full" disabled={!markets.length || busy}
        onClick={() => next(async () => { await save({ step: 2, markets }); setStage("q2"); })}>Continue</Button>
    </>);
    case "q2": return wrap(<>
      <Robot size={90} />
      <Progress n={2} />
      <h1 className="text-center font-heading text-2xl font-semibold">How long have you been trading?</h1>
      <div className="grid w-full gap-3">
        {EXPERIENCE.map((m) => <Option key={m} label={m} active={experience === m} onClick={() => setExperience(m)} />)}
      </div>
      <div className="flex w-full gap-2">
        <Button variant="ghost" onClick={() => setStage("q1")}>Back</Button>
        <Button className="flex-1" disabled={!experience || busy}
          onClick={() => next(async () => { await save({ step: 3, experience: experience! }); setStage("q3"); })}>Continue</Button>
      </div>
    </>);
    case "q3": {
      const answer = problem === "Other" ? other.trim() : problem;
      return wrap(<>
        <Robot size={90} />
        <Progress n={3} />
        <h1 className="text-center font-heading text-2xl font-semibold">What's actually costing you money right now?</h1>
        <div className="grid w-full gap-2.5">
          {[...PROBLEMS, "Other"].map((m) => <Option key={m} label={m} active={problem === m} onClick={() => setProblem(m)} />)}
          {problem === "Other" && (
            <input value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} placeholder="Tell us in a few words"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          )}
        </div>
        <div className="flex w-full gap-2">
          <Button variant="ghost" onClick={() => setStage("q2")}>Back</Button>
          <Button className="flex-1" disabled={!answer || busy}
            onClick={() => next(async () => { await save({ step: 3, problem: answer!, completed: true }); setStage("setup"); })}>Continue</Button>
        </div>
      </>);
    }
    case "setup": return wrap(<>
      <Robot bubble="Give me a second, I'm setting this up for you." />
      <ul className="w-full max-w-xs space-y-2.5 text-sm">
        {["Reading your answers", "Personalizing your experience", "Preparing your TradeNova workspace"].map((t, i) => (
          <li key={t} className={cn("flex items-center gap-2 transition-opacity duration-300", setupTick >= i ? "opacity-100" : "opacity-30")}>
            {setupTick > i ? <Check className="h-4 w-4 text-primary" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {t}
          </li>
        ))}
      </ul>
    </>);
    case "preview": return wrap(<>
      <h1 className="text-center font-heading text-2xl font-semibold">Your best trading days start before the trade.</h1>
      <p className="-mt-3 text-center text-sm text-muted-foreground">TradeNova tracks not only what your trade did, but the state you were in when you took it.</p>
      <div className="w-full rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-[11px] tracking-[0.2em] text-muted-foreground">BEFORE THE TRADE</p>
        {["Emotional State", "Focus Level", "Confidence"].map((l) => (
          <div key={l} className="flex items-center justify-between py-2 text-sm">
            <span>{l}</span>
            <span className="flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="h-3.5 w-3.5 rounded-full border border-border" />)}</span>
          </div>
        ))}
        <p className="mt-3 text-[11px] text-muted-foreground">Preview only. You'll fill this in when you log your trades.</p>
      </div>
      <Button className="w-full" onClick={() => setStage("plan")}>Continue</Button>
    </>);
    case "plan": return wrap(<>
      <p className="text-[11px] tracking-[0.2em] text-primary">CHOOSE YOUR PLAN · 14 DAYS FREE</p>
      <h1 className="-mt-4 text-center font-heading text-3xl font-semibold">Start mastering your trading.</h1>
      <div className="flex rounded-lg border border-border p-0.5 text-xs">
        {(["monthly", "yearly"] as const).map((b) => (
          <button key={b} onClick={() => setBilling(b)}
            className={cn("rounded-md px-4 py-1.5 transition-colors duration-300", billing === b ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
            {b === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {(["pro", "elite"] as const).map((p) => (
          <button key={p} onClick={() => setPlan(p)}
            className={cn("rounded-xl border p-5 text-left transition-all duration-300",
              plan === p ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40")}>
            <p className="font-heading text-lg font-semibold capitalize">{p}</p>
            <p className="mt-1 text-2xl font-bold">{fmt(priceFor(p)) ?? "—"}<span className="text-sm font-normal text-muted-foreground"> / {period}</span></p>
            <p className="mt-1 text-xs text-primary">14-day free trial</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {PLAN_FEATURES[p].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" />{f}</li>)}
            </ul>
          </button>
        ))}
      </div>
      <Button className="w-full max-w-md" onClick={() => setStage("payment")}>Start 14-Day Free Trial</Button>
    </>, true);
    case "payment": {
      const pr = fmt(priceFor(plan));
      const ends = new Date(Date.now() + 14 * 864e5).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
      return wrap(<>
        <h1 className="text-center font-heading text-2xl font-semibold">Start your 14-day free trial</h1>
        <p className="-mt-4 text-center text-sm text-muted-foreground">Add a payment method to activate your TradeNova trial.</p>
        <div className="w-full space-y-2.5 rounded-xl border border-border bg-card p-5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="capitalize">{plan} · {billing === "monthly" ? "Monthly" : "Annual"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Due today</span><span className="font-semibold">$0.00</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Trial</span><span>14 days</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Then</span><span>{pr ? `${pr} / ${period}` : "Plan price shown at checkout"}</span></div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          You won't be charged today. If you don't cancel before your trial ends (around {ends}), you'll be billed {pr ? `${pr} every ${period}` : "the plan price"} until you cancel. You can cancel anytime from Billing.
        </p>
        <Button className="w-full" disabled={busy} onClick={startTrial}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}Start My Free Trial
        </Button>
        <p className="-mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Secure payment powered by Dodo Payments. Card details never touch TradeNova.</p>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setStage("plan")}>Change plan</button>
      </>);
    }
    case "confirming": return wrap(<>
      <Robot />
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Confirming your trial…</p>
    </>);
    case "success": return wrap(<>
      <Robot size={130} bubble="You're all set. Welcome to TradeNova." />
      <Button className="w-full" onClick={() => { sessionStorage.setItem("tradenova-welcome-pending", "1"); navigate("/app", { replace: true }); }}>Enter TradeNova</Button>
    </>);
    default: return <div className="min-h-screen bg-background" />;
  }
}
