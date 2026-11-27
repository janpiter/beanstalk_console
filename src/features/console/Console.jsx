import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  actionLocation, Alert, Divider, Item, legacyCookie, locationFor, logo, Menu, nameOf, neutral, preference, queueURL,
  savePreference, serverFields, ServerSummary, states, TubeTable, tubeFields,
} from '../../components/console-ui.jsx';
import { Icon } from '../../components/icon.jsx';
import { NavigationPicker, serverPickerOption } from '../../components/navigation-picker.jsx';
import { Toaster } from '../../components/sonner.jsx';
import { ActionDialog, CopyPayloadDialog, defaultSettings } from './actions.jsx';
import { BulkControls, SampleEditor, Samples, SearchResults, TubeJobAddActions, TubeJobs, TubeJobsSkeleton, TubeQueueActions } from './jobs.jsx';
import { endpoint, request, useResource } from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import { sampleDestinations } from '../../lib/sample-destinations.js';

function settingsFromCookies() {
  const value = (key, fallback) => Number(legacyCookie(key)) || fallback;
  return {
    pause: value('tubePauseSeconds', defaultSettings.pause),
    searchLimit: Math.min(100, Math.max(1, value('searchResultLimit', defaultSettings.searchLimit))),
    json: legacyCookie('isDisabledJsonDecode') !== '1',
    base64: legacyCookie('isEnabledBase64Decode') === '1',
    highlight: legacyCookie('isDisabledJobDataHighlight') !== '1',
  };
}
const autoRefreshParam = 'auto_refresh';
const autoRefreshPreference = 'auto-refresh';
const autoRefreshInterval = 500;

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

function TubeResultList({ children }) {
  return <ol className="console-toast-details console-tube-result-list">{children}</ol>;
}

function TubeResultItem({ tube, children }) {
  return <li>
    <div className="console-tube-result-name">{tube}</div>
    <div className="console-tube-result-status">{children}</div>
  </li>;
}

function notifyTubeResults(operation, results) {
  const failed = results.some(item => item.error || item.stopped === 'timeout');
  const notify = failed ? toast.error : toast.success;
  notify(nameOf(operation) + ' results', {
    description: <TubeResultList>
      {results.map(item => <TubeResultItem key={item.tube} tube={item.tube}>
        <span className="console-tube-result-count">{item.affected.toLocaleString()} affected</span>
        {item.error && ' · ' + item.error}
        {item.stopped && ' · stopped at ' + item.stopped}
        {item.pendingCopy && ' · destination job #' + item.pendingCopy.destinationId + ' created; source deletion unconfirmed'}
      </TubeResultItem>)}
    </TubeResultList>,
  });
}

