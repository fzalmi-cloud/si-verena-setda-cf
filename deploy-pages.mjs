// Deploy frontend dist ke Cloudflare Pages via direct upload API
// Usage: node deploy-pages.mjs <project> <dist-dir>
import { readdirSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join, relative, sep } from 'path';

const TOKEN = process.env.CF_TOKEN;
const ACCOUNT = process.env.CF_ACCOUNT;
const PROJECT = process.argv[2] || 'si-verena-setda';
const DIST = process.argv[3] || './dist';

if (!TOKEN || !ACCOUNT) {
  console.error('Set CF_TOKEN & CF_ACCOUNT');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
console.log(`Mengunggah ${files.length} file dari ${DIST} ke Pages project "${PROJECT}"...`);

// Manifest: mapping path -> { path, type, hash (base64 sha-256) }
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.wasm': 'application/wasm',
  '.map': 'application/json', '.xml': 'application/xml', '.pdf': 'application/pdf',
};
const manifest = { files: {} };
for (const file of files) {
  const rel = relative(DIST, file).split(sep).join('/');
  const buf = readFileSync(file);
  const hash = createHash('sha256').update(buf).digest('base64');
  const ext = rel.slice(rel.lastIndexOf('.'));
  manifest.files[rel] = { path: rel, type: MIME[ext] || 'application/octet-stream', hash };
}

const form = new FormData();
form.append('branch', 'main');
form.append('commit_message', `Deploy frontend SI-VERENA (fix keamanan + upload referensi) - ${new Date().toISOString()}`);
form.append('manifest', JSON.stringify(manifest));

for (const file of files) {
  const rel = relative(DIST, file).split(sep).join('/');
  form.append(rel, new Blob([readFileSync(file)]));
}

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  }
);
const json = await res.json();
if (!json.success) {
  console.error('GAGAL:', JSON.stringify(json.errors));
  process.exit(1);
}
console.log('SUKSES!');
console.log('deployment id :', json.result.id);
console.log('url           :', json.result.url);
console.log('preview       :', json.result.preview_url || '-');
console.log('environment   :', json.result.environment);
