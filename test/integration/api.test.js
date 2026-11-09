import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../src/app.js';

let server; let base; let db; let temp; const testEnv = { NODE_ENV: 'test', GEMINI_API_KEY: 'private-test-key' };
before(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), 'krushi-integration-'));
  const created = createApp({ databasePath: ':memory:', uploadDir: path.join(temp, 'uploads'), env: testEnv, fetchImpl: async (url, options) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      const requestBody = JSON.parse(options.body);
      assert.equal(options.headers['x-goog-api-key'], 'private-test-key');
      assert.equal(requestBody.contents[0].parts[1].inline_data.mime_type, 'image/png');
      assert.ok(requestBody.contents[0].parts[1].inline_data.data.length > 0);
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ probableIssue: 'Gemini sees possible brown leaf spots', causes: 'The photo shows spots; more field checks are needed.', organicAlternatives: 'Remove badly affected leaves.' }) }] } }] });
    }
    if (String(url).includes('nominatim.openstreetmap.org/reverse')) return Response.json({ address: { village: 'Pipili', state_district: 'Puri', state: 'Odisha' } });
    if (!String(url).includes('api.open-meteo.com/v1/forecast')) throw new Error(`Unexpected fetch: ${url}`);
    return Response.json({ current: { temperature_2m: 28, relative_humidity_2m: 70, apparent_temperature: 32, precipitation: 0, weather_code: 1, wind_speed_10m: 8, time: '2026-10-28T14:00' } });
  } }); db = created.db;
  server = createServer(created.app); await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); db.close(); await rm(temp, { recursive: true, force: true }); });

async function request(route, options = {}, cookie) {
  const headers = new Headers(options.headers || {}); if (cookie) headers.set('cookie', cookie);
  const response = await fetch(base + route, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function register(email) { return request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Test Farmer', email, password: 'secure-pass-1' }) }); }

test('registration, profile, diagnosis, history, and logout work together', async () => {
  const account = await register('journey@example.com'); assert.equal(account.response.status, 201); assert.ok(account.cookie); assert.equal('passwordHash' in account.data, false);
  assert.equal((await request('/api/auth/me', {}, account.cookie)).data.name, 'Test Farmer');
  const profile = await request('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ district: 'Puri', block: 'Pipili', village: 'Demo village', language: 'or' }) }, account.cookie);
  assert.equal(profile.data.district, 'Puri'); assert.equal(profile.data.language, 'or');
  const gps = await request('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ latitude: 19.8135, longitude: 85.8312 }) }, account.cookie);
  assert.equal(gps.data.district, 'Puri'); assert.equal(gps.data.latitude, 19.8135);
  const place = await request('/api/location/reverse?latitude=19.8135&longitude=85.8312', {}, account.cookie);
  assert.deepEqual(place.data.location, { village: 'Pipili', district: 'Puri', state: 'Odisha', displayName: 'Pipili, Puri, Odisha', attribution: '© OpenStreetMap contributors' });
  assert.equal((await request('/api/location/reverse?latitude=99&longitude=2', {}, account.cookie)).response.status, 400);
  const weather = await request('/api/weather/current', {}, account.cookie);
  assert.equal(weather.response.status, 200); assert.equal(weather.data.provider, 'Open-Meteo'); assert.equal(weather.data.temperatureC, 28);
  assert.equal((await request('/api/weather/current')).response.status, 401);
  assert.equal((await request('/api/weather/current?latitude=99&longitude=2', {}, account.cookie)).response.status, 400);
  const form = new FormData(); form.set('crop', 'Paddy'); form.set('growthStage', 'Flowering'); form.set('symptom', 'yellowing'); form.set('district', 'Puri'); form.set('block', 'Pipili');
  form.set('image', new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])], { type: 'image/png' }), 'leaf.png');
  const diagnosis = await request('/api/diagnoses', { method: 'POST', body: form }, account.cookie);
  assert.equal(diagnosis.response.status, 201, JSON.stringify(diagnosis.data)); assert.equal(diagnosis.data.crop, 'Paddy');
  assert.match(diagnosis.data.probableIssue, /Gemini sees possible brown leaf spots/); assert.match(diagnosis.data.provider, /Gemini image analysis/); assert.match(diagnosis.data.soil, /ମାଟି/); assert.match(diagnosis.data.weather, /ଆର୍ଦ୍ରତା/);
  const history = await request('/api/diagnoses', {}, account.cookie); assert.equal(history.response.status, 200); assert.equal(history.data.length, 1); assert.equal(history.data[0].id, diagnosis.data.id);
  const changedPlaceForm = new FormData(); changedPlaceForm.set('crop', 'Paddy'); changedPlaceForm.set('district', 'Puri'); changedPlaceForm.set('block', 'Pipili'); changedPlaceForm.set('village', 'Different village');
  changedPlaceForm.set('image', new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])], { type: 'image/png' }), 'leaf.png');
  const changedPlaceDiagnosis = await request('/api/diagnoses', { method: 'POST', body: changedPlaceForm }, account.cookie);
  assert.equal(changedPlaceDiagnosis.response.status, 201); assert.equal(changedPlaceDiagnosis.data.latitude, null); assert.equal(changedPlaceDiagnosis.data.longitude, null);
  assert.equal((await request('/api/diagnoses', {}, account.cookie)).data.length, 2);
  assert.equal((await request('/api/auth/logout', { method: 'POST' }, account.cookie)).response.status, 204);
  assert.equal((await request('/api/diagnoses', {}, account.cookie)).response.status, 401);
});

