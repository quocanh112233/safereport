import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK, calculateJwkThumbprint, SignJWT, jwtVerify, createLocalJWKSet } from 'jose';
import { createSimulatedToken, SIMULATED_USERS, SIMULATED_PUBLIC_JWK } from '../src/lib/tide-mock/simulatedKeys.ts';
import { loadTideConfig } from '../src/lib/auth/tidecloakConfig.ts';
import { verifyDpop, MemoryJtiStore } from '../src/lib/auth/verifyDpop.ts';
import { hasRole } from '../src/lib/auth/tideJWT.ts';
import { createIdentity, encryptReport, decryptReport, fingerprint } from '../src/lib/reports/crypto.ts';
import { ReportStore } from '../src/lib/reports/store.ts';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

test('simulated tokens match TideCloak JWKS and pass cryptographic verification', async () => {
  const config = loadTideConfig();
  assert.ok(config.jwk?.keys?.length > 0, 'JWKS must contain keys');

  const dpopPair = await generateKeyPair('ES256', { extractable: true });
  const dpopPub = await exportJWK(dpopPair.publicKey);

  const token = await createSimulatedToken(SIMULATED_USERS.alice, dpopPub);
  assert.equal(typeof token, 'string');

  const JWKS = createLocalJWKSet(config.jwk);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${config['auth-server-url'].replace(/\/+$/, '')}/realms/${config.realm}`,
    requiredClaims: ['sub', 'exp', 'iat'],
  });

  assert.equal(payload.sub, 'alice-report-sender');
  assert.equal(payload.azp, config.resource);
  assert.deepEqual(payload.realm_access?.roles, ['_tide_enabled', '_tide_vault.selfencrypt']);
});

test('simulated DPoP proof enforces RFC 9449 binding, method matching, and replay protection', async () => {
  const config = loadTideConfig();
  const dpopPair = await generateKeyPair('ES256', { extractable: true });
  const dpopPub = await exportJWK(dpopPair.publicKey);
  const jkt = await calculateJwkThumbprint(dpopPub);

  const token = await createSimulatedToken(SIMULATED_USERS.bob, dpopPub);
  const ath = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))).toString('base64url');

  const url = 'http://localhost:3000/api/reports';
  const makeProof = (method = 'POST', targetUrl = url, customJti = crypto.randomUUID()) =>
    new SignJWT({
      jti: customJti,
      htm: method,
      htu: targetUrl,
      iat: Math.floor(Date.now() / 1000),
      ath,
    })
      .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: dpopPub })
      .sign(dpopPair.privateKey);

  const jtiStore = new MemoryJtiStore();
  const claims = { cnf: { jkt } };

  // 1. Valid request passes
  const proof1 = await makeProof('POST', url);
  const req1 = new Request(url, { method: 'POST', headers: { Authorization: `DPoP ${token}`, DPoP: proof1 } });
  await verifyDpop(req1, token, claims, { jtiStore, trustForwardedHeaders: false });

  // 2. Replay of same proof is strictly rejected
  await assert.rejects(
    verifyDpop(req1, token, claims, { jtiStore, trustForwardedHeaders: false }),
    /DPoP proof has already been used|replay/i
  );

  // 3. Method mismatch is rejected
  const proofMethodMismatch = await makeProof('GET', url);
  const reqMethodMismatch = new Request(url, { method: 'POST', headers: { Authorization: `DPoP ${token}`, DPoP: proofMethodMismatch } });
  await assert.rejects(verifyDpop(reqMethodMismatch, token, claims, { jtiStore }));

  // 4. URL mismatch is rejected
  const proofUrlMismatch = await makeProof('POST', 'http://localhost:3000/api/identity');
  const reqUrlMismatch = new Request(url, { method: 'POST', headers: { Authorization: `DPoP ${token}`, DPoP: proofUrlMismatch } });
  await assert.rejects(verifyDpop(reqUrlMismatch, token, claims, { jtiStore }));

  // 5. Query parameters in request URL do not break RFC 9449 htu match (query string stripped)
  const urlWithQuery = 'http://localhost:3000/api/identity?user=bob-incident-auditor';
  const cleanHtu = 'http://localhost:3000/api/identity';
  const proofWithCleanHtu = await makeProof('GET', cleanHtu);
  const reqWithQuery = new Request(urlWithQuery, { method: 'GET', headers: { Authorization: `DPoP ${token}`, DPoP: proofWithCleanHtu } });
  await verifyDpop(reqWithQuery, token, claims, { jtiStore, trustForwardedHeaders: false });
});

test('RBAC role governance distinguishes Alice selfencrypt and Bob selfdecrypt privileges', async () => {
  const dpopPair = await generateKeyPair('ES256', { extractable: true });
  const dpopPub = await exportJWK(dpopPair.publicKey);

  const aliceToken = await createSimulatedToken(SIMULATED_USERS.alice, dpopPub);
  const bobToken = await createSimulatedToken(SIMULATED_USERS.bob, dpopPub);

  const config = loadTideConfig();
  const JWKS = createLocalJWKSet(config.jwk);

  const { payload: aliceJwt } = await jwtVerify(aliceToken, JWKS);
  const { payload: bobJwt } = await jwtVerify(bobToken, JWKS);

  assert.equal(hasRole(aliceJwt, '_tide_vault.selfencrypt'), true);
  assert.equal(hasRole(aliceJwt, '_tide_vault.selfdecrypt'), false);

  assert.equal(hasRole(bobJwt, '_tide_vault.selfdecrypt'), true);
  assert.equal(hasRole(bobJwt, '_tide_vault.selfencrypt'), false);
});

test('Zero-Knowledge E2EE round-trip: Alice sends confidential incident report, only Bob can decrypt', async () => {
  const alice = await createIdentity();
  const bob = await createIdentity();
  const mallory = await createIdentity();

  const incidentData = {
    title: 'An ninh học đường: Phát hiện rò rỉ đề thi qua mạng nội bộ',
    body: 'Báo cáo khẩn cấp gửi thanh tra: Các tệp nhật ký truy cập trái phép đã được đóng gói.',
    timestamp: new Date().toISOString(),
  };

  // Alice encrypts report for recipient Bob
  const envelope = await encryptReport(
    incidentData,
    'alice-report-sender',
    'bob-incident-auditor',
    alice.publicKey,
    bob.publicKey
  );

  // Bob can decrypt successfully
  const bobDecrypted = await decryptReport(envelope, 'bob-incident-auditor', bob.privateKey);
  assert.deepEqual(bobDecrypted, incidentData);

  // Alice (the author) can also decrypt her own sent report
  const aliceDecrypted = await decryptReport(envelope, 'alice-report-sender', alice.privateKey);
  assert.deepEqual(aliceDecrypted, incidentData);

  // Mallory (Outsider / DB Administrator / Hacker) cannot decrypt
  await assert.rejects(decryptReport(envelope, 'mallory-outsider', mallory.privateKey));
  await assert.rejects(decryptReport(envelope, 'bob-incident-auditor', mallory.privateKey));

  // Ciphertext does not expose plaintext anywhere
  assert.ok(!envelope.ciphertext.includes('đề thi'));
  assert.ok(!envelope.ciphertext.includes('An ninh học đường'));
  assert.ok(envelope.ciphertext.length > 50);
});

test('ReportStore supports deleting and re-registering reporting key', async () => {
  const testDir = join(process.cwd(), 'data', 'test-store-' + Date.now());
  const store = new ReportStore(testDir);
  try {
    const pair1 = await createIdentity();
    await store.register('test-user', pair1.publicKey, 'encrypted-private-key-1');
    assert.ok(store.identity('test-user'));

    // Cannot overwrite while key exists
    const pair2 = await createIdentity();
    await assert.rejects(store.register('test-user', pair2.publicKey, 'encrypted-private-key-2'));

    // Delete key
    const deleted = store.deleteIdentity('test-user');
    assert.equal(deleted, true);
    assert.equal(store.identity('test-user'), null);

    // Can now register new key pair
    await store.register('test-user', pair2.publicKey, 'encrypted-private-key-2');
    const newId = store.identity('test-user');
    assert.equal(newId.encryptedPrivateKey, 'encrypted-private-key-2');
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

