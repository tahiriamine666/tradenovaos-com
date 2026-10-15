import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Brain, CalendarDays, Check, ChevronRight, FileUp, LayoutDashboard, ListChecks, LockKeyhole, Sparkles, Target } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import BrandLogo from '@/components/BrandLogo';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { monthlyPlanPrice } from '@/lib/pricing';
import './homepage.css';

const features = [
  { icon: BookOpen, title: 'Every trade. The whole story.', label: 'Trade Journal', text: 'Keep execution, charts, outcomes and emotions together. Review the context, not just the result.', to: '/features/trade-journal' },
  { icon: BarChart3, title: 'See what your data says.', label: 'Analytics', text: 'Review win rate, profit factor, cumulative P&L and setup performance from your recorded trades.', to: '/features/edge-analytics' },
  { icon: ListChecks, title: 'A plan before the position.', label: 'Trade Plan', text: 'Pair-specific Daily Plans, Weekly Outlooks and reusable checklists. Your process, in one workspace.', to: '/features/playbook-lab' },
  { icon: Brain, title: 'Look beyond the numbers.', label: 'Psychology', text: 'Record emotions and discipline. Reflect on your decisions with weekly and bi-weekly reviews.', to: '/features/mind-journal' },
  { icon: CalendarDays, title: 'Keep the bigger picture.', label: 'Calendars', text: 'Explore daily trading results and upcoming economic events, with filters and saved preferences.', to: '/features/trading-calendar' },
  { icon: Sparkles, title: 'Meet your trading context.', label: 'NOVA AI', text: 'Ask NOVA questions grounded in your own trading data, journal and plans.', to: '/features/ai-insights' },
];
const previewViews = ['Dashboard', 'Trade Journal', 'Trade Plan'] as const;
type PreviewView = typeof previewViews[number];