function jobBatchProgress(operation, kicking) {
  return <TubeResultList>
    {operation.tubes.map(({ tube, status, affected, stopped, error, target = operation.target }) => <TubeResultItem key={tube} tube={tube}>
      {status === 'skipped' ? 'Already queued or running · skipped' : <>
        <span className="console-tube-result-count">{affected.toLocaleString()} / {target.toLocaleString()} {kicking ? 'kicked' : 'deleted'}</span>
        {status === 'queued' && ' · Queued'}
        {status === 'failed' && (' · ' + (error || 'Stopped at timeout'))}
        {status === 'done' && (stopped === 'limit' ? ' · Limit reached' : ' · No more matching jobs')}
      </>}
    </TubeResultItem>)}
  </TubeResultList>;
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

function QuickSettings({ theme, fontSize, changeTheme, changeFontSize, refresh, changeRefresh }) {
  return <>
    <li className="theme-menu-item" onClick={event => event.stopPropagation()}>
      <fieldset>
        <legend className="theme-menu-heading">Appearance</legend>
        <AppearanceOptions legend="Theme" name="console-theme" choices={themeChoices} selected={theme} onChange={changeTheme} />
        <AppearanceOptions legend="Font size" name="console-font-size" choices={fontSizeChoices} selected={fontSize} onChange={changeFontSize} />
      </fieldset>
    </li>
    {changeRefresh && <><Divider /><li onClick={event => event.stopPropagation()}>
      <label className="dropdown-item fs-14px console-refresh-option">
        <Icon name="refresh" weight="regular" />
        <span className="me-auto">Auto-refresh</span>
        <span className="console-refresh-status" aria-hidden="true">{refresh ? 'On' : 'Off'}</span>
        <input type="checkbox" role="switch" className="btn-check" checked={refresh}
          onChange={event => changeRefresh(event.currentTarget.checked)} />
        <span className="console-refresh-switch" aria-hidden="true" />
      </label>
    </li></>}
  </>;
}

function SignOutAction({ onSignOut }) {
  const [busy, setBusy] = useState(false);
  return <li>
    <button type="button" className="dropdown-item fs-14px"
      disabled={busy} aria-busy={busy} onClick={async event => {
        event.stopPropagation();
        setBusy(true);
        try {
          await onSignOut();
        } finally {
          setBusy(false);
        }
      }}>
      <Icon name="signOut" weight="regular" /> {busy ? 'Signing out…' : 'Sign out'}
    </button>
  </li>;
}

function ClearableSearch({ value, onValueChange, defaultValue = '', clearLabel, ...inputProps }) {
  const [draft, setDraft] = useState(defaultValue);
  const input = useRef(null);
  const text = value ?? draft;
  const change = onValueChange ?? setDraft;
  return <div className="console-search-field">
    <input {...inputProps} ref={input} type="search" autoComplete="off" value={text} onChange={event => change(event.target.value)} />
    {text !== '' && <button type="button" className="console-search-clear" aria-label={clearLabel} title={clearLabel}
      onClick={() => {
        change('');
        input.current?.focus();
      }}><Icon name="close" /></button>}
  </div>;
}

function TubeJobSearch({ server, tube, query, state, limit, listFilter, onSearch }) {
  return <form className="tube-job-search" role="search" aria-label="Search jobs in this tube" action="./" method="get" onSubmit={onSearch}>
    <input type="hidden" name="server" value={server.endpoint} />
    <input type="hidden" name="tube" value={tube} />
    <input type="hidden" name="state" value={state} />
    <input type="hidden" name="action" value="search" />
    <input type="hidden" name="limit" value={limit} />
    {listFilter && <input type="hidden" name="filter" value={listFilter} />}
    <div className="input-group input-group-sm">
      <ClearableSearch className="form-control form-control-sm" name="searchStr" placeholder="Search jobs" aria-label="Search jobs in this tube"
        clearLabel="Clear job search" defaultValue={query} maxLength={1000} required />
      <button type="submit" className="btn btn-sm console-icon-button console-header-search-button" aria-label="Search jobs" title="Search jobs"><Icon name="search" weight="regular" /></button>
    </div>
  </form>;
}

function Navigation({ servers, server, tubes, tube, tubeList, listFilter, loadingServers, loadingTubes, serversError, tubesError, samplesPage, onAction, refresh, changeRefresh, onColumns, appearance, onSignOut }) {
  const [expanded, setExpanded] = useState(false);
  const availableServers = server && !servers.some(item => item.id === server.id) ? [...servers, server] : servers;
  const serverOptions = [{ id: '', label: 'All servers', href: './?' }, ...availableServers.map(item => ({
    ...serverPickerOption(item),
    href: locationFor(item),
  }))];
  const tubeNames = tubes.map(item => item.name);
  if (tube && !tubeNames.includes(tube)) tubeNames.unshift(tube);
  const tubeOptions = [{ id: '', label: 'All tubes', href: locationFor(server) }, ...tubeNames.map(name => ({
    id: name, label: name, href: actionLocation(server, name, undefined, { filter: listFilter }),
  }))];
  return <nav className={'navbar navbar-expand-lg sticky-top bg-body rounded-3 mx-3' + (tubeList ? ' navbar-with-tube-filter rounded-bottom-0' : '')} aria-label="Main navigation">
    <div className={'container-fluid' + (tubeList ? ' px-3' : '')}>
      <a className="navbar-brand" href="./?"><img src={logo} alt="" width="22" height="22" className="rounded-circle mb-1" />{' '}<span>Beanstalk Console</span></a>
      <button type="button" className="border-0 btn btn-sm navbar-toggler legacy-toggler" aria-expanded={expanded} aria-controls="navbarSupportedContent" aria-label="Toggle navigation" onClick={() => setExpanded(!expanded)}><Icon name="menu" /></button>
      <div className={'collapse navbar-collapse' + (expanded ? ' show' : '')} id="navbarSupportedContent">
        <ul className="navbar-nav navbar-pickers me-auto mb-2 mb-lg-0">
          <li className="nav-item"><NavigationPicker title="servers" icon="server" options={serverOptions}
            selected={server?.id || ''} loading={loadingServers} unavailable={Boolean(serversError)} /></li>
          {server && <li className="nav-item"><NavigationPicker key={server.id} title="tubes" icon="tube" options={tubeOptions}
            selected={tube || ''} loading={loadingTubes} unavailable={Boolean(tubesError)} /></li>}
        </ul>
        <div className="console-header-actions">
          <div className="console-header-controls" role="group" aria-label="Console controls">
            <Menu button="btn btn-sm console-settings-button" end title="Settings" label={<>
              <Icon name="settings" weight="regular" />
              <span>Settings</span>
              <Icon name="caretDown" className="console-settings-caret" />
            </>}>
              {!samplesPage && <Item onClick={onColumns}><Icon name="listChecks" weight="regular" /> Filter columns</Item>}
              <Item href="./?action=manageSamples"><Icon name="file" weight="regular" /> Manage samples</Item>
              <Divider />
              <QuickSettings {...appearance} refresh={refresh} changeRefresh={samplesPage ? null : changeRefresh} />
              <Divider /><Item onClick={() => onAction({ type: 'settings' })}>
                <Icon name="advancedSettings" weight="regular" /> <span className="me-auto">Advanced settings</span>
                <Icon name="caretRight" />
              </Item>
              <Divider />
              <Item newTab href="https://github.com/beanstalkd/beanstalkd">Beanstalk (github) <Icon name="externalLink" /></Item>
              <Item newTab href="https://github.com/beanstalkd/beanstalkd/blob/master/doc/protocol.txt">Protocol Specification <Icon name="externalLink" /></Item>
              {onSignOut && <><Divider /><SignOutAction onSignOut={onSignOut} /></>}
            </Menu>
          </div>
        </div>
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
  const listFilter = params.get('filter') || undefined;
  const from = params.get('from') || '';
  const [settings, setSettings] = useState(() => ({ ...settingsFromCookies(), ...preference('settings', {}) }));
  const [refreshChoice, setRefreshChoice] = useState(() =>
    readAutoRefresh(params) ?? preference(autoRefreshPreference, null));
  const refresh = refreshChoice ?? false;
  const [visibleServerFields, setServerFields] = useState(() => preference('server-columns', legacyCookie('filter')?.split(',') || defaultServerFields));
  const [visibleTubeFields, setTubeFields] = useState(() => preference('tube-columns', legacyCookie('tubefilter')?.split(',') || tubeFields.slice(0, 9)));
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState(() => params.get('filter') || '');
  const [selection, setSelection] = useState(() => new Map());
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pending = useRef(false);
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
  const polling = refresh && !samplesPage ? autoRefreshInterval : 0;
  const overviewUrl = server ? queueURL(server, 'overview') : null;
  const overview = useResource(overviewUrl, revision, tube ? 0 : polling);
  const overviewError = overview.error;
  const detail = useResource(server && tube ? queueURL(server, 'tubes', tube) : null, revision, polling);
  const samples = useResource(samplesPage || (server && tube) ? endpoint('samples') : null, revision);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || settings.searchLimit));
  const search = useResource(server && tube && query ? queueURL(server, 'tubes', tube, 'search') + '?' + new URLSearchParams({ query, limit, ...(from && { from }) }) : null, revision);
  const loadingServers = !serversResource.data && !serversResource.error;
  const resolvingServer = loadingServers || Boolean(serverKey && serversResource.data && !server && !sharedLink.error);
  const tubeList = Boolean(!samplesPage && serverKey && !tube && (server || resolvingServer));
  const loadingTubes = resolvingServer || Boolean(server && !overview.data && !overview.error);
  const loadingDetail = resolvingServer || Boolean(server && !detail.data && !detail.error);
  const tubes = [...(overview.data?.tubes || [])].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  const matcher = filterPattern(filter);
  const filtered = matcher ? tubes.filter(item => matcher.test(item.name)) : tubes;
  const selected = [...selection.keys()];
  const active = selected.filter(name => tubes.some(item => item.name === name));
  const reload = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!overviewError) return;
    const id = toast.error(overviewError);
    return () => { toast.dismiss(id); };
  }, [overviewUrl, overviewError]);

  useEffect(() => {
    let title = (tube ? tube + ' - ' : '') + (server?.label || 'All servers');
    if (samplesPage) title = 'Job samples';
    if (action === 'newSample') title = 'New job sample';
    if (action === 'editSample') title = 'Edit job sample';
    document.title = title + ' - Beanstalk console';
  }, [server?.label, tube, samplesPage, action]);

  useEffect(() => {
    if (!tubeList) return;
    const nav = document.querySelector('.navbar-with-tube-filter');
    if (!nav) return;
    const measure = () => document.body.style.setProperty('--tube-filter-sticky-top', nav.getBoundingClientRect().height + 'px');
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.body.style.removeProperty('--tube-filter-sticky-top');
    };
  }, [tubeList]);

  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, []);

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
    const statsByName = new Map(tubes.map(stats => [stats.name, stats]));
    setSelection(previous => {
      const next = new Map(previous);
      for (const name of names) {
        if (!checked) next.delete(name);
        else if (!next.has(name) && statsByName.has(name)) {
          const stats = statsByName.get(name);
          const counts = Object.fromEntries(states.map(state => [state, Number(stats['current-jobs-' + state]) || 0]));
          next.set(name, { ...counts, all: states.reduce((sum, state) => sum + counts[state], 0) });
        }
      }
      return next;
    });
  }
  function changePage(url) {
    currentURL.current = url;
    pageVersion.current++;
    openedLegacyAction.current = false;
    setPageURL(url);
    setFilter(url.searchParams.get('filter') || '');
    setSelection(new Map());
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

  function changeRefresh(next) {
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
    if (action === 'deleteAll' && tube && !detail.data && !detail.error) return;
    const sample = samples.data?.find(item => item.id === params.get('key'));
    const state = params.get('state') || 'ready';
    const stats = detail.data?.stats;
    const clearCount = !stats ? '' : state === 'all'
      ? states.reduce((total, name) => total + Number(stats['current-jobs-' + name] ?? 0), 0)
      : stats['current-jobs-' + state] ?? '';
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
      deleteAll: { type: 'bulk', action: 'clear', tubes: [tube], state, ...(tube && { clearCount }) },
      moveJobsTo: { type: 'bulk', action: params.get('destState') === 'buried' ? 'bury' : 'move', tubes: [tube], state, destination: params.get('destTube') },
    };
    openedLegacyAction.current = true;
    if (aliases[action]) startDialog({ ...aliases[action], legacyURL: true });
    else if (['editSample', 'deleteSample', 'loadSample'].includes(action)) toast.error('Sample no longer exists');
  }, [params, server?.id, samples.data, serversResource.data, detail.data, detail.error]);

  function closeDialog() {
    if (dialog?.legacyURL) {
      const target = samplesPage ? './?action=manageSamples' : locationFor(server, tube);
      navigate(target, { replace: true });
    }
    setDialog(null);
  }

  const pauseSeconds = settings.pause < 1 ? 3600 : settings.pause;

  function run(operation, names, options = {}) {
    const limitsByState = !tube && operation === 'clear'
      ? Object.fromEntries(['all', ...states].map(state => [state, names.map(name => selection.get(name)[state])]))
      : undefined;
    const limits = !tube && operation === 'kick' ? names.map(name => selection.get(name).buried) : undefined;
    startDialog({
      type: 'bulk', action: operation, tubes: names, state: options.state, fromTubeList: !tube,
      limits, limitsByState,
      options: operation === 'pause' ? { seconds: pauseSeconds, ...options } : options,
    });
  }

  async function bulkRequest(operation, names, options, version) {
    const seconds = pauseSeconds;
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

  async function runJobBatch(names, { state, limit = 1000, batched = false, targets } = {}) {
    if (names.length === 0 || names.length > 50) {
      setError('Select 1–50 tubes');
      return;
    }

    const targetServer = dialog.server || server;
    const kicking = dialog.action === 'kick';
    const route = kicking ? 'kicks' : 'deletions';
    closeDialog();
    const version = pageVersion.current;
    const toastId = toast.loading(kicking ? 'Starting job kick…' : 'Starting job deletion…', {
      description: names.length === 1 ? names[0] : names.length + ' selected tubes',
    });
    let operation;
    try {
      operation = await request(queueURL(targetServer, route), {
        method: 'POST', data: targets ? { targets, state } : { tubes: names, state, limit, batched },
      });
      while (operation.tubes.some(entry => entry.status === 'queued' || entry.status === 'running')) {
        toast.loading(kicking ? 'Kicking jobs…' : 'Deleting jobs…', { id: toastId, description: jobBatchProgress(operation, kicking) });
        await new Promise(resolve => setTimeout(resolve, 750));
        operation = await request(queueURL(targetServer, route, operation.id));
      }
      const failed = operation.tubes.some(entry => entry.status === 'failed');
      const limited = operation.tubes.some(entry => entry.status === 'skipped' || (!targets && !batched && entry.stopped === 'limit'));
      const notify = failed ? toast.error : limited ? toast.warning : toast.success;
      notify(kicking ? 'Kick results' : 'Job deletion results', { id: toastId, description: jobBatchProgress(operation, kicking) });
      if (!kicking && tube && pageVersion.current === version && operation.tubes.some(entry => entry.tube === tube && entry.status === 'done')) {
        const latest = await request(queueURL(targetServer, 'tubes', tube)).catch(() => null);
        if (pageVersion.current === version && (latest ? ['ready', 'reserved', 'delayed', 'buried'].every(
          name => !Number(latest.stats['current-jobs-' + name]),
        ) : !batched)) navigate(locationFor(targetServer));
      }
    } catch (failure) {
      if (operation) toast.error(kicking ? 'Kick status is unavailable' : 'Job deletion status is unavailable', {
        id: toastId, description: 'The operation may still be running. ' + failure.message,
      });
      else toast.error(failure.message, { id: toastId });
    } finally {
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
    if (dialog.limits || dialog.limitsByState) {
      const state = dialog.limitsByState ? form.get('clearState') : dialog.state;
      if (dialog.limitsByState && !Object.hasOwn(dialog.limitsByState, state)) {
        setError('Choose which job states to delete.');
        return;
      }
      const limits = dialog.limitsByState?.[state] ?? dialog.limits;
      const targets = [];
      for (const [index, tube] of dialog.tubes.entries()) {
        const value = form.get('jobLimit-' + index);
        const limit = Number(value);
        if (!value?.trim() || !Number.isSafeInteger(limit) || limit < 0 || limit > limits[index]) {
          setError('Enter a whole number between 0 and the maximum for each tube.');
          return;
        }
        if (limit > 0) targets.push({ tube, limit });
      }
      if (!targets.length) {
        setError('Enter a positive limit for at least one tube.');
        return;
      }
      return runJobBatch(targets.map(entry => entry.tube), { state, targets });
    }
    if (dialog.action === 'clear' && dialog.clearCount !== undefined) {
      const target = Number(form.get('clearCount'));
      if (!Number.isSafeInteger(target) || target < 1) {
        setError('Enter a positive whole number of jobs to delete.');
        return;
      }
      return runJobBatch(dialog.tubes, { state: dialog.state, limit: target, batched: true });
    }
    if (dialog.action === 'clear') return runJobBatch(dialog.tubes, { state: dialog.state || 'ready', limit: dialog.options?.limit });
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
      let description;
      switch (dialog.type) {
        case 'settings': {
          const next = { pause: number('tubePauseSeconds'),
            searchLimit: number('searchResultLimit'), json: form.has('json'), base64: form.has('base64'), highlight: form.has('highlight') };
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
        case 'loadSample': {
          const destinationServer = dialog.pickDestination ? servers.find(item => item.id === get('sendServer')) : target;
          const destinationTube = dialog.pickDestination ? get('sendTube') : dialog.tube;
          if (dialog.pickDestination && (!destinationServer || !sampleDestinations(dialog.sample).includes(destinationTube))) {
            setError('Choose a server and a tube.');
            return;
          }
          await postAction('loadSample', destinationServer, destinationTube, { key: dialog.sample.id });
          if (params.get('redirect') === './?action=manageSamples') {
            reload();
            if (pageVersion.current === version) {
              toast.success('Job placed on tube');
              navigate('./?action=manageSamples', { replace: true });
            }
            return;
          }
          message = 'Job placed on tube'; break;
        }
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
          message = 'Job kicked';
          description = <TubeResultList>
            <TubeResultItem tube={tube}>Job #{dialog.job.id}</TubeResultItem>
          </TubeResultList>;
          break;
        case 'bulk': {
          const mode = get('destinationMode');
          const operation = mode === '$buried' ? 'bury' : dialog.action;
          const destination = mode === 'new' || mode === 'existing' ? get('destTube') : dialog.destination;
          if (operation === 'move' && !destination?.trim()) {
            setError('Choose a destination tube.');
            return;
          }
          const result = await bulkRequest(operation, dialog.tubes, {
            state: dialog.state || 'ready', destination, ...dialog.options,
          }, version);
          if (operation === 'move' && result[0]?.affected > 0 && !result[0]?.error) {
            reload();
            if (pageVersion.current === version) navigate(locationFor(server, destination), { replace: dialog.legacyURL });
            return;
          }
          break;
        }
      }
      reload();
      if (pageVersion.current !== version) return;
      if (message) toast.success(message, { description });
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
    <Navigation {...{ servers, server, tubes, tube, tubeList, listFilter, loadingServers, loadingTubes, samplesPage, onAction: startDialog, refresh, changeRefresh }}
        serversError={serversResource.error} tubesError={overview.error}
        appearance={appearance} onSignOut={onSignOut}
        onColumns={() => startDialog({ type: 'columns', tubeColumns: Boolean(server), fields: server ? tubeFields : serverFields, visible: server ? visibleTubeFields : visibleServerFields })} />
      <div className="mx-3">
        {serversResource.error && <Alert error message={serversResource.error} />}
        {sharedLink.error && <Alert error message={sharedLink.error} />}
        {sampleEdit ? (action === 'newSample' || editingSample
          ? <SampleEditor key={editingSample?.id || 'new'} sample={editingSample} servers={servers} save={saveSample} busy={busy} error={error} />
          : samples.error || samples.data ? <Alert error message={samples.error || 'Sample no longer exists'} />
            : <Alert message="Loading sample…" />)
          : samplesPage ? <Samples resource={samples} servers={servers} onAction={startDialog} />
          : !serverKey ? (serversResource.data || loadingServers) && <ServerSummary {...{ servers, fields: visibleServerFields, revision, interval: polling, onAction: startDialog, personalEnabled: serversResource.data?.personalEnabled }} loading={loadingServers} />
          : tubeList ? <>
            <div className="col-12 px-3 pb-3 bg-body rounded-3 rounded-top-0 tube-filter-bar">
              <ClearableSearch className="form-control form-control-sm input-sm search-query shadow-none" id="searchTubes" name="searchTubes" placeholder="Search tubes"
                aria-label="Search tubes" clearLabel="Clear tube filter" value={filter} onValueChange={filterTubes} />
              <div id="tubeCountInfo" className="form-text text-body-secondary mt-2" aria-live="polite">{loadingTubes ? 'Loading tubes…' : overview.data && (filter ? `${filtered.length} of ${tubes.length} tubes match · ${tubes.length} total tubes` : `${tubes.length} total tubes`)}</div>
            </div>
            <TubeTable tubes={filtered} fields={visibleTubeFields} server={server} listFilter={listFilter} selected={selected} onSelect={select} previous={overview.previousData?.tubes} loading={loadingTubes}
              bulk={<BulkControls selected={active} visibleTubes={filtered} run={run} />} />
          </> : detail.data || loadingDetail ? <>
            {loadingDetail && !query && <span className="visually-hidden" role="status">Loading tube details…</span>}
            <TubeTable tubes={detail.data ? [detail.data.stats] : []} fields={visibleTubeFields} detail loading={loadingDetail}
              tubeName={tube} server={server || { endpoint: serverKey }} listFilter={listFilter} searchResults={Boolean(query)}
              headerSearch={server && <TubeJobSearch key={server.id + ':' + tube + ':' + query} {...{ server, tube, query }}
                state={params.get('state') || ''} limit={settings.searchLimit} listFilter={listFilter} onSearch={submitSearch} />}
              footer={!query && (detail.data
                ? <TubeQueueActions key={server.id + ':' + tube} {...{ stats: detail.data.stats, server, tube, run }}>
                  <TubeJobAddActions {...{ server, tube, samples: samples.data, onAction: startDialog }} />
                </TubeQueueActions>
                : <div className="queue-panel-tools queue-panel-footer" aria-hidden="true">
                  {[0, 1, 2, 3].map(item => <span key={item} className="console-skeleton skeleton-button skeleton-name" />)}
                  <span className="console-skeleton skeleton-button skeleton-name ms-auto" />
                </div>)} />
            {query ? <SearchResults {...{ tube, query, results: search, settings, onAction: startDialog, onCopy: copy, next: scanNext, retry: reload }} />
              : detail.data ? <TubeJobs key={server.id + ':' + tube} detail={detail.data}
                {...{ server, tube, onAction: startDialog, onCopy: copy, settings }} />
                : <TubeJobsSkeleton />}
          </> : detail.error && <div className="mt-3"><p>{`Tube "${tube}" not found or it is empty`}</p><a href={locationFor(server)}>&lt;&lt; back</a></div>}
      </div>
    </div>
    {scrolled && <div className="scroll-top position-fixed bottom-0 end-0 me-4 mb-3 pe-3" title="Scroll to top">
      <button type="button" className="btn btn-sm text-white btn-success rounded-circle console-icon-button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0 })}><Icon name="scrollUp" /></button>
    </div>}
    {dialog?.type === 'copyPayload'
      ? <CopyPayloadDialog payload={dialog.payload} close={closeDialog} returnFocus={dialogFocus.current} />
      : dialog && <ActionDialog action={dialog} close={closeDialog} returnFocus={dialogFocus.current} {...{ submit, settings, servers, tubes, busy, error }} />}
  </div>;
}
