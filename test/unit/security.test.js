import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, newSessionToken, tokenDigest, verifyPassword } from '../../src/security.js';

test('password hashes are salted and verify only the right password', () => {
  const first = hashPassword('secure-pass-1');
  const second = hashPassword('secure-pass-1');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('secure-pass-1', first), true);
  assert.equal(verifyPassword('wrong-password', first), false);
  assert.equal(verifyPassword('anything', 'broken-hash'), false);
});

test('session tokens are random and only their digest is suitable for storage', () => {
  const one = newSessionToken(); const two = newSessionToken();
  assert.notEqual(one, two);
  assert.equal(tokenDigest(one).length, 64);
  assert.notEqual(tokenDigest(one), one);
});
