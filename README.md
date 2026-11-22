# Statsify: private Spotify listening stats

Your Spotify export is parsed in your browser and stored in IndexedDB there; nothing is uploaded. That path needs no backend, database, API keys or login. Optionally you can also connect your Spotify account (OAuth 2.0 with PKCE) to sync your latest plays and Spotify's own top lists; that part needs a free Spotify app and three environment variables, see [Connect Spotify](#connect-spotify-optional). Every dependency is free.

## Get your data
Spotify > Account > Privacy settings > Download your data > tick **Extended streaming history** (it can take days to arrive). Unzip it and keep the `Streaming_History_Audio_*.json` files. The basic `StreamingHistory*.json` from Account Data also imports (no album names).

## Run locally
```
npm install
npm run dev     # http://localhost:3000
```
Open **Settings** and select all the JSON files at once. Re-importing is safe: duplicates are skipped.

## Deploy for free
1. Push this folder to a GitHub repo (`.gitignore` already excludes Spotify exports).
2. On vercel.com (Hobby plan): Add New > Project > import the repo. Framework is auto-detected. The JSON import needs no environment variables; the optional Spotify connection needs the three listed under [Connect Spotify](#connect-spotify-optional).

## How the numbers work
- Listening time is the sum of `ms_played`, never plays x song length.
- **Play event** = any imported row. **Stream** = 30 s or more played (Spotify's threshold). Both are shown.
- Podcast/audiobook rows are skipped. Re-imports are skipped by timestamp + track + `ms_played` + occurrence number, so genuinely identical events within one export are all kept.
- Time filters end at your newest imported play, because exports are snapshots.
- Artwork is not in the export. Tracks and albums fetch it from Spotify's keyless oEmbed endpoint. Artist photos come from Wikipedia's free API and are shown only when the page title equals the artist name and its description is music-related; otherwise (and on any failure) a letter tile is used. Lookups are cached in the browser and can be turned off in Settings. When Spotify is connected, artwork and artist photos that arrive with the API responses (top lists, recent plays) are used first.
- Genres are not in the export. The Genres page shows genres only when Spotify is connected (Spotify's tags on your top artists, as a share of those artists, not weighted by listening time); otherwise it says so instead of guessing.

## Connect Spotify (optional)
**Settings > Spotify account > Connect Spotify** signs you in with Spotify and then syncs two things:
- your **last 50 plays** (`/me/player/recently-played`), merged into your history;
- Spotify's own **top tracks and top artists** for 4 weeks, 6 months and about a year (`/me/top/{type}`). They appear on the Overview, feed the Genres page and give exact Spotify links for those artists.

What the Spotify API cannot do, so the app does not pretend to: it has no full listening history (only the last 50 plays, so sync regularly), it does not say how long a play lasted (synced plays count the track length and are stored with `src: "api"`), and the top lists carry ranks, not play counts. **The JSON export stays the complete and exact source**; the two work together.

- **Duplicates.** An API play is skipped when it is already stored (same id) or when an imported play of the same track covers its timestamp (give or take 90 s). Importing an export later removes the API plays it now covers. A sync never overwrites or deletes anything that was imported.
- **Everything else keeps working:** the import, your IndexedDB data, Wrapped, share cards, the Spotify and Apple Music listening links and the English / Bahasa Indonesia interface.

Setup is free and takes about five minutes: **[docs/SPOTIFY_SETUP.md](docs/SPOTIFY_SETUP.md)**. Since February 2026 Spotify apps run in *Development mode*: the app owner needs Spotify Premium and at most 5 accounts can be authorised.

| Environment variable | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` | Client ID of your Spotify app (not a secret) |
| `SPOTIFY_REDIRECT_URI` | Exactly the Redirect URI registered in the dashboard, e.g. `https://your-app.vercel.app/api/spotify/callback` |
| `SESSION_SECRET` | 32+ random characters; they encrypt the session cookie |

Without them Spotify login stays off and the rest of the app works as before. `.env.example` lists them.

**Security.** There is no client secret anywhere: the login uses Authorization Code with PKCE. Tokens never reach the browser's JavaScript; they live in an AES-256-GCM encrypted, `HttpOnly`, `SameSite=Lax` cookie (`Secure` and `__Host-` prefixed in production). `state` and the PKCE verifier are checked on the callback, the callback redirect never carries a code or token, the data route can only reach three whitelisted Spotify endpoints, and nothing is stored on the server. Scopes requested: `user-top-read`, `user-read-recently-played`, and `user-read-private` (required by Spotify for the connected-account profile endpoint). No email scope is requested. Disconnect forgets the session on this device; to revoke access completely, remove Statsify at spotify.com/account/apps.

## Tests
`npm test` compiles the framework-free modules under strict TypeScript and runs the checks against fake Spotify and iTunes servers (the RFC 7636 PKCE test vector, state validation, token refresh and rotation, error handling, duplicate detection, import regression). `npm run typecheck` is a plain `tsc --noEmit`. [docs/TESTING.md](docs/TESTING.md) says what is and is not covered.

## Not built yet
Genre enrichment (e.g. MusicBrainz tags cached in IndexedDB).

## Share card
The **Share** page draws a PNG card (Story 9:16 or Post 1:1; Dark, Purple, Neon, Minimal) from your own history: total time, plays, top artist, top album and top 5 tracks, ranked by listening time. Periods: week, month, year, all time, or a custom date range; presets end at your newest imported play. Download works everywhere; Share uses the Web Share API when the browser can share files and otherwise saves the PNG. Artwork is drawn only if the image host allows it; otherwise letter tiles are used.

## Language and motion
**Settings > Language** switches the whole interface between English and Bahasa Indonesia. The choice is saved in this browser (localStorage); numbers, dates and durations follow the language. Artist, track and album names and your imported data are never translated. All text lives in one table in `lib/i18n.tsx`, English and Indonesian side by side. Animations are CSS transitions (plus a small count-up) and are turned off when the system asks for reduced motion.

## Wrapped story
`/wrapped` is a full-screen, seven-slide story built from your own plays: intro (pick all time or a year), listening stats, top artist, top tracks, top albums, music taste, and a recap. Navigate with the on-screen buttons, the progress bar, taps, swipes, or the ← → keys; Esc leaves. Rankings use listening time. Genres are not in Spotify's export, so "taste" shows when you listen (hour of day, favourite weekday, longest streak, top-artist share) instead of invented genres. **Share My Story** uses the Web Share API with a PNG made on your device; where that is unavailable you get Download image and Copy link. The link only opens Statsify and contains none of your data.

## Motion system (Framer Motion)
All movement goes through `framer-motion` (`npm install` adds it), with one set of rules in `lib/motion.ts` and reusable pieces in `components/Motion.tsx`: `MotionRoot` (honours the OS reduce-motion setting for the whole app), `PageTransition`, `FadeIn`, `StaggerContainer`/`StaggerItem`, `AnimatedCard`, `AnimatedButton` and `ListItem`. Levels: micro (hover/tap, ~0.16 s), enter (cards and sections, ~0.4 s), page (route change, ~0.28 s) and cinematic (Wrapped only). CSS keeps only colour/shadow transitions, the artwork-colour glow and the loading spinner, so nothing is animated twice. Long lists never animate row by row (first rows stagger, the rest appear). Share-card canvases are never animated, so exports can't capture a half-finished transition. Added with the Spotify upgrade, in the same two files: `Skeleton` / `PageSkeleton` (loading shimmer), `Reveal` (scroll-triggered reveal), `Tilt` (3D tilt on album cards, only for fine pointers), `ScrollParallax` (artist artwork), `Switch` (animated toggle) and `ConfirmDialog` in `components/Dialog.tsx` (animated modal). They animate only transform and opacity and respect `prefers-reduced-motion`.
