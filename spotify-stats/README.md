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
- Artwork is not in the export. Tracks and albums fetch it from Spotify's keyless oEmbed endpoint and fall back to a letter tile; artists always use a letter tile.
- Genres are not in the export, so the Genres page says so instead of guessing.

## Not built yet
Genre enrichment (e.g. MusicBrainz tags cached in IndexedDB) and artist photos. This code has not been through `npm run build` or browser testing yet.
