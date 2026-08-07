# Discord Lyrics Bot

Bot Discord untuk mencari lirik lagu dengan **4 sumber lirik** dan auto-detect lagu dari music bot.

## Fitur

- `/lirik <judul>` - Cari lirik lagu
- `/np` atau `/nowplaying` - Auto-detect lagu dari music bot (Jockie, Cloudy, Hydra, dll)
- `/lirik nowplaying` - Fallback untuk ambil lirik dari music bot
- `/artist <nama>` - Info artis & lagu terpopulernya
- `/ping`, `/status`, `/help`
- **4 sumber lirik**: Genius → lrclib.net → lrcmux.dev → Better Lyrics (otomatis fallback)
- Timestamp lirik otomatis dihapus
- Embed respons yang rapi dengan thumbnail & link
- Berjalan 24/7 di Vercel free tier (serverless + keep-alive cron)

## Command

| Command | Deskripsi |
|---------|-----------|
| `/lirik <judul>` | Cari lirik lagu |
| `/lirik <judul> - <artis>` | Cari lirik spesifik |
| `/np` | Ambil lirik dari lagu yang sedang diputar di music bot |
| `/nowplaying` | Sama seperti /np |
| `/lirik nowplaying` | Fallback untuk ambil lirik dari music bot |
| `/lirik np` | Fallback untuk ambil lirik dari music bot |
| `/artist <nama>` | Info artis & lagu terpopulernya |
| `/ping` | Cek latensi bot ke API Discord |
| `/status` | Info status bot & sumber lirik |
| `/help` | Tampilkan semua command |

## Supported Music Bots

Bot otomatis mendeteksi embed dari music bot berikut:

| Bot | Status |
|-----|--------|
| Jockie Music (1-3) | ✅ |
| Cloudy | ✅ |
| Hydra | ✅ |
| FlaviBot | ✅ |
| LunaBot | ✅ |
| Lara | ✅ |
| Matchbox | ✅ |
| Listen | ✅ |
| FredBoat | ✅ |
| Rythm | ✅ |
| MEE6 | ✅ |
| ProBot | ✅ |
| SoundCloud | ✅ |
| Soundify | ✅ |
| Grobot | ✅ |

## Tech Stack

- [Vercel](https://vercel.com/) Serverless Functions (Node.js)
- Discord HTTP Interactions (webhook)
- [Genius Lyrics](https://genius.com/) API
- [lrclib.net](https://lrclib.net/) API (fallback 1)
- [lrcmux.dev](https://lrcmux.dev/) API (fallback 2)
- [Better Lyrics](https://blyrics.vercel.app/) API (fallback 3)
- [tweetnacl](https://www.npmjs.com/package/tweetnacl) (verifikasi signature Discord)

## Setup

### 1. Buat / siapkan Discord Bot

1. Buka https://discord.com/developers/applications
2. Klik **New Application** → beri nama → **Create**
3. Buka tab **Bot** → klik **Reset Token** → copy token (untuk `DISCORD_TOKEN`)
4. Di tab **General Information**, copy **Application ID** (untuk `CLIENT_ID`) dan **Public Key** (untuk `DISCORD_PUBLIC_KEY`)

### 2. Deploy ke Vercel

> Deploy dulu karena URL deployment dibutuhkan untuk mengisi **Interaction Endpoint URL**.

1. Install [Vercel CLI](https://vercel.com/docs/cli) atau gunakan dashboard https://vercel.com
2. Import repo ini ke Vercel (framework preset: **Other**)
3. Tambahkan **Environment Variables** di Vercel (Settings → Environment Variables):
   - `DISCORD_TOKEN`
   - `DISCORD_PUBLIC_KEY`
   - `GENIUS_API_KEY`
   - `CLIENT_ID`
4. Deploy. Dapatkan URL, contoh: `https://bot-lirik-discord.vercel.app`

### 3. Atur Interaction Endpoint URL (Discord Developer Portal)

1. Buka https://discord.com/developers/applications
2. Pilih aplikasi → tab **General Information**
3. Di bagian **Interaction Endpoint URL**, isi:
   ```
   https://<nama-project>.vercel.app/api/interactions
   ```
4. Klik **Save**. Discord akan mengirim `PING` untuk verifikasi — harus merespons `{ "type": 1 }`.

### 4. Register Slash Commands

Jalankan dari komputer lokal (root project):

```bash
npm install
npm run register
```

Catatan:
- Jika `GUILD_ID` di-isi di `.env`, command terdaftar ke guild itu **instan**.
- Tanpa `GUILD_ID`, command terdaftar **global** dan butuh waktu hingga 1 jam untuk muncul.

### 5. Invite Bot ke Server

1. Tab **OAuth2** → **URL Generator**
2. Centang `applications.commands` dan `bot`
3. Centang permission: Send Messages, Embed Links, Read Message History
4. Copy URL → buka di browser → invite

## Environment Variables

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `DISCORD_TOKEN` | Ya | Token bot Discord |
| `DISCORD_PUBLIC_KEY` | Ya | Public Key bot (untuk verifikasi webhook) |
| `CLIENT_ID` | Ya | Application ID bot |
| `GENIUS_API_KEY` | Opsional | Tanpa ini, bot hanya pakai lrclib/lrcmux/BetterLyrics |
| `GUILD_ID` | Opsional | Isi untuk register command ke guild instan |

## Menjalankan Lokal (Development)

```bash
npm install
npx vercel dev
```

Server lokal akan jalan di `http://localhost:3000/api/interactions`. Untuk uji coba nyata, set **Interaction Endpoint URL** sementara ke URL tunneling (mis. via `ngrok`/`cloudflared`) atau deploy preview Vercel.

> Jika `vercel dev` gagal karena script install esbuild terblokir, jalankan `npm approve-scripts esbuild`.

## Struktur Project

```
Bot-Lirik-Discord/
├── api/
│   ├── interactions.js       # Serverless function utama (handle webhook Discord)
│   └── keep-alive.js         # Cron endpoint untuk keep-alive (anti-sleep)
├── scripts/
│   └── register-commands.js  # Daftarkan slash commands ke Discord
├── src/
│   ├── commands.js           # Definisi & handler command + music bot detection
│   ├── lyrics.js             # Service lirik (4 sumber) & cari artis
│   └── helpers.js            # Verifikasi signature, REST Discord, embed builder
├── vercel.json               # Konfigurasi Vercel (cron keep-alive)
├── .env.example              # Template environment variables
├── .gitignore
└── package.json
```

## Credits

- [Genius](https://genius.com/)
- [lrclib.net](https://lrclib.net/)
- [lrcmux.dev](https://lrcmux.dev/)
- [Better Lyrics](https://blyrics.vercel.app/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Vercel](https://vercel.com/)
