import logo from '@/assets/tradenova-robot.png.asset.json';

export default function BrandLogo({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  return <img src={logo.url} alt={decorative ? '' : 'TradeNova'} aria-hidden={decorative || undefined} className={className} />;
}