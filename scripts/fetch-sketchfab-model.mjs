#!/usr/bin/env node
/**
 * fetch-sketchfab-model.mjs
 *
 * Pulls a single GLB model from Sketchfab into /public/models/ using the
 * Sketchfab Data API v3. Handles authentication, license checking,
 * attribution logging, and streaming the binary download.
 *
 *   node scripts/fetch-sketchfab-model.mjs <UID> [output-name]
 *
 * Examples:
 *   node scripts/fetch-sketchfab-model.mjs a1b2c3d4e5f67890abcdef1234567890
 *   node scripts/fetch-sketchfab-model.mjs a1b2c3d4e5f67890abcdef1234567890 stained-glass
 *
 * The UID is the long hex string at the end of a Sketchfab model URL:
 *   https://sketchfab.com/3d-models/some-model-name-<THIS-PART>
 *
 * Requires SKETCHFAB_API_TOKEN in .env.local (already populated by the
 * Credentials Bootstrap step — see the immersive-3D system file Part 4).
 *
 * License safety: the script refuses to download models flagged as
 * non-downloadable, and prints the license name before fetching so you can
 * confirm it's compatible with this project's commercial use. CC-BY-NC is a
 * red flag for any client work and gets flagged in the console.
 *
 * Attribution: every successful fetch appends a record to
 * public/models/ATTRIBUTIONS.json with the author, license, source URL, and
 * fetch timestamp. CC-BY models legally require credit somewhere on the site;
 * this file is the source of truth for what needs crediting.
 *
 * Why this script: the Cowork sandbox doesn't have your Sketchfab credentials
 * and can't run authenticated fetches reliably; this script runs on your Mac
 * in ~30 seconds and produces a clean GLB in the right folder. Run from the
 * project root.
 */

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Tiny inline .env.local reader. Keeps this script dependency-free, matching
// the style of fetch-images.mjs. Only supports `KEY=value` lines; comments
// and blank lines are ignored. No quotes/escapes handled — we don't need them
// for the keys this script reads.
// ---------------------------------------------------------------------------
async function loadEnvLocal() {
  const envPath = join(PROJECT_ROOT, '.env.local');
  try {
    const text = await readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local optional — keys may be set in the parent environment.
  }
}

await loadEnvLocal();

const TOKEN = process.env.SKETCHFAB_API_TOKEN;
const [, , UID, OUTPUT_NAME] = process.argv;

if (!TOKEN) {
  console.error('✗ Missing SKETCHFAB_API_TOKEN.');
  console.error('  Expected in .env.local (mirrored from _SECRETS/.env.shared).');
  process.exit(1);
}
if (!UID) {
  console.error('Usage: node scripts/fetch-sketchfab-model.mjs <UID> [output-name]');
  console.error('  UID = the hex string at the end of a Sketchfab model URL.');
  process.exit(1);
}

const API = 'https://api.sketchfab.com/v3';
const headers = { Authorization: `Token ${TOKEN}` };

// ---------------------------------------------------------------------------
// License safety classification.
// ---------------------------------------------------------------------------
const RED_FLAG_LICENSES = new Set([
  'CC Attribution-NonCommercial',
  'CC Attribution-NonCommercial-NoDerivs',
  'CC Attribution-NonCommercial-ShareAlike',
  'Editorial', // Sketchfab's "Editorial only" — not for commercial sites
]);

function classify(license) {
  if (!license) return { tier: 'unknown', note: 'License not provided by API' };
  const label = license.label ?? '';
  if (label.includes('CC0')) return { tier: 'safe', note: 'CC0 — no attribution required, commercial OK' };
  if (label.includes('NonCommercial')) return { tier: 'red', note: 'NON-COMMERCIAL — not safe for client work' };
  if (label.includes('Editorial')) return { tier: 'red', note: 'EDITORIAL ONLY — not safe for commercial use' };
  if (label.startsWith('CC Attribution')) return { tier: 'attribution', note: 'Attribution required — logged to ATTRIBUTIONS.json' };
  if (label.includes('Standard') || label.includes('Custom')) return { tier: 'purchased', note: 'Store license — confirm purchase covers this use' };
  return { tier: 'unknown', note: `Unknown license: ${label}` };
}

// ---------------------------------------------------------------------------
// 1. Fetch model metadata.
// ---------------------------------------------------------------------------
console.log('');
console.log(`Awakening Adventures — fetching Sketchfab model ${UID}`);
console.log('');

const metaRes = await fetch(`${API}/models/${UID}`, { headers });
if (!metaRes.ok) {
  console.error(`✗ Metadata fetch failed: HTTP ${metaRes.status} ${metaRes.statusText}`);
  console.error(`  ${await metaRes.text()}`);
  process.exit(1);
}
const info = await metaRes.json();
const license = info.license;
const classification = classify(license);

