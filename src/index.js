require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const genius = require('genius-lyrics');
const https = require('https');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const geniusClient = new genius.Client(process.env.GENIUS_API_KEY);

const commands = [
  new SlashCommandBuilder()
    .setName('lirik')
    .setDescription('Cari lirik lagu')
    .addStringOption(option =>
      option.setName('judul').setDescription('Judul lagu (atau: Judul - Artis)').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan semua command yang tersedia'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DiscordLyricsBot/1.0 (https://github.com/Baitha16/Bot-Lirik-Discord)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function cleanLyrics(text) {
  return text
    .replace(/\[\d{2}:\d{2}[\.\:]\d{2,3}\]\s*/g, '')
    .replace(/\d+ Contributors?/g, '')
    .replace(/Translations[^\n]*/g, '')
    .replace(/^[\d]+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function tryGeniusLocal(query) {
  try {
    const searches = await geniusClient.songs.search(query);
    if (!searches.length) return null;
    const song = searches[0];
    const lyrics = cleanLyrics(await song.lyrics());
    if (!lyrics || lyrics.length < 20) return null;
    return { lyrics, title: song.title, artist: song.artist.name, thumbnail: song.thumbnail, url: song.url, source: 'Genius' };
  } catch (e) {
    console.log('[DEBUG] Genius lokal gagal: ' + e.message);
    return null;
  }
}

async function tryLrclib(query) {
  try {
    const parts = query.split(' - ').map(s => s.trim());
    let url;
    if (parts.length >= 2) {
      url = 'https://lrclib.net/api/search?track_name=' + encodeURIComponent(parts[0]) + '&artist_name=' + encodeURIComponent(parts.slice(1).join(' - '));
    } else {
      url = 'https://lrclib.net/api/search?track_name=' + encodeURIComponent(query);
    }
    const results = await fetchJson(url);
    for (const r of results) {
      if (r.plainLyrics) return { lyrics: cleanLyrics(r.plainLyrics), title: r.trackName, artist: r.artistName, source: 'lrclib' };
      if (r.syncedLyrics) return { lyrics: cleanLyrics(r.syncedLyrics), title: r.trackName, artist: r.artistName, source: 'lrclib' };
    }
  } catch (e) {
    console.log('[DEBUG] lrclib gagal: ' + e.message);
  }
  return null;
}

client.once('ready', async () => {
  console.log('Bot online sebagai ' + client.user.tag);
  console.log('Bot ID: ' + client.user.id);
  client.user.setActivity('/help | /lirik', { type: 3 });

  try {
    console.log('Registering slash commands untuk application ID: ' + client.user.id);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered!');
  } catch (e) {
    console.error('Register error:', e.message);
    console.error('Full error:', e);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle('🎵 Lyrics Bot - Commands')
      .setDescription('Bot untuk mencari lirik lagu')
      .addFields(
        { name: '/lirik <judul>', value: 'Cari lirik lagu. Format: `/lirik Bohemian Rhapsody` atau `/lirik Bohemian Rhapsody - Queen`' },
        { name: '/help', value: 'Tampilkan semua command' }
      )
      .setFooter({ text: 'Powered by Genius + lrclib.net' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'lirik') {
    const query = interaction.options.getString('judul');
    await interaction.deferReply();

    try {
      let result = await tryGeniusLocal(query);
      if (!result) {
        console.log('[DEBUG] Genius gagal, coba lrclib...');
        result = await tryLrclib(query);
      }

      if (!result) return interaction.editReply('Lirik tidak ditemukan.');

      const truncated = result.lyrics.length > 4000 ? result.lyrics.substring(0, 4000) + '\n\n... (dipotong)' : result.lyrics;

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(result.title)
        .setAuthor({ name: result.artist })
        .setDescription(truncated)
        .setFooter({ text: 'Diminta oleh ' + interaction.user.tag + ' | Sumber: ' + result.source })
        .setTimestamp();

      if (result.thumbnail) embed.setThumbnail(result.thumbnail);
      if (result.url) embed.setURL(result.url);

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('ERROR:', err.message);
      interaction.editReply('Terjadi error saat mencari lirik.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Login berhasil!'))
  .catch((e) => console.error('Login gagal:', e.message));

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Lyrics Bot is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('HTTP server running on port ' + PORT);
});
