# Discord Lyrics Bot

Bot Discord untuk mencari lirik lagu menggunakan Genius API.

## Fitur
- Command `!lyrics <judul lagu>` untuk mencari lirik
- Embed respons yang rapi
- Riwayat pencarian tersimpan di Supabase

## Setup

### 1. Buat Discord Bot
1. Buka https://discord.com/developers/applications
2. Klik **New Application** → beri nama → **Create**
3. Buka tab **Bot** → klik **Reset Token** → copy token
4. Aktifkan **Message Content Intent** di bawah
5. Buka tab **OAuth2** → **URL Generator**
6. Centang `bot` dan `applications.commands`
7. Centang permissions: **Send Messages**, **Embed Links**, **Read Message History**
8. Copy URL yang dihasilkan → buka di browser → invite bot ke server

### 2. Dapatkan Genius API Key
1. Buka https://genius.com/api-clients
2. Login / buat akun Genius
3. Klik **New API Client**
4. Isi nama app → **Create API Client**
5. Copy **Access Token**

### 3. Setup Supabase
1. Buka https://supabase.com → buka project kamu
2. Buka tab **SQL Editor**
3. Copy isi file `supabase-schema.sql` → jalankan
4. Buka tab **Settings** → **API** → copy **Project URL** dan **anon key**

### 4. Deploy ke Oracle Cloud
1. Daftar https://cloud.oracle.com (gratis)
2. Buat **Compute Instance** (Ubuntu 24.04, VM.Standard.E2.1.Micro)
3. SSH ke VM:
   ```bash
   ssh -i your-key.pem ubuntu@your-ip
   ```
4. Install dependencies:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nodejs npm git
   ```
5. Clone repo:
   ```bash
   git clone https://github.com/username/repo.git
   cd repo
   npm install
   ```
6. Buat file `.env`:
   ```bash
   nano .env
   ```
7. Isi token dan API key:
   ```
   DISCORD_TOKEN=your_token
   GENIUS_API_KEY=your_key
   SUPABASE_URL=your_url
   SUPABASE_KEY=your_key
   ```
8. Install PM2 dan jalankan:
   ```bash
   sudo npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### 5. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/repo.git
git push -u origin main
```

## Command
| Command | Deskripsi |
|---------|-----------|
| `!lyrics <judul>` | Cari lirik lagu |

## Tech Stack
- Discord.js v14
- Genius Lyrics API
- Supabase (PostgreSQL)
- PM2 (process manager)
