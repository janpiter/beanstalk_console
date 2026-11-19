import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  actionLocation, Alert, Divider, Item, legacyCookie, locationFor, logo, Menu, nameOf, neutral, preference, queueURL,
  savePreference, serverFields, ServerSummary, TubeTable, tubeFields,
} from '../../components/console-ui.jsx';
import { Icon } from '../../components/icon.jsx';
import { NavigationPicker } from '../../components/navigation-picker.jsx';
import { Toaster } from '../../components/sonner.jsx';
import { ActionDialog, CopyPayloadDialog, defaultSettings } from './actions.jsx';
import { BulkControls, SampleEditor, Samples, SearchResults, TubeJobs, TubeJobsSkeleton } from './jobs.jsx';
import { endpoint, request, useResource } from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';

function settingsFromCookies() {
  const value = (key, fallback) => Number(legacyCookie(key)) || fallback;
  return {
    pause: value('tubePauseSeconds', defaultSettings.pause),
    interval: Math.max(100, value('autoRefreshTimeoutMs', defaultSettings.interval)),
    auto: legacyCookie('isEnabledAutoRefreshLoad') === '1',
    searchLimit: Math.min(100, Math.max(1, value('searchResultLimit', defaultSettings.searchLimit))),
    json: legacyCookie('isDisabledJsonDecode') !== '1',
    unserialize: legacyCookie('isDisabledUnserialization') !== '1',
    base64: legacyCookie('isEnabledBase64Decode') === '1',
    highlight: legacyCookie('isDisabledJobDataHighlight') !== '1',
  };
}
const autoRefreshParam = 'auto_refresh';
const autoRefreshPreference = 'auto-refresh';

