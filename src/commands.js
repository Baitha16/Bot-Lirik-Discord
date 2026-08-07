'use strict';

const { searchLyrics, searchArtist } = require('./lyrics');
const { discordFetch, buildEmbed, getUserName } = require('./helpers');

function getOption(interaction, name) {
  const opt = (interaction.data && interaction.data.options || []).find((o) => o.name === name);
  return opt ? opt.value : null;
}

const commandList = [
  {
    name: 'lirik',
    description: 'Cari lirik lagu',
    type: 1,
    options: [
      { name: 'judul', description: 'Judul lagu (atau: Judul - Artis)', type: 3, required: true },
    ],
    defer: true,
    async execute(interaction) {
      const query = getOption(interaction, 'judul');
      const result = await searchLyrics(query);
      if (!result) return { content: 'Lirik tidak ditemukan. Coba lagi dengan format `/lirik Judul - Artis`.' };

      const truncated = result.lyrics.length > 4000
        ? result.lyrics.slice(0, 4000) + '\n\n... (lirik dipotong)'
        : result.lyrics;

      return {
        embeds: [buildEmbed({
          title: result.title,
          author: result.artist,
          description: truncated,
          thumbnail: result.thumbnail,
          url: result.url,
          footer: 'Diminta oleh ' + getUserName(interaction) + ' | Sumber: ' + result.source,
        })],
      };
    },
  },
  {
    name: 'artist',
    description: 'Cari info artis & lagu terpopulernya',
    type: 1,
    options: [
      { name: 'nama', description: 'Nama artis / band', type: 3, required: true },
    ],
    defer: true,
    async execute(interaction) {
      const query = getOption(interaction, 'nama');
      const artist = await searchArtist(query);
      if (!artist) return { content: 'Artis tidak ditemukan.' };

      const lines = artist.songs.map((s, i) => {
        const title = s.title.length > 45 ? s.title.slice(0, 45) + '...' : s.title;
        return '`' + (i + 1) + '.` [' + title + '](' + s.url + ')';
      });

      return {
        embeds: [buildEmbed({
          title: artist.name,
          description: lines.length ? lines.join('\n') : 'Tidak ada lagu ditemukan.',
          thumbnail: artist.image,
          url: artist.url,
          footer: 'Diminta oleh ' + getUserName(interaction) + ' | Lagu terpopuler dari Genius',
        })],
      };
    },
  },
  {
    name: 'ping',
    description: 'Cek latensi bot ke API Discord',
    type: 1,
    async execute(interaction) {
      const start = Date.now();
      try {
        await discordFetch('/users/@me');
      } catch (_) { /* tetap tampilkan hasil */ }
      const ms = Date.now() - start;
      return {
        embeds: [buildEmbed({
          title: 'Pong!',
          description: 'Latensi ke API Discord: **' + ms + ' ms**',
          footer: 'Diminta oleh ' + getUserName(interaction),
        })],
      };
    },
  },
  {
    name: 'status',
    description: 'Info bot & sumber lirik',
    type: 1,
    async execute(interaction) {
      const start = Date.now();
      let botUser = null;
      try {
        botUser = await discordFetch('/users/@me');
      } catch (_) { /* kosong */ }
      const latency = Date.now() - start;

      return {
        embeds: [buildEmbed({
          title: 'Status Bot',
          fields: [
            { name: 'Bot', value: botUser ? botUser.username : 'Tidak diketahui', inline: true },
            { name: 'Latensi API', value: latency + ' ms', inline: true },
            { name: 'Uptime runtime', value: Math.floor(process.uptime()) + ' detik', inline: true },
            { name: 'Sumber lirik', value: 'Genius API' + (process.env.GENIUS_API_KEY ? ' (aktif)' : ' (key belum diatur)') + ' + lrclib.net (fallback)', inline: false },
            { name: 'Node.js', value: process.version, inline: true },
            { name: 'Versi bot', value: '2.0.0', inline: true },
          ],
          footer: 'Diminta oleh ' + getUserName(interaction),
        })],
      };
    },
  },
  {
    name: 'help',
    description: 'Tampilkan semua command yang tersedia',
    type: 1,
    execute() {
      return {
        embeds: [buildEmbed({
          title: 'Lyrics Bot - Commands',
          description: 'Bot untuk mencari lirik lagu, berjalan di Vercel serverless.',
          fields: [
            { name: '/lirik <judul>', value: 'Cari lirik lagu. Contoh: `/lirik Bohemian Rhapsody - Queen`', inline: false },
            { name: '/artist <nama>', value: 'Cari info artis & lagu terpopulernya. Contoh: `/artist Taylor Swift`', inline: false },
            { name: '/ping', value: 'Cek latensi bot ke API Discord', inline: false },
            { name: '/status', value: 'Info status bot & sumber lirik', inline: false },
            { name: '/help', value: 'Tampilkan command ini', inline: false },
          ],
          footer: 'Powered by Genius + lrclib.net',
        })],
      };
    },
  },
];

const toJSON = (cmd) => ({
  name: cmd.name,
  description: cmd.description,
  type: cmd.type,
  options: cmd.options || [],
});

module.exports = { commands: commandList, commandsJSON: commandList.map(toJSON) };
