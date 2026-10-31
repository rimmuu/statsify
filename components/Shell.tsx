'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Provider, useData } from '@/lib/store'
import { PERIODS } from '@/lib/stats'

const NAV = [['/', 'Overview'], ['/tracks', 'Tracks'], ['/artists', 'Artists'], ['/albums', 'Albums'], ['/genres', 'Genres'], ['/history', 'History'], ['/insights', 'Insights'], ['/compare', 'Compare'], ['/settings', 'Settings']]

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all, period, setPeriod } = useData()
  const links = NAV.map(([h, l]) => (
    <Link key={h} href={h} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${path === h ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}>{l}</Link>
  ))
  const show = path === '/settings' || (ready && all.length > 0)
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-white/5 p-4 md:block">
        <div className="mb-6 px-3 text-lg font-semibold text-spotify">● Statsify</div>
        <nav className="flex flex-col gap-1">{links}</nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-black/80 backdrop-blur">
          <nav className="flex gap-1 overflow-x-auto p-2 md:hidden">{links}</nav>
          <div className="flex gap-2 overflow-x-auto p-2 md:px-8">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${period === p.k ? 'bg-spotify text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>{p.l}</button>
            ))}
          </div>
        </header>
        <main className="p-4 md:p-8">
          {show ? children : ready ? (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h1 className="text-2xl font-semibold">No listening history yet</h1>
              <p className="mt-2 text-neutral-400">Import your Spotify Extended Streaming History to see your stats. Everything stays in your browser.</p>
              <Link href="/settings" className="mt-6 inline-block rounded-full bg-spotify px-5 py-2.5 font-medium text-black">Import data</Link>
            </div>
          ) : <p className="text-neutral-500">Loading…</p>}
        </main>
      </div>
    </div>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  return <Provider><Inner>{children}</Inner></Provider>
}
