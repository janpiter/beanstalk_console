import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const sessionCookie = 'console_session';
const sessionLifetime = 12 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest();

export function consoleAuth(env, decodeCookies) {
  const { CONSOLE_USERNAME: username, CONSOLE_PASSWORD: password } = env;
  if (Boolean(username) !== Boolean(password)) throw new Error('Set both CONSOLE_USERNAME and CONSOLE_PASSWORD');
  const enabled = Boolean(username);
  const credentials = enabled && digest(JSON.stringify([username, password]));
  const basic = enabled && digest('Basic ' + Buffer.from(username + ':' + password).toString('base64'));
  const sessions = new Map();
  const cookie = { httpOnly: true, sameSite: 'strict', secure: env.CONSOLE_SECURE_COOKIES === 'true', path: '/' };
  const tokenFor = request => decodeCookies(request).get(sessionCookie);

  function signedIn(request) {
    if (!enabled) return true;
    const token = tokenFor(request);
    const expires = sessions.get(token);
    if (expires > Date.now()) return true;
    if (expires !== undefined) sessions.delete(token);
    return false;
  }

  function checkOrigin(request, response, next) {
    response.set('Cache-Control', 'no-store');
    const origin = request.get('Origin');
    if (request.get('Sec-Fetch-Site') === 'cross-site' ||
      (origin && (!URL.canParse(origin) || new URL(origin).host !== request.get('Host')))) {
      return response.status(403).json({ error: 'Cross-site request denied' });
    }
    if (!request.is('application/json')) return response.status(415).json({ error: 'Expected application/json' });
    next();
  }

  return {
    enabled,
    checkOrigin,
    status(request, response) {
      response.set('Cache-Control', 'no-store').json({ enabled, authenticated: signedIn(request) });
    },
    login(request, response) {
      if (!enabled) return response.status(204).end();
      const { username: submittedUser, password: submittedPassword } = request.body || {};
      if (typeof submittedUser !== 'string' || typeof submittedPassword !== 'string' ||
        !timingSafeEqual(digest(JSON.stringify([submittedUser, submittedPassword])), credentials)) {
        return response.status(401).json({ error: 'Incorrect username or password' });
      }
      const now = Date.now();
      for (const [token, expires] of sessions) {
        if (expires <= now) sessions.delete(token);
      }
      sessions.delete(tokenFor(request));
      const token = randomBytes(32).toString('hex');
      sessions.set(token, now + sessionLifetime);
      response.cookie(sessionCookie, token, { ...cookie, maxAge: sessionLifetime }).status(204).end();
    },
    logout(request, response) {
      sessions.delete(tokenFor(request));
      response.clearCookie(sessionCookie, cookie).status(204).end();
    },
    requireAuth(request, response, next) {
      if (signedIn(request) || (!request.get('Sec-Fetch-Site') && timingSafeEqual(digest(request.get('authorization') || ''), basic))) return next();
      response.set('Cache-Control', 'no-store').status(401).json({ error: 'Authentication required' });
    },
  };
}
