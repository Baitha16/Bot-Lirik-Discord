'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { searchLyrics, searchArtist } = require('./lyrics');
const { discordFetch, buildEmbed, getUserName } = require('./helpers');

// Daftar music bot yang dikenal (ID + nama)
const MUSIC_BOTS = [
  { id: '242634733769803776', name: 'Grobot' },
  { id: '581860774314993664', name: 'Jockie Music' },
  { id: '180723147292901376', name: 'FredBoat' },
  { id: '772273272418365460', name: 'Hydra' },
  { id: '282859034547439617', name: 'ProBot' },
  { id: '473422981896888330', name: 'Rythm' },
  { id: '252182229384505363', name: 'MEE6' },
  { id: '302789687246479360', name: 'SoundCloud' },
  { id: '884910136721209364', name: 'Soundify' },
  { id: '904995708367867936', name: 'Blockhead' },
  { id: '574879582569027595', name: 'Cloudy' },
  { id: '928686911484782632', name: 'Flavi' },
  { id: '1045335103778318416', name: 'Luna' },
  { id: '951084658311339068', name: 'Lara' },
  { id: '937278521008445490', name: 'Matchbox' },
  { id: '751438722725712997', name: 'Listen' },
];

const MUSIC_BOT_NAMES = [
  'grobot', 'jockie', 'fredboat', 'hydra', 'probot', 'rythm', 'mee6',
  'soundcloud', 'soundify', 'blockhead', 'cloudy', 'flavi', 'luna',
  'lara', 'matchbox', 'listen', 'music', 'play', 'jukebox', 'dj',
];

function isMusicBot(userId, username) {
  const uid = String(userId || '');
  const uname = String(username || '').toLowerCase();
  if (MUSIC_BOTS.some(bot => bot.id === uid)) return true;
  if (MUSIC_BOT_NAMES.some(name => uname.includes(name))) return true;
  return false;
}

function parseSongFromEmbed(embed) {
  if (!embed) return null;
  let title = '';
  let artist = '';

  if (embed.title) {
    const match = embed.title.match(/(?:now playing|playing|listening)[:\s]*(.+)/i);
    if (match) title = match[1].trim();
  }

  if (!title && embed.description) {
    const match = embed.description.match(/^(.+?)(?:\s*[-—–]\s*(.+))?$/m);
    if (match) {
      title = match[1].trim();
      if (match[2]) artist = match[2].trim();
    }
  }

  if (!title && embed.fields) {
    for (const field of embed.fields) {
      const name = (field.name || '').toLowerCase();
      const value = field.value || '';
      if (name.includes('title') || name.includes('track') || name.includes('song') || name.includes('now playing')) {
        title = value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      }
      if (name.includes('artist') || name.includes('by') || name.includes('author')) {
        artist = value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      }
    }
  }

  if (!title && embed.thumbnail && embed.title && !embed.title.toLowerCase().includes('queue')) {
    title = embed.title;
  }

  if (!title) return null;
  if (artist && !title.toLowerCase().includes(artist.toLowerCase())) {
    return title + ' - ' + artist;
  }
  return title;
}

async function findNowPlaying(interaction) {
  const channelId = interaction.channel_id;
  let messages;
  try {
    messages = await discordFetch('/channels/' + channelId + '/messages?limit=20');
  } catch (e) {
    console.log('[DEBUG] Gagal fetch messages: ' + e.message);
    return null;
  }
  if (!messages || !messages.length) return null;

  for (const msg of messages) {
    const author = msg.author || {};
    if (!isMusicBot(author.id, author.username)) continue;
    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        const songQuery = parseSongFromEmbed(embed);
        if (songQuery) return songQuery;
      }
    }
    if (msg.content) {
      const match = msg.content.match(/(?:now playing|playing|listening)[:\s]*(.+)/i);
      if (match) return match[1].trim();
    }
  }
  return null;
}

