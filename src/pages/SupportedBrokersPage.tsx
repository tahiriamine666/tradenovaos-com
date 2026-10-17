import { Link } from 'react-router-dom';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SeoHead from '@/components/SeoHead';

export default function SupportedBrokersPage() {
  return <div className="min-h-screen bg-black text-white">
    <SeoHead path="/supported-brokers" title="Trade imports & broker connections — TradeOS" description="Log trades manually or import a compatible CSV. MT5 Auto Sync is Coming Soon; automatic broker connections are not currently available." />
    <MarketingNav />
    <main className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <p className="text-xs tracking-widest text-blue-300">YOUR WORKFLOW, CONNECTED</p><h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Bring your trades.<br />Keep your process.</h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">Start with manual logging or a compatible CSV export. Automatic broker connections are not available yet.</p>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 p-8"><p className="text-xs text-blue-300">AVAILABLE</p><h2 className="mt-5 text-2xl">Manual journal & CSV import</h2><p className="mt-5 leading-7 text-zinc-400">Record trades in the journal, or use the import controls for a compatible CSV file. Check the required columns and preview before saving. Broker exports may need formatting; support for every broker or format is not guaranteed.</p><Link to="/features/trade-journal" className="mt-8 inline-flex min-h-11 items-center underline underline-offset-4">Explore the journal →</Link></section>
        <section className="rounded-xl border border-zinc-800 p-8"><p className="text-xs text-blue-300">COMING SOON</p><h2 className="mt-5 text-2xl">MT5 Auto Sync</h2><p className="mt-5 leading-7 text-zinc-400">Automatic synchronization remains disabled. There is no release date to announce. No broker credentials are needed for manual journaling.</p><Link to="/faq" className="mt-8 inline-flex min-h-11 items-center underline underline-offset-4">Read the FAQ →</Link></section>
      </div>
      <Link to="/signup" className="mt-12 inline-flex min-h-12 items-center rounded-lg bg-white px-7 font-semibold text-black">Start your 14-day trial</Link><p className="mt-4 text-sm text-zinc-400">Payment method required.</p>
    </main>
    <MarketingFooter />
  </div>;
}
