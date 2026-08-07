'use strict';

const { searchLyrics, searchArtist } = require('./lyrics');
const { discordFetch, buildEmbed, getUserName } = require('./helpers');

function getOption(interaction, name) {
  const opt = (interaction.data && interaction.data.options || []).find((o) => o.name === name);
  return opt ? opt.value : null;
}

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

// Nama-nama music bot (tanpa ID, untuk fallback)
const MUSIC_BOT_NAMES = [
  'grobot', 'jockie', 'fredboat', 'hydra', 'probot', 'rythm', 'mee6',
  'soundcloud', 'soundify', 'blockhead', 'cloudy', 'flavi', 'luna',
  'lara', 'matchbox', 'listen', 'music', 'play', 'jukebox', 'dj',
];

function isMusicBot(userId, username) {
  const uid = String(userId || '');
  const uname = String(username || '').toLowerCase();

  // Cek by ID
  if (MUSIC_BOTS.some(bot => bot.id === uid)) return true;

  // Cek by nama
  if (MUSIC_BOT_NAMES.some(name => uname.includes(name))) return true;

  return false;
}

function parseSongFromEmbed(embed) {
  if (!embed) return null;

  let title = '';
  let artist = '';
  let source = '';

  // Method 1: Embed title mengandung "Now Playing" / "Playing"
  if (embed.title) {
    const t = embed.title.toLowerCase();
    if (t.includes('now playing') || t.includes('playing') || t.includes('listening')) {
      // Ambil dari title setelah "Now Playing:" atau sejenisnya
      const match = embed.title.match(/(?:now playing|playing|listening)[:\s]*(.+)/i);
      if (match) title = match[1].trim();
    }
  }

  // Method 2: Description mengandung judul lagu
  if (!title && embed.description) {
    // Cari pattern seperti "Title - Artist" atau "Title — Artist"
    const match = embed.description.match(/^(.+?)(?:\s*[-—–]\s*(.+))?$/m);
    if (match) {
      title = match[1].trim();
      if (match[2]) artist = match[2].trim();
    }
  }

  // Method 3: Fields mengandung info lagu
  if (!title && embed.fields) {
    for (const field of embed.fields) {
      const name = (field.name || '').toLowerCase();
      const value = field.value || '';

      if (name.includes('title') || name.includes('track') || name.includes('song') || name.includes('now playing')) {
        title = value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim(); // Remove markdown links
      }
      if (name.includes('artist') || name.includes('by') || name.includes('author')) {
        artist = value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      }
    }
  }

  // Method 4: Coba ambil dari embed pertama yang ada thumbnail
  if (!title && embed.thumbnail) {
    // Beberapa music bot taruh judul di title
    if (embed.title && !embed.title.toLowerCase().includes('queue')) {
      title = embed.title;
    }
  }

  if (!title) return null;

  // Gabungkan title + artist
  if (artist && !title.toLowerCase().includes(artist.toLowerCase())) {
    return title + ' - ' + artist;
  }
  return title;
}

async function findNowPlaying(interaction) {
  const channelId = interaction.channel_id;

  // Fetch 20 pesan terakhir di channel
  let messages;
  try {
    messages = await discordFetch('/channels/' + channelId + '/messages?limit=20');
  } catch (e) {
    console.log('[DEBUG] Gagal fetch messages: ' + e.message);
    return null;
  }

  if (!messages || !messages.length) return null;

  // Cari pesan dari music bot yang punya embed "Now Playing"
  for (const msg of messages) {
    const author = msg.author || {};
    if (!isMusicBot(author.id, author.username)) continue;

    // Cek embeds
    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        const songQuery = parseSongFromEmbed(embed);
        if (songQuery) return songQuery;
      }
    }

    // Cek content (beberapa bot taruh judul di content)
    if (msg.content) {
      const match = msg.content.match(/(?:now playing|playing|listening)[:\s]*(.+)/i);
      if (match) return match[1].trim();
    }
  }

  return null;
}

const commandList = [
  {
    name: 'lirik',
    description: 'Cari lirik lagu (atau ketik nowplaying untuk lagu yang sedang diputar)',
    type: 1,
    options: [
      {
        name: 'judul',
        description: 'Judul lagu, atau "nowplaying" / "np" untuk lagu yang sedang diputar',
        type: 3,
        required: true,
      },
    ],
    defer: true,
    async execute(interaction) {
      const query = getOption(interaction, 'judul');
      const q = (query || '').trim().toLowerCase();

      let searchQuery = query;

      // Cek apakah user minta nowplaying
      if (q === 'nowplaying' || q === 'np' || q === 'now playing' || q === 'sedang diputar') {
        const songQuery = await findNowPlaying(interaction);
        if (!songQuery) {
          return {
            content: 'Tidak ditemukan lagu yang sedang diputar. Coba ketik `/lirik Judul Lagu` langsung.',
            flags: 64,
          };
        }
        searchQuery = songQuery;
      }

      const result = await searchLyrics(searchQuery);
      if (!result) return { content: 'Lirik tidak ditemukan. Coba format `/lirik Judul - Artis`.' };

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
    description: 'Tampilkan semua command yang tersedia',
    type: 1,
    execute() {
      return {
        embeds: [buildEmbed({
          title: 'Lyrics Bot - Commands',
          description: 'Bot untuk mencari lirik lagu, berjalan di Vercel serverless.',
          fields: [
            { name: '/lirik <judul>', value: 'Cari lirik lagu. Contoh: `/lirik Bohemian Rhapsody - Queen`', inline: false },
            { name: '/lirik nowplaying', value: 'Ambil lirik dari lagu yang sedang diputar di music bot', inline: false },
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

const toJSON = (cmd) => ({
  name: cmd.name,
  description: cmd.description,
  type: cmd.type,
  options: cmd.options || [],
});

module.exports = { commands: commandList, commandsJSON: commandList.map(toJSON) };