// Command definitions
const lirikCommand = new SlashCommandBuilder()
  .setName('lirik')
  .setDescription('Cari lirik lagu')
  .addSubcommand(sub =>
    sub.setName('manual')
      .setDescription('Cari lirik dengan judul lagu')
      .addStringOption(opt =>
        opt.setName('judul').setDescription('Judul lagu (atau: Judul - Artis)').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('nowplaying')
      .setDescription('Ambil lirik dari lagu yang sedang diputar di music bot')
  )
  .addSubcommand(sub =>
    sub.setName('np')
      .setDescription('Sama seperti nowplaying')
  );

const artistCommand = new SlashCommandBuilder()
  .setName('artist')
  .setDescription('Cari info artis & lagu terpopulernya')
  .addStringOption(opt =>
    opt.setName('nama').setDescription('Nama artis / band').setRequired(true)
  );

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Cek latensi bot ke API Discord');

const statusCommand = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Info bot & sumber lirik');

const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Tampilkan semua command yang tersedia');

const commandList = [
  {
    name: 'lirik',
    builder: lirikCommand,
    defer: true,
    async execute(interaction) {
      const sub = interaction.options.getSubcommand();

      if (sub === 'nowplaying' || sub === 'np') {
        const songQuery = await findNowPlaying(interaction);
        if (!songQuery) {
          return {
            content: 'Tidak ditemukan lagu yang sedang diputar. Coba ketik `/lirik manual` langsung.',
            flags: 64,
          };
        }
        const result = await searchLyrics(songQuery);
        if (!result) return { content: 'Lirik tidak ditemukan untuk lagu yang sedang diputar.' };

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
            footer: 'Diminta oleh ' + getUserName(interaction) + ' | Sumber: ' + result.source + ' | Now Playing',
          })],
        };
      }

      // Subcommand: manual
      const query = interaction.options.getString('judul');
      const result = await searchLyrics(query);
      if (!result) return { content: 'Lirik tidak ditemukan. Coba format `/lirik manual Judul - Artis`.' };

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
    builder: artistCommand,
    defer: true,
    async execute(interaction) {
      const query = interaction.options.getString('nama');
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
    builder: pingCommand,
    async execute(interaction) {
      const start = Date.now();
      try { await discordFetch('/users/@me'); } catch (_) {}
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
    builder: statusCommand,
    async execute(interaction) {
      const start = Date.now();
      let botUser = null;
      try { botUser = await discordFetch('/users/@me'); } catch (_) {}
      const latency = Date.now() - start;

      return {
        embeds: [buildEmbed({
          title: 'Status Bot',
          fields: [
            { name: 'Bot', value: botUser ? botUser.username : 'Tidak diketahui', inline: true },
            { name: 'Latensi API', value: latency + ' ms', inline: true },
            { name: 'Sumber lirik', value: 'Genius + lrclib + lrcmux + BetterLyrics (4 fallback)', inline: false },
            { name: 'Music bots', value: MUSIC_BOTS.map(b => b.name).join(', '), inline: false },
            { name: 'Node.js', value: process.version, inline: true },
            { name: 'Versi bot', value: '2.1.0', inline: true },
          ],
          footer: 'Diminta oleh ' + getUserName(interaction),
        })],
      };
    },
  },
  {
    name: 'help',
    builder: helpCommand,
    execute() {
      return {
        embeds: [buildEmbed({
          title: 'Lyrics Bot - Commands',
          description: 'Bot untuk mencari lirik lagu, berjalan di Vercel serverless.',
          fields: [
            { name: '/lirik manual <judul>', value: 'Cari lirik lagu. Contoh: `/lirik manual Bohemian Rhapsody - Queen`', inline: false },
            { name: '/lirik nowplaying', value: 'Ambil lirik dari lagu yang sedang diputar di music bot', inline: false },
            { name: '/lirik np', value: 'Sama seperti nowplaying', inline: false },
            { name: '/artist <nama>', value: 'Cari info artis & lagu terpopulernya. Contoh: `/artist Taylor Swift`', inline: false },
            { name: '/ping', value: 'Cek latensi bot ke API Discord', inline: false },
            { name: '/status', value: 'Info status bot & sumber lirik', inline: false },
            { name: '/help', value: 'Tampilkan command ini', inline: false },
          ],
          footer: 'Powered by Genius + lrclib + lrcmux + BetterLyrics',
        })],
      };
    },
  },
];

const commandsJSON = commandList.map(cmd => cmd.builder.toJSON());

module.exports = { commands: commandList, commandsJSON };
