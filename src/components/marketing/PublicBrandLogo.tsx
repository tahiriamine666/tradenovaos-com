import logoN from '@/assets/tradeos-n-logo.png';

export default function BrandLogo({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src={logoN}
      alt={decorative ? '' : 'TradeOS logo'}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={`inline-block shrink-0 rounded-md bg-background object-contain ${className}`}
    />
  );
}
