import React from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingPage from '@/pages/PricingPage';

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingNav />
      <main className="flex-1 bg-background text-foreground">
        <PricingPage />
      </main>
      <MarketingFooter />
    </div>
  );
}
