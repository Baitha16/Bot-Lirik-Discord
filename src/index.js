require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const genius = require('genius-lyrics');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const geniusClient = new genius.Client(process.env.GENIUS_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

client.once('ready', () => {
  console.log('Bot online sebagai ' + client.user.tag);
  client.user.setActivity('/lirik <judul lagu>', { type: 3 });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('/lirik')) return;

  const query = message.content.slice(6).trim();
  if (!query) return message.reply('Gunakan: /lirik <judul lagu>');

  const loading = await message.reply('Mencari lirik...');

  try {
    let result = await tryGeniusLocal(query);
    if (!result) {
      console.log('[DEBUG] Genius gagal, coba lrclib...');
      result = await tryLrclib(query);
    }

    if (!result) return loading.edit('Lirik tidak ditemukan.');

    const truncated = result.lyrics.length > 4000 ? result.lyrics.substring(0, 4000) + '\n\n... (dipotong)' : result.lyrics;

    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle(result.title)
      .setAuthor({ name: result.artist })
      .setDescription(truncated)
      .setFooter({ text: 'Diminta oleh ' + message.author.tag + ' | Sumber: ' + result.source })
      .setTimestamp();

    if (result.thumbnail) embed.setThumbnail(result.thumbnail);
    if (result.url) embed.setURL(result.url);

    await loading.edit({ embeds: [embed] });

    const { error } = await supabase.from('lyrics_history').insert({
      user_id: message.author.id,
      user_tag: message.author.tag,
      song_title: result.title,
      artist: result.artist,
      guild_id: message.guild?.id,
      guild_name: message.guild?.name,
    });

    if (error) console.error('Supabase error:', error.message);

    const { data: resetData } = await supabase.from('reset_log').select('reset_count').order('id', { ascending: false }).limit(1).single();
    const { count } = await supabase.from('lyrics_history').select('*', { count: 'exact', head: true });

    const resetInfo = resetData ? resetData.reset_count : 0;
    const recordCount = count || 0;

    embed.setFooter({
      text: `Diminta oleh ${message.author.tag} | Sumber: ${result.source} | Log: ${recordCount}/100 | Reset: ${resetInfo}x`
    });

    await loading.edit({ embeds: [embed] });

  } catch (err) {
    console.error('ERROR:', err.message);
    loading.edit('Terjadi error saat mencari lirik.');
  }
});

client.login(process.env.DISCORD_TOKEN);
