'use client';

import { useTideCloak } from '@tidecloak/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { createIdentity, fingerprint } from '@/lib/reports/crypto';
import type { Identity, StoredReport } from '@/lib/reports/store';
import { ReportComposer } from './ReportComposer';
import { ReportList } from './ReportList';

export type RequestApi = <T>(path: string, init?: RequestInit) => Promise<T>;

export function ReportWorkspace({ userId }: { userId: string }) {
  const { secureFetch, getToken, doEncrypt, doDecrypt, logout } = useTideCloak();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [privateKey, setPrivateKey] = useState<JsonWebKey | null>(null);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox');

  const api: RequestApi = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    if (!token) throw new Error('Your session expired. Sign in again.');
    const headers = new Headers(init.headers);
    // This SDK attaches the current token and DPoP proof together, avoiding a refresh race.
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await secureFetch(new URL(path, window.location.origin).href, { ...init, headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    return result as T;
  }, [getToken, secureFetch]);

  const refresh = useCallback(async () => {
    const result = await api<{ reports: StoredReport[] }>('/api/reports');
    setReports(result.reports);
  }, [api]);

  useEffect(() => {
    let active = true;
    Promise.all([api<{ identity: Identity | null }>('/api/identity'), api<{ reports: StoredReport[] }>('/api/reports')])
      .then(([account, inbox]) => { if (active) { setIdentity(account.identity); setReports(inbox.reports); setReady(true); } })
      .catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Could not load workspace.'); });
    return () => { active = false; };
  }, [api]);

  async function unlock() {
    setBusy(true); setStatus('Connecting to Tide to unlock your reporting key…');
    try {
      if (identity) {
        const result = await doDecrypt([{ encrypted: identity.encryptedPrivateKey, tags: ['vault'] }]);
        const key: JsonWebKey = JSON.parse(result[0]);
        if (await fingerprint({ kty: key.kty, n: key.n, e: key.e }) !== identity.fingerprint) throw new Error('Stored public and private keys do not match. Do not send a report.');
        setPrivateKey(key);
      } else {
        const pair = await createIdentity();
        const result = await doEncrypt([{ data: JSON.stringify(pair.privateKey), tags: ['vault'] }]);
        const encryptedPrivateKey = result[0];
        if (typeof encryptedPrivateKey !== 'string' || !encryptedPrivateKey) throw new Error('Tide did not return an encrypted key.');
        const saved = await api<{ identity: Identity }>('/api/identity', { method: 'POST', body: JSON.stringify({ publicKey: pair.publicKey, encryptedPrivateKey }) });
        if (saved.identity.fingerprint !== await fingerprint(pair.publicKey)) throw new Error('Registered key fingerprint does not match.');
        setIdentity(saved.identity); setPrivateKey(pair.privateKey);
      }
      setStatus('Reporting key unlocked for this session.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not unlock reporting key.'); }
    finally { setBusy(false); }
  }

  function lock() { setPrivateKey(null); setStatus('Reporting key locked. Opened reports have been hidden.'); }

  async function deleteKey() {
    if (!window.confirm('Are you sure you want to delete this reporting key from the server? You can then generate a brand new key.')) return;
    setBusy(true); setStatus('Deleting reporting key from server…');
    try {
      await api('/api/identity', { method: 'DELETE' });
      setIdentity(null);
      setPrivateKey(null);
      setStatus('Reporting key deleted. You can now create a brand new key.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not delete reporting key.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="workspace-heading"><div><div className="eyebrow">YOUR PRIVATE WORKSPACE</div><h1>Speak with confidence.</h1></div>
      <button className="text-button" onClick={() => { lock(); logout().catch(() => setStatus('Sign out could not complete. Your reporting key is locked; try signing out again.')); }}>Sign out ↗</button></div>
    <p role="status" aria-live="polite" className="status">{status}</p>
    {!ready ? <div className="panel"><p>{status ? 'Workspace could not be loaded.' : 'Loading encrypted workspace…'}</p><button onClick={() => window.location.reload()}>Reload workspace</button></div> : <div className="workspace-grid">
      <aside className="identity-panel">
        <div className="eyebrow">YOUR REPORTING IDENTITY</div><h2>{privateKey ? 'Ready to report.' : 'Your key is locked.'}</h2>
        <p>Share your account ID and fingerprint directly with someone who wants to send you a report. Verify theirs through a trusted channel.</p>
        <label htmlFor="account-id">Account ID</label><input id="account-id" value={userId} readOnly />
        {identity && <><label htmlFor="key-fingerprint">Key fingerprint · SHA-256</label><textarea id="key-fingerprint" value={identity.fingerprint} readOnly rows={3} spellCheck={false} />
          <button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(`Account: ${userId}\nFingerprint: ${identity.fingerprint}`); setStatus('Account ID and fingerprint copied.'); } catch { setStatus('Copy unavailable. Select and copy the account ID and fingerprint manually.'); } }}>Copy recipient details</button></>}
        <div className="key-action">
          {privateKey ? <>
            <button onClick={lock}>Lock workspace</button>
            <button className="text-button" style={{ color: '#d32f2f', fontSize: '12px', marginTop: '6px' }} disabled={busy} onClick={deleteKey}>Delete key & generate new</button>
          </> : <>
            <button className="primary" disabled={busy} onClick={unlock}>{busy ? 'Contacting Tide…' : identity ? 'Unlock with Tide' : 'Create my reporting key'}</button>
            {identity && <button className="text-button" style={{ color: '#d32f2f', fontSize: '12px', marginTop: '6px' }} disabled={busy} onClick={deleteKey}>Delete key & generate new</button>}
          </>}
        </div>
        <p className="fine-print">Your unlocked key stays in this page’s memory. Lock or sign out when finished. No name or email is collected here.</p>
      </aside>
      <section className="reports-panel" aria-label="Reports">
        <nav className="tabs" aria-label="Workspace views">{(['inbox', 'sent', 'compose'] as const).map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab === 'inbox' ? 'Received' : tab === 'sent' ? 'Sent' : '+ New report'}</button>)}</nav>
        {view === 'compose' ? identity && privateKey ? <ReportComposer userId={userId} identity={identity} api={api} onSent={async () => { await refresh(); setView('sent'); setStatus('Encrypted report delivered. Only you and the chosen recipient hold its decryption keys.'); }} /> : <div className="empty"><h2>Unlock before you write.</h2><p>Use the identity panel to create or unlock your reporting key with Tide.</p></div> :
          <ReportList key={`${view}-${privateKey ? 'open' : 'locked'}`} reports={reports.filter(report => view === 'inbox' ? report.recipientId === userId : report.senderId === userId)} userId={userId} privateKey={privateKey} onRefresh={refresh} />}
      </section>
    </div>}
    <aside className="notice"><strong>Use a verified recipient.</strong> Account IDs are pseudonyms, not proof of someone’s real-world role. A compromised browser or a recipient sharing plaintext can expose a report. This prototype does not provide anonymity, forward secrecy, or instant revocation.</aside>
  </>;
}
