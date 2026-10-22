import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIdentity, encryptReport, decryptReport, fingerprint } from '../src/lib/reports/crypto.ts';
import { ReportStore } from '../src/lib/reports/store.ts';

test('only sender and chosen recipient can decrypt; content and routing tampering fail', async () => {
  const sender = await createIdentity();
  const recipient = await createIdentity();
  const outsider = await createIdentity();
  const content = { title: 'Sensitive incident', body: 'Private evidence, never a server field.' };
  const report = await encryptReport(content, 'sender', 'recipient', sender.publicKey, recipient.publicKey);
  assert.deepEqual(await decryptReport(report, 'sender', sender.privateKey), content);
  assert.deepEqual(await decryptReport(report, 'recipient', recipient.privateKey), content);
  await assert.rejects(decryptReport(report, 'outsider', outsider.privateKey));
  await assert.rejects(decryptReport(report, 'recipient', outsider.privateKey));
  await assert.rejects(decryptReport({ ...report, id: crypto.randomUUID() }, 'recipient', recipient.privateKey));
  const changed = (report.ciphertext[0] === 'A' ? 'B' : 'A') + report.ciphertext.slice(1);
  await assert.rejects(decryptReport({ ...report, ciphertext: changed }, 'recipient', recipient.privateKey));
  assert.equal(await fingerprint(sender.publicKey), await fingerprint(sender.publicKey));
  assert.notEqual(await fingerprint(sender.publicKey), await fingerprint(recipient.publicKey));
});

test('persistent store isolates users, rejects invalid envelopes and cannot overwrite identity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'safereport-test-'));
  try {
    const store = new ReportStore(dir);
    const sender = await createIdentity();
    const recipient = await createIdentity();
    await store.register('sender', sender.publicKey, 'tide-encrypted-private-key');
    await store.register('recipient', recipient.publicKey, 'other-tide-encrypted-key');
    await assert.rejects(store.register('sender', recipient.publicKey, 'replacement'));
    const content = { title: 'Secret title', body: 'Secret details' };
    const report = await encryptReport(content, 'sender', 'recipient', sender.publicKey, recipient.publicKey);
    store.save('sender', report);
    assert.equal(store.list('recipient').length, 1);
    assert.equal(store.list('sender').length, 1);
    assert.equal(store.list('stranger').length, 0);
    assert.equal(new ReportStore(dir).list('recipient').length, 1);
    assert.throws(() => store.save('stranger', { ...report, id: crypto.randomUUID() }));
    assert.throws(() => store.save('sender', { ...report, id: crypto.randomUUID(), recipientId: 'unknown' }));
    assert.throws(() => store.save('sender', { ...report, id: '../../outside' }));
    assert.throws(() => store.save('sender', { ...report, id: crypto.randomUUID(), iv: 'bad' }));
    assert.throws(() => store.save('sender', { ...report, id: crypto.randomUUID(), title: 'plaintext' }));
    assert.throws(() => store.save('sender', report));
    const stored = readFileSync(join(dir, 'reports', readdirSync(join(dir, 'reports'))[0]), 'utf8');
    assert.ok(!stored.includes(content.title) && !stored.includes(content.body));
    assert.equal(store.publicIdentity('sender').encryptedPrivateKey, undefined);
    assert.equal(store.identity('sender').encryptedPrivateKey, 'tide-encrypted-private-key');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
