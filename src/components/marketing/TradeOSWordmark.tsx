/** Public-site branding only. Keep the authenticated application's BrandLogo unchanged. */
export default function TradeOSWordmark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 text-white">
      <img
        src="/brand/tradeos-n.svg"
        alt=""
        aria-hidden="true"
        width={32}
        height={28}
        className="h-7 w-8 shrink-0 object-contain"
        draggable={false}
      />
      <span className="font-sans text-[22px] font-extrabold leading-none tracking-[-0.05em] sm:text-[24px]">
        TradeOS
      </span>
    </span>
  );
}
