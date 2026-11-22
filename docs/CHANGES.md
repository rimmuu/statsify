# What changed in the Premium upgrade

Base: the version that already had the Spotify and Apple Music listening links. **Nothing was removed** (0 files deleted) and `lib/import.ts`, the manual import, is byte-identical to before. No new npm dependency was added.

## New files (28)
| File | Purpose |
|---|---|
| `app/api/spotify/login/route.ts` | Starts the login: `state` and PKCE verifier in a sealed 10-minute cookie, redirect to Spotify |
| `app/api/spotify/callback/route.ts` | Validates `state`, trades the code for tokens, stores them in the sealed session cookie |
| `app/api/spotify/status/route.ts` | Connection status from the cookie (no Spotify call, no tokens in the answer) |
| `app/api/spotify/data/route.ts` | Whitelisted proxy for top tracks, top artists and recent plays; refreshes tokens and writes the rotated one back |
| `app/api/spotify/logout/route.ts` | Disconnect (same-origin POST), clears both cookies |
| `lib/server/session.ts` | PKCE helpers, AES-256-GCM cookie sealing, cookie flags |
| `lib/server/spotify.ts` | Spotify HTTP client, error classification, response reducers |
| `lib/server/flows.ts` | The login, refresh and data flows as plain testable functions |
| `lib/spotify/types.ts` | Types shared by server and browser |
| `lib/spotify/client.ts` | Browser client for the app's own `/api/spotify` routes |
| `lib/spotify/merge.ts` | API plays to records, duplicate detection against imported history |
| `lib/spotify/sync.ts` | One sync run (7 steps), partial-failure handling, clean-up after an import |
| `lib/spotify/store.ts` | Sync bookkeeping and top lists in localStorage, validated on read |
| `lib/spotify/provider.tsx` | React context: status, sync, progress, errors, auto-sync, disconnect |
| `lib/spotify/genres.ts` | Genre shares from Spotify's top artists |
| `lib/apiArt.ts` | Remembers artwork URLs that arrived with API responses |
| `components/SpotifyAccount.tsx` | Settings card: connect, status, sync, progress, errors, auto-sync switch |
| `components/SpotifyTop.tsx` | Overview card with Spotify's own top tracks and artists |
| `components/RangeTabs.tsx` | Segmented control for 4 weeks / 6 months / about 1 year |
| `components/Dialog.tsx` | Animated confirmation dialog (replaces `window.confirm`) |
| `scripts/run-tests.mjs` | `npm test` runner |
| `tests/server.test.cjs`, `tests/sync.test.cjs`, `tests/links.test.cjs` | Test batteries (see `docs/TESTING.md`) |
| `docs/SPOTIFY_SETUP.md`, `docs/TESTING.md`, `docs/CHANGES.md` | Setup guide, testing notes, this file |
| `.env.example` | The three environment variables |

## Modified files (20)
| File | Change |
|---|---|
| `.gitignore` | `!.env.example`, so the template is committed while real `.env*` files stay ignored |
| `README.md` | New "Connect Spotify" and "Tests" sections; the "no backend / OAuth" claims were corrected; new motion pieces listed |
| `app/page.tsx` | Spotify's own top lists card, favourite genre from the API, scroll reveal for the chart |
| `app/genres/page.tsx` | Real genres from Spotify's top artists (animated bars, period switch); the original explanation stays when not connected |
| `app/insights/page.tsx` | Charts reveal on scroll |
| `app/settings/page.tsx` | Spotify account card, animated switches, "Your data" card (imported vs synced), animated confirm dialog, API duplicates reconciled after an import |
| `app/globals.css` | Skeleton shimmer |
| `components/Shell.tsx` | `SpotifyProvider`; skeleton while the history loads |
| `components/Motion.tsx` | `Skeleton`, `PageSkeleton`, `Reveal`, `Tilt`, `ScrollParallax`, `Switch` |
| `components/Chart.tsx` | Bars animate (off under reduced motion) |
| `components/TopList.tsx` | 3D tilt on album cards; exact Spotify link for artists known from the API |
| `components/Detail.tsx` | Parallax artist artwork, exact artist link, chart reveal |
| `components/Art.tsx` | Uses artwork from API responses before oEmbed |
| `lib/stats.ts` | `Rec` gains an optional `src: 'api'` (no `src` = imported) |
| `lib/db.ts` | `removeMany`; same database, version and store |
| `lib/artistPhoto.ts` | `seedArtistPhotos`: API artist photos fill gaps and replace "not found" |
| `lib/listen.ts` | Exact Spotify artist and album links when a URI of the right type is known |
| `lib/motion.ts` | `tiltSpring` token |
| `lib/i18n.tsx` | 61 new keys, each in English and Bahasa Indonesia |
| `package.json` | `typecheck` and `test` scripts only |

## Not changed on purpose
Wrapped, Share, Compare, History and Tracks keep their existing animations (they already had staggered entries, shared-layout transitions, count-ups, spring interactions and reduced-motion handling) and the new loading skeleton and chart animation reach them through the shared pieces. History's search deliberately does not re-animate on every keystroke (a note in the code explains why).