function ProductPreview() {
  const [view, setView] = useState<PreviewView>('Dashboard');
  return (
    <figure className="home-preview" id="product-preview">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><LockKeyhole className="h-3 w-3" /> tradenovaos.com/app</span>
        <span>Product preview · empty workspace</span>
      </div>
      <div className="home-preview-body">
        <aside className="home-preview-sidebar">
          <div className="flex items-center gap-2 pb-7"><BrandLogo decorative className="h-7 w-7 object-contain" /><span className="text-sm font-bold">TradeNova</span></div>
          {previewViews.map((item, index) => {
            const Icon = [LayoutDashboard, BookOpen, ListChecks][index];
            return <Button key={item} variant="ghost" onClick={() => setView(item)} aria-pressed={view === item} className={`mb-1 w-full justify-start text-xs ${view === item ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Icon />{item}</Button>;
          })}
          <div className="mt-3 space-y-4 border-t border-border pt-5 text-xs text-muted-foreground"><p>Analytics</p><p>NOVA AI</p><p>Economic Calendar</p><p>Certificates</p></div>
        </aside>
        <div className="home-preview-content">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground mb-1">Your trading workspace</p><h3 className="text-xl font-semibold">{view}</h3></div><span className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2">All accounts</span></div>
          <div className="sm:hidden flex gap-1 mb-5" role="group" aria-label="Product preview views">{previewViews.map(item => <Button key={item} variant="ghost" size="sm" onClick={() => setView(item)} aria-pressed={view === item} className={`text-xs px-2 ${view === item ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}>{item}</Button>)}</div>
          {view === 'Dashboard' ? <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{['Net P&L', 'Win Rate', 'Average R:R', 'Total Trades'].map(label => <div key={label} className="border border-border rounded-md p-4 bg-card"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl mt-3">—</p></div>)}</div>
            <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4"><div className="home-empty-chart"><p className="text-sm font-medium">Cumulative P&L</p><div className="home-chart-grid"><BarChart3 className="h-6 w-6 text-primary mb-3" /><p className="text-sm text-muted-foreground">No trades recorded</p></div></div><div className="border border-border rounded-md p-5"><p className="text-sm font-medium">Psychology Score</p><div className="flex flex-col justify-center items-center min-h-40"><div className="home-score">—</div><p className="text-xs text-muted-foreground mt-4">Not enough data</p></div></div></div>
          </> : view === 'Trade Journal' ? <div className="border border-border rounded-md overflow-hidden"><div className="grid grid-cols-4 p-4 border-b border-border text-xs text-muted-foreground"><span>PAIR</span><span>RESULT</span><span>P&L</span><span>DATE</span></div><div className="flex flex-col items-center justify-center min-h-64"><BookOpen className="h-7 w-7 text-primary mb-4" /><p className="text-sm">No trades recorded</p><p className="text-xs text-muted-foreground mt-2">Your recorded executions appear here.</p></div></div> : <div className="border border-border rounded-md p-5"><div className="flex flex-wrap gap-5 text-xs border-b border-border pb-4"><span className="text-primary">Daily Plan</span><span className="text-muted-foreground">Weekly Outlook</span><span className="text-muted-foreground">Full View</span></div><div className="py-6 text-sm"><p className="mb-4 text-muted-foreground">EURUSD · Daily Plan</p><p className="font-medium mb-3">Pre-trade checklist</p>{['Review market structure', 'Mark key levels', 'Define risk before entry'].map(text => <div key={text} className="flex items-center gap-3 py-3 border-b border-border text-muted-foreground"><span className="w-4 h-4 border border-border rounded-sm" />{text}</div>)}<p className="mt-4 text-xs text-muted-foreground">Illustrative checklist · customize your own rules</p></div></div>}
        </div>
      </div>
      <figcaption className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground"><span>Your data. Your process. One workspace.</span><span className="hidden sm:inline">TradeNovaOS</span></figcaption>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="home-page min-h-screen bg-background text-foreground">
      <SeoHead path="/" title="TradeNova OS — Trading journal, analytics & playbooks" description="Plan trades, journal every execution, and improve with AI insights. TradeNova OS is the Trading Operating System for serious traders." />
      <MarketingNavbar homepage onLogin={() => { window.location.assign('/login'); }} onSignup={() => { window.location.assign('/signup'); }} />
      <main id="main-content">
        <section className="home-hero home-container">
          <p className="home-eyebrow"><span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mr-2" /> THE TRADING OPERATING SYSTEM</p>
          <h1>TradeNovaOS<span className="block home-hero-subtitle">A clearer view of<br className="hidden sm:block" /> your trading.</span></h1>
          <p className="home-hero-copy">Plan with intention. Journal with context. Review with clarity.<br className="hidden sm:block" /> Your entire trading process, brought together.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8"><Button asChild size="lg" className="home-primary"><Link to="/signup">Get started <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="home-secondary"><a href="#product-preview">Explore the workspace <ArrowUpRight /></a></Button></div>
          <p className="text-xs text-muted-foreground mt-5">14-day trial · Payment method required</p>
          <div className="home-preview-wrap"><ProductPreview /></div>
        </section>

        <section className="home-section home-container" id="features">
          <div className="home-section-heading"><div><p className="home-eyebrow">ONE CONNECTED WORKFLOW</p><h2>Less noise.<br />More perspective.</h2></div><p className="home-section-copy">From the first idea to the final review, keep your decisions and your data in the same place.</p></div>
          <div className="home-feature-grid">{features.map(feature => <Link key={feature.label} to={feature.to} className="home-feature"><div className="flex items-center justify-between mb-10"><feature.icon className="h-5 w-5 text-primary" /><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div><p className="home-eyebrow mb-3">{feature.label}</p><h3>{feature.title}</h3><p className="text-sm text-muted-foreground leading-relaxed mt-4">{feature.text}</p></Link>)}</div>
        </section>

        <section className="home-section home-container" id="how-it-works">
          <div className="home-section-heading"><div><p className="home-eyebrow">A MORE INTENTIONAL ROUTINE</p><h2>Before. During.<br />After the trade.</h2></div><Button asChild variant="outline" className="home-secondary"><Link to="/features/playbook-lab">Explore Trade Plan <ArrowRight /></Link></Button></div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">{[{ n: '01', title: 'Define your plan.', text: 'Write your outlook, mark key levels and build a checklist around your own rules.' }, { n: '02', title: 'Capture the context.', text: 'Record executions, before-and-after charts and the emotions behind your decisions.' }, { n: '03', title: 'Make time to review.', text: 'Bring journal evidence into structured reviews. Decide what to keep and what to change.' }].map(step => <div key={step.n} className="border-t border-border pt-6"><span className="text-xs text-primary">{step.n}</span><h3 className="text-xl font-medium mt-6 mb-3">{step.title}</h3><p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{step.text}</p></div>)}</div>
        </section>

        <section className="home-section home-container" id="integrations">
          <div className="home-section-heading"><div><p className="home-eyebrow">YOUR WORKFLOW, CONNECTED</p><h2>Bring your trades.<br />Keep your process.</h2></div><p className="home-section-copy">Start with manual trade logging or CSV import. Automatic account connections are not available yet.</p></div>
          <div className="grid md:grid-cols-2 gap-5"><div className="home-integration"><FileUp className="text-primary h-6 w-6 mb-8" /><h3 className="text-2xl font-medium">Manual & CSV import</h3><p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-7">Log trades directly or import a compatible CSV export into your journal.</p><Link to="/supported-brokers" className="text-sm inline-flex items-center gap-2">Explore supported platforms <ArrowUpRight className="h-4 w-4" /></Link></div><div className="home-integration"><div className="flex justify-between items-start mb-7"><img src="/brokers/mt5.png" alt="MetaTrader 5" loading="lazy" className="h-9 w-auto max-w-36 object-contain" /><span className="text-xs text-primary border border-primary/25 px-3 py-1 rounded-md">Coming Soon</span></div><h3 className="text-2xl font-medium">MT5 Auto Sync</h3><p className="text-sm text-muted-foreground leading-relaxed mt-3">Automatic trade synchronization is coming soon. Continue using your journal and manual imports in the meantime.</p></div></div>
        </section>

        <section className="home-section home-container" id="pricing">
          <div className="home-section-heading"><div><p className="home-eyebrow">SIMPLE BY DESIGN</p><h2>Your workspace.<br />Your next chapter.</h2></div><p className="home-section-copy">Choose the plan that fits your trading workflow.<br />Monthly pricing in USD.</p></div>
          <div className="grid md:grid-cols-2 gap-5">{(['pro', 'elite'] as const).map(plan => <article key={plan} className={`home-price ${plan === 'elite' ? 'home-price-elite' : ''}`}><div className="flex justify-between items-center"><h3 className="text-xl font-semibold capitalize">{plan}</h3><span className="text-xs text-muted-foreground">{plan === 'pro' ? 'A focused foundation' : 'Room to grow'}</span></div><p className="home-price-amount">{monthlyPlanPrice(plan)}<span className="text-sm font-normal text-muted-foreground"> / month</span></p><p className="text-sm text-muted-foreground mb-8">{plan === 'pro' ? 'For a focused, individual trading workflow.' : 'For traders working across multiple accounts.'}</p><Button asChild size="lg" variant={plan === 'elite' ? 'default' : 'outline'} className={`w-full ${plan === 'elite' ? 'home-primary' : 'home-secondary'}`}><Link to="/signup">Choose {plan === 'pro' ? 'Pro' : 'Elite'} <ArrowRight /></Link></Button><ul className="space-y-4 mt-8 pt-7 border-t border-border">{[ 'Trade Journal & Trade Logs', 'Trading Calendar & analytics', 'Daily Plans, outlooks & checklists', 'Psychology & structured reviews', 'Economic Calendar', `NOVA AI — ${plan === 'pro' ? '500' : '1,000'} credits/month`, `${plan === 'pro' ? '1 trading account' : 'Unlimited trading accounts'} · auto sync coming soon` ].map(text => <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{text}</li>)}</ul></article>)}</div>
          <div className="flex flex-wrap justify-between gap-4 mt-6 text-xs text-muted-foreground"><p>14-day trial · Payment method required · MT5 Auto Sync unavailable</p><Link to="/pricing" className="inline-flex items-center gap-1 hover:text-foreground">View all billing options <ChevronRight className="h-3 w-3" /></Link></div>
        </section>

        <section className="home-final home-container"><p className="home-eyebrow">MAKE ROOM FOR CLARITY</p><h2>A better place<br />for your trading process.</h2><p className="text-muted-foreground mt-6 mb-8">Your plans, your trades, your perspective. Together in TradeNovaOS.</p><Button asChild size="lg" className="home-primary"><Link to="/signup">Build your workspace <ArrowRight /></Link></Button><p className="text-xs text-muted-foreground mt-5">14-day trial · Payment method required</p></section>
      </main>
      <MarketingFooter homepage />
    </div>
  );
}
