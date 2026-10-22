import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK, calculateJwkThumbprint, SignJWT } from 'jose';
import { readBody, apiError } from '../src/lib/reports/http.ts';
import { verifyDpop, MemoryJtiStore } from '../src/lib/auth/verifyDpop.ts';
import { shouldAttachDpopProof } from '../node_modules/@tidecloak/js/dist/esm/lib/secureFetchPolicy.js';

test('installed SDK attaches DPoP when the caller lets it choose the current token', () => {
  assert.equal(shouldAttachDpopProof(null, 'current-token'), true);
});

test('HTTP boundary rejects malformed, non-object and oversized JSON without hiding server failures', async () => {
  const request = body => new Request('http://localhost/api/reports', { method: 'POST', body });
  assert.deepEqual(await readBody(request('{"id":"test"}')), { id: 'test' });
  for (const body of ['null', '[]', '"text"', '{broken']) {
    await assert.rejects(readBody(request(body)), error => error.status === 400);
  }
  await assert.rejects(readBody(request('1234567890'), 5), error => error.status === 413);
  const invalid = await readBody(request('null')).catch(error => apiError(error));
  assert.equal(invalid.status, 400);
});

test('DPoP verifies bound proof; rejects replay, Bearer, unbound tokens and changed route/method', async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  const jwk = await exportJWK(pair.publicKey);
  const jkt = await calculateJwkThumbprint(jwk);
  const token = 'test-access-token';
  const ath = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))).toString('base64url');
  const proof = await new SignJWT({ jti: crypto.randomUUID(), htm: 'GET', htu: 'http://localhost:3000/api/reports', iat: Math.floor(Date.now() / 1000), ath })
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk }).sign(pair.privateKey);
  const request = (method = 'GET', url = 'http://localhost:3000/api/reports', scheme = 'DPoP') => new Request(url, { method, headers: { Authorization: `${scheme} ${token}`, DPoP: proof } });
  const claims = { cnf: { jkt } };
  const options = { jtiStore: new MemoryJtiStore(), trustForwardedHeaders: false };
  await verifyDpop(request(), token, claims, options);
  await assert.rejects(verifyDpop(request(), token, claims, options));
  await assert.rejects(verifyDpop(request('GET', undefined, 'Bearer'), token, claims));
  await assert.rejects(verifyDpop(request(), token, {}));
  await assert.rejects(verifyDpop(request('POST'), token, claims));
  await assert.rejects(verifyDpop(request('GET', 'http://localhost:3000/api/identity'), token, claims));
  await assert.rejects(verifyDpop(request(), 'different-token', claims));
  await assert.rejects(verifyDpop(request(), token, { cnf: { jkt: 'different-key' } }));
});

test('a future-dated DPoP proof stays in replay protection until its entire validity window ends', async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  const jwk = await exportJWK(pair.publicKey);
  const jkt = await calculateJwkThumbprint(jwk);
  const token = 'future-dated-access';
  const start = Date.now();
  const iat = Math.floor(start / 1000) + 299;
  const ath = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))).toString('base64url');
  const proof = await new SignJWT({ jti: crypto.randomUUID(), htm: 'GET', htu: 'http://localhost:3000/api/reports', iat, ath })
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk }).sign(pair.privateKey);
  const request = new Request('http://localhost:3000/api/reports', { headers: { Authorization: `DPoP ${token}`, DPoP: proof } });
  const options = { jtiStore: new MemoryJtiStore(), trustForwardedHeaders: false };
  const original = Date.now;
  try {
    Date.now = () => start;
    await verifyDpop(request, token, { cnf: { jkt } }, options);
    Date.now = () => start + 301000;
    await assert.rejects(verifyDpop(request, token, { cnf: { jkt } }, options), /replay/);
  } finally { Date.now = original; }
});
