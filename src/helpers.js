'use strict';

const nacl = require('tweetnacl');

const DISCORD_API = 'https://discord.com/api/v10';
const USER_AGENT = 'DiscordBot (https://github.com/Baitha16/Bot-Lirik-Discord, 2.0.0)';

function getPublicKey() {
  const key = process.env.DISCORD_PUBLIC_KEY;
  if (!key) throw new Error('DISCORD_PUBLIC_KEY belum diatur');
  return key;
}

function verifyRequest(signature, timestamp, rawBody) {
  if (!signature || !timestamp) return false;
  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody, 'utf8'),
      Buffer.from(signature, 'hex'),
      Buffer.from(getPublicKey(), 'hex')
    );
  } catch (e) {
    console.error('Verifikasi signature gagal: ' + e.message);
    return false;
  }
}

async function discordFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(DISCORD_API + path, {
    method,
    headers: {
      Authorization: 'Bot ' + process.env.DISCORD_TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Discord API ' + res.status + ': ' + text.slice(0, 200));
  }
  return res.json();
}

async function editOriginalReply(interaction, payload) {
  const path = '/webhooks/' + interaction.application_id + '/' + interaction.token + '/messages/@original';
  await discordFetch(path, { method: 'PATCH', body: payload });
}

function buildEmbed({ title, description, author, thumbnail, url, fields, footer, color }) {
  const embed = { color: color || 0x1db954, timestamp: new Date().toISOString() };
  if (title) embed.title = title;
  if (description) embed.description = description;
  if (author) embed.author = { name: author };
  if (thumbnail) embed.thumbnail = { url: thumbnail };
  if (url) embed.url = url;
  if (fields && fields.length) embed.fields = fields;
  if (footer) embed.footer = { text: footer };
  return embed;
}

function getUserName(interaction) {
  const user = interaction.user || (interaction.member && interaction.member.user) || {};
  return user.global_name || user.username || 'pengguna';
}

function deferResponse() {
  return { type: 5 };
}

function messageResponse(content, embeds, flags) {
  const data = {};
  if (content) data.content = content;
  if (embeds && embeds.length) data.embeds = embeds;
  if (flags) data.flags = flags;
  return { type: 4, data };
}

module.exports = {
  verifyRequest,
  discordFetch,
  editOriginalReply,
  buildEmbed,
  getUserName,
  deferResponse,
  messageResponse,
};
