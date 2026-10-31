'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'id'
const KEY = 'statsify.lang'

// One table, English and Indonesian side by side. A key missing in either language is a compile error.
const d = <T extends Record<string, readonly [string, string]>>(x: T): T => x
const T = d({
  'nav.overview': ['Overview', 'Ringkasan'],
  'nav.tracks': ['Tracks', 'Lagu'],
  'nav.artists': ['Artists', 'Artis'],
  'nav.albums': ['Albums', 'Album'],
  'nav.genres': ['Genres', 'Genre'],
  'nav.history': ['History', 'Riwayat'],
  'nav.insights': ['Insights', 'Wawasan'],
  'nav.compare': ['Compare', 'Perbandingan'],
  'nav.share': ['Share', 'Bagikan'],
  'nav.settings': ['Settings', 'Pengaturan'],
  'nav.label': ['Main navigation', 'Navigasi utama'],
  'per.label': ['Time period', 'Periode waktu'],
  'per.all': ['All time', 'Sepanjang waktu'],
  'per.1y': ['1 year', '1 tahun'],
  'per.6m': ['6 months', '6 bulan'],
  'per.1m': ['1 month', '1 bulan'],
  'per.1w': ['1 week', '1 minggu'],
  'foot': ['Designed & built by', 'Dirancang & dibuat oleh'],
  'e.title': ['No listening history yet', 'Belum ada riwayat mendengarkan'],
  'e.body': ['Import your Spotify Extended Streaming History to see your stats. Everything stays in your browser.', 'Impor Riwayat Streaming Lengkap Spotify untuk melihat statistikmu. Semuanya tetap di browser kamu.'],
  'e.cta': ['Import data', 'Impor data'],
  'common.loading': ['Loading…', 'Memuat…'],
  'u.d': ['d', 'hr'],
  'u.h': ['h', 'j'],
  'u.m': ['m', 'mnt'],
  'u.s': ['s', 'dtk'],
  'u.min': ['min', 'mnt'],
  'u.lt1': ['<1 min', '<1 mnt'],
  'n.plays': ['{n} play|{n} plays', '{n} pemutaran|{n} pemutaran'],
  'n.streams': ['{n} stream|{n} streams', '{n} stream|{n} stream'],
  'n.tracks': ['{n} track|{n} tracks', '{n} lagu|{n} lagu'],
  'n.days': ['{n} day|{n} days', '{n} hari|{n} hari'],
  'n.minutes': ['{n} minute|{n} minutes', '{n} menit|{n} menit'],
  'n.files': ['{n} file|{n} files', '{n} file|{n} file'],
  's.events': ['Play events', 'Total pemutaran'],
  's.streams': ['Streams (30 s+)', 'Stream (30 dtk+)'],
  's.streamsSub': ['{n} stream (30 s+)|{n} streams (30 s+)', '{n} stream (30 dtk+)|{n} stream (30 dtk+)'],
  's.uTracks': ['Unique tracks', 'Lagu unik'],
  's.uArtists': ['Unique artists', 'Artis unik'],
  's.uAlbums': ['Unique albums', 'Album unik'],
  's.topTrack': ['Top track', 'Lagu teratas'],
  's.topArtist': ['Top artist', 'Artis teratas'],
  's.topAlbum': ['Top album', 'Album teratas'],
  's.favGenre': ['Favorite genre', 'Genre favorit'],
  's.unavailable': ['Unavailable', 'Tidak tersedia'],
  's.notInExport': ['Not in Spotify’s export', 'Tidak ada di ekspor Spotify'],
  'ov.total': ['Total listening time', 'Total waktu mendengarkan'],
  'ov.perMonth': ['Hours listened per month', 'Jam mendengarkan per bulan'],
  'tl.title.track': ['Top tracks', 'Lagu teratas'],
  'tl.title.artist': ['Top artists', 'Artis teratas'],
  'tl.title.album': ['Top albums', 'Album teratas'],
  'tl.help': ['Plays = every play event. Streams = plays of 30 s or more. Time is summed from actual ms_played.', 'Pemutaran = setiap event putar. Stream = pemutaran 30 dtk atau lebih. Waktu dijumlahkan dari ms_played yang sebenarnya.'],
  'tl.sort': ['Sort by', 'Urutkan'],
  'tl.limit': ['How many to show', 'Jumlah ditampilkan'],
  'sort.plays': ['Most played', 'Paling sering diputar'],
  'sort.ms': ['Most listening time', 'Waktu dengar terlama'],
  'sort.last': ['Recently played', 'Baru diputar'],
  'opt.top': ['Top {n}', '{n} teratas'],
  'opt.all': ['All', 'Semua'],
  'd.back.track': ['← Top tracks', '← Lagu teratas'],
  'd.back.artist': ['← Top artists', '← Artis teratas'],
  'd.nf': ['Nothing found.', 'Tidak ditemukan.'],
  'd.nfBack.track': ['Back to tracks', 'Kembali ke lagu'],
  'd.nfBack.artist': ['Back to artists', 'Kembali ke artis'],
  'd.listen': ['Listening time', 'Waktu mendengarkan'],
  'd.first': ['First played', 'Pertama diputar'],
  'd.last': ['Last played', 'Terakhir diputar'],
  'd.allTime': ['all time', 'sepanjang waktu'],
  'd.topTracks': ['Most-played tracks', 'Lagu paling sering diputar'],
  'd.topAlbums': ['Most-listened albums', 'Album paling sering didengar'],
  'd.recent': ['Listening history (latest 50)', 'Riwayat mendengarkan (50 terbaru)'],
  'cmp.title': ['Compare', 'Perbandingan'],
  'cmp.artists': ['Artists', 'Artis'],
  'cmp.tracks': ['Tracks', 'Lagu'],
  'cmp.need.artist': ['You need at least two artists in the selected period to compare.', 'Kamu memerlukan minimal dua artis pada periode terpilih untuk membandingkan.'],
  'cmp.need.track': ['You need at least two tracks in the selected period to compare.', 'Kamu memerlukan minimal dua lagu pada periode terpilih untuk membandingkan.'],
  'h.title': ['Listening history', 'Riwayat mendengarkan'],
  'h.search': ['Search tracks, artists, albums', 'Cari lagu, artis, album'],
  'h.count': ['{n} play, newest first|{n} plays, newest first', '{n} pemutaran, terbaru dulu|{n} pemutaran, terbaru dulu'],
  'h.more': ['Show more', 'Tampilkan lebih banyak'],
  'i.title': ['Insights', 'Wawasan'],
  'i.hour': ['Most active hour', 'Jam paling aktif'],
  'i.hourSub': ['your local time', 'waktu lokal kamu'],
  'i.day': ['Most active day', 'Hari paling aktif'],
  'i.streak': ['Longest streak', 'Rentetan terpanjang'],
  'i.streakSub': ['consecutive days with plays', 'hari berturut-turut dengan pemutaran'],
  'i.active': ['Active days', 'Hari aktif'],
  'i.byHour': ['Hours listened by hour of day', 'Jam mendengarkan menurut jam'],
  'i.byWeek': ['Hours listened by weekday', 'Jam mendengarkan menurut hari'],
  'wd.0': ['Sun', 'Min'],
  'wd.1': ['Mon', 'Sen'],
  'wd.2': ['Tue', 'Sel'],
  'wd.3': ['Wed', 'Rab'],
  'wd.4': ['Thu', 'Kam'],
  'wd.5': ['Fri', 'Jum'],
  'wd.6': ['Sat', 'Sab'],
  'g.title': ['Genres', 'Genre'],
  'g.head': ['Genre data isn’t available.', 'Data genre tidak tersedia.'],
  'g.body': ['Spotify’s Extended Streaming History has no genre field, and artist genres are only served through Spotify’s authenticated API. Statsify won’t guess or invent genres, so this page stays empty until a genre source is connected.', 'Riwayat Streaming Lengkap Spotify tidak memiliki kolom genre, dan genre artis hanya tersedia lewat API Spotify yang memerlukan login. Statsify tidak menebak atau mengarang genre, jadi halaman ini tetap kosong sampai sumber genre terhubung.'],
  'g.foot': ['A free option would be MusicBrainz artist tags, cached in IndexedDB.', 'Salah satu opsi gratis adalah tag artis dari MusicBrainz yang disimpan di IndexedDB.'],
  'set.title': ['Import & data', 'Impor & data'],
  'set.lang': ['Language', 'Bahasa'],
  'set.langHelp': ['Applies immediately and is remembered on this device.', 'Berlaku langsung dan diingat di perangkat ini.'],
  'set.pick': ['Choose Spotify JSON files', 'Pilih file JSON Spotify'],
  'set.importing': ['Importing…', 'Mengimpor…'],
  'set.help1': ['Select every', 'Pilih semua file'],
  'set.help2': ['file at once. Files never leave your browser. Re-importing is safe: duplicates are skipped.', 'sekaligus. File tidak pernah meninggalkan browser kamu. Mengimpor ulang aman: duplikat dilewati.'],
  'set.reading': ['Reading {name} ({i}/{n})', 'Membaca {name} ({i}/{n})'],
  'set.done': ['Done', 'Selesai'],
  'set.failed': ['Import failed: {e}', 'Impor gagal: {e}'],
  'set.added': ['new plays imported from {files}.', 'pemutaran baru diimpor dari {files}.'],
  'set.stats': ['{dupes} duplicates skipped · {skipped} rows skipped (podcasts, audiobooks or missing data) · {read} rows read.', '{dupes} duplikat dilewati · {skipped} baris dilewati (podcast, buku audio, atau data tidak lengkap) · {read} baris dibaca.'],
  'set.bad': ['{n} file(s) weren’t valid listening-history JSON and were ignored.', '{n} file bukan JSON riwayat mendengarkan yang valid dan diabaikan.'],
  'set.stored': ['{n} plays stored in this browser', '{n} pemutaran tersimpan di browser ini'],
  'set.clear': ['Clear all', 'Hapus semua'],
  'set.confirm': ['Delete all imported data from this browser?', 'Hapus semua data impor dari browser ini?'],
  'set.photos': ['Artist photos', 'Foto artis'],
  'set.photosHelp': ['Looks up artist names on Wikipedia (free, no account) and keeps the results in this browser. Turn off to stop all lookups.', 'Mencari nama artis di Wikipedia (gratis, tanpa akun) dan menyimpan hasilnya di browser ini. Matikan untuk menghentikan semua pencarian.'],
  'sh.title': ['Share your stats', 'Bagikan statistikmu'],
  'sh.sub': ['Turn your listening history into a card for Stories or posts. It is drawn in your browser from your own data.', 'Ubah riwayat mendengarkanmu menjadi kartu untuk Story atau postingan. Kartu digambar di browser kamu dari datamu sendiri.'],
  'sh.period': ['Period', 'Periode'],
  'sh.theme': ['Theme', 'Tema'],
  'sh.format': ['Format', 'Format'],
  'sh.from': ['From', 'Dari'],
  'sh.to': ['To', 'Sampai'],
  'sh.p.week': ['Week', 'Minggu'],
  'sh.p.month': ['Month', 'Bulan'],
  'sh.p.year': ['Year', 'Tahun'],
  'sh.p.all': ['All time', 'Sepanjang waktu'],
  'sh.p.custom': ['Custom', 'Rentang khusus'],
  'sh.t.week': ['Last 7 days', '7 hari terakhir'],
  'sh.t.month': ['Last 30 days', '30 hari terakhir'],
  'sh.t.year': ['Last 12 months', '12 bulan terakhir'],
  'sh.t.all': ['All time', 'Sepanjang waktu'],
  'sh.t.custom': ['Custom range', 'Rentang khusus'],
  'th.dark': ['Dark', 'Gelap'],
  'th.purple': ['Purple', 'Ungu'],
  'th.neon': ['Neon', 'Neon'],
  'th.minimal': ['Minimal', 'Minimal'],
  'sh.f.story': ['Story 9:16', 'Story 9:16'],
  'sh.f.square': ['Post 1:1', 'Postingan 1:1'],
  'sh.download': ['Download PNG', 'Unduh PNG'],
  'sh.preparing': ['Preparing…', 'Menyiapkan…'],
  'sh.share': ['Share', 'Bagikan'],
  'sh.shareTitle': ['My Statsify', 'Statsify-ku'],
  'sh.shareText': ['My music stats, made with Statsify', 'Statistik musikku, dibuat dengan Statsify'],
  'sh.saved': ['Saved. Check your downloads or photos.', 'Tersimpan. Cek unduhan atau foto kamu.'],
  'sh.saveFail': ['Couldn’t save the image. Try again or switch format.', 'Gagal menyimpan gambar. Coba lagi atau ganti format.'],
  'sh.shared': ['Shared!', 'Terbagikan!'],
  'sh.fallback': ['This browser can’t share images directly, so the PNG was saved. Post it from your gallery or Photos app.', 'Browser ini tidak bisa membagikan gambar langsung, jadi PNG disimpan. Unggah dari galeri atau aplikasi Foto kamu.'],
  'sh.shareFail': ['Couldn’t open the share sheet. Download the PNG and share it manually.', 'Tidak bisa membuka menu bagikan. Unduh PNG lalu bagikan secara manual.'],
  'sh.makeFail': ['Couldn’t create the image. Try another theme or format.', 'Gagal membuat gambar. Coba tema atau format lain.'],
  'sh.empty': ['No listening data in this period. Pick a longer period or another date range.', 'Tidak ada data mendengarkan pada periode ini. Pilih periode lebih panjang atau rentang tanggal lain.'],
  'sh.preview': ['Preview of your stats card', 'Pratinjau kartu statistikmu'],
})
export type K = keyof typeof T
const pick = (i: 0 | 1) => Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v[i]])) as Record<K, string>
const DICT: Record<Lang, Record<K, string>> = { en: pick(0), id: pick(1) }
const NUM: Record<Lang, string> = { en: 'en-US', id: 'id-ID' }
const DATE: Record<Lang, string> = { en: 'en-GB', id: 'id-ID' }

