import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function freePort() { const s = createServer(); await new Promise((r) => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise((r) => s.close(r)); return p; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('production server serves the React build and completes the farmer journey over HTTP', async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'krushi-system-')); const port = await freePort();
  const child = spawn(process.execPath, ['src/server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), DATABASE_PATH: path.join(temp, 'db.sqlite'), UPLOAD_DIR: path.join(temp, 'uploads'), WEB_DIR: path.resolve('dist') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', (d) => { log += d.toString(); }); child.stderr.on('data', (d) => { log += d.toString(); });
  t.after(async () => { child.kill('SIGTERM'); await new Promise((r) => child.once('exit', r)); await rm(temp, { recursive: true, force: true }); });
  let health;
  for (let i = 0; i < 60; i++) { try { health = await fetch(`http://127.0.0.1:${port}/api/status`); if (health.ok) break; } catch {} await sleep(100); }
  assert.ok(health?.ok, `server did not start: ${log}`);
  const home = await fetch(`http://127.0.0.1:${port}/`); assert.equal(home.status, 200); const html = await home.text(); assert.match(html, /Krushi Mitra/);
  const asset = html.match(/src="([^"]+\.js)"/); assert.ok(asset, 'built React bundle was linked'); assert.equal((await fetch(new URL(asset[1], home.url))).status, 200);
  const register = await fetch(`http://127.0.0.1:${port}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'System Farmer', email: 'system@example.com', password: 'secure-pass-1' }) });
  assert.equal(register.status, 201); const cookie = register.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie } })).status, 200);
  const form = new FormData(); form.set('crop', 'Paddy'); form.set('growthStage', 'Flowering'); form.set('district', 'Puri'); form.set('block', 'Pipili'); form.set('village', 'System village');
  form.set('image', new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])], { type: 'image/png' }), 'leaf.png');
  const created = await fetch(`http://127.0.0.1:${port}/api/diagnoses`, { method: 'POST', headers: { cookie }, body: form });
  const createdBody = await created.text(); assert.equal(created.status, 201, createdBody); const diagnosis = JSON.parse(createdBody); assert.equal(diagnosis.crop, 'Paddy');
  const history = await fetch(`http://127.0.0.1:${port}/api/diagnoses`, { headers: { cookie } }); assert.equal((await history.json())[0].id, diagnosis.id);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/auth/logout`, { method: 'POST', headers: { cookie } })).status, 204);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/diagnoses`, { headers: { cookie } })).status, 401);
});
