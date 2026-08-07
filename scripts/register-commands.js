'use strict';

require('dotenv').config();
const { commandsJSON } = require('../src/commands');

const DISCORD_API = 'https://discord.com/api/v10';

async function registerToGuild(token, clientId, guildId) {
  const url = `${DISCORD_API}/applications/${clientId}/guilds/${guildId}/commands`;
  
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
    console.error('Gagal mendaftarkan ke guild ' + guildId + ' (' + res.status + '):');
    console.error(text);
    return false;
  }

  const registered = JSON.parse(text);
  console.log('Sukses ke guild ' + guildId + ':');
  for (const cmd of registered) {
    console.log('  /' + cmd.name + ' (id: ' + cmd.id + ')');
  }
  return true;
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    console.error('Error: DISCORD_TOKEN dan CLIENT_ID wajib diisi di file .env');
    process.exit(1);
  }

  const guildIds = process.env.GUILD_ID
    ? process.env.GUILD_ID.split(',').map(id => id.trim()).filter(Boolean)
    : [];

  if (guildIds.length === 0) {
    console.log('Mendaftarkan ' + commandsJSON.length + ' command ke: global (semua server)');
    console.log('Catatan: command global butuh waktu hingga 1 jam untuk muncul.');
    
    const url = `${DISCORD_API}/applications/${clientId}/commands`;
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
      console.error('Gagal mendaftarkan global (' + res.status + '):');
      console.error(text);
      process.exit(1);
    }

    const registered = JSON.parse(text);
    console.log('Sukses! Command terdaftar:');
    for (const cmd of registered) {
      console.log('  /' + cmd.name + ' (id: ' + cmd.id + ')');
    }
  } else {
    console.log('Mendaftarkan ' + commandsJSON.length + ' command ke ' + guildIds.length + ' guild...');
    let allSuccess = true;
    for (const guildId of guildIds) {
      const success = await registerToGuild(token, clientId, guildId);
      if (!success) allSuccess = false;
    }
    if (!allSuccess) process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
