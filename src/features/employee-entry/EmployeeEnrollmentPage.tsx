'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type EnrollmentProof = { id: string; token: string };
type EnrollmentResult = {
  name?: unknown;
  email?: unknown;
  expiresAt?: unknown;
  message?: unknown;
  code?: unknown;
};
type Stage = 'checking' | 'missing' | 'ready' | 'finished' | 'unavailable';

async function employeeEnrollmentRequest(
  action: 'inspect' | 'accept',
  proof: EnrollmentProof,
  extra: { password?: string; confirmed?: true } = {},
): Promise<EnrollmentResult> {
  const response = await fetch('/api/employee-enrollment/' + action, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...proof, ...extra }),
  });
  const data = (await response.json().catch(() => ({}))) as EnrollmentResult;
  if (!response.ok) {
    const failure = new Error(typeof data.message === 'string' ?
      data.message : 'Invitation unavailable. Ask VSPH to review or reissue it.') as Error & { code?: string };
    failure.code = typeof data.code === 'string' ? data.code : undefined;
    throw failure;
  }
  return data;
}

export function estimatePasswordStrength(value: string) {
  if (!value) return { level: 0, description: 'Strength appears as you type.' };
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(value)).length;
  const common = /password|qwerty|letmein|welcome|12345678|abcdefgh/i.test(value);
  const repetition = /(.)\1{3,}/.test(value);
  const points = Number(value.length >= 8) + Number(value.length >= 12) +
    Number(value.length >= 16) + Number(types >= 3) + Number(types === 4);
  const level = value.length < 8 || common || repetition ? 1 : Math.min(4, Math.max(1, points));
  const name = ['', 'Weak', 'Fair', 'Good', 'Strong'][level];
  const advice = value.length < 8 ? 'Use at least 8 characters.' :
    common || repetition ? 'Avoid common or repeated patterns.' :
      level < 3 ? 'Try a longer unique passphrase.' :
        level < 4 ? 'Additional length helps.' : 'Use a different password for every account.';
  return { level, description: name + ' (estimate). ' + advice };
}

function PasswordEye({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3" opacity={visible ? 0.55 : 1}/>
    </svg>
  );
}

