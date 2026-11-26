export default function VinylFallback({
  artworkUrl,
  accentRgb = '250 51 79',
  spinning = true,
  className = '',
}: {
  artworkUrl?: string
  accentRgb?: string
  spinning?: boolean
  className?: string
}) {
  return (
    <div
      className={`relative grid aspect-square place-items-center ${className}`}
      data-vinyl-mode="css-fallback"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-full opacity-45 blur-2xl"
        style={{ background: `radial-gradient(circle, rgb(${accentRgb} / 0.55), transparent 68%)` }}
      />
      <div className={`vinyl-disc-css relative h-full w-full ${spinning ? 'vinyl-spinning' : ''}`}>
        <div
          className="absolute inset-[31%] overflow-hidden rounded-full border border-white/15 bg-[#FA334F]"
          style={{ boxShadow: 'inset 0 0 18px rgba(0,0,0,0.45)' }}
        >
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-between py-3 text-[8px] font-mono uppercase tracking-[0.2em] text-white/85">
              <span>Statsify</span>
              <span>33⅓</span>
            </div>
          )}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-[#080808]"
          />
        </div>
      </div>
    </div>
  )
}
