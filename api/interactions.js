'use strict';

const { waitUntil } = require('@vercel/functions');
const { verifyRequest, deferResponse, messageResponse, editOriginalReply } = require('../src/helpers');
const { commands } = require('../src/commands');

async function readRawBody(req) {
  if (req.rawBody) return req.rawBody;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function runDeferred(command, interaction) {
  try {
    const payload = await command.execute(interaction);
    await editOriginalReply(interaction, payload);
  } catch (e) {
    console.error('Follow-up command /' + command.name + ' gagal:', e);
    try {
      await editOriginalReply(interaction, { content: 'Terjadi error saat memproses command. Coba lagi nanti.' });
    } catch (_) { /* abaikan */ }
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', bot: 'Discord Lyrics Bot', serverless: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let rawBody;
  let interaction;
  try {
    rawBody = await readRawBody(req);
    interaction = JSON.parse(rawBody);
  } catch (e) {
    res.status(400).json({ error: 'Body tidak valid' });
    return;
  }

  if (!verifyRequest(req.headers['x-signature-ed25519'], req.headers['x-signature-timestamp'], rawBody)) {
    res.status(401).json({ error: 'Signature tidak valid' });
    return;
  }

  if (interaction.type === 1) {
    res.status(200).json({ type: 1 });
    return;
  }

  if (interaction.type !== 2) {
    res.status(200).json({ type: 1 });
    return;
  }

  console.log('[INTERACTION] Received type=' + interaction.type + ', data=' + JSON.stringify(interaction.data));

  const command = commands.find((c) => interaction.data && c.name === interaction.data.name);
  if (!command) {
    console.log('[INTERACTION] Command not found: ' + (interaction.data ? interaction.data.name : 'null'));
    console.log('[INTERACTION] Available commands: ' + commands.map(c => c.name).join(', '));
    res.status(200).json(messageResponse('Command tidak dikenal. Gunakan `/help`.', null, 64));
    return;
  }

  if (command.defer) {
    waitUntil(runDeferred(command, interaction));
    res.status(200).json(deferResponse());
    return;
  }

  try {
    const payload = await command.execute(interaction);
    res.status(200).json(messageResponse(payload.content, payload.embeds));
  } catch (e) {
    console.error('Command /' + command.name + ' gagal:', e);
    res.status(200).json(messageResponse('Terjadi error saat memproses command.', null, 64));
  }
};
