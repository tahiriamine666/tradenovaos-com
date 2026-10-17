import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Brain, CalendarDays, Check, ChevronRight, FileUp, LayoutDashboard, ListChecks, LockKeyhole, Sparkles, Target } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HomepageProductDemo from '@/components/marketing/HomepageProductDemo';
import HomepageFounder from '@/components/marketing/HomepageFounder';
import HomepageTraderFeedback from '@/components/marketing/HomepageTraderFeedback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import novaWave from '@/assets/nova-robot-wave.png.asset.json';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { monthlyPlanPrice } from '@/lib/pricing';
import './homepage.css';

const features = [
  { icon: Target, title: 'Define the limits first.', label: 'Risk Management', text: 'Record risk-per-trade and daily loss limits in your plan. Review adherence alongside outcomes; limits do not prevent losses automatically.', to: '/features/playbook-lab' },
  { icon: BookOpen, title: 'Every trade. The whole story.', label: 'Trade Journal', text: 'Keep execution, charts, outcomes and emotions together. Review the context, not just the result.', to: '/features/trade-journal' },
  { icon: BarChart3, title: 'See what your data says.', label: 'Analytics', text: 'Review win rate, profit factor, cumulative P&L and setup performance from your recorded trades.', to: '/features/edge-analytics' },
  { icon: ListChecks, title: 'A plan before the position.', label: 'Trade Plan', text: 'Pair-specific Daily Plans, Weekly Outlooks and reusable checklists. Your process, in one workspace.', to: '/features/playbook-lab' },
  { icon: Brain, title: 'Look beyond the numbers.', label: 'Psychology', text: 'Record emotions and discipline. Reflect on your decisions with weekly and bi-weekly reviews.', to: '/features/mind-journal' },
  { icon: CalendarDays, title: 'Keep the bigger picture.', label: 'Calendars', text: 'Explore daily trading results and upcoming economic events, with filters and saved preferences.', to: '/features/trading-calendar' },
  { icon: Sparkles, title: 'Meet your trading context.', label: 'NOVA AI', text: 'Ask NOVA questions grounded in your own trading data, journal and plans.', to: '/features/ai-insights' },
];
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
          <div className="home-preview-wrap"><HomepageProductDemo /></div>
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

        <section className="home-section home-container" id="built-for-traders">
          <div className="home-section-heading"><div><p className="home-eyebrow">BUILT FOR TRADERS</p><h2>What traders<br />can explore.</h2></div><p className="home-section-copy">Different ways to bring your process into focus. These are platform features, not customer testimonials or performance claims.</p></div>
          <div className="home-benefit-grid">{[
            { icon: Target, title: 'For the patient planner.', text: 'Keep pair-specific plans and reusable rules close to your journal.', detail: 'Daily Plans & Weekly Outlooks' },
            { icon: BookOpen, title: 'For the detail keeper.', text: 'Give each trade its context: execution, screenshots and the decisions around it.', detail: 'Before & after charts' },
            { icon: Brain, title: 'For the honest reviewer.', text: 'Record emotions and reflect on discipline without reducing every decision to a win or loss.', detail: 'Psychology & structured reviews' },
            { icon: BarChart3, title: 'For the pattern seeker.', text: 'Compare recorded outcomes by pair and setup. Let the journal be your evidence.', detail: 'Trading analytics' },
            { icon: ListChecks, title: 'For your own routine.', text: 'Arrange your Dashboard and Checklist around the way you work.', detail: 'Personalized layouts' },
            { icon: LockKeyhole, title: 'For the manual-first trader.', text: 'Start with trade logging or compatible CSV imports. MT5 Auto Sync remains Coming Soon.', detail: 'No broker connection required' },
          ].map(item => <article className="home-benefit" key={item.title}><item.icon className="h-5 w-5 text-primary mb-8" /><h3 className="text-xl font-medium">{item.title}</h3><p className="text-sm text-muted-foreground leading-relaxed mt-4">{item.text}</p><p className="home-benefit-detail">{item.detail}</p></article>)}</div>
        </section>

        <HomepageTraderFeedback />

        <HomepageFounder />

        <section className="home-section home-container home-faq" id="faq">
          <div><p className="home-eyebrow">A LITTLE MORE CLARITY</p><h2>Good questions.<br />Straight answers.</h2><p className="text-sm text-muted-foreground leading-relaxed mt-6">Something else on your mind?</p><Link to="/contact" className="inline-flex items-center gap-2 text-sm mt-3">Get in touch <ArrowUpRight className="h-4 w-4" /></Link></div>
          <Accordion type="single" collapsible className="min-w-0">{[
            { q: 'Are the homepage results from a real account?', a: 'No. Every number, trade, balance, event and AI response in this preview is illustrative demo data. Nothing here represents a customer’s results or connects to a trading account.' },
            { q: 'What can I use TradeNovaOS for?', a: 'Plan trades, log executions, store chart screenshots, review recorded results and reflect on trading psychology. The workspace also includes NOVA AI, an Economic Calendar and a place for uploaded certificates.' },
            { q: 'Can I connect my MT5 account now?', a: 'No. MT5 Auto Sync is Coming Soon, with no announced release date. Manual trade logging and compatible CSV imports are available independently.' },
            { q: 'What do Pro and Elite cost?', a: `Pro is ${monthlyPlanPrice('pro')} USD per month and Elite is ${monthlyPlanPrice('elite')} USD per month. Annual options are shown on the Pricing page. The checkout confirms the final billing terms before purchase.` },
            { q: 'Is a payment method required for the trial?', a: 'The onboarding offer is a 14-day trial with a payment method required. Review the trial, renewal and cancellation terms shown at checkout before subscribing.' },
            { q: 'Does NOVA provide trading signals or guaranteed results?', a: 'NOVA supports questions and reflection around your trading context. It does not guarantee outcomes. AI responses can be inaccurate and should be reviewed; TradeNovaOS is not a substitute for financial advice.' },
            { q: 'Can I make the workspace my own?', a: 'You can reorder or hide Dashboard widgets, arrange Checklist sections and customize your reusable plan rules. Your trading records remain separate from the illustrative homepage demo.' },
          ].map(({ q, a }, index) => <AccordionItem key={q} value={`faq-${index}`} className="border-border"><AccordionTrigger className="text-left text-sm py-6 gap-5 hover:no-underline">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground leading-relaxed pr-6">{a}</AccordionContent></AccordionItem>)}</Accordion>
        </section>

        <section className="home-final home-container"><img src={import.meta.env.DEV ? `https://id-preview--0ee4a120-abbf-401b-9623-1114b47e7fda.lovable.app${novaWave.url}` : novaWave.url} alt="NOVA, the TradeNova robot, waving" className="home-final-mascot" loading="lazy" width="220" height="220" /><p className="home-eyebrow">MAKE ROOM FOR CLARITY</p><h2>Your trading.<br />With more perspective.</h2><p className="text-muted-foreground mt-6 mb-8">Your plans, your trades, your perspective. Together in TradeNovaOS.</p><Button asChild size="lg" className="home-primary"><Link to="/signup">Build your workspace <ArrowRight /></Link></Button><p className="text-xs text-muted-foreground mt-5">14-day trial · Payment method required</p></section>
      </main>
      <MarketingFooter homepage />
    </div>
  );
}
