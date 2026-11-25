# Connecting Spotify: setup guide

Everything here is optional. Without it Statsify works exactly as before (import your JSON export). With it you can sync your latest plays and Spotify's own top artists and tracks.

## What you need
- A Spotify account with **Premium**. Since February 2026 the owner of a Spotify app in *Development mode* must have Premium ([Spotify's announcement](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)).
- Your Statsify deployed on Vercel (or running locally, see below).

## 1. Create the Spotify app
1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. **Create app**. Name and description can be anything (for example "Statsify").
3. **Redirect URIs**: add the URL where Statsify receives the login result:
   - Production: `https://YOUR-APP.vercel.app/api/spotify/callback`
   - Local development (optional): `http://127.0.0.1:3000/api/spotify/callback`

   Spotify's rules ([Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)): it must be **https**, except loopback addresses; `http://localhost` is **not** accepted, use `http://127.0.0.1`. The match is exact, so the text you register must be character for character what you put in `SPOTIFY_REDIRECT_URI`.
4. Under *Which API/SDKs are you planning to use?* tick **Web API**, accept the terms, **Save**.
5. Open **Settings** of the app and copy the **Client ID**. You do not need the client secret and Statsify never asks for it.

## 2. Allow your account
In the app's dashboard open **User Management** (Users and Access) and add the name and email address of every Spotify account that will log in, including your own. Development mode allows **at most 5** users. An account that is not listed gets a Spotify error when connecting, and Statsify shows "This Spotify account isn't allowed for this app".

## 3. Environment variables
| Name | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` | the Client ID from step 1 |
| `SPOTIFY_REDIRECT_URI` | the exact Redirect URI from step 1 |
| `SESSION_SECRET` | 32 or more random characters (any long random string, for example from a password manager; or `openssl rand -base64 32`) |

**Vercel:** Project > Settings > Environment Variables > add the three for *Production* > **redeploy** (variables are read at build and start time, so an old deployment does not see them). Preview deployments get a different URL each time and would need that URL registered too, so connect on the production domain.

**Local:** copy `.env.example` to `.env.local`, fill it in, run `npm run dev` and open **`http://127.0.0.1:3000`** (not `localhost`: the login cookie belongs to the address you opened).

## 4. Connect
Open **Settings > Spotify account > Connect Spotify**. Spotify shows what Statsify asks for and nothing else:
- `user-top-read`: your top artists and tracks;
- `user-read-recently-played`: your last 50 plays.

You are sent back to Settings, the card shows **Connected**, and the first sync runs by itself (turn this off with *Sync automatically*). **Sync now** runs it any time.

## What gets synced, and the limits
| | |
|---|---|
| Recent plays | The API returns only your **last 50 plays** and no listening time. They are saved as plays marked `src: "api"` with the track length as listening time. Sync regularly so nothing falls out of the 50. |
| Top tracks / artists | Spotify's own ranking for ~4 weeks, ~6 months and ~1 year. Ranks only, no play counts or minutes. Artists also carry Spotify's genre tags, which feed the Genres page. |
| Your export | Stays the complete, exact source. Both work together; duplicates are detected and an import is never overwritten. |

## Where things are stored
| What | Where |
|---|---|
| Spotify access and refresh tokens | an encrypted `HttpOnly` cookie, readable only by the server |
| Plays (imported and synced) | IndexedDB in your browser, same store as before |
| Top lists, last-sync info, artwork URLs | localStorage in your browser (derived data) |
| Anything on the server | nothing |

## Troubleshooting
Settings shows whether sign-in is unavailable, sign-in did not finish, or a sync failed. The table lists possible causes.

| Situation | Cause and fix |
|---|---|
| “Coming soon, maybe 😭✌️” | A variable is missing or `SESSION_SECRET` is shorter than 32 characters. Fix it and redeploy. |
| Spotify page says *INVALID_CLIENT: Invalid redirect URI* | `SPOTIFY_REDIRECT_URI` and the dashboard differ (https, host, path, a trailing slash). |
| "This Spotify account isn't allowed for this app" | Add the account under User Management; the app owner also needs Premium. |
| "The login couldn't be verified" / "took too long" | Cookies are blocked, the login was started in another browser, or it took more than 10 minutes. Try again in one browser. |
| "Reconnect needed" | Spotify no longer accepts the saved authorization (revoked, or two tabs refreshed at once). Press **Reconnect Spotify**. |
| "Spotify asked us to slow down" | Rate limit. Wait the shown seconds and press **Try again**. |
| "quota" message | The app used its Spotify quota ([July 2026 change](https://developer.spotify.com/documentation/web-api/references/changes/july-2026)). Try again later. |
| Everyone is signed out after a deploy | `SESSION_SECRET` changed. Sessions sealed with the old secret are rejected; connect again. |

To remove access completely: Settings > **Disconnect**, then remove Statsify at [spotify.com/account/apps](https://www.spotify.com/account/apps). Spotify has no token-revocation endpoint for apps, so that page is the real off switch.

## How the login works (for the curious)
1. `/api/spotify/login` makes a random `state` and a PKCE code verifier, seals both in a 10-minute cookie, and sends you to Spotify with only the verifier's SHA-256 challenge ([Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)).
2. Spotify returns to `/api/spotify/callback?code&state`. The server checks `state`, trades the code and the verifier for tokens, and seals them in the session cookie. You land on `/settings` with only a status word in the URL.
3. `/api/spotify/data` reads the token from the cookie, refreshes it when it is about to expire (the refresh token is replaced on every use, so the new one is always written back), calls one of three whitelisted Spotify endpoints, and returns reduced results. The browser never sees a token.
