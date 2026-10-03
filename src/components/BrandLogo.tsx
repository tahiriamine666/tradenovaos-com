import logo from '@/assets/tradenova-robot.png.asset.json';

export default function BrandLogo({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  // The local Vite preview does not proxy CDN asset paths; the hosted preview does.
  const src = import.meta.env.DEV
    ? `https://id-preview--0ee4a120-abbf-401b-9623-1114b47e7fda.lovable.app${logo.url}`
    : logo.url;
  return <img src={src} alt={decorative ? '' : 'TradeNova'} aria-hidden={decorative || undefined} className={className} />;
}