import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check, ChevronLeft, Loader2, Lock, ShieldCheck, Sparkles, Crown, Tag, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { createCheckoutUrl, validateCoupon, syncSubscription, type LsPlan, type LsBilling, type CouponResult } from "@/lib/lemonsqueezy";
import { openLemonOverlay, loadLemonJs } from "@/lib/lemonjs";

type PlanDef = {
  id: LsPlan;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  icon: typeof Sparkles;
  accent: string;
};

const PLANS: Record<LsPlan, PlanDef> = {
  pro: {
    id: "pro",
    name: "TradeNova Pro",
    tagline: "For serious active traders",
    monthly: 14,
    yearly: 11,
    icon: Sparkles,
    accent: "from-violet-500 to-fuchsia-500",
    features: [
      "Unlimited trades",
      "AI Analytics",
      "Trade Journal",
      "Risk Management",
      "Replay Studio",
    ],
  },
  elite: {
    id: "elite",
    name: "TradeNova Elite",
    tagline: "For funded & professional traders",
    monthly: 28,
    yearly: 22,
    icon: Crown,
    accent: "from-amber-400 to-orange-500",
    features: [
      "Everything in Pro",
      "API Access",
      "Priority Support",
      "Advanced Replay Studio",
      "Early Feature Access",
    ],
  },
};

