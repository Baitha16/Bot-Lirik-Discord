'use strict';

require('dotenv').config();
const { commandsJSON } = require('../src/commands');

const DISCORD_API = 'https://discord.com/api/v10';

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    console.error('Error: DISCORD_TOKEN dan CLIENT_ID wajib diisi di file .env');
    process.exit(1);
  }

  const url = process.env.GUILD_ID
    ? `${DISCORD_API}/applications/${clientId}/guilds/${process.env.GUILD_ID}/commands`
    : `${DISCORD_API}/applications/${clientId}/commands`;

  console.log('Mendaftarkan ' + commandsJSON.length + ' command ke: ' + (process.env.GUILD_ID ? 'guild ' + process.env.GUILD_ID : 'global (semua server)'));
  console.log('Catatan: command global butuh waktu hingga 1 jam untuk muncul.');

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: 'Bot ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordLyricsBot/2.0 (https://github.com/Baitha16/Bot-Lirik-Discord)',
    },
    body: JSON.stringify(commandsJSON),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('Gagal mendaftarkan command (' + res.status + '):');
    console.error(text);
    process.exit(1);
  }

  const registered = JSON.parse(text);
  console.log('Sukses! Command terdaftar:');
  for (const cmd of registered) {
    console.log('  /' + cmd.name + ' (id: ' + cmd.id + ')');
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
