'use strict';

const { searchLyrics, searchArtist } = require('./lyrics');
const { discordFetch, buildEmbed, getUserName } = require('./helpers');

// Daftar music bot yang dikenal (ID + nama) - Verified dari top.gg/Discord
const MUSIC_BOTS = [
  { id: '975048280926982164', name: 'Grobot' },
  // Jockie Music (4 instances)
  { id: '411916947773587456', name: 'Jockie Music' },
  { id: '819222665028604969', name: 'Jockie Music 2' },
  { id: '412347553141751808', name: 'Jockie Music 3' },
  // { id: '473287938564888587', name: 'Jockie Music 4' }, // unverified
  { id: '184405311681986560', name: 'FredBoat' },
  { id: '547905866255433758', name: 'Hydra' },
  { id: '282859044593598464', name: 'ProBot' },
  { id: '235088799074484224', name: 'Rythm' },
  { id: '159985870458322944', name: 'MEE6' },
  { id: '890343617762304070', name: 'SoundCloud' },
  { id: '834847569476845648', name: 'Soundify' },
  { id: '1259530981526868048', name: 'Cloudy' },
  { id: '684773505157431347', name: 'FlaviBot' },
  { id: '1013571395000733726', name: 'LunaBot' },
  { id: '944016826751389717', name: 'Lara' },
  { id: '1145363441524166758', name: 'Matchbox' },
  { id: '777401960793636934', name: 'Listen' },
];

const MUSIC_BOT_NAMES = [
  'grobot', 'jockie', 'fredboat', 'hydra', 'probot', 'rythm', 'mee6',
  'soundcloud', 'soundify', 'cloudy', 'flavibot', 'lunabot', 'lara',
  'matchbox', 'listen', 'music', 'play', 'jukebox', 'dj',
  'jockie music', 'music bot', 'musicbot',
];

function isMusicBot(userId, username) {
  const uid = String(userId || '');
  const uname = String(username || '').toLowerCase();
  if (MUSIC_BOTS.some(bot => bot.id === uid)) return true;
  if (MUSIC_BOT_NAMES.some(name => uname.includes(name))) return true;
  return false;
}