function readAutoRefresh(params) {
  const value = params.get(autoRefreshParam)?.toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

function carryAutoRefresh(url, enabled) {
  if (enabled || url.searchParams.has(autoRefreshParam)) {
    const value = String(enabled);
    if (url.searchParams.get(autoRefreshParam) !== value) url.searchParams.set(autoRefreshParam, value);
  }
  return url;
}

const postAction = (name, server, tube, params, data) =>
  request(actionLocation(server, tube, name, params), { method: 'POST', data });

function notifyTubeResults(operation, results, toastId) {
  const failed = results.some(item => item.error || item.stopped === 'timeout');
  const limited = operation === 'clear' && results.some(item => item.stopped === 'limit');
  const notify = failed ? toast.error : limited ? toast.warning : toast.success;
  notify(operation === 'clear' ? 'Job deletion results' : nameOf(operation) + ' results', {
    id: toastId,
    description: <ul className="console-toast-details mb-0 ps-3">
      {results.map(item => <li key={item.tube}>
        {item.tube} · {item.affected} {operation === 'clear' ? 'deleted' : 'affected'}
        {item.error && ' · ' + item.error}
        {item.stopped && ' · stopped at ' + item.stopped}
        {item.pendingCopy && ' · destination job #' + item.pendingCopy.destinationId + ' created; source deletion unconfirmed'}
      </li>)}
    </ul>,
  });
}

function filterPattern(value) {
  const pattern = value.trim();
  if (!pattern) return null;
  const hasRegexSyntax = /[.|+?^${}()[\]\\]/.test(pattern);
  try {
    return new RegExp(hasRegexSyntax ? pattern : pattern.replaceAll('*', '.*'), 'i');
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*'), 'i');
  }
}

const defaultServerFields = ['current-connections', ...tubeFields.slice(0, 5).sort(), 'current-tubes'];

const themeChoices = [
  { value: 'system', label: 'System', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

const fontSizeChoices = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
];

function AppearanceOptions({ legend, name, choices, selected, onChange }) {
  return <fieldset className="theme-switcher">
    <legend>{legend}</legend>
    <div className="theme-options">
      {choices.map(({ value, label, icon }) => <label key={value}>
        <input type="radio" name={name} className="btn-check" value={value}
          checked={selected === value} onChange={() => onChange(value)} />
        <span>{icon && <Icon name={icon} />}{label}</span>
      </label>)}
    </div>
  </fieldset>;
}

function AppearanceSettings({ theme, fontSize, changeTheme, changeFontSize }) {
  return <li className="theme-menu-item" onClick={event => event.stopPropagation()}>
    <AppearanceOptions legend="Appearance" name="console-theme" choices={themeChoices} selected={theme} onChange={changeTheme} />
    <AppearanceOptions legend="Font size" name="console-font-size" choices={fontSizeChoices} selected={fontSize} onChange={changeFontSize} />
  </li>;
}

function SignOutAction({ onSignOut }) {
  const [busy, setBusy] = useState(false);
  return <li className="console-sign-out-footer">
    <button type="button" className={neutral + ' console-danger-action console-sign-out w-100 justify-content-start fw-semibold'}
      disabled={busy} aria-busy={busy} onClick={async event => {
        event.stopPropagation();
        setBusy(true);
        try {
          await onSignOut();
        } finally {
          setBusy(false);
        }
      }}>
      <Icon name="signOut" /> {busy ? 'Signing out…' : 'Sign out'}
    </button>
  </li>;
}

function Navigation({ servers, server, tubes, tube, loadingServers, loadingTubes, serversError, tubesError, query, state, samplesPage, onSearch, onAction, refresh, toggleRefresh, onColumns, searchLimit, appearance, onSignOut }) {
  const [expanded, setExpanded] = useState(false);
  const availableServers = server && !servers.some(item => item.id === server.id) ? [...servers, server] : servers;
  const serverOptions = [{ id: '', label: 'All servers', href: './?' }, ...availableServers.map(item => ({
    id: item.id, label: item.label, description: item.label === item.endpoint ? undefined : item.endpoint,
    href: locationFor(item),
  }))];
  const tubeNames = tubes.map(item => item.name);
  if (tube && !tubeNames.includes(tube)) tubeNames.unshift(tube);
  const tubeOptions = [{ id: '', label: 'All tubes', href: locationFor(server) }, ...tubeNames.map(name => ({
    id: name, label: name, href: locationFor(server, name),
  }))];
  return <nav className="navbar navbar-expand-lg sticky-top bg-body rounded-3 mx-3 shadow-sm rounded-bottom-0" aria-label="Main navigation">
    <div className="container-fluid">
      <a className="navbar-brand" href="./?"><img src={logo} alt="" width="22" height="22" className="rounded-circle mb-1" />{' '}<span>Beanstalk Console</span></a>
      <button type="button" className="border-0 btn btn-sm navbar-toggler legacy-toggler" aria-expanded={expanded} aria-controls="navbarSupportedContent" aria-label="Toggle navigation" onClick={() => setExpanded(!expanded)}><Icon name="menu" /></button>
      <div className={'collapse navbar-collapse' + (expanded ? ' show' : '')} id="navbarSupportedContent">
        <ul className="navbar-nav navbar-pickers me-auto mb-2 mb-lg-0">
          <li className="nav-item"><NavigationPicker title="servers" icon="server" options={serverOptions}
            selected={server?.id || ''} loading={loadingServers} unavailable={Boolean(serversError)} /></li>
          {server && <li className="nav-item"><NavigationPicker key={server.id} title="tubes" icon="tube" options={tubeOptions}
            selected={tube || ''} loading={loadingTubes} unavailable={Boolean(tubesError)} /></li>}
        </ul>
        {server && tube && <form key={server.id + ':' + tube + ':' + query} className="tube-job-search mb-2 mb-lg-0 me-lg-1" role="search" aria-label="Search jobs in this tube" action="./" method="get" onSubmit={onSearch}>
          <input type="hidden" name="server" value={server.endpoint} /><input type="hidden" name="tube" value={tube} />
          <input type="hidden" name="state" value={state} /><input type="hidden" name="action" value="search" />
          <input type="hidden" name="limit" value={searchLimit} />
          <div className="input-group input-group-sm">
            <input type="search" className="form-control" name="searchStr" placeholder="Search jobs in this tube" aria-label="Search jobs in this tube" defaultValue={query} maxLength={1000} required />
            <button type="submit" className={neutral} aria-label="Search jobs" title="Search jobs"><Icon name="search" /></button>
          </div>
        </form>}
        <ul className="nav navbar-nav navbar-right align-items-lg-center gap-lg-1">
          <li className="nav-item"><Menu button="nav-link console-settings-button" end title="Settings" label={<>
            <Icon name="settings" className="d-none d-sm-block" weight="regular" />
            <span className="d-block d-sm-none text-start">Settings <span className="float-end pe-2"><Icon name="settings" weight="regular" /></span></span>
          </>}>
            {!samplesPage && <Item onClick={onColumns}>Filter columns</Item>}
            <Item href="./?action=manageSamples">Manage samples</Item>
            <Divider />
            <Item newTab href="https://github.com/beanstalkd/beanstalkd">Beanstalk (github) <Icon name="externalLink" /></Item>
            <Item newTab href="https://github.com/beanstalkd/beanstalkd/blob/master/doc/protocol.txt">Protocol Specification <Icon name="externalLink" /></Item>
            <Divider /><Item onClick={() => onAction({ type: 'settings' })}>Edit settings</Item>
            <Divider /><AppearanceSettings {...appearance} />
            {onSignOut && <><Divider /><SignOutAction onSignOut={onSignOut} /></>}
          </Menu></li>
          {!samplesPage && <li className="nav-item d-flex justify-content-end"><button id={server ? 'autoRefresh' : 'autoRefreshSummary'} type="button" className={'btn btn-sm mt-lg-0 console-icon-button ' + (refresh ? 'btn-success' : 'console-neutral')}
            aria-label="Toggle auto refresh" aria-pressed={refresh} title="Toggle auto refresh" onClick={toggleRefresh}><Icon name="refresh" weight="regular" /></button></li>}
        </ul>
      </div>
    </div>
  </nav>;
}

export default function Console({ appearance, onSignOut }) {
  const [pageURL, setPageURL] = useState(() => new URL(location.href));
  const params = pageURL.searchParams;
  const serverKey = params.get('server') || '';
  const tube = params.get('tube') || '';
  const action = params.get('action') || '';
  const sampleEdit = ['newSample', 'editSample'].includes(action);
  const samplesPage = sampleEdit || ['manageSamples', 'deleteSample'].includes(action);
  const query = action === 'search' ? params.get('searchStr') || '' : '';
  const from = params.get('from') || '';
  const [settings, setSettings] = useState(() => ({ ...settingsFromCookies(), ...preference('settings', {}) }));
  const [refreshChoice, setRefreshChoice] = useState(() =>
    readAutoRefresh(params) ?? preference(autoRefreshPreference, null));
  const refresh = refreshChoice ?? settings.auto;
  const [visibleServerFields, setServerFields] = useState(() => preference('server-columns', legacyCookie('filter')?.split(',') || defaultServerFields));
  const [visibleTubeFields, setTubeFields] = useState(() => preference('tube-columns', legacyCookie('tubefilter')?.split(',') || tubeFields.slice(0, 9)));
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState(() => params.get('filter') || '');
  const [selected, setSelected] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pending = useRef(false);
  const clearingJobs = useRef(false);
  const openedLegacyAction = useRef(false);
  const currentURL = useRef(pageURL);
  const pageVersion = useRef(0);
  const dialogFocus = useRef(null);
  const serversResource = useResource(endpoint('servers'), revision);
  const servers = serversResource.data?.servers || [];
  const listedServer = servers.find(item => [item.id, item.endpoint, 'beanstalk://' + item.endpoint].includes(serverKey));
  const sharedLink = useResource(
    serverKey && serversResource.data && !listedServer ? endpoint('server-link') + '?' + new URLSearchParams({ server: serverKey }) : null,
    revision,
  );
  const server = listedServer || sharedLink.data;
  const polling = refresh && !samplesPage ? settings.interval : 0;
  const overviewUrl = server ? queueURL(server, 'overview') : null;
  const overview = useResource(overviewUrl, revision, tube ? 0 : polling);
  const overviewError = overview.error;
  const detail = useResource(server && tube ? queueURL(server, 'tubes', tube) : null, revision, polling);
  const samples = useResource(samplesPage || (server && tube) ? endpoint('samples') : null, revision);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || settings.searchLimit));
  const search = useResource(server && tube && query ? queueURL(server, 'tubes', tube, 'search') + '?' + new URLSearchParams({ query, limit, ...(from && { from }) }) : null, revision);
  const loadingServers = !serversResource.data && !serversResource.error;
  const resolvingServer = loadingServers || Boolean(serverKey && serversResource.data && !server && !sharedLink.error);
  const loadingTubes = resolvingServer || Boolean(server && !overview.data && !overview.error);
  const loadingDetail = resolvingServer || Boolean(server && !detail.data && !detail.error);
  const tubes = [...(overview.data?.tubes || [])].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  const matcher = filterPattern(filter);
  const filtered = matcher ? tubes.filter(item => matcher.test(item.name)) : tubes;
  const active = selected.filter(name => tubes.some(item => item.name === name));
  const reload = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!overviewError) return;
    const id = toast.error(overviewError);
    return () => { toast.dismiss(id); };
  }, [overviewUrl, overviewError]);

  useEffect(() => {
    document.body.classList.toggle('page-all-tubes', Boolean(server && !tube));
    let title = (tube ? tube + ' - ' : '') + (server?.label || 'All servers');
    if (samplesPage) title = 'Job samples';
    if (action === 'newSample') title = 'New job sample';
    if (action === 'editSample') title = 'Edit job sample';
    document.title = title + ' - Beanstalk console';
  }, [server?.label, tube, samplesPage, action]);

  useEffect(() => {
    const nav = document.querySelector('.navbar');
    if (!nav || !server || tube) return;
    const measure = () => document.body.style.setProperty('--tube-filter-sticky-top', nav.getBoundingClientRect().height + 'px');
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(nav);
    return () => observer.disconnect();
  }, [server?.id, tube]);

  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, []);

  useEffect(() => {
    const bar = document.getElementById('tubeBulkActions');
    document.body.classList.toggle('has-tube-bulk-actions', Boolean(bar));
    if (!bar) return;
    const measure = () => document.body.style.setProperty('--tube-bulk-space', (bar.getBoundingClientRect().height + 16) + 'px');
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(bar);
    return () => observer.disconnect();
  }, [active.length]);

  useEffect(() => {
    if (!server || tube || dialog) return;
    function shortcut(event) {
      if (event.target.closest?.('input, textarea, select, button, [contenteditable=true], [role=textbox]') ||
        event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !/^[a-z0-9]$/i.test(event.key)) return;
      const input = document.getElementById('searchTubes');
      if (!input) return;
      event.preventDefault();
      input.focus();
      filterTubes(filter + event.key);
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [server?.id, tube, dialog, filter]);

  function startDialog(value) {
    const active = document.activeElement;
    const menu = active?.closest('.dropdown-menu');
    dialogFocus.current = menu?.parentElement.querySelector('button[aria-expanded]') || active;
    setError('');
    const highlight = value.type === 'sample' && window.getSelection()?.toString().trim().slice(0, 200);
    if (highlight) value = { ...value, data: { ...value.data, name: highlight } };
    setDialog(value);
  }
  function select(names, checked) {
    setSelected(previous => checked ? [...new Set([...previous, ...names])] : previous.filter(item => !names.includes(item)));
  }
  function changePage(url) {
    currentURL.current = url;
    pageVersion.current++;
    openedLegacyAction.current = false;
    setPageURL(url);
    setFilter(url.searchParams.get('filter') || '');
    setSelected([]);
    setDialog(null);
    setError('');
  }

  useEffect(() => {
    if (refreshChoice !== null) savePreference(autoRefreshPreference, refreshChoice);
  }, [refreshChoice]);

  useEffect(() => {
    const url = carryAutoRefresh(new URL(location.href), refresh);
    if (url.href !== location.href) {
      history.replaceState(history.state, '', url);
      currentURL.current = url;
      setPageURL(url);
    }

    function onPopState() {
      const url = carryAutoRefresh(new URL(location.href), refresh);
      if (url.href !== location.href) history.replaceState(history.state, '', url);
      if (url.pathname !== currentURL.current.pathname || url.search !== currentURL.current.search) changePage(url);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [refresh]);

  function navigate(href, { replace = false } = {}) {
    const url = carryAutoRefresh(new URL(href, location.href), refresh);
    if (url.href === location.href) return;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    changePage(url);
    if (!replace) window.scrollTo(0, 0);
  }

  function followLink(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash || link.getAttribute('href').startsWith('#')) return;
    event.preventDefault();
    navigate(url);
  }

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(event.currentTarget));
    navigate('./?' + params);
  }

  function setParam(name, value) {
    const url = new URL(location.href);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    history.replaceState(history.state, '', url);
    currentURL.current = url;
    setPageURL(url);
  }

  function toggleRefresh() {
    const next = !refresh;
    setRefreshChoice(next);
    setParam(autoRefreshParam, String(next));
  }
  function filterTubes(value) { setFilter(value); setParam('filter', value.trim() ? value : ''); }
  function scanNext(value) { setParam('from', value); }
  async function copy(value) {
    const version = pageVersion.current;
    if (await copyText(value)) {
      toast.success('Job data copied to clipboard');
    } else if (pageVersion.current === version) {
      startDialog({ type: 'copyPayload', payload: value });
    }
  }

  useEffect(() => {
    if (openedLegacyAction.current || !action || sampleEdit) return;
    if (['newSample', 'editSample', 'deleteSample', 'loadSample'].includes(action) && !samples.data) return;
    if (serverKey && !server) return;
    const sample = samples.data?.find(item => item.id === params.get('key'));
    const state = params.get('state') || 'ready';
    const count = params.has('count') ? Number(params.get('count')) : undefined;
    const job = { id: params.get('jobid') };
    const removalTarget = serversResource.data?.personalEnabled && servers.find(item => item.endpoint === params.get('removeServer'));
    const aliases = {
      deleteSample: sample && { type: 'deleteSample', sample },
      loadSample: sample && { type: 'loadSample', tube, sample },
      serversRemove: removalTarget && { type: 'removeServer', server: removalTarget },
      deleteJob: job.id && { type: 'deleteJob', job },
      kickJob: job.id && { type: 'kickJob', job },
      kick: { type: 'bulk', action: 'kick', tubes: [tube], options: { state: 'any', limit: count ?? 1 } },
      pause: { type: 'bulk', action: count === 0 ? 'resume' : 'pause', tubes: [tube], options: { seconds: count > 0 ? count : undefined } },
      delete: { type: 'bulk', action: 'clear', tubes: [tube], state, options: { limit: 1 } },
      deleteAll: { type: 'bulk', action: 'clear', tubes: [tube], state },
      moveJobsTo: { type: 'bulk', action: params.get('destState') === 'buried' ? 'bury' : 'move', tubes: [tube], state, destination: params.get('destTube') },
    };
    openedLegacyAction.current = true;
    if (aliases[action]) startDialog({ ...aliases[action], legacyURL: true });
    else if (['editSample', 'deleteSample', 'loadSample'].includes(action)) toast.error('Sample no longer exists');
  }, [params, server?.id, samples.data, serversResource.data]);

  function closeDialog() {
    if (dialog?.legacyURL) {
      const target = samplesPage ? './?action=manageSamples' : locationFor(server, tube);
      navigate(target, { replace: true });
    }
    setDialog(null);
  }

  function run(operation, names, options = {}) {
    startDialog({ type: 'bulk', action: operation, tubes: names, state: options.state, options });
  }

  async function bulkRequest(operation, names, options, version) {
    const seconds = settings.pause < 1 ? 3600 : settings.pause;
    let response;
    if (operation === 'pause' || operation === 'resume') {
      response = await request(queueURL(server, 'tube-actions'), {
        method: 'POST',
        data: { action: operation, tubes: names, seconds: options.seconds ?? seconds },
      });
    } else if (operation === 'move' || operation === 'bury') {
      response = await postAction('moveJobsTo', server, names[0], {
        state: options.state, destTube: options.destination, destState: operation === 'bury' ? 'buried' : undefined,
      });
    } else if (tube && operation === 'kick') {
      response = await postAction('kick', server, tube, { count: options.limit ?? 1 }, { state: options.state });
    } else {
      response = await postAction('tubeBulk', server, null, null, {
        operation, tubes: names, seconds, kick_mode: options.limit === 1000 ? 'all' : 'limit', count: options.limit,
      });
    }
    const { results } = response;
    if (pageVersion.current === version) notifyTubeResults(operation, results);
    return results;
  }

  async function clearInBackground(names, state, limit = 1000) {
    if (clearingJobs.current) {
      setError('A job deletion is already running in this tab');
      return;
    }
    if (names.length === 0 || names.length > 50) {
      setError('Select 1–50 tubes');
      return;
    }

    clearingJobs.current = true;
    closeDialog();
    const version = pageVersion.current;
    const toastId = toast.loading('Deleting jobs…', {
      description: names.length === 1 ? names[0] : names.length + ' selected tubes',
    });
    try {
      const { results } = await request(queueURL(server, 'tube-actions'), {
        method: 'POST',
        data: { action: 'clear', tubes: names, state, limit },
      });
      notifyTubeResults('clear', results, toastId);
      if (tube && pageVersion.current === version) {
        const latest = await request(queueURL(server, 'tubes', tube)).catch(() => null);
        if (pageVersion.current === version && (!latest || ['ready', 'reserved', 'delayed', 'buried'].every(
          name => !Number(latest.stats['current-jobs-' + name]),
        ))) navigate(locationFor(server));
      }
    } catch (failure) {
      toast.error(failure.message, { id: toastId });
    } finally {
      clearingJobs.current = false;
      reload();
    }
  }

  async function saveSample(form, names, sample) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const version = pageVersion.current;
    const edited = form.get('jobdata');
    const data = sample?.data.replace(/\r\n?/g, '\n') === edited ? sample.data : edited;
    try {
      await postAction(sample ? 'editSample' : 'newSample', null, null, { key: sample?.id }, {
        name: form.get('name'), jobdata: data, 'tubes[]': names,
      });
      reload();
      if (pageVersion.current === version) {
        toast.success('Sample saved');
        navigate('./?action=manageSamples', { replace: true });
      }
    } catch (failure) {
      if (pageVersion.current === version) {
        setError(failure.message);
        toast.error(failure.message);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function submit(form) {
    if (pending.current) return;
    if (dialog.action === 'clear') return clearInBackground(dialog.tubes, dialog.state || 'ready', dialog.options?.limit);
    pending.current = true;
    setBusy(true);
    setError('');
    const get = name => form.get(name);
    const number = name => get(name)?.trim() ? Number(get(name)) : undefined;
    const preserved = (field, original) => original?.replace(/\r\n?/g, '\n') === get(field) ? original : get(field);
    const target = dialog.server || server;
    const version = pageVersion.current;
    try {
      let message;
      switch (dialog.type) {
        case 'settings': {
          const next = { pause: number('tubePauseSeconds'), interval: number('autoRefreshTimeoutMs'), auto: form.has('isEnabledAutoRefreshLoad'),
            searchLimit: number('searchResultLimit'), json: form.has('json'), base64: form.has('base64'), unserialize: form.has('unserialize'), highlight: form.has('highlight') };
          savePreference('settings', next); setSettings(next); break;
        }
        case 'columns': {
          const checked = new Set(form.getAll('filter'));
          const fields = dialog.fields.filter(field => checked.has(field));
          savePreference(server ? 'tube-columns' : 'server-columns', fields);
          (server ? setTubeFields : setServerFields)(fields); break;
        }
        case 'server': {
          const host = get('host').trim();
          const address = (host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host) + ':' + get('port');
          const editing = dialog.server;
          await request(editing ? endpoint('servers', editing.id) : endpoint('servers'), {
            method: editing ? 'PUT' : 'POST', data: { address, label: get('label') },
          });
          message = editing ? 'Server updated' : 'Server added';
          break;
        }
        case 'removeServer':
          await request(endpoint('servers', dialog.server.id), { method: 'DELETE' });
          message = 'Server removed'; break;
        case 'add': {
          const result = await postAction('addjob', target, null, null, {
            tubeName: get('tubeName'), tubeData: preserved('tubeData', dialog.payload),
            tubePriority: number('tubePriority'), tubeDelay: number('tubeDelay'), tubeTtr: number('tubeTtr'),
          });
          message = 'Job #' + result.id + ' added'; break;
        }
        case 'loadSample':
          await postAction('loadSample', target, dialog.tube, { key: dialog.sample.id });
          if (params.get('redirect') === './?action=manageSamples') {
            reload();
            if (pageVersion.current === version) {
              toast.success('Job placed on tube');
              navigate('./?action=manageSamples', { replace: true });
            }
            return;
          }
          message = 'Job placed on tube'; break;
        case 'sample': {
          await request(endpoint('samples'), {
            method: 'POST',
            data: { name: get('addsamplename'), data: dialog.job.payload, tubes: form.getAll('tubes[]') },
          });
          message = 'Sample saved'; break;
        }
        case 'deleteSample':
          await postAction('deleteSample', null, null, { key: dialog.sample.id });
          message = 'Sample deleted'; break;
        case 'deleteJob':
          await request(queueURL(server, 'jobs', dialog.job.id), { method: 'DELETE' });
          message = 'Job deleted'; break;
        case 'kickJob':
          await postAction('kickJob', server, tube, { jobid: dialog.job.id, state: dialog.job.stats?.state });
          message = 'Job kicked'; break;
        case 'bulk': {
          const mode = get('destinationMode');
          const operation = mode === '$buried' ? 'bury' : dialog.action;
          const result = await bulkRequest(operation, dialog.tubes, {
            state: dialog.state || 'ready', destination: mode === 'new' ? get('destTube') : mode || dialog.destination, ...dialog.options,
          }, version);
          if (operation === 'move' && result[0]?.affected > 0 && !result[0]?.error) {
            reload();
            if (pageVersion.current === version) navigate(locationFor(server, mode === 'new' ? get('destTube') : mode || dialog.destination), { replace: dialog.legacyURL });
            return;
          }
          break;
        }
      }
      reload();
      if (pageVersion.current !== version) return;
      if (message) toast.success(message);
      if (server && tube && dialog.type === 'deleteJob') {
        const latest = await request(queueURL(server, 'tubes', tube)).catch(() => null);
        if (pageVersion.current !== version) return;
        if (!latest || ['ready', 'reserved', 'delayed', 'buried'].every(state => !Number(latest.stats['current-jobs-' + state]))) {
          navigate(locationFor(server), { replace: dialog.legacyURL });
          return;
        }
      }
      closeDialog();
    } catch (failure) {
      if (pageVersion.current === version) {
        setError(failure.message);
        toast.error(failure.message);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const editingSample = samples.data?.find(item => item.id === params.get('key'));
  return <div onClick={followLink}>
    <Toaster theme={appearance.resolvedTheme} />
    <div className="container-fluid">
      <Navigation {...{ servers, server, tubes, tube, loadingServers, loadingTubes, query, samplesPage, onAction: startDialog, refresh, toggleRefresh, searchLimit: settings.searchLimit }}
        serversError={serversResource.error} tubesError={overview.error}
        state={params.get('state') || ''} onSearch={submitSearch} appearance={appearance} onSignOut={onSignOut}
        onColumns={() => startDialog({ type: 'columns', tubeColumns: Boolean(server), fields: server ? tubeFields : serverFields, visible: server ? visibleTubeFields : visibleServerFields })} />
      <div className="mx-3">
        {serversResource.error && <Alert error message={serversResource.error} />}
        {sharedLink.error && <Alert error message={sharedLink.error} />}
        {sampleEdit ? (action === 'newSample' || editingSample
          ? <SampleEditor key={editingSample?.id || 'new'} sample={editingSample} servers={servers} save={saveSample} busy={busy} error={error} />
          : samples.error || samples.data ? <Alert error message={samples.error || 'Sample no longer exists'} />
            : <Alert message="Loading sample…" />)
          : samplesPage ? <Samples resource={samples} servers={servers} />
          : !serverKey ? (serversResource.data || loadingServers) && <ServerSummary {...{ servers, fields: visibleServerFields, revision, interval: polling, onAction: startDialog, personalEnabled: serversResource.data?.personalEnabled }} loading={loadingServers} />
          : (server || resolvingServer) && !tube ? <>
            <div className="col-12 px-3 pb-3 bg-body rounded-3 rounded-top-0 tube-filter-bar">
              <div className="input-group">
                <input type="text" className="form-control form-control-sm input-sm search-query shadow-none" id="searchTubes" name="searchTubes" placeholder="Search tubes"
                  aria-label="Search tubes" value={filter} onChange={event => filterTubes(event.target.value)} />
                {filter && <button type="button" className="btn clear-search" aria-label="Clear filter" onClick={() => { filterTubes(''); document.getElementById('searchTubes')?.focus(); }}>×</button>}
              </div>
              <div id="tubeCountInfo" className="form-text text-body-secondary mt-2" aria-live="polite">{loadingTubes ? 'Loading tubes…' : overview.data && (filter ? `${filtered.length} of ${tubes.length} tubes match · ${tubes.length} total tubes` : `${tubes.length} total tubes`)}</div>
            </div>
            <TubeTable tubes={filtered} fields={visibleTubeFields} server={server} selected={selected} onSelect={select} previous={overview.previousData?.tubes} loading={loadingTubes}
              bulk={<BulkControls selected={active} allTubes={tubes} visibleTubes={filtered} run={run} />} />
          </> : detail.data ? <>
            <TubeTable tubes={[detail.data.stats]} fields={visibleTubeFields} detail />
            {query ? <SearchResults {...{ server, tube, query, results: search, settings, onAction: startDialog, next: scanNext, retry: reload }} />
              : <TubeJobs key={server.id + ':' + tube} detail={detail.data} {...{ server, tube, samples: samples.data, onAction: startDialog, onCopy: copy, settings, run }} />}
          </> : loadingDetail ? <>
            <span className="visually-hidden" role="status">Loading tube details…</span>
            <TubeTable fields={visibleTubeFields} detail loading />
            {!query && <TubeJobsSkeleton />}
          </> : detail.error && <div className="mt-3"><p>{`Tube "${tube}" not found or it is empty`}</p><a href={locationFor(server)}>&lt;&lt; back</a></div>}
      </div>
    </div>
    {scrolled && <div className="scroll-top position-fixed bottom-0 end-0 me-4 mb-3 pe-3" title="Scroll to top">
      <button type="button" className="btn btn-sm text-white btn-success rounded-circle console-icon-button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0 })}><Icon name="scrollUp" /></button>
    </div>}
    {dialog?.type === 'copyPayload'
      ? <CopyPayloadDialog payload={dialog.payload} close={closeDialog} returnFocus={dialogFocus.current} />
      : dialog && <ActionDialog action={dialog} close={closeDialog} returnFocus={dialogFocus.current} {...{ submit, settings, tubes, busy, error }} />}
  </div>;
}
