require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const genius = require('genius-lyrics');
const { createClient } = require('@supabase/supabase-js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const geniusClient = new genius.Client(process.env.GENIUS_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

client.once('ready', () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);
  console.log(`✅ Bot ID: ${client.user.id}`);
  console.log(`✅ Guilds: ${client.guilds.cache.size}`);
  client.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (${guild.id})`);
  });
  client.user.setActivity('/lirik <judul lagu>', { type: 3 });
});

client.on('messageCreate', async (message) => {
  console.log(`[DEBUG] Pesan dari ${message.author.tag}: ${message.content}`);
  if (message.author.bot) return;
  if (!message.content.startsWith('/lirik')) return;

  const query = message.content.slice(6).trim();
  console.log(`[DEBUG] Query: ${query}`);
  if (!query) {
    return message.reply('❌ Gunakan: `/lirik <judul lagu>`');
  }

  const loading = await message.reply('🔍 Mencari lirik...');

  try {
    console.log(`[DEBUG] Searching Genius for: ${query}`);
    const searches = await geniusClient.songs.search(query);
    if (!searches.length) {
      console.log('[DEBUG] No songs found');
      return loading.edit('❌ Lirik tidak ditemukan.');
    }

    const song = searches[0];
    console.log(`[DEBUG] Found: ${song.title} - ${song.artist.name}`);
    const lyrics = await song.lyrics();
    console.log(`[DEBUG] Lyrics length: ${lyrics.length}`);

    const truncatedLyrics = lyrics.length > 4000
      ? lyrics.substring(0, 4000) + '\n\n... (lirik dipotong)'
      : lyrics;

    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle(`🎵 ${song.title}`)
      .setAuthor({ name: song.artist.name })
      .setDescription(truncatedLyrics)
      .setThumbnail(song.thumbnail)
      .setURL(song.url)
      .setFooter({ text: `Diminta oleh ${message.author.tag}` })
      .setTimestamp();

    console.log('[DEBUG] Sending embed...');
    await loading.edit({ embeds: [embed] });
    console.log('[DEBUG] Embed sent!');

    console.log('[DEBUG] Inserting to Supabase...');
    const { error } = await supabase.from('lyrics_history').insert({
      user_id: message.author.id,
      user_tag: message.author.tag,
      song_title: song.title,
      artist: song.artist.name,
      guild_id: message.guild?.id,
      guild_name: message.guild?.name,
    });

    if (error) {
      console.error('[DEBUG] Supabase error:', error.message);
    } else {
      console.log('[DEBUG] Supabase insert success!');
    }

  } catch (err) {
    console.error('[DEBUG] ERROR:', err.message);
    loading.edit('❌ Terjadi error saat mencari lirik.');
  }
});

client.login(process.env.DISCORD_TOKEN);
