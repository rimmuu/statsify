export default function Genres() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Genres</h1>
      <div className="card mt-6 space-y-3 text-neutral-300">
        <p className="font-medium text-white">Genre data isn’t available.</p>
        <p>Spotify’s Extended Streaming History has no genre field, and artist genres are only served through Spotify’s authenticated API. Statsify won’t guess or invent genres, so this page stays empty until a genre source is connected.</p>
        <p className="text-sm text-neutral-500">A free option would be MusicBrainz artist tags, cached in IndexedDB.</p>
      </div>
    </div>
  )
}
