'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type Stage = 'checking' | 'ready' | 'done' | 'unavailable';
type CredentialResult = { name?: unknown; email?: unknown; message?: unknown; code?: unknown };

async function credentialRequest(
  action: 'status' | 'replace',
  data?: { password: string; confirmed: true },
): Promise<CredentialResult> {
  const response = await fetch('/api/employee-credentials/' + action, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...(data ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    } : {}),
  });
  const result = (await response.json().catch(() => ({}))) as CredentialResult;
  if (!response.ok) {
    const error = new Error(
      typeof result.message === 'string' ? result.message :
        'Temporary sign-in expired. Sign in again or ask HR to review your credentials.',
    ) as Error & { code?: string };
    error.code = typeof result.code === 'string' ? result.code : undefined;
    throw error;
  }
  return result;
}

/**
 * First sign-in requires the ORIGINAL temporary-credential SQL-backed flow.
 * Never derive identity from the frontend URL, cookies, or a mock success.
 */
export function EmployeePasswordPage() {
  const [stage, setStage] = useState<Stage>('checking');
  const [information, setInformation] = useState('Verifying your temporary sign-in.');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await credentialRequest('status');
        if (!active) return;
        if (typeof result.name !== 'string' || typeof result.email !== 'string') {
          throw new Error('Temporary sign-in expired. Sign in again or ask HR to review your credentials.');
        }
        setInformation(result.name + ' · ' + result.email +
          '. Choose your own password before opening the workspace.');
        setStage('ready');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Temporary sign-in expired.');
        setStage('unavailable');
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || stage !== 'ready' || !consent) return;
    if (password.length < 12 || password.length > 128 || password !== confirmation) {
      setMessage('Passwords must match and contain at least 12 characters.');
      return;
    }
    const submittedPassword = password;
    setPassword('');
    setConfirmation('');
    setBusy(true);
    setMessage('');
    try {
      const result = await credentialRequest('replace', { password: submittedPassword, confirmed: true });
      if (result.message !== 'Your personal password is set. Sign in again to open your employee workspace.') {
        throw new Error('Password replacement could not be verified.');
      }
      setMessage(result.message);
      setStage('done');
    } catch (error) {
      const failure = error as Error & { code?: string };
      setMessage(failure.message + (failure.code === 'CREDENTIAL_RECOVERY_REQUIRED' ?
        ' If your password submission completed, try signing in with your personal password before requesting recovery.' :
        ''));
      if (failure.code !== 'PASSWORD_REJECTED' && !/Invalid request/.test(failure.message)) {
        setStage('unavailable');
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Sign-out failed. Retry.');
      window.location.assign('/login');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign-out failed. Retry.');
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <Link className="brand" href="/login">VSPH<span>.</span></Link>
        <span>CONTROL CENTER</span>
      </header>
      <main className="invite-layout"><section className="invite-card">
        <p className="kicker">FIRST SIGN-IN</p>
        <h1>Make this account yours.</h1>
        <p id="passwordSetupInfo" className="lead">{information}</p>
        <p id="passwordSetupMessage" role="status" aria-live="polite">{message}</p>
        <form id="passwordSetupForm" hidden={stage !== 'ready'}
          onSubmit={(event) => void submit(event)}>
          <label htmlFor="personalPassword">Your new personal password</label>
          <input id="personalPassword" type="password" autoComplete="new-password"
            required minLength={12} maxLength={128} value={password}
            onChange={(event) => setPassword(event.target.value)} />
          <label htmlFor="personalPasswordConfirm">Confirm your personal password</label>
          <input id="personalPasswordConfirm" type="password" autoComplete="new-password"
            required minLength={12} maxLength={128} value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)} />
          <label className="employee-enrollment-consent">
            <input id="personalPasswordConsent" type="checkbox" required
              checked={consent} onChange={(event) => setConsent(event.target.checked)}/>
            I accept this employee account link and will keep my personal password private.
          </label>
          <p>The temporary password cannot open your workspace. Choose a different personal
            password; HR should never receive it.</p>
          <button type="submit" id="savePersonalPassword" disabled={busy}>
            Set personal password
          </button>
        </form>
        <Link className="invite-return" href="/login">Go to sign in</Link>
        <button id="cancelPasswordSetup" type="button" disabled={busy}
          onClick={() => void cancel()}>Cancel sign-in</button>
      </section></main>
    </>
  );
}