const COUNTRIES = [
  ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["AU", "Australia"],
  ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"], ["ES", "Spain"], ["IT", "Italy"],
  ["AE", "United Arab Emirates"], ["MA", "Morocco"], ["SA", "Saudi Arabia"], ["IN", "India"],
  ["JP", "Japan"], ["SG", "Singapore"], ["BR", "Brazil"], ["MX", "Mexico"], ["ZA", "South Africa"],
];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const initialPlan: LsPlan = params.get("plan") === "elite" ? "elite" : "pro";
  const [planId, setPlanId] = useState<LsPlan>(initialPlan);
  const [billing, setBilling] = useState<LsBilling>("monthly");

  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState((user?.user_metadata as any)?.full_name ?? "");
  const [country, setCountry] = useState("US");
  const [zip, setZip] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const plan = PLANS[planId];
  const Icon = plan.icon;

  useEffect(() => { loadLemonJs().catch(() => {}); }, []);
  useEffect(() => { setCoupon(null); setCouponInput(""); }, [planId, billing]);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/checkout?plan=${planId}`);
    }
  }, [user, planId, navigate]);

  const price = billing === "yearly" ? plan.yearly : plan.monthly;
  const period = billing === "yearly" ? "/mo, billed yearly" : "/month";

  const recurringMonthly = useMemo(() => {
    if (!coupon?.valid || !coupon.amount) return price;
    if (coupon.amount_type === "percent") {
      return Math.max(0, +(price * (1 - coupon.amount / 100)).toFixed(2));
    }
    // fixed = cents off the recurring charge
    return Math.max(0, +(price - coupon.amount / 100).toFixed(2));
  }, [price, coupon]);

  const isTrialPlan = planId === "pro";
  const dueToday = isTrialPlan ? 0 : recurringMonthly;


  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon({ code, plan: planId, billing });
      if (!result.valid) {
        setCoupon(null);
        toast({ title: "Coupon not valid", description: result.error ?? "Try a different code.", variant: "destructive" });
      } else {
        setCoupon(result);
        toast({ title: "Coupon applied", description: result.label ?? "Discount added." });
      }
    } catch (e: any) {
      toast({ title: "Could not check coupon", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter the email for your subscription.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = await createCheckoutUrl({
        plan: planId,
        billing,
        coupon: coupon?.valid ? coupon.code : undefined,
        email: email.trim(),
        name: name.trim() || undefined,
        country: country || undefined,
        zip: zip.trim() || undefined,
      });
      await openLemonOverlay(url, {
        onSuccess: async () => {
          try { await syncSubscription(); } catch { /* noop */ }
          navigate("/billing/success");
        },
      });
    } catch (e: any) {
      toast({
        title: "Could not start checkout",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body">
      {/* Top bar */}
      <div className="border-b border-slate-200/70 sticky top-0 z-30 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Secure checkout · 256-bit SSL
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 min-h-[calc(100vh-3.5rem)]">
        {/* LEFT — 40% */}
        <aside className="lg:col-span-2 bg-[#F7F7FA] px-6 sm:px-10 py-10 lg:py-14 border-r border-slate-200/70">
          <div className="max-w-md mx-auto lg:mx-0 lg:ml-auto lg:mr-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-10">
              <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#7C3AED]/25">
                <Zap className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold font-heading tracking-tight">TradeNova</span>
            </div>

            {/* Plan summary card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.25)]"
            >
              {/* Plan toggle */}
              <div className="inline-flex p-1 rounded-full bg-slate-100 text-xs font-semibold mb-5">
                {(Object.keys(PLANS) as LsPlan[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setPlanId(id)}
                    className={`px-3.5 py-1.5 rounded-full transition-all ${
                      planId === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {PLANS[id].name.replace("TradeNova ", "")}
                  </button>
                ))}
              </div>

              <div className="flex items-start gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.accent} flex items-center justify-center shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading">{plan.name}</h2>
                  <p className="text-xs text-slate-500">{plan.tagline}</p>
                </div>
              </div>

              {/* Billing toggle */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {(["monthly", "yearly"] as LsBilling[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className={`relative rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      billing === b
                        ? "border-[#7C3AED] bg-[#7C3AED]/5 ring-1 ring-[#7C3AED]/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {b === "monthly" ? "Monthly" : "Yearly"}
                    </div>
                    <div className="font-semibold">
                      ${b === "monthly" ? plan.monthly : plan.yearly}
                      <span className="text-slate-400 text-xs font-normal">/mo</span>
                    </div>
                    {b === "yearly" && (
                      <span className="absolute -top-2 right-2 text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                        SAVE 20%
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Price */}
              <div className="mb-6 py-5 border-y border-slate-100">
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-bold tracking-tight font-heading">${price}</span>
                  <span className="text-sm text-slate-500 mb-2">{period}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{isTrialPlan ? "7-day free trial · Cancel anytime" : "Billed immediately · Cancel anytime"}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED]/10">
                      <Check className="h-3 w-3 text-[#7C3AED]" strokeWidth={3} />
                    </span>
                    <span className="text-slate-700">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Coupon */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Coupon code
                </label>
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="h-10 rounded-xl bg-white border-slate-200 text-sm uppercase tracking-wider"
                    disabled={!!coupon?.valid}
                  />
                  {coupon?.valid ? (
                    <button
                      onClick={() => { setCoupon(null); setCouponInput(""); }}
                      className="px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  )}
                </div>
                {coupon?.valid && (
                  <p className="mt-2 text-xs text-emerald-600 font-semibold">
                    ✓ {coupon.label} applied
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{plan.name} · {billing}</span>
                  <span>${price.toFixed(2)}/mo</span>
                </div>
                {coupon?.valid && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({coupon.label})</span>
                    <span>−${(price - recurringMonthly).toFixed(2)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                  <span>After trial</span>
                  <span className="font-semibold text-slate-900">${recurringMonthly.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Due today</span>
                  <span className="font-bold text-[#7C3AED]">${dueToday.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-6 flex items-center justify-center gap-3 opacity-70">
                <div className="text-[10px] font-bold tracking-wider text-slate-500">VISA</div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="text-[10px] font-bold tracking-wider text-slate-500">MASTERCARD</div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="text-[10px] font-bold tracking-wider text-slate-500">AMEX</div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="text-[10px] font-bold tracking-wider text-slate-500">APPLE PAY</div>
              </div>
            </motion.div>
          </div>
        </aside>

        {/* RIGHT — 60% */}
        <section className="lg:col-span-3 bg-white px-6 sm:px-10 py-10 lg:py-14">
          <div className="max-w-xl mx-auto lg:mx-0 lg:ml-10">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight">
                Complete your purchase
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Start your 7-day free trial. We'll only charge you after the trial ends.
              </p>
            </motion.div>

            <div className="mt-10 space-y-6">
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-12 rounded-2xl border-slate-200 text-base"
                />
              </Field>

              <Field label="Full name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Trader"
                  className="h-12 rounded-2xl border-slate-200 text-base"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Country">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
                  >
                    {COUNTRIES.map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ZIP / Postal code">
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="10001"
                    className="h-12 rounded-2xl border-slate-200 text-base"
                  />
                </Field>
              </div>

              {/* Card info notice */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex items-start gap-3">
                <Lock className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Card details are entered in a secure PCI-compliant overlay on the next step.
                  Your information is encrypted end-to-end and never touches our servers.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-base font-bold transition-all shadow-lg shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Opening secure checkout…</>
                ) : (
                  <>Start 7-day free trial</>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                30-day money-back guarantee · Cancel anytime
              </div>

              <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                By starting your trial you agree to our{" "}
                <a href="/terms" className="underline hover:text-slate-700">Terms</a> and{" "}
                <a href="/privacy" className="underline hover:text-slate-700">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700 mb-2">{label}</span>
      {children}
    </label>
  );
}
