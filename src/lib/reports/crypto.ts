export type ReportContent = { title: string; body: string };
export type EncryptedReport = {
  id: string;
  senderId: string;
  recipientId: string;
  iv: string;
  ciphertext: string;
  senderKey: string;
  recipientKey: string;
};

export function toBase64(value: ArrayBuffer | Uint8Array): string {
  return btoa(Array.from(new Uint8Array(value), b => String.fromCharCode(b)).join(''));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

export async function createIdentity() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['encrypt', 'decrypt'],
  );
  return {
    publicKey: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
  };
}

export async function fingerprint(publicKey: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
  const digest = await crypto.subtle.digest('SHA-256', await crypto.subtle.exportKey('spki', key));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function associatedData(report: Pick<EncryptedReport, 'id' | 'senderId' | 'recipientId'>) {
  return new TextEncoder().encode(JSON.stringify([1, report.id, report.senderId, report.recipientId]));
}

export async function encryptReport(content: ReportContent, senderId: string, recipientId: string, senderPublicKey: JsonWebKey, recipientPublicKey: JsonWebKey): Promise<EncryptedReport> {
  if (!content.title.trim() || content.title.length > 120 || !content.body.trim() || content.body.length > 16000) {
    throw new Error('Enter a title (up to 120 characters) and a report (up to 16,000 characters).');
  }
  const report = { id: crypto.randomUUID(), senderId, recipientId };
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const sealKey = async (publicKey: JsonWebKey) => {
    const rsa = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    return toBase64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, rawKey));
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: associatedData(report) }, key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  return { ...report, iv: toBase64(iv), ciphertext: toBase64(ciphertext), senderKey: await sealKey(senderPublicKey), recipientKey: await sealKey(recipientPublicKey) };
}

export async function decryptReport(report: EncryptedReport, userId: string, privateKey: JsonWebKey): Promise<ReportContent> {
  if (userId !== report.senderId && userId !== report.recipientId) throw new Error('This report is not addressed to your account.');
  const rsa = await crypto.subtle.importKey('jwk', privateKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsa, fromBase64(userId === report.senderId ? report.senderKey : report.recipientKey));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(report.iv), additionalData: associatedData(report) }, key, fromBase64(report.ciphertext),
  );
  const content = JSON.parse(new TextDecoder().decode(plaintext));
  if (typeof content.title !== 'string' || typeof content.body !== 'string') throw new Error('Invalid report content.');
  return content;
}
