# Testing

## Commands
```
npm test            # strict-compiles the framework-free modules, then runs tests/*.test.cjs against fake Spotify and iTunes servers
npm run typecheck   # tsc --noEmit over the whole project
npm run build       # next build (also type-checks)
```
`npm test` needs no network, browser, Spotify account or credentials.

## What `npm test` covers
- **PKCE and cookies:** the RFC 7636 appendix B test vector; verifier length and alphabet; AES-256-GCM round trip; rejection of tampered, expired, wrong-secret and junk cookies; cookie flags (`HttpOnly`, `SameSite=Lax`, `__Host-` and `Secure` in production).
- **OAuth flow (fake Spotify):** authorize URL (S256, required scopes including `user-read-private` for `GET /me`, no client secret); state mismatch refused without any network call; expired or missing login cookie; denied consent; failed code exchange logged without the code, verifier or tokens; the redirect never contains a code or token; an account that is not allowed (403) is refused with a clear reason.
- **Token refresh:** an expiring token is refreshed and the rotated refresh token is stored (also when Spotify then answers 429); a revoked grant becomes "reauthorize"; outages become "upstream"; a tampered cookie is "unauthorized".
- **Spotify errors:** 401, 403, 429 with `Retry-After` (and the cap), 429 `QUOTA_EXCEEDED`, 5xx, 404, network failure, invalid JSON.
- **Data proxy:** exact Spotify URLs, whitelist of kinds, ranges and cursors, reduced output (local files, episodes and nameless rows dropped), the token only in the `Authorization` header.
- **Hybrid data:** API plays become `src: "api"` records; syncing twice adds nothing; an imported play covers an API play whether `played_at` marks its start or its end (±90 s); imports are never modified; API plays that a later import covers are removed.
- **Import regression:** `lib/import.ts` is unchanged; Extended and basic exports parse to the same ids, occurrence numbers and counts as before; re-imports (including ids from older versions) are skipped; imported and API plays group together.
- **Sync orchestration:** step order, partial failure keeps what arrived, retry completes the lists, damaged localStorage entries are ignored, artwork map cap, exact artist links only on an exact name match.
- **Listening links:** Spotify URLs, Apple Music matching (karaoke, tribute and live copies rejected; accents, "&", non-Latin titles), cache, rate-limit spacing and error handling.

## What was not run when this was produced
Be aware of these before relying on it:
- `next build` and ESLint (ESLint is not configured in this project; the build ignores lint errors by design).
- Real calls to Spotify or iTunes, and the real OAuth round trip. The flow is tested against a fake Spotify that follows the documented behaviour; the first real login is the final check.
- IndexedDB in a real browser. No schema change was made (same database and `plays` store; records only gain an optional `src` field), and the sync logic is tested against an in-memory fake of the same operations.
- Visual and touch checks on iPhone and desktop, and the animations.
- Compilation against the real React, Next and Framer Motion type packages. The whole project was type-checked with permissive stubs for those three; the server modules were checked strictly against the real `@types/node`.

## Manual check (about 5 minutes, on your phone)
1. Settings shows **Spotify account > Not connected** and a **Connect Spotify** button (if it says "isn't set up", fix the environment variables).
2. Connect: Spotify consent screen > back on Settings with a "Spotify connected" message and the card showing **Connected** and your name.
3. **Sync now**: the progress bar moves through 7 steps; the result line reports new plays. Overview shows "Spotify's own top lists".
4. Sync again straight away: 0 new plays, the same number reported as already in your history.
5. Import a JSON export that overlaps: the counts of imported records stay as before; Settings > Your data shows imported and synced counts separately.
6. **Disconnect** (confirm), then reload: Not connected. Your plays are still there.
7. Switch language: all of the above is translated.
