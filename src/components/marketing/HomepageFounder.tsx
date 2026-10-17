import founderPortrait from '@/assets/founder-portrait.png.asset.json';

export default function HomepageFounder() {
  return (
    <section className="home-section home-container home-founder" id="founder" aria-labelledby="founder-heading">
      <div className="home-founder-intro">
        <p className="home-eyebrow">WHY I BUILT THIS</p>
        <div className="home-founder-portrait">
          <img src={founderPortrait.url} alt="Portrait of the TradeNovaOS founder" loading="lazy" decoding="async" />
        </div>
        <p className="text-xs text-muted-foreground mt-5">The purpose behind TradeNovaOS</p>
      </div>
      <div>
        <h2 id="founder-heading">Discipline deserves<br />a dedicated space.</h2>
        <p className="home-founder-lead">TradeNovaOS was built to bring trading discipline and analysis into one considered workspace.</p>
        <p className="home-founder-copy">A plan before the trade. Context around the execution. Time to review the decisions afterward. The purpose is simple: make room for a clearer, more consistent process.</p>
        <p className="home-founder-copy">Not a promise of profit. A place to record, reflect and understand your own trading.</p>
        <div className="home-founder-signoff"><span>TradeNovaOS</span><span>Plan. Journal. Review.</span></div>
      </div>
    </section>
  );
}
