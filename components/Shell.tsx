'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/tracks', label: 'Tracks' },
  { href: '/artists', label: 'Artists' },
  { href: '/albums', label: 'Albums' },
  { href: '/genres', label: 'Genres' },
  { href: '/history', label: 'History' },
  { href: '/insights', label: 'Insights' },
  { href: '/compare', label: 'Compare' },
  { href: '/settings', label: 'Settings' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        {/* Slim top branding row */}
        <div className="px-4 py-2 border-b border-zinc-800/60 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
          <span className="text-emerald-500">●</span> Statsify by Rimmuu
        </div>
        {/* Navigation scrollable row */}
        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2 text-xs no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors font-medium ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 p-6 shrink-0 sticky top-0 h-screen">
          <div className="text-sm font-semibold text-emerald-400 mb-8 flex items-center gap-2">
            <span className="text-emerald-500">●</span> Statsify by Rimmuu
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors font-medium flex items-center ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col min-w-0">
          <div className="flex-1">{children}</div>

          {/* Footer Credit */}
          <footer className="mt-12 pt-6 border-t border-zinc-800/60 text-xs text-zinc-500 text-center md:text-left">
            ©️ Statsify by Rimmuu
          </footer>
        </main>
      </div>
    </div>
  );
}