type Vars = Record<string, string | number>
type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: K, v?: Vars) => string
  num: (n: number) => string
  pct: (n: number) => string
  hm: (ms: number) => string
  dur: (ms: number) => string
  date: (ts: number) => string
  dateTime: (ts: number) => string
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useI18n = () => useContext(C)

// First render is always English (matches the server HTML, so no hydration mismatch); the saved or browser language applies right after mount.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>('en')
  useEffect(() => {
    let l: Lang = 'en'
    try {
      const s = localStorage.getItem(KEY)
      l = s === 'id' || s === 'en' ? s : navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en'
    } catch {}
    set(l)
  }, [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = useCallback((l: Lang) => {
    set(l)
    try { localStorage.setItem(KEY, l) } catch {}
  }, [])
  const value = useMemo<Ctx>(() => {
    const dict = DICT[lang]
    const nf = new Intl.NumberFormat(NUM[lang], { maximumFractionDigits: 0 })
    const pf = new Intl.NumberFormat(NUM[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    const df = new Intl.DateTimeFormat(DATE[lang], { day: 'numeric', month: 'short', year: 'numeric' })
    const dtf = new Intl.DateTimeFormat(DATE[lang], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const t = (k: K, v?: Vars): string => {
      let s = dict[k]
      if (s.includes('|')) {
        const [one, many] = s.split('|')
        s = v && v.n === 1 ? one : many
      }
      return v ? s.replace(/\{(\w+)\}/g, (m, name: string) => { const x = v[name]; return x === undefined ? m : typeof x === 'number' ? nf.format(x) : x }) : s
    }
    const hm = (ms: number) => `${nf.format(Math.floor(ms / 3.6e6))} ${t('u.h')} ${Math.floor((ms % 3.6e6) / 6e4)} ${t('u.min')}`
    const dur = (ms: number) => {
      const s = Math.floor(ms / 1000)
      return `${Math.floor(s / 86400)}${t('u.d')} ${Math.floor((s % 86400) / 3600)}${t('u.h')} ${Math.floor((s % 3600) / 60)}${t('u.m')} ${s % 60}${t('u.s')}`
    }
    return { lang, setLang, t, num: (n) => nf.format(n), pct: (n) => pf.format(n), hm, dur, date: (ts) => df.format(new Date(ts)), dateTime: (ts) => dtf.format(new Date(ts)) }
  }, [lang, setLang])
  return <C.Provider value={value}>{children}</C.Provider>
}
