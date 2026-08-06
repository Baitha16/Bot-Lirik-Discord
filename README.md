# Discord Lyrics Bot 🎵

Bot Discord untuk mencari lirik lagu. Menggunakan **Genius API** (lirik lengkap) dengan fallback ke **lrclib.net** (backup gratis).

## Fitur

- Command `/lirik <judul lagu>` untuk mencari lirik
- Hybrid: Genius → lrclib.net (otomatis fallback)
- Timestamp lirik otomatis dihapus
- Embed respons yang rapi dengan thumbnail & link

## Tech Stack

- [Discord.js](https://discord.js.org/) v14
- [Genius Lyrics](https://genius.com/) API
- [lrclib.net](https://lrclib.net/) API (fallback)
- [UptimeRobot](https://uptimerobot.com/) (keep alive untuk Replit)

## Command

| Command | Deskripsi |
|---------|-----------|
| `/lirik <judul>` | Cari lirik lagu |
| `/lirik <judul> - <artis>` | Cari lirik spesifik |

**Contoh:**
```
/lirik Bohemian Rhapsody
/lirik Bohemian Rhapsody - Queen
```

## Setup

### 1. Buat Discord Bot

1. Buka https://discord.com/developers/applications
2. Klik **New Application** → beri nama → **Create**
3. Buka tab **Bot** → klik **Reset Token** → copy token
4. Aktifkan **Message Content Intent** di bawah
5. Buka tab **OAuth2** → **URL Generator**
6. Centang `bot`
7. Centang permissions:
   - Send Messages
   - Embed Links
   - Read Message History
8. Copy URL → buka di browser → invite bot ke server

### 2. Dapatkan Genius API Key

1. Buka https://genius.com/api-clients
2. Login / buat akun Genius
3. Klik **New API Client**
4. Isi:
   - **App Name:** `Lyrics Bot`
   - **App Website URL:** `https://github.com`
5. Klik **Create API Client**
6. Copy **Client Access Token**

### 3. Buat File `.env`

Buat file `.env` di root project:

```
DISCORD_TOKEN=your_discord_bot_token
GENIUS_API_KEY=your_genius_api_key
```

## Cara Jalankan

### Lokal (Windows)

1. Install Node.js dari https://nodejs.org
2. Buka PowerShell:
   ```powershell
   cd "D:\Github\Bot Lirik Discord"
   npm install
   node src/index.js
   ```
3. Atau double-click **`start.bat`**

### Replit (24/7)

1. Login ke https://replit.com
2. Import dari GitHub: `Baitha16/Bot-Lirik-Discord`
3. Tambah **Secrets** (Environment Variables):
   - `DISCORD_TOKEN`
   - `GENIUS_API_KEY`
4. Klik **Publish** → bot akan dapat URL
5. Daftar https://uptimerobot.com
6. Tambah monitor:
   - **Type:** HTTP(s)
   - **URL:** URL dari Replit
   - **Interval:** 5 minutes

## Struktur Project

```
Bot-Lirik-Discord/
├── src/
│   └── index.js              # Bot utama
├── .env                      # Environment variables (jangan di-push!)
├── .env.example              # Template
├── .gitignore
├── start.bat                 # Shortcut jalankan bot lokal
├── package.json
└── README.md
```

## Credits

- [Discord.js](https://discord.js.org/)
- [Genius](https://genius.com/)
- [lrclib.net](https://lrclib.net/)
- [UptimeRobot](https://uptimerobot.com/)
