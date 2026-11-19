import { useEffect, useRef, useState } from 'react';
import { endpoint, request } from '../lib/api.js';
import { logo, success } from './console-ui.jsx';

export function SignIn({ onSignIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const passwordField = useRef(null);

  useEffect(() => { document.title = 'Sign in - Beanstalk Console'; }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      await request(endpoint('session'), {
        method: 'POST', checkSession: false,
        data: { username: form.get('username'), password: form.get('password') },
      });
      const session = await request(endpoint('session'), { checkSession: false });
      if (!session.authenticated) throw new Error('Could not start a session. Check that your browser accepts cookies.');
      onSignIn();
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 401) {
        passwordField.current.value = '';
        passwordField.current.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  return <main className="console-sign-in">
    <form className="console-sign-in-card card bg-body border shadow-sm" onSubmit={submit} aria-busy={busy}>
      <div className="d-flex align-items-center gap-2 fw-semibold mb-4">
        <img src={logo} width="24" height="24" alt="" /> Beanstalk Console
      </div>
      <h1 className="h4 mb-3">Sign in</h1>
      {error && <div id="sign-in-error" className="alert alert-danger py-2" role="alert">{error}</div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="sign-in-user">Username</label>
        <input className="form-control" id="sign-in-user" name="username" autoComplete="username"
          autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="mb-4">
        <label className="form-label" htmlFor="sign-in-password">Password</label>
        <input className="form-control" id="sign-in-password" name="password" type="password"
          ref={passwordField} autoComplete="current-password" required />
      </div>
      <button type="submit" className={success + ' w-100'} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>;
}
