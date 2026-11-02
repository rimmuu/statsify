# Statsify: private Spotify listening stats

Runs entirely in your browser. Your Spotify export is parsed locally and stored in IndexedDB; nothing is uploaded. No backend, database, API keys or OAuth. Every dependency is free.

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
2. On vercel.com (Hobby plan): Add New > Project > import the repo. Framework is auto-detected; no environment variables needed.

## How the numbers work
- Listening time is the sum of `ms_played`, never plays x song length.
- **Play event** = any imported row. **Stream** = 30 s or more played (Spotify's threshold). Both are shown.
- Podcast/audiobook rows are skipped. Re-imports are skipped by timestamp + track + `ms_played` + occurrence number, so genuinely identical events within one export are all kept.
- Time filters end at your newest imported play, because exports are snapshots.
- Artwork is not in the export. Tracks and albums fetch it from Spotify's keyless oEmbed endpoint. Artist photos come from Wikipedia's free API and are shown only when the page title equals the artist name and its description is music-related; otherwise (and on any failure) a letter tile is used. Lookups are cached in the browser and can be turned off in Settings.
- Genres are not in the export, so the Genres page says so instead of guessing.

## Not built yet
Genre enrichment (e.g. MusicBrainz tags cached in IndexedDB).

## Share card
The **Share** page draws a PNG card (Story 9:16 or Post 1:1; Dark, Purple, Neon, Minimal) from your own history: total time, plays, top artist, top album and top 5 tracks, ranked by listening time. Periods: week, month, year, all time, or a custom date range; presets end at your newest imported play. Download works everywhere; Share uses the Web Share API when the browser can share files and otherwise saves the PNG. Artwork is drawn only if the image host allows it; otherwise letter tiles are used.

## Language and motion
**Settings > Language** switches the whole interface between English and Bahasa Indonesia. The choice is saved in this browser (localStorage); numbers, dates and durations follow the language. Artist, track and album names and your imported data are never translated. All text lives in one table in `lib/i18n.tsx`, English and Indonesian side by side. Animations are CSS transitions (plus a small count-up) and are turned off when the system asks for reduced motion.

## Wrapped story
`/wrapped` is a full-screen, seven-slide story built from your own plays: intro (pick all time or a year), listening stats, top artist, top tracks, top albums, music taste, and a recap. Navigate with the on-screen buttons, the progress bar, taps, swipes, or the ← → keys; Esc leaves. Rankings use listening time. Genres are not in Spotify's export, so "taste" shows when you listen (hour of day, favourite weekday, longest streak, top-artist share) instead of invented genres. **Share My Story** uses the Web Share API with a PNG made on your device; where that is unavailable you get Download image and Copy link. The link only opens Statsify and contains none of your data.
