import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeminiAdvisory, getWeather, localAdvisory } from '../../src/advisory.js';

test('offline symptom guide gives crop-specific guidance without claiming image analysis', () => {
  const result = localAdvisory({ crop: 'Paddy', growthStage: 'Flowering', symptom: 'yellowing' });
  assert.match(result.probableIssue, /Paddy/);
  assert.match(result.probableIssue, /Yellowing leaves/);
  assert.match(result.causes, /soil is too wet or dry/);
  assert.match(result.provider, /Local symptom guide/);
  assert.doesNotMatch(result.probableIssue, /confirmed diagnosis/i);
});

test('offline symptom guide localizes Odia and handles unknown symptoms safely', () => {
  const result = localAdvisory({ crop: 'ଧାନ', symptom: 'not-a-symptom', language: 'or' });
  assert.match(result.probableIssue, /ଜଣାନାହିଁ/);
  assert.match(result.provider, /ସ୍ଥାନୀୟ/);
  assert.match(result.causes, /ସ୍ଥାନୀୟ କୃଷି ଅଧିକାରୀ/);
});

test('Gemini crop analysis sends the image bytes and returns parsed image findings', async () => {
  let request;
  const image = Buffer.from('sample-image-bytes');
  const result = await getGeminiAdvisory({ crop: 'Paddy', growthStage: 'Flowering', symptom: 'brown-spots', village: 'Pipili', image, mimeType: 'image/jpeg', apiKey: 'test-secret', fetchImpl: async (url, options) => {
    request = { url: String(url), options, body: JSON.parse(options.body) };
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ probableIssue: 'Leaf spots visible', causes: 'Possible disease or stress.' }) }] } }] });
  } });
  assert.match(request.url, /models\/gemini-3\.8-flash:generateContent/);
  assert.equal(request.options.headers['x-goog-api-key'], 'test-secret');
  assert.equal(request.body.contents[0].parts[1].inline_data.mime_type, 'image/jpeg');
  assert.equal(request.body.contents[0].parts[1].inline_data.data, image.toString('base64'));
  assert.match(request.body.contents[0].parts[0].text, /Paddy.*Flowering.*brown-spots.*Pipili/);
  assert.equal(result.probableIssue, 'Leaf spots visible');
  assert.equal(result.provider, 'Gemini image analysis');
  assert.equal(result.activeIngredients, '');
});

test('Gemini reports useful status errors instead of silently claiming success', async () => {
  await assert.rejects(getGeminiAdvisory({ crop: 'Paddy', image: Buffer.from('x'), mimeType: 'image/png', apiKey: 'bad-key', fetchImpl: async () => new Response('', { status: 401 }) }), /invalid/);
  await assert.rejects(getGeminiAdvisory({ crop: 'Paddy', image: Buffer.from('x'), mimeType: 'image/png', apiKey: 'key', model: 'missing-model', fetchImpl: async () => new Response('', { status: 404 }) }), /not found/);
});

test('Gemini retries temporary 5xx outages and returns the recovered analysis', async () => {
  let calls = 0;
  const image = Buffer.from('sample-image-bytes');
  const result = await getGeminiAdvisory({ crop: 'Paddy', image, mimeType: 'image/jpeg', apiKey: 'test-secret', fetchImpl: async () => {
    calls++;
    if (calls < 3) return new Response('', { status: 503 });
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ probableIssue: 'Recovered crop analysis' }) }] } }] });
  } });
  assert.equal(calls, 3);
  assert.equal(result.probableIssue, 'Recovered crop analysis');
});

test('weather works without provider credentials when GPS coordinates are available', async () => {
  const calls = [];
  const result = await getWeather({ latitude: 19.8135, longitude: 85.8312, fetchImpl: async (url) => {
    calls.push(String(url));
    return Response.json({ current: { temperature_2m: 31.2, relative_humidity_2m: 68, apparent_temperature: 36, precipitation: 0, weather_code: 2, wind_speed_10m: 12, time: '2026-10-28T14:00' } });
  } });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /api\.open-meteo\.com\/v1\/forecast/);
  assert.equal(result.provider, 'Open-Meteo');
  assert.equal(result.condition, 'Partly cloudy');
  assert.equal(result.temperatureC, 31.2);
  assert.equal(result.latitude, 19.8135);
  assert.match(result.summary, /humidity 68%/);
});

test('manual locality is geocoded before requesting weather', async () => {
  const calls = [];
  const result = await getWeather({ village: 'Pipili', district: 'Puri', fetchImpl: async (url) => {
    calls.push(String(url));
    if (String(url).includes('geocoding-api')) return Response.json({ results: [{ latitude: 20.11, longitude: 85.83 }] });
    return Response.json({ current: { temperature_2m: 29, relative_humidity_2m: 72, weather_code: 61, time: '2026-10-28T14:00' } });
  } });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /geocoding-api/);
  assert.equal(new URL(calls[0]).searchParams.get('name'), 'Pipili');
  assert.equal(result.provider, 'Open-Meteo');
  assert.equal(result.condition, 'Light rain');
});

test('WeatherAPI weather results include a displayable condition as well as a summary', async () => {
  const result = await getWeather({ village: 'Pipili', district: 'Puri', apiKey: 'test-key', fetchImpl: async () => Response.json({ current: { temp_c: 30, humidity: 74, condition: { text: 'Partly cloudy' } } }) });
  assert.equal(result.provider, 'WeatherAPI');
  assert.equal(result.condition, 'Partly cloudy');
  assert.match(result.summary, /Partly cloudy/);
});

test('weather without a location stays unavailable without making a guessed request', async () => {
  let called = false;
  const result = await getWeather({ fetchImpl: async () => { called = true; throw new Error('unexpected'); } });
  assert.equal(result.provider, 'Unavailable');
  assert.equal(called, false);
});
