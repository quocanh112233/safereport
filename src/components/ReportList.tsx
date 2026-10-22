'use client';

import { useState } from 'react';
import { decryptReport } from '@/lib/reports/crypto';
import type { ReportContent } from '@/lib/reports/crypto';
import type { StoredReport } from '@/lib/reports/store';

export function ReportList({ reports, userId, privateKey, onRefresh }: { reports: StoredReport[]; userId: string; privateKey: JsonWebKey | null; onRefresh: () => Promise<void> }) {
  const [opened, setOpened] = useState<Record<string, ReportContent>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function open(report: StoredReport) {
    if (!privateKey) return;
    setBusy(true); setStatus('Decrypting in your browser…');
    try {
      const content = await decryptReport(report, userId, privateKey);
      setOpened(previous => ({ ...previous, [report.id]: content }));
      setStatus('Report opened on this device.');
    } catch { setStatus('Could not decrypt this report. The key or encrypted content may not match.'); }
    finally { setBusy(false); }
  }

  return <div className="report-list">
    <div className="list-heading"><h2>Your encrypted reports <span className="count">{reports.length}</span></h2><button className="text-button" disabled={busy} onClick={async () => { setBusy(true); try { await onRefresh(); setStatus('Reports refreshed.'); } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not refresh reports.'); } finally { setBusy(false); } }}>Refresh</button></div>
    <p className="status" role="status" aria-live="polite">{status}</p>
    {!reports.length && <div className="empty"><div className="empty-mark" aria-hidden="true">↗</div><h3>No reports here yet.</h3><p>Share your recipient details to receive one, or choose New report to send one.</p></div>}
    {reports.map(report => <article className="report" key={report.id}>
      <div className="report-meta"><span className="badge">{report.senderId === userId ? 'SENT' : 'RECEIVED'} · ENCRYPTED</span><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></div>
      <h3>{opened[report.id]?.title || 'Title protected'}</h3>
      <p className="fine-print">{report.senderId === userId ? 'To' : 'From'} <code>{report.senderId === userId ? report.recipientId : report.senderId}</code></p>
      {opened[report.id] ? <><div className="report-body">{opened[report.id].body}</div><button onClick={() => setOpened(previous => { const next = { ...previous }; delete next[report.id]; return next; })}>Hide content</button></> : <><p className="muted">{privateKey ? 'Open this report on your device.' : 'Unlock your reporting key to read this report.'}</p><button disabled={!privateKey || busy} onClick={() => open(report)}>Open report</button></>}
      <details><summary>Inspect stored ciphertext</summary><p className="fine-print">Title and message are inside this encrypted payload. Account IDs and delivery time remain visible to the server.</p><code className="ciphertext">{report.ciphertext}</code></details>
    </article>)}
  </div>;
}