test('farmer histories are isolated and anonymous access is rejected', async () => {
  assert.equal((await request('/api/diagnoses')).response.status, 401);
  const farmerA = await register('a@example.com'); const farmerB = await register('b@example.com');
  assert.equal((await request('/api/diagnoses', {}, farmerA.cookie)).data.length, 0);
  assert.equal((await request('/api/diagnoses', {}, farmerB.cookie)).data.length, 0);
});

test('duplicate registration and invalid login return useful errors', async () => {
  await register('duplicate@example.com');
  const duplicate = await register('duplicate@example.com'); assert.equal(duplicate.response.status, 409);
  const badLogin = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'duplicate@example.com', password: 'wrong-password' }) });
  assert.equal(badLogin.response.status, 401);
});

test('status reports Gemini setup required when no key is configured', async () => {
  const configuredKey = testEnv.GEMINI_API_KEY;
  delete testEnv.GEMINI_API_KEY;
  try {
    const status = await request('/api/status');
    assert.equal(status.response.status, 200);
    assert.deepEqual(status.data.integrations.cropAnalysis, { provider: 'Gemini setup required', configured: false, model: 'Not configured' });
    assert.equal(JSON.stringify(status.data).includes('private-test-key'), false);
  } finally {
    testEnv.GEMINI_API_KEY = configuredKey;
  }
});

test('photo crop report sends the image to Gemini and saves its analysis', async () => {
  const configuredKey = testEnv.GEMINI_API_KEY;
  testEnv.GEMINI_API_KEY = 'private-test-key';
  try {
    const status = await request('/api/status');
    assert.deepEqual(status.data.integrations.cropAnalysis, { provider: 'Gemini image analysis', configured: true, model: 'gemini-3.8-flash' });
    const account = await register('gemini-image@example.com');
    const form = new FormData(); form.set('crop', 'Paddy'); form.set('symptom', 'brown-spots'); form.set('image', new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])], { type: 'image/png' }), 'leaf.png');
    const report = await request('/api/diagnoses', { method: 'POST', body: form }, account.cookie);
    assert.equal(report.response.status, 201);
    assert.match(report.data.provider, /Gemini image analysis/);
    assert.match(report.data.probableIssue, /Gemini sees/);
    assert.match(report.data.causes, /photo shows/);
    const history = await request('/api/diagnoses', {}, account.cookie);
    assert.equal(history.data.length, 1);
    assert.match(history.data[0].provider, /Gemini image analysis/);
  } finally {
    testEnv.GEMINI_API_KEY = configuredKey;
  }
});

test('admin overview returns date-bounded activity and configuration-only health', async () => {
  testEnv.ADMIN_SETUP_KEY = 'integration-admin-setup-key-2026';
  try {
    const admin = await request('/api/admin/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Admin', email: 'overview-admin@example.com', password: 'secure-admin-pass-1', setupKey: testEnv.ADMIN_SETUP_KEY }) });
    assert.equal(admin.response.status, 201, JSON.stringify(admin.data));
    const farmer = await register('overview-farmer@example.com');
    const activityDay = '2026-01-03 10:00:00';
    db.prepare("UPDATE farmers SET created_at=? WHERE id=?").run(activityDay, farmer.data.id);
    db.prepare("INSERT INTO auth_events(farmer_id,email,event,created_at) VALUES(?,?,?,?)").run(farmer.data.id, farmer.data.email, 'login_success', activityDay);
    db.prepare("INSERT INTO diagnoses(farmer_id,crop,image_key,probable_issue,provider,created_at) VALUES(?,?,?,?,?,?)").run(farmer.data.id, 'Rice', 'test-image.png', 'Test issue', 'Test provider', activityDay);

    const overview = await request('/api/admin/overview?from=2026-01-03&to=2026-01-03', {}, admin.cookie);
    assert.equal(overview.response.status, 200, JSON.stringify(overview.data));
    assert.deepEqual(overview.data.activity, [{ date: '2026-01-03', accounts: 1, logins: 1, assessments: 1 }]);
    assert.deepEqual(overview.data.range, { from: '2026-01-03', to: '2026-01-03' });
    assert.equal(overview.data.health.api, 'healthy');
    assert.equal(overview.data.health.database, 'connected');
    assert.match(overview.data.health.cropAnalysis, /not configured/);
    assert.match(overview.data.health.cropAnalysis, /not live-tested/);
    assert.equal((await request('/api/admin/overview?from=2026-02-30&to=2026-03-01', {}, admin.cookie)).response.status, 400);
    assert.equal((await request('/api/admin/overview?from=2025-01-01&to=2026-01-02', {}, admin.cookie)).response.status, 400);
  } finally {
    delete testEnv.ADMIN_SETUP_KEY;
  }
});

