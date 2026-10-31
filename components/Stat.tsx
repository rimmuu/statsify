export default function Stat({ l, v, s }: { l: string; v: string | number; s?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{l}</div>
      <div className="mt-2 truncate text-2xl font-semibold">{v}</div>
      {s && <div className="mt-1 truncate text-sm text-neutral-400">{s}</div>}
    </div>
  )
}
