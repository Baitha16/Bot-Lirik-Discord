'use strict';

const genius = require('genius-lyrics');

const USER_AGENT = 'DiscordLyricsBot/2.0 (https://github.com/Baitha16/Bot-Lirik-Discord)';

let geniusClient;
function getGeniusClient() {
  if (!geniusClient && process.env.GENIUS_API_KEY) {
    geniusClient = new genius.Client(process.env.GENIUS_API_KEY);
  }
  return geniusClient;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function cleanLyrics(text) {
  return String(text || '')
    .replace(/\[\d{2}:\d{2}[.\:]\d{2,3}\]\s*/g, '')
    .replace(/\d+ Contributors?/g, '')
    .replace(/Translations[^\n]*/g, '')
    .replace(/^[\d]+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Source 1: Genius API
async function tryGenius(query) {
  const client = getGeniusClient();
  if (!client) return null;
  try {
    const searches = await client.songs.search(query);
    if (!searches.length) return null;
    const song = searches[0];
    const lyrics = cleanLyrics(await song.lyrics());
    if (!lyrics || lyrics.length < 20) return null;
    return {
      lyrics,
      title: song.title,
      artist: song.artist.name,
      thumbnail: song.image || song.thumbnail,
      url: song.url,
      source: 'Genius',
    };
  } catch (e) {
    console.log('[DEBUG] Genius gagal: ' + e.message);
    return null;
  }
}

// Source 2: lrclib.net
async function tryLrclib(query) {
  try {
    const parts = query.split(' - ').map((s) => s.trim());
    let url;
    if (parts.length >= 2) {
      url = 'https://lrclib.net/api/search?track_name=' + encodeURIComponent(parts[0]) + '&artist_name=' + encodeURIComponent(parts.slice(1).join(' - '));
    } else {
      url = 'https://lrclib.net/api/search?track_name=' + encodeURIComponent(query);
    }
    const results = await fetchJson(url);
    for (const r of results) {
      const raw = r.plainLyrics || r.syncedLyrics;
      if (raw) {
        return { lyrics: cleanLyrics(raw), title: r.trackName, artist: r.artistName, source: 'lrclib' };
      }
    }
  } catch (e) {
    console.log('[DEBUG] lrclib gagal: ' + e.message);
  }
  return null;
}

// Source 3: lrcmux.dev
async function tryLrcmux(query) {
  try {
    const parts = query.split(' - ').map((s) => s.trim());
    let artist = '';
    let track = query;
    if (parts.length >= 2) {
      track = parts[0];
      artist = parts.slice(1).join(' - ');
    }

    let url;
    if (artist) {
      url = 'https://lrcmux.dev/api/search?q=' + encodeURIComponent(track + ' ' + artist);
    } else {
      url = 'https://lrcmux.dev/api/search?q=' + encodeURIComponent(track);
    }

    const results = await fetchJson(url);
    if (!results || !results.length) return null;

    for (const r of results) {
      const raw = r.lyrics || r.plainLyrics || r.syncedLyrics;
      if (raw) {
        return {
          lyrics: cleanLyrics(raw),
          title: r.trackName || r.title || track,
          artist: r.artistName || r.artist || artist,
          source: 'lrcmux',
        };
      }
    }
  } catch (e) {
    console.log('[DEBUG] lrcmux gagal: ' + e.message);
  }
  return null;
}

// Source 4: Better Lyrics API
async function tryBetterLyrics(query) {
  try {
    const parts = query.split(' - ').map((s) => s.trim());
    let artist = '';
    let track = query;
    if (parts.length >= 2) {
      track = parts[0];
      artist = parts.slice(1).join(' - ');
    }

    const url = 'https://lyrics-api.boidu.dev/getLyrics?s=' + encodeURIComponent(track) + '&a=' + encodeURIComponent(artist);
    const result = await fetchJson(url);

    if (result && result.lyrics) {
      return {
        lyrics: cleanLyrics(result.lyrics),
        title: result.song || result.title || track,
        artist: result.artist || artist,
        source: 'BetterLyrics',
      };
    }
  } catch (e) {
    console.log('[DEBUG] BetterLyrics gagal: ' + e.message);
  }
  return null;
}

// Main search: Genius → lrclib → lrcmux → BetterLyrics
async function searchLyrics(query) {
  let result = await tryGenius(query);
  if (result) return result;

  console.log('[DEBUG] Genius tidak menemukan, coba lrclib...');
  result = await tryLrclib(query);
  if (result) return result;

  console.log('[DEBUG] lrclib tidak menemukan, coba lrcmux...');
  result = await tryLrcmux(query);
  if (result) return result;

  console.log('[DEBUG] lrcmux tidak menemukan, coba BetterLyrics...');
  result = await tryBetterLyrics(query);
  return result;
}

async function searchArtist(query) {
  const client = getGeniusClient();
  if (!client) return null;
  try {
    const raw = await client.api.get('/search?q=' + encodeURIComponent(query));
    const parsed = JSON.parse(raw);
    const hits = parsed.response && parsed.response.hits ? parsed.response.hits : [];

    let artist = null;
    const artistHit = hits.find((h) => h.type === 'artist');
    const songHit = hits.find((h) => h.type === 'song');
    if (artistHit) artist = new genius.Artist(client, artistHit.result, true);
    else if (songHit && songHit.result && songHit.result.primary_artist) {
      artist = new genius.Artist(client, songHit.result.primary_artist, true);
    }
    if (!artist) return null;

    const songs = await artist.songs({ sort: 'popularity', perPage: 10 });
    return {
      name: artist.name,
      url: artist.url,
      image: artist.image || artist.thumbnail,
      songs: songs.map((s) => ({ title: s.title, url: s.url })),
    };
  } catch (e) {
    console.log('[DEBUG] Cari artis gagal: ' + e.message);
    return null;
  }
}

module.exports = { searchLyrics, searchArtist, cleanLyrics };
