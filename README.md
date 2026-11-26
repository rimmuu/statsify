# Statsify 3.0 — Personal Music Archive

Statsify is a private, cinematic music analytics application built with Next.js, React, TypeScript, Tailwind CSS, Motion, GSAP, and Three.js / React Three Fiber.

Your browser imports Spotify Extended Streaming History JSON exports directly into IndexedDB and computes all statistics locally—no account or API keys required. Optionally, you can connect your Spotify account via OAuth 2.0 with PKCE to sync recent plays and Spotify's own top lists & genre tags.

## What's New in Statsify 3.0

- **Nocturne Archive Visual Identity**: Refined dark-first palette (`#080808` obsidian canvas, `#18181B` secondary surface, `#F5F5F5` / `#999999` typography hierarchy, restrained `#FA334F` signature crimson accent) paired with self-hosted **Instrument Serif**, **Plus Jakarta Sans**, and **JetBrains Mono**.
- **Dynamic Ambient Lighting**: Dominant colors extracted from album artwork and artist portraits smoothly shift ambient lighting via GPU-composited CSS `@property` channels.
- **Cinematic Opening & 3D Vinyl Studio**: Lightweight, skippable opening experience (plays once for returning users, replayable from Settings, skipped automatically under `prefers-reduced-motion`) and an interactive **React Three Fiber 3D Vinyl** inside the Album Inspection Studio with automatic offscreen/hidden pause and CSS 3D fallback when WebGL is unavailable.
- **Distinct Editorial Compositions Per Page**:
  - **Home**: Editorial listening monograph with monumental total time, featured artwork + vinyl peek, hairlined stat ledger, asymmetric highlights, monthly rhythm, recent plays, and derived listening notes.
  - **Songs**: Searchable, sortable, paginated music archive with play-share hairline meters, rank deltas, and shared-element 3D artwork flights into Track Detail dossiers.
  - **Artists**: Magazine-inspired editorial portrait gallery (#1 cover spread, #2–#4 portrait trio, ranked index) backed by verified automatic portrait retrieval.
  - **Albums**: Interactive **3D Cover Flow** (touch swipe/flick momentum, keyboard arrows, horizontal trackpad, range scrubber) + Editorial Record Shelf + **3D Vinyl Inspection Studio**.
  - **Genres**: Typographic frequency study with editorial tonal spectrum bars (when Spotify is connected) and honest empty state otherwise.
  - **History**: Day-grouped chronological listening journal with track artwork, search, timestamps, and bounded pagination for 10,000+ plays.
  - **Insights**: 26-week daily listening calendar heatmap, 24-hour sonic rhythm, weekday cadence, streak metrics, and real data-derived listening observations.
  - **Compare**: Compare any two **Artists**, **Tracks**, or **Time Periods** side by side with opposing proportional deltas and comparative Recharts trend lines.
  - **Wrapped**: 7-scene interactive film powered by GSAP + Motion + 3D Vinyl with Pause/Play, Replay, touch swipe, keyboard navigation, and 1080×1920 Story export.
  - **Share Studio**: 5 museum-grade `<canvas>` poster templates (**Obsidian Editorial**, **Cinematic Artwork**, **Minimal Monochrome**, **Dynamic Album Colors**, **Signature Red**) exporting pixel-identical **1080×1920** (Instagram Story) and **1080×1080** (Instagram Post) PNGs. The **Classic templates** selector also exports the five original Statsify layouts.
- **Global Custom Date Ranges**: Filter any page by All Time, 1 Year, 6 Months, 1 Month, 1 Week, or Custom Date Range.
- **Mobile-First Engineering**: Designed for iPhone 16 Pro Max Safari with translucent safe-area-aware bottom navigation (`Home`, `Songs`, `Artists`, `Albums`, `More`), capability-gated hover states, `16px` touch inputs, `100dvh` layouts, and swipeable bottom sheets.
- **Bilingual Localization**: Full English and Bahasa Indonesia support persisted in `localStorage`.

## Run Locally

```bash
npm install
npm run dev     # http://localhost:3000
```

Open **Settings** and select your Spotify `Streaming_History_Audio_*.json` files (or basic `StreamingHistory*.json`). Everything stays in your browser's IndexedDB (`spotify-stats` v1—100% compatible with existing Statsify user data).

## Verification Commands

```bash
npm test            # strict-compiles framework-free lib modules and runs all tests/*.test.cjs
npm run typecheck   # tsc --noEmit across the entire Next.js app
npm run lint        # next lint
npm run build       # production Next.js build
```

## Deploy to Vercel

1. Push your branch to GitHub (`.gitignore` excludes local `.env*` files and Spotify exports).
2. Import the repository on Vercel (Next.js is auto-detected).
3. JSON import, 3D Vinyl, Cover Flow, Wrapped, Insights, Share Studio, and Apple Music links work with **zero environment variables**.
4. Optional Spotify OAuth requires the three environment variables listed in `.env.example` and detailed in **[docs/SPOTIFY_SETUP.md](docs/SPOTIFY_SETUP.md)**:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_REDIRECT_URI`
   - `SESSION_SECRET` (32+ random characters)

## Privacy & Security

- All listening history remains local inside browser IndexedDB.
- Optional Spotify OAuth uses Authorization Code with PKCE (no client secret); tokens stay server-side inside an AES-256-GCM encrypted `HttpOnly` cookie (`__Host-` + `Secure` in production) and never reach client JavaScript.
- External catalog/artwork lookups (`/api/apple`, `/api/artist-photo`) enforce same-origin `Sec-Fetch-Site` checks, strict input validation, and verified Apple Music storefront/catalog ID matching.
