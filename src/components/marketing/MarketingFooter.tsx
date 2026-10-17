import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import BrandLogo from './PublicBrandLogo';
import { CookieSettingsButton } from '@/components/CookieConsent';

export default function MarketingFooter(props: { homepage?: boolean }) {
    const homepageColumns = [
      { title: 'PRODUCT', links: [{ label: 'Features', to: '/#features' }, { label: 'NOVA AI', to: '/how-nova-works' }, { label: 'Integrations', to: '/#integrations' }, { label: 'Pricing', to: '/pricing' }, { label: 'Free Psychology Audit', to: '/psychology-audit' }, { label: 'Security', to: '/security' }] },
      { title: 'COMPANY', links: [{ label: 'About', to: '/about' }, { label: 'FAQ', to: '/faq' }, { label: 'Contact', to: '/contact' }] },
      { title: 'LEGAL', links: [{ label: 'Privacy Policy', to: '/privacy' }, { label: 'Risk Disclaimer', to: '/risk-disclaimer' }, { label: 'Cookie Policy', to: '/cookies' }] },
    ];
    return (
      <footer className="home-footer border-y border-border bg-black text-foreground" aria-label="Website footer" data-homepage={props.homepage || undefined}>
        <div className="home-container grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16 lg:py-14">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="TradeOS home">
              <BrandLogo className="h-8 w-8" decorative />
              <span className="home-wordmark text-foreground">TradeOS</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">A workspace for journaling and planning.<br />Built around a more disciplined process.</p>
            <a href="https://www.instagram.com/tradenovaos1/" target="_blank" rel="noopener noreferrer" aria-label="TradeOS on Instagram" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <Instagram className="h-3.5 w-3.5" aria-hidden="true" /> Instagram
            </a>
          </div>
          {homepageColumns.map(column => (
            <nav key={column.title} aria-label={`Footer ${column.title.toLowerCase()}`}>
              <h3 className="mb-5 text-[10px] font-semibold text-foreground">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map(link => (
                  <li key={link.label}>
                    {link.to.includes('#') ? (
                      <a href={link.to} className="text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
                    ) : (
                      <Link to={link.to} className="text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="home-container flex flex-col items-start gap-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <p className="max-w-xl text-[11px] leading-6 text-muted-foreground">Trading involves substantial risk and is not suitable for every investor. Past performance does not guarantee future results.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
              <p>© {new Date().getFullYear()} TradeNova. All rights reserved.</p>
              <CookieSettingsButton className="min-h-11 text-[11px] text-muted-foreground" />
            </div>
          </div>
        </div>
      </footer>
    );
}