console.log(`  Model:        ${info.name}`);
console.log(`  Author:       ${info.user?.displayName ?? '(unknown)'}`);
console.log(`  Source URL:   ${info.viewerUrl ?? `https://sketchfab.com/3d-models/${UID}`}`);
console.log(`  License:      ${license?.label ?? 'unknown'}`);
console.log(`  Status:       ${classification.note}`);
console.log(`  Downloadable: ${info.isDownloadable ? 'yes' : 'NO'}`);
console.log('');

if (!info.isDownloadable) {
  console.error('✗ Author has not flagged this model as downloadable. Cannot fetch via API.');
  process.exit(1);
}

if (classification.tier === 'red') {
  console.error('✗ License is NOT safe for commercial use. Refusing to download.');
  console.error('  Awakening Adventures is a commercial site. Use a CC0 / CC-BY model instead.');
  process.exit(1);
}

if (classification.tier === 'unknown') {
  console.warn('⚠ License classification is unclear. Review manually before using on the site.');
  console.warn('  Proceeding with download — you decide whether to commit the result.');
}

// ---------------------------------------------------------------------------
// 2. Request a temporary download URL.
// ---------------------------------------------------------------------------
const dlRes = await fetch(`${API}/models/${UID}/download`, { headers });
if (!dlRes.ok) {
  console.error(`✗ Download request failed: HTTP ${dlRes.status} ${dlRes.statusText}`);
  console.error(`  ${await dlRes.text()}`);
  process.exit(1);
}
const dl = await dlRes.json();

// Prefer GLB (single binary) over the glTF ZIP archive.
const target = dl.glb ?? dl.gltf;
if (!target?.url) {
  console.error('✗ No GLB/glTF download URL returned by the API.');
  console.error(`  Payload: ${JSON.stringify(dl)}`);
  process.exit(1);
}
const isGlb = !!dl.glb;
const ext = isGlb ? 'glb' : 'zip';

// ---------------------------------------------------------------------------
// 3. Stream the file to public/models/.
// ---------------------------------------------------------------------------
const slug = (OUTPUT_NAME ?? info.slug ?? UID).replace(/[^a-zA-Z0-9_-]/g, '-');
const fileName = `${slug}.${ext}`;
const outDir = join(PROJECT_ROOT, 'public', 'models');
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, fileName);

const fileRes = await fetch(target.url);
if (!fileRes.ok || !fileRes.body) {
  console.error(`✗ File download failed: HTTP ${fileRes.status} ${fileRes.statusText}`);
  process.exit(1);
}

console.log(`  Downloading → public/models/${fileName} ...`);
await pipeline(fileRes.body, createWriteStream(outPath));

const fileStat = await stat(outPath);
const sizeMb = (fileStat.size / (1024 * 1024)).toFixed(2);
console.log(`  ✓ done       (${sizeMb} MB)`);
console.log('');

// ---------------------------------------------------------------------------
// 4. Append to ATTRIBUTIONS.json.
// ---------------------------------------------------------------------------
const attributionsPath = join(outDir, 'ATTRIBUTIONS.json');
let attributions = [];
try {
  const raw = await readFile(attributionsPath, 'utf8');
  attributions = JSON.parse(raw);
  if (!Array.isArray(attributions)) attributions = [];
} catch {
  // File doesn't exist yet — start fresh.
}

const record = {
  uid: UID,
  name: info.name,
  author: info.user?.displayName ?? null,
  authorProfile: info.user?.profileUrl ?? null,
  sourceUrl: info.viewerUrl ?? `https://sketchfab.com/3d-models/${UID}`,
  license: license?.label ?? null,
  licenseUrl: license?.url ?? null,
  classification: classification.tier,
  localPath: `/models/${fileName}`,
  sizeBytes: fileStat.size,
  fetchedAt: new Date().toISOString(),
};

// De-dupe by UID — re-fetches replace prior entries for the same model.
attributions = attributions.filter((r) => r.uid !== UID);
attributions.push(record);
await writeFile(attributionsPath, JSON.stringify(attributions, null, 2) + '\n', 'utf8');

console.log(`  Attribution logged → public/models/ATTRIBUTIONS.json`);

// ---------------------------------------------------------------------------
// 5. Print the credit line the site needs to show somewhere visible.
// ---------------------------------------------------------------------------
if (classification.tier === 'attribution') {
  console.log('');
  console.log('  ⓘ Required credit (CC-BY) — display on the site:');
  console.log(`    "${info.name}" by ${info.user?.displayName} (${license?.label})`);
  console.log(`    ${info.viewerUrl}`);
}

console.log('');
console.log('Done.');
console.log(`  Import in R3F: useGLTF('/models/${fileName}')`);
console.log('');
