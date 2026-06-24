import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingPage from '@/pages/Pricing';
import SeoHead from '@/components/SeoHead';

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <SeoHead
        path="/pricing"
        title="Pricing — TradeNova OS plans for every trader"
        description="Compare Free, Pro, and Elite plans. Start a 7-day free trial — journal trades, build playbooks, and unlock AI insights at the tier that fits."
      />
      <MarketingNav />
      <main className="flex-1 bg-background text-foreground">
        <PricingPage />
      </main>
      <MarketingFooter />
    </div>
  );
}
