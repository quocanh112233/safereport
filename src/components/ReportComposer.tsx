'use client';

import { useState } from 'react';
import { encryptReport, fingerprint } from '@/lib/reports/crypto';
import type { Identity } from '@/lib/reports/store';
import type { RequestApi } from './ReportWorkspace';

type Recipient = Omit<Identity, 'encryptedPrivateKey'>;

export function ReportComposer({ userId, identity, api, onSent }: { userId: string; identity: Identity; api: RequestApi; onSent: () => Promise<void> }) {
  const [recipientId, setRecipientId] = useState('');
  const [expectedFingerprint, setExpectedFingerprint] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus('Verifying the recipient key…');
    try {
      const recipient = recipientId.trim();
      if (recipient === userId) throw new Error('Choose another account to receive your report.');
      const result = await api<{ identity: Recipient }>(`/api/identity?user=${encodeURIComponent(recipient)}`);
      const actualFingerprint = await fingerprint(result.identity.publicKey);
      if (actualFingerprint !== expectedFingerprint.trim().toLowerCase() || result.identity.userId !== recipient) throw new Error('Fingerprint does not match. Confirm the account ID and fingerprint directly with your recipient. Nothing was sent.');
      setStatus('Encrypting title and message in your browser…');
      const encrypted = await encryptReport({ title: title.trim(), body: body.trim() }, userId, recipient, identity.publicKey, result.identity.publicKey);
      await api('/api/reports', { method: 'POST', body: JSON.stringify(encrypted) });
      setTitle(''); setBody(''); setStatus('Encrypted report delivered.');
      try { await onSent(); }
      catch { setStatus('Report delivered, but the inbox could not refresh. Do not resend; refresh the workspace to see it.'); }
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Report could not be sent.'); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="composer">
    <div className="eyebrow">NEW CONFIDENTIAL REPORT</div><h2>Tell the right person.</h2><p className="muted">Everything you write below the recipient details is encrypted before upload.</p>
    <label htmlFor="recipient">Recipient account ID</label><input id="recipient" required maxLength={200} value={recipientId} onChange={event => setRecipientId(event.target.value)} autoComplete="off" />
    <label htmlFor="fingerprint">Recipient fingerprint</label><input id="fingerprint" required pattern="[a-fA-F0-9]{64}" minLength={64} maxLength={64} value={expectedFingerprint} onChange={event => setExpectedFingerprint(event.target.value)} aria-describedby="fingerprint-help" autoComplete="off" spellCheck={false} />
    <p id="fingerprint-help" className="fine-print">Get these details from the recipient in person or through an independently trusted channel. Copying them from an untrusted directory is not verification.</p>
    <hr /><label htmlFor="report-title">Report title · encrypted</label><input id="report-title" required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} autoComplete="off" />
    <label htmlFor="report-body">What happened? · encrypted</label><textarea id="report-body" required maxLength={16000} rows={8} value={body} onChange={event => setBody(event.target.value)} placeholder="Describe the incident using sample data for this prototype." />
    <div className="form-footer"><span className="fine-print">{body.length.toLocaleString()} / 16,000 characters</span><button className="primary" disabled={busy}>{busy ? 'Working…' : 'Encrypt & send report ↗'}</button></div>
    <p className="status" role="status" aria-live="polite">{status}</p>
  </form>;
}
