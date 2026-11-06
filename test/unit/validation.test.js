import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLocation, validateDiagnosis } from '../../src/validation.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
test('accepts supported image bytes and rejects spoofed file types', () => {
  assert.equal(validateDiagnosis({ crop: ' Paddy ', file: { buffer: png, size: png.length, mimetype: 'image/png' } }), null);
  assert.match(validateDiagnosis({ crop: 'Paddy', file: { buffer: Buffer.from('not an image'), size: 12, mimetype: 'image/png' } }), /contents/);
  assert.match(validateDiagnosis({ crop: 'Paddy', file: { buffer: png, size: png.length, mimetype: 'image/gif' } }), /JPEG, PNG, or WebP/);
});

test('rejects missing and oversized input and sanitizes location text', () => {
  assert.match(validateDiagnosis({ crop: ' ', file: null }), /crop name/);
  assert.match(validateDiagnosis({ crop: 'Paddy', file: { buffer: png, size: 9 * 1024 * 1024, mimetype: 'image/png' } }), /8 MB/);
  assert.deepEqual(cleanLocation('  Village  ', '', ' District '), ['Village', '', 'District']);
});
