import { useEffect, useState } from 'react';

export const endpoint = (...parts) => new URL('./api/' + parts.map(encodeURIComponent).join('/'), document.baseURI).pathname;

export async function request(url, { method = 'GET', data, signal, checkSession = true } = {}) {
  const response = await fetch(url, {
    method, signal,
    ...(method !== 'GET' && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data ?? {}) }),
  });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => null);
  if (response.status === 401 && checkSession && !signal?.aborted) {
    window.dispatchEvent(new Event('console-auth-required'));
  }
  if (!response.ok || result === null) {
    throw Object.assign(new Error(result?.error || `Request failed (HTTP ${response.status})`), { status: response.status });
  }
  return result;
}

export function useResource(url, revision, interval = 0) {
  const [result, setResult] = useState({});
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const data = await request(url, { signal: controller.signal });
        if (!controller.signal.aborted) setResult(previous => ({
          url, data, previousData: previous.url === url ? previous.data : undefined, updated: new Date(),
        }));
      } catch (error) {
        if (!controller.signal.aborted) setResult(previous => ({
          ...(previous.url === url ? previous : { url }), error: error.message,
        }));
      } finally {
        if (!controller.signal.aborted && interval) timer = setTimeout(load, interval);
      }
    }
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [url, revision, interval]);
  return result.url === url ? result : {};
}
