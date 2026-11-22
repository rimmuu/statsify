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
  'ls.spotify': ['Listen on Spotify', 'Dengarkan di Spotify'],
  'ls.apple': ['Listen on Apple Music', 'Dengarkan di Apple Music'],
  'sp.title': ['Spotify account', 'Akun Spotify'],
  'sp.st.connected': ['Connected', 'Terhubung'],
  'sp.st.off': ['Not connected', 'Belum terhubung'],
  'sp.st.reauth': ['Reconnect needed', 'Perlu dihubungkan ulang'],
  'sp.blurb': ['Connect to pull in your latest plays and Spotify’s own top artists and tracks. Your complete history still comes from the JSON export.', 'Hubungkan untuk mengambil pemutaran terbaru serta artis dan lagu teratas versi Spotify. Riwayat lengkapmu tetap berasal dari ekspor JSON.'],
  'sp.connect': ['Connect Spotify', 'Hubungkan Spotify'],
  'sp.reconnect': ['Reconnect Spotify', 'Hubungkan ulang Spotify'],
  'sp.disconnect': ['Disconnect', 'Putuskan'],
  'sp.sync': ['Sync now', 'Sinkronkan sekarang'],
  'sp.syncing': ['Syncing…', 'Menyinkronkan…'],
  'sp.retry': ['Try again', 'Coba lagi'],
  'sp.checking': ['Checking the connection…', 'Memeriksa koneksi…'],
  'sp.noconfig': ['Spotify login isn’t set up on this server yet.', 'Login Spotify belum disiapkan di server ini.'],
  'sp.noconfigHelp': ['The server needs SPOTIFY_CLIENT_ID and SESSION_SECRET (see the README). Importing JSON files works without them.', 'Server memerlukan SPOTIFY_CLIENT_ID dan SESSION_SECRET (lihat README). Impor file JSON tetap berfungsi tanpa keduanya.'],
  'sp.last': ['Last sync: {when}', 'Sinkron terakhir: {when}'],
  'sp.never': ['Not synced yet', 'Belum pernah disinkronkan'],
  'sp.step.recent': ['Recent plays', 'Pemutaran terbaru'],
  'sp.step.tracks': ['Top tracks · {range}', 'Lagu teratas · {range}'],
  'sp.step.artists': ['Top artists · {range}', 'Artis teratas · {range}'],
  'sp.range.short_term': ['Last 4 weeks', '4 minggu terakhir'],
  'sp.range.medium_term': ['Last 6 months', '6 bulan terakhir'],
  'sp.range.long_term': ['About 1 year', 'Sekitar 1 tahun'],
  'sp.result': ['{added} new plays saved · {dupes} already in your history · {skipped} skipped', '{added} pemutaran baru disimpan · {dupes} sudah ada di riwayatmu · {skipped} dilewati'],
  'sp.partial': ['The plays were saved, but the top lists are incomplete.', 'Pemutaran sudah disimpan, tetapi daftar teratas belum lengkap.'],
  'sp.limits': ['Spotify only shares your last 50 plays and doesn’t say how long you listened, so synced plays count the full track length. Sync regularly so no play is missed; the JSON export stays the complete and exact source.', 'Spotify hanya membagikan 50 pemutaran terakhir dan tidak menyebut berapa lama kamu mendengarkan, sehingga pemutaran hasil sinkron dihitung sepanjang durasi lagu. Sinkronkan secara rutin agar tidak ada yang terlewat; ekspor JSON tetap sumber yang lengkap dan akurat.'],
  'sp.auto': ['Sync automatically', 'Sinkron otomatis'],
  'sp.autoHelp': ['When you open Statsify and the last sync is over 30 minutes old.', 'Saat kamu membuka Statsify dan sinkron terakhir sudah lebih dari 30 menit.'],
  'sp.discTitle': ['Disconnect Spotify?', 'Putuskan Spotify?'],
  'sp.discBody': ['Statsify forgets the connection on this device. Plays you already saved stay. To remove its access completely, remove Statsify at spotify.com/account/apps.', 'Statsify melupakan koneksi di perangkat ini. Pemutaran yang sudah tersimpan tetap ada. Untuk mencabut aksesnya sepenuhnya, hapus Statsify di spotify.com/account/apps.'],
  'sp.err.not_configured': ['Spotify login isn’t set up on this server.', 'Login Spotify belum disiapkan di server ini.'],
  'sp.err.unauthorized': ['You’re not connected to Spotify.', 'Kamu belum terhubung ke Spotify.'],
  'sp.err.reauthorize': ['Spotify no longer accepts the saved authorization. Reconnect to continue.', 'Spotify tidak lagi menerima otorisasi yang tersimpan. Hubungkan ulang untuk melanjutkan.'],
  'sp.err.forbidden': ['Spotify refused access. In development mode the account must be added to the app (up to 5 users) and the app owner needs Premium.', 'Spotify menolak akses. Pada development mode, akun harus ditambahkan ke aplikasi (maksimal 5 pengguna) dan pemilik aplikasi perlu Premium.'],
  'sp.err.rate_limited': ['Spotify asked us to slow down. Try again in about {s} seconds.', 'Spotify meminta kita melambat. Coba lagi sekitar {s} detik lagi.'],
  'sp.err.quota': ['This app has used up its Spotify quota for now. Try again later.', 'Kuota Spotify aplikasi ini sedang habis. Coba lagi nanti.'],
  'sp.err.upstream': ['Spotify had a problem. Try again in a moment.', 'Spotify sedang bermasalah. Coba lagi sebentar lagi.'],
  'sp.err.network': ['Couldn’t reach the server. Check your connection and try again.', 'Tidak dapat menghubungi server. Periksa koneksimu lalu coba lagi.'],
  'sp.err.bad_request': ['The request wasn’t valid.', 'Permintaan tidak valid.'],
  'sp.cb.connected': ['Spotify connected.', 'Spotify terhubung.'],
  'sp.cb.denied': ['You declined the Spotify permissions, so nothing was connected.', 'Kamu menolak izin Spotify, jadi tidak ada yang terhubung.'],
  'sp.cb.state': ['The login couldn’t be verified (state mismatch). Please try again.', 'Login tidak dapat diverifikasi (state tidak cocok). Silakan coba lagi.'],
  'sp.cb.expired': ['The login took too long or was started in another browser. Please try again.', 'Login terlalu lama atau dimulai di browser lain. Silakan coba lagi.'],
  'sp.cb.exchange': ['Spotify didn’t complete the login. Please try again.', 'Spotify tidak menyelesaikan login. Silakan coba lagi.'],
  'sp.cb.forbidden': ['This Spotify account isn’t allowed for this app. In development mode add it under Users and Access in the Spotify Developer Dashboard (the app owner also needs Premium).', 'Akun Spotify ini belum diizinkan untuk aplikasi ini. Pada development mode, tambahkan di Users and Access pada Spotify Developer Dashboard (pemilik aplikasi juga perlu Premium).'],
  'sp.cb.config': ['Spotify login isn’t set up on this server yet.', 'Login Spotify belum disiapkan di server ini.'],
  'sp.top.title': ['Spotify’s own top lists', 'Daftar teratas versi Spotify'],
  'sp.top.tracks': ['Top tracks', 'Lagu teratas'],
  'sp.top.artists': ['Top artists', 'Artis teratas'],
  'sp.top.help': ['Ranked by Spotify. No play counts or minutes.', 'Diurutkan oleh Spotify. Tanpa jumlah putar atau menit.'],
  'sp.top.updated': ['Updated {when}', 'Diperbarui {when}'],
  'sp.genre.sub': ['from Spotify’s top artists', 'dari artis teratas Spotify'],
  'g.api.head': ['Genres of your top artists', 'Genre artis teratasmu'],
  'g.api.help': ['As tagged by Spotify: the share of your top artists (up to 50 per period) that carry each genre. It isn’t based on listening time.', 'Sesuai label Spotify: persentase artis teratasmu (hingga 50 per periode) yang memiliki tiap genre. Tidak berdasarkan waktu dengar.'],
  'g.api.none': ['Spotify hasn’t tagged your top artists in this period with any genre.', 'Spotify belum memberi genre pada artis teratasmu di periode ini.'],
  'g.connect': ['Connect Spotify in Settings to see your genres.', 'Hubungkan Spotify di Pengaturan untuk melihat genre-mu.'],
  'dm.title': ['Your data', 'Datamu'],
  'dm.imported': ['Imported from JSON', 'Diimpor dari JSON'],
  'dm.api': ['Synced from Spotify', 'Disinkronkan dari Spotify'],
  'dm.confirmTitle': ['Clear all data?', 'Hapus semua data?'],
  'dm.confirmBody': ['This deletes every play stored in this browser, imported and synced, and the saved Spotify top lists. It can’t be undone. Your Spotify connection stays.', 'Ini menghapus semua pemutaran yang tersimpan di browser ini, baik hasil impor maupun sinkron, beserta daftar teratas Spotify yang tersimpan. Tidak bisa dibatalkan. Koneksi Spotify tetap ada.'],
  'dm.cancel': ['Cancel', 'Batal'],
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
  'nav.wrapped': ['Wrapped', 'Wrapped'],
  'w.title': ['Your Music Wrapped', 'Cerita Musikmu'],
  'w.intro.sub': ['Everything you played, replayed as a story.', 'Semua yang kamu putar, dirangkum jadi sebuah cerita.'],
  'w.start': ['Start Your Story', 'Mulai Ceritamu'],
  'w.hint': ['Tap, swipe, or use ← → to move.', 'Ketuk, geser, atau gunakan ← → untuk berpindah.'],
  'w.scope': ['Period', 'Periode'],
  'w.prev': ['Previous slide', 'Slide sebelumnya'],
  'w.next': ['Next slide', 'Slide berikutnya'],
  'w.close': ['Close story', 'Tutup cerita'],
  'w.goto': ['Go to slide {n}: {title}', 'Ke slide {n}: {title}'],
  'w.slideOf': ['Slide {n} of {total}', 'Slide {n} dari {total}'],
  'w.stats.title': ['Listening Stats', 'Statistik Mendengarkan'],
  'w.stats.songs': ['Songs', 'Lagu'],
  'w.stats.artists': ['Artists', 'Artis'],
  'w.stats.albums': ['Albums', 'Album'],
  'w.stats.time': ['Listening time', 'Waktu mendengarkan'],
  'w.stats.plays': ['Played {n} time in total.|Played {n} times in total.', 'Diputar {n} kali secara total.|Diputar {n} kali secara total.'],
  'w.stats.note': ['Songs, artists and albums are counted once, however often you played them.', 'Lagu, artis, dan album dihitung sekali saja, seberapa sering pun kamu memutarnya.'],
  'w.artist.title': ['Top Artist', 'Artis Teratas'],
  'w.artist.lead': ['The artist you spent the most time with', 'Artis yang paling banyak menemanimu'],
  'w.artist.share': ['{p}% of your listening time', '{p}% dari waktu mendengarkanmu'],
  'w.tracks.title': ['Top Tracks', 'Lagu Teratas'],
  'w.tracks.basis': ['Ranked by listening time.', 'Diurutkan berdasarkan waktu mendengarkan.'],
  'w.albums.title': ['Top Albums', 'Album Teratas'],
  'w.albums.none': ['Album details aren’t available for this period.', 'Detail album tidak tersedia untuk periode ini.'],
  'w.taste.title': ['Your Music Taste', 'Selera Musikmu'],
  'w.taste.peak': ['You listen most around {h}', 'Kamu paling sering mendengarkan sekitar pukul {h}'],
  'w.taste.hours': ['Listening by hour of day', 'Mendengarkan menurut jam'],
  'w.taste.day': ['Favorite day', 'Hari favorit'],
  'w.taste.share': ['Top artist share', 'Porsi artis teratas'],
  'w.taste.genre': ['Genres aren’t part of Spotify’s export, so your taste is described by when and how you listen.', 'Genre bukan bagian dari ekspor Spotify, jadi seleramu dijelaskan lewat kapan dan bagaimana kamu mendengarkan.'],
  'w.recap.title': ['Your Recap', 'Rangkumanmu'],
  'w.share': ['Share My Story', 'Bagikan Ceritaku'],
  'w.replay': ['Replay Story', 'Ulangi Cerita'],
  'w.full': ['View Full Stats', 'Lihat Statistik Lengkap'],
  'w.sheet': ['Share your story', 'Bagikan ceritamu'],
  'w.download': ['Download image', 'Unduh gambar'],
  'w.copy': ['Copy link', 'Salin tautan'],
  'w.privacy': ['The image is made on your device. The link only opens Statsify; none of your stats are in it.', 'Gambar dibuat di perangkatmu. Tautannya hanya membuka Statsify; tidak ada statistikmu di dalamnya.'],
  'w.copied': ['Link copied.', 'Tautan disalin.'],
  'w.copyFail': ['Couldn’t copy the link. Copy it from the address bar.', 'Tidak bisa menyalin tautan. Salin dari bilah alamat.'],
  'w.shareFail': ['Couldn’t share directly. You can download the image or copy the link.', 'Tidak bisa membagikan langsung. Kamu bisa mengunduh gambar atau menyalin tautan.'],
  'w.empty.title': ['Your story starts with your data', 'Ceritamu dimulai dari datamu'],
  'w.empty.body': ['Import your Spotify history to unlock your Wrapped.', 'Impor riwayat Spotify-mu untuk membuka Wrapped.'],
  'w.back': ['Back to Statsify', 'Kembali ke Statsify'],
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
  weekday: (i: number) => string
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
    const wf = new Intl.DateTimeFormat(DATE[lang], { weekday: 'long' })
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
    return { lang, setLang, t, num: (n) => nf.format(n), pct: (n) => pf.format(n), hm, dur, date: (ts) => df.format(new Date(ts)), dateTime: (ts) => dtf.format(new Date(ts)), weekday: (i) => wf.format(new Date(2024, 0, 7 + i)) }
  }, [lang, setLang])
  return <C.Provider value={value}>{children}</C.Provider>
}
