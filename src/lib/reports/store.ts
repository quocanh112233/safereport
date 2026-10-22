import { createHash, createPublicKey } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { EncryptedReport } from './crypto';

export type Identity = { userId: string; publicKey: JsonWebKey; fingerprint: string; encryptedPrivateKey: string };
export type StoredReport = EncryptedReport & { createdAt: string };

export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

function validUser(userId: string) {
  if (!userId || userId.length > 200) throw new InputError('Invalid account identifier.');
  return createHash('sha256').update(userId).digest('hex');
}

function readJson<T>(file: string): T | null {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

function isBase64(value: unknown, min: number, max: number) {
  return typeof value === 'string' && value.length >= min && value.length <= max && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

// shortcut: local files support a single-node hackathon demo; use a transactional database before multi-instance deployment.
export class ReportStore {
  dir: string;
  constructor(dir = join(process.cwd(), 'data', 'safereport')) { this.dir = dir; }

  identity(userId: string): Identity | null {
    return readJson<Identity>(join(this.dir, 'identities', `${validUser(userId)}.json`));
  }

  publicIdentity(userId: string) {
    const identity = this.identity(userId);
    if (!identity) throw new InputError('Account has not registered a reporting key yet.', 404);
    const { encryptedPrivateKey: _private, ...publicIdentity } = identity;
    return publicIdentity;
  }

  deleteIdentity(userId: string): boolean {
    const id = validUser(userId);
    const filePath = join(this.dir, 'identities', `${id}.json`);
    try {
      unlinkSync(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async register(userId: string, publicKey: JsonWebKey, encryptedPrivateKey: string): Promise<Identity> {
    const id = validUser(userId);
    if (!publicKey || publicKey.kty !== 'RSA' || publicKey.e !== 'AQAB' || publicKey.d || publicKey.p || publicKey.q ||
      typeof publicKey.n !== 'string' || publicKey.n.length !== 512 || !/^[\w-]+$/.test(publicKey.n) ||
      typeof encryptedPrivateKey !== 'string' || encryptedPrivateKey.length < 16 || encryptedPrivateKey.length > 32768) {
      throw new InputError('Invalid public key or Tide-encrypted private key.');
    }
    const cleanKey = { kty: 'RSA', n: publicKey.n, e: publicKey.e, alg: 'RSA-OAEP-256', ext: true, key_ops: ['encrypt'] };
    const spki = createPublicKey({ key: cleanKey, format: 'jwk' }).export({ type: 'spki', format: 'der' });
    const identity = { userId, publicKey: cleanKey, encryptedPrivateKey, fingerprint: createHash('sha256').update(spki).digest('hex') };
    const directory = join(this.dir, 'identities');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    try { writeFileSync(join(directory, `${id}.json`), JSON.stringify(identity), { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError('This account already has a key. Unlock it instead of replacing it.', 409);
      throw error;
    }
    return identity;
  }

  save(userId: string, value: unknown): StoredReport {
    const fields = ['id', 'senderId', 'recipientId', 'iv', 'ciphertext', 'senderKey', 'recipientKey'];
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) throw new InputError('Only encrypted report fields are accepted.');
    const report = value as EncryptedReport;
    if (report.senderId !== userId) throw new InputError('Sender does not match your session.', 403);
    if (typeof report.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(report.id) ||
      typeof report.recipientId !== 'string' || report.recipientId === userId ||
      !isBase64(report.iv, 16, 16) || !isBase64(report.ciphertext, 24, 100000) ||
      !isBase64(report.senderKey, 512, 512) || !isBase64(report.recipientKey, 512, 512)) throw new InputError('Invalid encrypted report.');
    this.publicIdentity(userId);
    this.publicIdentity(report.recipientId);
    const entry = { ...report, createdAt: new Date().toISOString() };
    const directory = join(this.dir, 'reports');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    try { writeFileSync(join(directory, `${entry.id}.json`), JSON.stringify(entry), { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError('Report already exists.', 409);
      throw error;
    }
    return entry;
  }

  list(userId: string): StoredReport[] {
    validUser(userId);
    const directory = join(this.dir, 'reports');
    let files: string[];
    try { files = readdirSync(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return files.filter(file => /^[a-f0-9-]+\.json$/.test(file))
      .map(file => readJson<StoredReport>(join(directory, file)))
      .filter((report): report is StoredReport => !!report && (report.senderId === userId || report.recipientId === userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
