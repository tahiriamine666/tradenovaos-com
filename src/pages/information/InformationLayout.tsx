import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logoN from '@/assets/tradeos-n-logo.png';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SeoHead from '@/components/SeoHead';
import { INFORMATION_LINKS } from './informationLinks';
import './information.css';

export default function InformationLayout({ path, title, description, eyebrow, children }: { path: string; title: string; description: string; eyebrow: string; children: ReactNode }) {
  return <div className="info-page">
    <SeoHead path={path} title={`${title} — TradeNovaOS`} description={description} />
    <a className="info-skip" href="#information-main">Skip to content</a>
    <header className="info-header">
      <Link to="/" className="info-brand" aria-label="TradeOS home"><img src={logoN} alt="" aria-hidden="true" className="w-8 h-8 object-contain" />TradeOS</Link>
      <nav aria-label="Account navigation"><Link to="/login">Log in</Link><Link className="info-button" to="/signup">Get started</Link></nav>
    </header>
    <nav className="info-nav" aria-label="Information pages">{INFORMATION_LINKS.map(item => <NavLink key={item.path} to={item.path}>{item.label}</NavLink>)}</nav>
    <main id="information-main" className="info-main">
      <div className="info-hero"><p className="info-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {children}
    </main>
    <MarketingFooter homepage />
  </div>;
}