/** Public employee invite: never accept an account without a live backend. */
export function EmployeeEnrollmentPage() {
  const proofRef = useRef<EnrollmentProof | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const [information, setInformation] = useState('Checking your private employee invitation.');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [consent, setConsent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = estimatePasswordStrength(password);

  useEffect(() => {
    let active = true;
    // React StrictMode replays effects. The ephemeral ref survives replay,
    // while history is scrubbed exactly once for private-link URLs.
    const earlier = proofRef.current;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const id = params.get('enrollment_id');
    const token = params.get('token');
    window.history.replaceState(null, '', window.location.pathname);
    const proof = earlier ?? (id && token ? { id, token } : null);
    proofRef.current = proof;

    const inspect = async () => {
      await Promise.resolve(); // state updates are asynchronous to the effect
      if (!active) return;
      if (!proof) {
        setInformation('Open the private invitation supplied by your HR manager or VSPH owner. Creating a staff record alone does not create a login.');
        setStage('missing');
        return;
      }
      try {
        const data = await employeeEnrollmentRequest('inspect', proof);
        if (!active) return;
        if (typeof data.name !== 'string' || typeof data.email !== 'string' ||
            typeof data.expiresAt !== 'string' ||
            !Number.isFinite(Date.parse(data.expiresAt))) {
          throw new Error('Invitation unavailable. Ask VSPH to review or reissue it.');
        }
        setInformation('Set up ' + data.name + ' (' + data.email + '). Invitation expires ' +
          new Date(data.expiresAt).toLocaleString() + '.');
        setStage('ready');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Invitation unavailable.');
        setStage('unavailable');
      }
    };
    void inspect();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const proof = proofRef.current;
    if (!proof || busy || stage !== 'ready' || !consent) return;
    if (password.length < 8 || password.length > 128 || password !== confirmation) {
      setMessage('Passwords must match and contain at least 8 characters.');
      return;
    }
    const submittedPassword = password;
    setPassword('');
    setConfirmation('');
    setBusy(true);
    setMessage('');
    try {
      const result = await employeeEnrollmentRequest('accept', proof, {
        password: submittedPassword, confirmed: true,
      });
      // A fake 200 response is not evidence of successful enrollment.
      if (result.message !== 'Your employee account is ready. Sign in with your work email and the password you just chose.') {
        throw new Error('Employee account activation could not be verified.');
      }
      proofRef.current = null;
      setMessage(result.message);
      setStage('finished');
    } catch (error) {
      const failure = error as Error & { code?: string };
      if (failure.code === 'PASSWORD_REJECTED') {
        setMessage(failure.message);
      } else {
        setMessage(failure.message +
          ' If you already completed setup, try signing in. Otherwise ask the issuer to review the invitation.');
        setStage('unavailable');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="employee-enrollment-page">
      <header><Link className="brand" href="/login">VSPH<span>.</span></Link><span>CONTROL CENTER</span></header>
      <main className="invite-layout"><section className="invite-card">
        <p className="kicker">EMPLOYEE ACCOUNT</p>
        <h1>Set up your login.</h1>
        <p id="enrollmentInfo" className="lead">{information}</p>
        <p id="enrollmentMessage" role="status" aria-live="polite">{message}</p>
        <form id="enrollmentForm" hidden={stage !== 'ready'} onSubmit={(e) => void submit(e)}>
          <label htmlFor="enrollmentPassword">New password</label>
          <div className="enrollment-password-wrap">
            <input id="enrollmentPassword" type={visible ? 'text' : 'password'}
              autoComplete="new-password" required minLength={8} maxLength={128}
              aria-describedby="enrollmentPasswordHelp enrollmentStrengthText"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className={'enrollment-password-toggle' + (visible ? ' is-visible' : '')}
              aria-label={visible ? 'Hide new password' : 'Show new password'} aria-pressed={visible}
              title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>
              <PasswordEye visible={visible}/>
            </button>
          </div>
          <p id="enrollmentPasswordHelp" className="enrollment-password-help">
            Use at least 8 characters. Longer, unique passphrases are safer.
          </p>
          <div className="enrollment-strength" role="group" aria-label="Estimated password strength">
            <div className="enrollment-strength-track">
              <span id="enrollmentStrengthFill" data-level={strength.level}
                style={{ width: (25 * strength.level) + '%' }} />
            </div>
            <p id="enrollmentStrengthText" aria-live="polite">{strength.description}</p>
          </div>
          <label htmlFor="enrollmentConfirm">Confirm password</label>
          <div className="enrollment-password-wrap">
            <input id="enrollmentConfirm" type={confirmationVisible ? 'text' : 'password'}
              autoComplete="new-password" required minLength={8} maxLength={128}
              value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            <button type="button"
              className={'enrollment-password-toggle' + (confirmationVisible ? ' is-visible' : '')}
              aria-label={confirmationVisible ? 'Hide confirmation password' : 'Show confirmation password'}
              aria-pressed={confirmationVisible} title={confirmationVisible ? 'Hide password' : 'Show password'}
              onClick={() => setConfirmationVisible(!confirmationVisible)}>
              <PasswordEye visible={confirmationVisible}/>
            </button>
          </div>
          <label className="employee-enrollment-consent">
            <input id="enrollmentConsent" type="checkbox" required checked={consent}
              onChange={(e) => setConsent(e.target.checked)} />
            I accept the employment account link for the named employee.
          </label>
          <p>This creates your personal employee login. HR authority, customer products and project
            assignments require separate approval.</p>
          <button id="enrollmentSubmit" type="submit" disabled={busy || stage !== 'ready'}>
            Create my login
          </button>
        </form>
        <Link className="invite-return" href="/login">Go to sign in</Link>
      </section></main>
    </div>
  );
}
