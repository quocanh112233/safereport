'use client';

import { useTideCloak } from '@tidecloak/nextjs';
import { ReportWorkspace } from './ReportWorkspace';
import { useEffect, useState } from 'react';

export function ReportApp() {
  const { authenticated, isInitializing, initError, isOffline, sessionExpired, login, reload, getValueFromToken } = useTideCloak();
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR & initial client hydration skeleton: guarantees identical HTML between server and client
  if (!mounted) {
    return (
      <main className="shell">
        <header className="site-header">
          <a href="/" className="brand"><img src="/safereport-logo.png" alt="" width="36" height="36" />SafeReport<span className="brand-caption">A safer place to speak.</span></a>
          <span className="badge">Built with TideCloak</span>
        </header>
        <p role="status" className="loading">Connecting to your protected workspace…</p>
        <footer>SafeReport · UNLOCKED prototype<span>Content encryption in your browser. Identity protection by Tide.</span></footer>
      </main>
    );
  }

  const isTideUnreachable = initError?.message?.includes('dpop_signing_alg_values_supported') ||
                            initError?.message?.includes('Failed to fetch') ||
                            initError?.message?.includes('NetworkError');

  const displayError = isTideUnreachable
    ? "TideCloak authentication server (:8080) is unreachable. Run './run.sh init' or 'docker start safereport-tidecloak' to start the local auth container."
    : (initError?.message || error);

  const userId = getValueFromToken('sub');
  return <main className="shell">
    <header className="site-header">
      <a href="/" className="brand"><img src="/safereport-logo.png" alt="" width="36" height="36" />SafeReport<span className="brand-caption">A safer place to speak.</span></a>
      <span className="badge">Built with TideCloak</span>
    </header>
    {(initError || error) && <p className="notice" role="alert">{displayError} <button onClick={reload}>Retry connection</button></p>}
    {isOffline && <p className="notice" role="status">Connection unavailable. Tide must be reachable to unlock your reporting key.</p>}
    {sessionExpired && <p className="notice" role="status">Your session expired. Sign in again to continue.</p>}
    {isInitializing ? <p role="status" className="loading">Connecting to your protected workspace…</p> : authenticated && !sessionExpired && typeof userId === 'string' ?
      <ReportWorkspace key={userId} userId={userId} /> :
      <section className="landing">
        <div className="eyebrow">CONFIDENTIAL INCIDENT REPORTING</div>
        <h1>Your story.<br />Your chosen reader.</h1>
        <p className="intro">Document what happened and send it directly to someone you trust. Your report is encrypted in your browser before it leaves your device.</p>
        <button className="primary" disabled={isOffline || !!initError} onClick={() => login().catch(error => setError(error instanceof Error ? error.message : 'Could not sign in.'))}>Enter your secure workspace <span aria-hidden="true">↗</span></button>
        <p className="fine-print">No extra name or email form. Your Tide account identifies you.</p>
        <div className="principles">
          <section><span className="step">01 / IDENTITY</span><h2>A key protected by Tide.</h2><p>Your private reporting key is stored encrypted with your Tide identity.</p></section>
          <section><span className="step">02 / DELIVERY</span><h2>A reader chosen by you.</h2><p>Verify their account and key fingerprint before sending a report.</p></section>
          <section><span className="step">03 / STORAGE</span><h2>Content stays encrypted.</h2><p>The server stores encrypted titles and messages, plus routing metadata.</p></section>
        </div>
        <aside className="notice"><strong>Confidential does not mean anonymous.</strong> The service can see account IDs, recipients and timestamps. The person you choose can read and share your report. Use sample data for this prototype.</aside>
      </section>}
    <footer>SafeReport · UNLOCKED prototype<span>Content encryption in your browser. Identity protection by Tide.</span></footer>
  </main>;
}
