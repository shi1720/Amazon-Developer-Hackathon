import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';

// Offline submission asset generation only. No API key or AI audio enters the app.
const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.env.NARRATION_OUTPUT || path.join(root, 'work/video/audio'));
const script = JSON.parse(await readFile(path.join(root, 'docs/deliverables/Narration-segments.json'), 'utf8'));
if (script.segments.map((s) => s.text).join(' ').split(/\s+/).length > 350)
  throw new Error('The film narration must remain under 350 words.');

let apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && process.argv.includes('--stdin-key')) {
  const hidden = Boolean(process.stdin.isTTY);
  if (hidden) execFileSync('stty', ['-echo'], { stdio: ['inherit', 'ignore', 'ignore'] });
  const input = createInterface({ input: process.stdin, terminal: false });
  console.log('Waiting for the supplied API key on secure standard input. It will not be saved.');
  try { apiKey = (await new Promise((resolve) => input.once('line', resolve))).trim(); }
  finally {
    input.close();
    if (hidden) execFileSync('stty', ['echo'], { stdio: ['inherit', 'ignore', 'ignore'] });
  }
}
if (!apiKey?.startsWith('sk-')) throw new Error('Provide OPENAI_API_KEY or --stdin-key.');
await mkdir(output, { recursive: true });
const metadata = [];
const model = 'gpt-4o-mini-tts';
const voice = 'cedar';
const instructions = `${script.speech_direction} Sound like a thoughtful product presenter explaining a real interface. Calm confidence, natural human pacing around 125 words per minute, crisp consonants. Avoid a sales announcer tone. Read only the supplied words.`;
async function checkedFetch(endpoint, init) {
  const response = await fetch(`https://api.openai.com/v1/audio/${endpoint}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    // Do not log a provider response that might echo request credentials.
    throw new Error(`OpenAI ${endpoint} returned HTTP ${response.status}.`);
  }
  return response;
}
for (const segment of script.segments) {
  const wav = path.join(output, `${segment.id}.wav`);
  const transcriptPath = path.join(output, `${segment.id}.json`);
  const fingerprint = createHash('sha256').update(JSON.stringify({ model, voice, instructions, text: segment.text })).digest('hex');
  let cached;
  try { cached = JSON.parse(await readFile(transcriptPath, 'utf8')); } catch { /* First render. */ }
  if (cached?.fingerprint === fingerprint) {
    metadata.push(cached);
    console.log(`${segment.id}: reused verified narration source.`);
    continue;
  }
  const response = await checkedFetch('speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: segment.text, instructions, response_format: 'wav' }),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Expected WAV output.');
  await writeFile(wav, bytes);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/wav' }), `${segment.id}.wav`);
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');
  form.append('prompt', 'KindHandoff, Shivam Gupta, Maya, Arun, Jo, Dev, MCP, Streamable HTTP, Firebase, Alexa.');
  const transcript = await (await checkedFetch('transcriptions', { method: 'POST', body: form })).json();
  const entry = { id: segment.id, fingerprint, model, voice, text: segment.text, file: path.basename(wav), transcript };
  await writeFile(transcriptPath, JSON.stringify(entry, null, 2) + '\n');
  metadata.push(entry);
  console.log(`${segment.id}: ${transcript.duration.toFixed(1)} seconds, ${transcript.words.length} timestamped words.`);
}
apiKey = undefined;
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ disclosure: script.disclosure, segments: metadata }, null, 2) + '\n');
console.log(`Narration and word timestamps written to ${output}.`);
