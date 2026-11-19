import { useEffect, useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { neutral, savePreference } from './components/console-ui.jsx';
import { SignIn } from './components/sign-in.jsx';
import Console from './features/console/Console.jsx';
import { endpoint, request, useResource } from './lib/api.js';

function useAppearance() {
  const root = document.documentElement;
  const [theme, setTheme] = useState(() => root.dataset.themePreference || 'system');
  const [fontSize, setFontSize] = useState(() => root.dataset.fontSize || 'small');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = event => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    onChange(media);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useLayoutEffect(() => {
    root.dataset.fontSize = fontSize;
    root.dataset.themePreference = theme;
    root.dataset.bsTheme = resolvedTheme;
  }, [root, resolvedTheme, theme, fontSize]);

  function changeTheme(value) {
    setTheme(value);
    savePreference('theme', value);
  }

  function changeFontSize(value) {
    setFontSize(value);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = 'console_font_size=' + value + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;
  }

  return { theme, resolvedTheme, fontSize, changeTheme, changeFontSize };
}

export default function App() {
  const appearance = useAppearance();
  const [revision, setRevision] = useState(0);
  const session = useResource(endpoint('session'), revision);
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    const requireSignIn = () => setAuthenticated(false);
    window.addEventListener('console-auth-required', requireSignIn);
    return () => window.removeEventListener('console-auth-required', requireSignIn);
  }, []);

  async function signOut() {
    try {
      await request(endpoint('session'), { method: 'DELETE', checkSession: false });
      setAuthenticated(false);
    } catch (failure) {
      toast.error(failure.message);
    }
  }

  if (!session.data) return <main className="console-sign-in">
    <div className="console-sign-in-card card border shadow-sm">
      {session.error ? <><p role="alert">{session.error}</p>
        <button type="button" className={neutral} onClick={() => setRevision(value => value + 1)}>Retry</button></>
        : <p className="mb-0 text-body-secondary" role="status">Loading Beanstalk Console…</p>}
    </div>
  </main>;

  if (session.data.enabled && !(authenticated ?? session.data.authenticated)) {
    return <SignIn onSignIn={() => setAuthenticated(true)} />;
  }

  return <Console appearance={appearance} onSignOut={session.data.enabled ? signOut : undefined} />;
}