function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) -> text
    .replace(/<[^>]+>/g, '')                      // <@123> -> remove
    .replace(/https?:\/\/\S+/g, '')               // URLs
    .replace(/🎵|🎶|▶|⏸|🔴|🟢|🎧|🎶/g, '')     // emoji
    .replace(/^#+\s*/, '')                        // ## heading
    .replace(/\*\*/g, '')                         // bold **text**
    .replace(/`/g, '')                            // code
    .trim();
}

function cleanSongText(text) {
  if (!text) return '';
  let clean = cleanMarkdown(text);
  
  // Hapus prefix umum (case insensitive)
  clean = clean.replace(/^(?:now playing|playing|listening|started playing|currently playing|song|track|music)[:\s]*/i, '');
  
  // Hapus isi dalam kurung [text] dan (text)
  clean = clean.replace(/\s*\([^)]*\)\s*/g, ' ');
  clean = clean.replace(/\s*\[[^\]]*\]\s*/g, ' ');
  
  // Hapus suffix/extra info setelah title
  clean = clean.replace(/\s*[-—–|]\s*(?:requested by|added by|duration|album|queue|position|source|platform|spotify|youtube|soundcloud|up next|by\s).*/i, '');
  clean = clean.replace(/\s*\d+:\d+\s*$/i, '');   // 3:45 at end
  clean = clean.replace(/\s*🎵\s*$/i, '');         // trailing emoji
  clean = clean.replace(/\s*🎶\s*$/i, '');
  clean = clean.replace(/\s*🎧\s*$/i, '');
  clean = clean.replace(/\s*▶\s*$/i, '');
  
  // Hapus text "by Artist" di akhir jika ada
  clean = clean.replace(/\s+by\s+.+$/i, '');
  
  // Bersihkan spasi berlebih
  clean = clean.replace(/\s{2,}/g, ' ').trim();
  
  return clean;
}

function parseSongFromEmbed(embed) {
  if (!embed) return null;
  let title = '';
  let artist = '';

  // 1. Cek fields dulu (paling reliable)
  if (embed.fields) {
    for (const field of embed.fields) {
      const name = (field.name || '').toLowerCase();
      const rawValue = field.value || '';
      const cleanValue = cleanSongText(rawValue);
      
      if (!cleanValue) continue;
      
      // Skip fields yang bukan title/artist
      if (name.match(/duration|queue|position|source|platform|requested|added by|up next|album|repeat|shuffle|loop|volume|bitrate|connected|status|paused|stopped|lyrics|help|command|prefix|language|settings|config|length|progress|next|repeat|mode|playback/)) {
        continue;
      }
      
      // Artist/Author/By/Singer/Composer/Producer
      if (name.match(/artist|^by$|author|singer|composer|producer|featuring|feat/)) {
        if (!artist) artist = cleanValue;
        console.log('[NP] field artist: "' + name + '" = "' + cleanValue + '"');
      }
      // Title/Track/Song/Name
      else if (name.match(/title|track|song|^name$|now playing|currently/)) {
        if (!title) title = cleanValue;
        console.log('[NP] field title: "' + name + '" = "' + cleanValue + '"');
      }
    }
  }

  // 2. Cek footer untuk artist (FredBoat: "Source: Artist")
  if (!artist && embed.footer && embed.footer.text) {
    const footerMatch = embed.footer.text.match(/(?:source|artist|by|from)[:\s]*(.+)/i);
    if (footerMatch) {
      artist = cleanSongText(footerMatch[1]);
      console.log('[NP] footer artist: "' + embed.footer.text + '" -> "' + artist + '"');
    }
  }

  // 3. Cek description (Jockie: [Title](URL))
  if (!title && embed.description) {
    let cleanDesc = cleanSongText(embed.description);
    
    // Skip kalau description cuma progress bar atau terlalu pendek/panjang
    if (cleanDesc.match(/^[\s\d:\/\-\.▶⏸ progress\[\]]+$/i) || cleanDesc.length < 3 || cleanDesc.length > 200) {
      console.log('[NP] desc skipped: "' + cleanDesc.substring(0, 50) + '"');
    } else {
      title = cleanDesc;
      console.log('[NP] parseSong desc: "' + cleanDesc.substring(0, 80) + '"');
    }
  }

  // 4. Cek embed title (FredBoat: Title di embed title)
  if (!title && embed.title) {
    let cleanTitle = cleanSongText(embed.title);
    // Skip label umum
    if (cleanTitle.match(/^(now playing|playing|listening|queue|playlist|search|up next|currently playing)$/i)) {
      console.log('[NP] title skipped label: "' + cleanTitle + '"');
    } else {
      title = cleanTitle;
    }
    console.log('[NP] parseSong title: "' + embed.title + '" -> "' + title + '"');
  }

  // 5. Fallback: title dengan thumbnail
  if (!title && embed.thumbnail && embed.title) {
    title = cleanSongText(embed.title);
    console.log('[NP] parseSong fallback thumbnail: "' + title + '"');
  }

  if (!title) {
    console.log('[NP] parseSong: no title found');
    return null;
  }
  
  // Final cleanup
  title = title.replace(/🎵|🎶|▶|⏸|🔴|🟢|🎧|🎶/g, '').trim();
  
  // Jika title kosong setelah cleanup
  if (!title || title.length < 2) return null;
  
  // Bersihkan artist dari karakter yang tidak perlu
  if (artist) {
    artist = artist.replace(/[()[\]]/g, '').trim();
    if (artist.length > 60 || artist.match(/https?:|\/\//)) {
      artist = '';
    }
  }
  
  // Bersihkan title
  title = title.replace(/[()[\]]/g, '').trim();
  if (title.length > 100 || title.match(/https?:|\/\//)) {
    title = title.split(/\s*[-—–|]\s*/)[0].trim();
  }
  
  // Jika artist sudah ada di title, jangan gabung
  if (artist && title.toLowerCase().includes(artist.toLowerCase())) {
    return title;
  }
  
  if (artist) {
    return title + ' - ' + artist;
  }
  return title;
}

async function findNowPlaying(interaction) {
  // 1. Cek apakah user reply ke pesan
  const repliedTo = interaction.data && interaction.data.resolved && interaction.data.resolved.messages;
  if (repliedTo) {
    const msgIds = Object.keys(repliedTo);
    for (const msgId of msgIds) {
      const msg = repliedTo[msgId];
      if (msg.embeds && msg.embeds.length > 0) {
        for (const embed of msg.embeds) {
          const songQuery = parseSongFromEmbed(embed);
          if (songQuery) {
            console.log('[NP] Lagu dari reply: ' + songQuery);
            return songQuery;
          }
        }
      }
      // Cek content
      if (msg.content) {
        const match = msg.content.match(/(?:now playing|playing|listening|currently playing|started playing)[:\s]*(.+)/i);
        if (match) {
          console.log('[NP] Lagu dari reply content: ' + match[1].trim());
          return match[1].trim();
        }
      }
    }
  }

  // 2. Scan channel messages
  const channelId = interaction.channel_id;
  let messages;
  try {
    messages = await discordFetch('/channels/' + channelId + '/messages?limit=30');
  } catch (e) {
    console.log('[NP] Gagal fetch messages: ' + e.message);
    return null;
  }
  if (!messages || !messages.length) {
    console.log('[NP] Tidak ada pesan ditemukan di channel ' + channelId);
    return null;
  }

  console.log('[NP] Ditemukan ' + messages.length + ' pesan di channel ' + channelId);

  // Cari dari message terbaru ke lama
  for (const msg of messages) {
    const author = msg.author || {};
    if (!author.bot) continue;
    
    const isBot = isMusicBot(author.id, author.username);
    if (!isBot) continue;
    
    console.log('[NP] Music bot terdeteksi: ' + author.username + ' (ID: ' + author.id + ')');
    
    // Cek embeds
    if (msg.embeds && msg.embeds.length > 0) {
      for (let i = 0; i < msg.embeds.length; i++) {
        const embed = msg.embeds[i];
        console.log('[NP] Embed #' + i + ': title=' + (embed.title || 'null') + ', desc=' + (embed.description || 'null').substring(0, 100));
        
        const songQuery = parseSongFromEmbed(embed);
        if (songQuery) {
          console.log('[NP] ✓ Lagu ditemukan: ' + songQuery);
          return songQuery;
        }
      }
    }
    
    // Cek content (pesan teks)
    if (msg.content) {
      const match = msg.content.match(/(?:now playing|playing|listening|currently playing|started playing)[:\s]*(.+)/i);
      if (match) {
        console.log('[NP] ✓ Lagu dari content: ' + match[1].trim());
        return match[1].trim();
      }
    }
  }
  
  console.log('[NP] ✗ Tidak ada lagu ditemukan dari music bot');
  return null;
}

// Command JSON (simple, tanpa subcommand)
const commandsJSON = [
  {
    name: 'lirik',
    description: 'Cari lirik lagu',
    type: 1,
    options: [
      {
        name: 'judul',
        description: 'Judul lagu. Contoh: "Judul Lagu" atau "Judul Lagu - Artist"',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'np',
    description: 'Ambil lirik lagu yang sedang diputar (bisa reply embed)',
    type: 1,
  },
  {
    name: 'nowplaying',
    description: 'Ambil lirik lagu yang sedang diputar (bisa reply embed)',
    type: 1,
  },
  {
    name: 'artist',
    description: 'Cari info artis & lagu terpopulernya',
    type: 1,
    options: [
      { name: 'nama', description: 'Nama artis / band', type: 3, required: true },
    ],
  },
  {
    name: 'ping',
    description: 'Cek latensi bot ke API Discord',
    type: 1,
  },
  {
    name: 'status',
    description: 'Info bot & sumber lirik',
    type: 1,
  },
  {
    name: 'help',
    description: 'Tampilkan semua command yang tersedia',
    type: 1,
  },
];

// Command handlers
const commandList = [
  {
    name: 'lirik',
    defer: true,
    async execute(interaction) {
      const judulOpt = interaction.data.options ? interaction.data.options.find(o => o.name === 'judul') : null;
      const query = judulOpt ? judulOpt.value : '';
      const q = (query || '').trim().toLowerCase();

      console.log('[CMD] /lirik query: "' + query + '"');

      // Cek apakah user reply ke pesan (bisa dari music bot)
      const repliedTo = interaction.data && interaction.data.resolved && interaction.data.resolved.messages;
      if (repliedTo) {
        const msgIds = Object.keys(repliedTo);
        for (const msgId of msgIds) {
          const msg = repliedTo[msgId];
          // Cek embeds
          if (msg.embeds && msg.embeds.length > 0) {
            for (const embed of msg.embeds) {
              const songQuery = parseSongFromEmbed(embed);
              if (songQuery) {
                console.log('[CMD] /lirik: reply embed song: ' + songQuery);
                const result = await searchLyrics(songQuery);
                if (result) {
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
                }
              }
            }
          }
          // Cek content
          if (msg.content) {
            const match = msg.content.match(/(?:now playing|playing|listening|currently playing|started playing)[:\s]*(.+)/i);
            if (match) {
              const songQuery = match[1].trim();
              console.log('[CMD] /lirik: reply content song: ' + songQuery);
              const result = await searchLyrics(songQuery);
              if (result) {
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
              }
            }
          }
        }
        return { content: 'Tidak ditemukan lagu dari pesan yang di-reply. Coba `/lirik Judul Lagu` langsung.', flags: 64 };
      }

      if (!query.trim()) {
        return { content: 'Judul lagu harus diisi. Atau reply embed music bot dengan `/lirik`.', flags: 64 };
      }

      // Fallback: handle nowplaying/np dari /lirik juga
      if (q === 'nowplaying' || q === 'np' || q === 'now playing' || q === 'sedang diputar') {
        console.log('[CMD] /lirik: detected nowplaying query');
        const songQuery = await findNowPlaying(interaction);
        if (songQuery) {
          console.log('[CMD] /lirik: found song: ' + songQuery);
          const result = await searchLyrics(songQuery);
          if (result) {
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
          }
        }
        return { content: 'Tidak ditemukan lagu yang sedang diputar. Coba `/lirik Judul Lagu` langsung.', flags: 64 };
      }

      const result = await searchLyrics(query);
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
    name: 'np',
    defer: true,
    async execute(interaction) {
      console.log('[CMD] /np called');
      const songQuery = await findNowPlaying(interaction);
      if (!songQuery) {
        console.log('[CMD] /np: Tidak ada lagu ditemukan');
        return {
          content: 'Tidak ditemukan lagu yang sedang diputar. Pastikan music bot sedang memutar lagu dan bot ini punya izin **Read Message History**.',
          flags: 64,
        };
      }
      console.log('[CMD] /np: Lagu ditemukan: ' + songQuery);

      const result = await searchLyrics(songQuery);
      if (!result) return { content: 'Lirik tidak ditemukan untuk: **' + songQuery + '**' };

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
    name: 'nowplaying',
    defer: true,
    async execute(interaction) {
      console.log('[CMD] /nowplaying called');
      const songQuery = await findNowPlaying(interaction);
      if (!songQuery) {
        console.log('[CMD] /nowplaying: Tidak ada lagu ditemukan');
        return {
          content: 'Tidak ditemukan lagu yang sedang diputar. Pastikan music bot sedang memutar lagu dan bot ini punya izin **Read Message History**.',
          flags: 64,
        };
      }
      console.log('[CMD] /nowplaying: Lagu ditemukan: ' + songQuery);

      const result = await searchLyrics(songQuery);
      if (!result) return { content: 'Lirik tidak ditemukan untuk: **' + songQuery + '**' };

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
    defer: true,
    async execute(interaction) {
      const namaOpt = interaction.data.options ? interaction.data.options.find(o => o.name === 'nama') : null;
      const query = namaOpt ? namaOpt.value : '';
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
    execute() {
      return {
        embeds: [buildEmbed({
          title: 'Lyrics Bot - Commands',
          fields: [
            { name: '/lirik <judul>', value: 'Cari lirik lagu. Contoh: `/lirik Judul Lagu` atau `/lirik Judul Lagu - Artist`', inline: false },
            { name: '/lirik nowplaying', value: 'Ambil lirik dari lagu yang sedang diputar (fallback)', inline: false },
            { name: '/np', value: 'Ambil lirik lagu yang sedang diputar (bisa reply embed)', inline: false },
            { name: '/nowplaying', value: 'Sama seperti /np', inline: false },
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

module.exports = { commands: commandList, commandsJSON };
