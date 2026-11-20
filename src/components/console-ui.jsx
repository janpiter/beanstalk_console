import { Icon } from './icon.jsx';
import { autoUpdate, computePosition, flip, hide, offset, shift, size } from '@floating-ui/dom';
import { useEffect, useId, useRef, useState } from 'react';
import logo from '../assets/bs-rounded.png';
import empty from '../assets/empty.svg';
import { endpoint, useResource } from '../lib/api.js';

export { logo, empty };
export const states = ['ready', 'delayed', 'buried'];
export const tubeFieldDescriptions = {
  'current-jobs-urgent': 'number of ready jobs with priority < 1024 in this tube',
  'current-jobs-ready': 'number of jobs in the ready queue in this tube',
  'current-jobs-reserved': 'number of jobs reserved by all clients in this tube',
  'current-jobs-delayed': 'number of delayed jobs in this tube',
  'current-jobs-buried': 'number of buried jobs in this tube',
  'total-jobs': 'cumulative count of jobs created in this tube in the current beanstalkd process',
  'current-using': 'number of open connections that are currently using this tube',
  'current-waiting': 'number of open connections that have issued a reserve command while watching this tube but not yet received a response',
  'current-watching': 'number of open connections that are currently watching this tube',
  'pause': 'number of seconds the tube has been paused for',
  'cmd-delete': 'cumulative number of delete commands for this tube',
  'cmd-pause-tube': 'cumulative number of pause-tube commands for this tube',
  'pause-time-left': 'number of seconds until the tube is un-paused',
};
export const tubeFields = Object.keys(tubeFieldDescriptions);
export const serverFieldDescriptions = {
  'binlog-current-index': 'the index of the current binlog file being written to. If binlog is not active this value will be 0',
  'binlog-max-size': 'the maximum size in bytes a binlog file is allowed to get before a new binlog file is opened',
  'binlog-oldest-index': 'the index of the oldest binlog file needed to store the current jobs',
  'binlog-records-migrated': 'the cumulative number of records written as part of compaction',
  'binlog-records-written': 'the cumulative number of records written to the binlog',
  'cmd-bury': 'the cumulative number of bury commands',
  'cmd-delete': 'the cumulative number of delete commands',
  'cmd-ignore': 'the cumulative number of ignore commands',
  'cmd-kick': 'the cumulative number of kick commands',
  'cmd-list-tube-used': 'the cumulative number of list-tube-used commands',
  'cmd-list-tubes': 'the cumulative number of list-tubes commands',
  'cmd-list-tubes-watched': 'the cumulative number of list-tubes-watched commands',
  'cmd-pause-tube': 'the cumulative number of pause-tube commands',
  'cmd-peek': 'the cumulative number of peek commands',
  'cmd-peek-buried': 'the cumulative number of peek-buried commands',
  'cmd-peek-delayed': 'the cumulative number of peek-delayed commands',
  'cmd-peek-ready': 'the cumulative number of peek-ready commands',
  'cmd-put': 'the cumulative number of put commands',
  'cmd-release': 'the cumulative number of release commands',
  'cmd-reserve': 'the cumulative number of reserve commands',
  'cmd-stats': 'the cumulative number of stats commands',
  'cmd-stats-job': 'the cumulative number of stats-job commands',
  'cmd-stats-tube': 'the cumulative number of stats-tube commands',
  'cmd-use': 'the cumulative number of use commands',
  'cmd-watch': 'the cumulative number of watch commands',
  'current-connections': 'the number of currently open connections',
  'current-jobs-buried': 'the number of buried jobs',
  'current-jobs-delayed': 'the number of delayed jobs',
  'current-jobs-ready': 'the number of jobs in the ready queue',
  'current-jobs-reserved': 'the number of jobs reserved by all clients',
  'current-jobs-urgent': 'the number of ready jobs with priority < 1024',
  'current-producers': 'the number of open connections that have each issued at least one put command',
  'current-tubes': 'the number of currently-existing tubes',
  'current-waiting': 'the number of open connections that have issued a reserve command but not yet received a response',
  'current-workers': 'the number of open connections that have each issued at least one reserve command',
  'hostname': 'the hostname of the machine as determined by uname',
  'id': 'a random id string for this server process, generated when each beanstalkd process starts',
  'job-timeouts': 'the cumulative count of times a job has timed out',
  'max-job-size': 'the maximum number of bytes in a job',
  'pid': 'the process id of the server',
  'rusage-stime': 'the cumulative system CPU time of this process in seconds and microseconds',
  'rusage-utime': 'the cumulative user CPU time of this process in seconds and microseconds',
  'total-connections': 'the cumulative count of connections',
  'total-jobs': 'the cumulative count of jobs created',
  'uptime': 'the number of seconds since this server process started running',
  'version': 'the version string of the server',
};
export const serverFields = Object.keys(serverFieldDescriptions);
export const nameOf = value => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
export const queueURL = (server, ...parts) => endpoint('servers', server.direct ? server.endpoint : server.id, ...parts);
export function locationFor(server, tube, action) {
  const params = new URLSearchParams();
  if (server) params.set('server', server.endpoint);
  if (tube) params.set('tube', tube);
  if (action) params.set('action', action);
  return params.size ? './?' + params : './?';
}
export function actionLocation(server, tube, action, values = {}) {
  const url = new URL(locationFor(server, tube, action), location.href);
  for (const [key, value] of Object.entries(values || {})) {
    if (value != null) url.searchParams.set(key, value);
  }
  return url.pathname + url.search;
}

export function ActionLink({ children, href, onAction, ...props }) {
  return <a href={href} {...props} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onAction();
  }}>{children}</a>;
}

export const textLink = 'text-info-emphasis link-underline link-underline-opacity-0 link-underline-opacity-75-hover';
export const neutral = 'btn btn-default btn-sm console-neutral';
export const success = 'btn btn-success btn-sm';

export function legacyCookie(key) {
  const prefix = key + '=';
  const raw = document.cookie.split(';').map(item => item.trim()).find(item => item.startsWith(prefix));
  try { return raw ? decodeURIComponent(raw.slice(prefix.length)) : undefined; } catch { return undefined; }
}

export function preference(key, initial) {
  const prefix = 'beanstalk-php-ui-';
  try { return JSON.parse(localStorage.getItem(prefix + key)) ?? initial; } catch { return initial; }
}

export function savePreference(key, value) {
  try { localStorage.setItem('beanstalk-php-ui-' + key, JSON.stringify(value)); } catch { /* Storage may be read-only. */ }
}

export function Menu({ children, label, title, scroll, end, searchable, button = 'nav-link dropdown-toggle', className = 'dropdown' }) {
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const Panel = searchable ? 'div' : 'ul';

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    const padding = 8;
    let focusSearch = searchable;
    const stopPositioning = autoUpdate(trigger, menu, () => {
      computePosition(trigger, menu, {
        strategy: 'fixed',
        placement: end ? 'bottom-end' : 'bottom-start',
        middleware: [
          offset(searchable ? 6 : 2),
          flip({ padding }),
          shift({ padding }),
          size({
            padding,
            apply({ availableWidth, availableHeight }) {
              menu.style.setProperty('--menu-max-width', Math.max(0, availableWidth) + 'px');
              menu.style.maxHeight = Math.max(0, Math.min(availableHeight, scroll ? 350 : Infinity)) + 'px';
            },
          }),
          hide(),
        ],
      }).then(({ x, y, middlewareData }) => {
        if (!menu.isConnected) return;
        Object.assign(menu.style, {
          left: x + 'px',
          top: y + 'px',
          visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible',
        });
        if (focusSearch && !middlewareData.hide?.referenceHidden) {
          focusSearch = false;
          menu.querySelector('input[type="search"]')?.focus({ preventScroll: true });
        }
      });
    });

    function dismiss(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => {
      stopPositioning();
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [end, open, scroll, searchable]);

  return <div ref={ref} className={className} data-search-picker-open={searchable && open ? '' : undefined} onBlur={event => {
    if (searchable && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }}>
    <button ref={triggerRef} type="button" className={button} aria-label={title} aria-controls={open ? id : undefined}
      aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>
    {open && <Panel ref={menuRef} id={id} className={'dropdown-menu console-dropdown-menu show' + (searchable ? ' console-navigation-menu' : '')}
      style={{ position: 'fixed' }} onClick={event => {
        const option = event.target.closest('[data-picker-option]');
        if (!searchable || option || event.target.closest('a[href]')) {
          setOpen(false);
          if (option?.tagName === 'BUTTON') triggerRef.current?.focus({ preventScroll: true });
        }
      }}>{children}</Panel>}
  </div>;
}

export const Item = ({ children, href, onClick, newTab = false }) => <li>{href
  ? <a className="dropdown-item fs-14px" href={href} target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}>{children}</a>
  : <button type="button" className="dropdown-item fs-14px" onClick={onClick}>{children}</button>}</li>;
export const Divider = () => <li><hr className="dropdown-divider" /></li>;

const jobFields = ['urgent', 'ready', 'reserved', 'delayed', 'buried'].map(state => 'current-jobs-' + state).concat('total-jobs');
const tubeGroups = [
  ['Jobs', jobFields],
  ['Connections', ['current-using', 'current-waiting', 'current-watching']],
  ['Pause', ['pause', 'pause-time-left']],
  ['Commands', ['cmd-delete', 'cmd-pause-tube']],
];
const serverActivity = ['current-connections', 'current-tubes', 'current-producers', 'current-waiting', 'current-workers', 'total-connections'];
const serverCommands = serverFields.filter(field => field.startsWith('cmd-'));
const serverBinlog = serverFields.filter(field => field.startsWith('binlog-'));
const serverGroups = [
  ['Jobs', [...jobFields, 'job-timeouts', 'max-job-size']],
  ['Activity', serverActivity],
  ['Commands', serverCommands],
  ['Binlog', serverBinlog],
  ['Server details', serverFields.filter(field => ![...jobFields, 'job-timeouts', 'max-job-size', ...serverActivity, ...serverCommands, ...serverBinlog].includes(field))],
];
const statLabels = {
  'total-jobs': 'Total', pause: 'Duration', 'pause-time-left': 'Time left',
  'current-connections': 'Connections', 'current-tubes': 'Tubes',
};
const groupedFields = (fields, groups) => groups.map(([label, keys]) => [label, keys.filter(field => fields.includes(field))])
  .filter(([, keys]) => keys.length > 0);
const groupStarts = groups => groups.map(([, keys]) => keys[0]);
const statGroupClass = (field, starts) => starts.includes(field) ? ' queue-metric-group-start' : '';
const statLabel = field => statLabels[field] ?? nameOf(field.replace(/^(current-jobs-|current-|cmd-)/, ''));
const statNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 20 });

function StatHeaderRows({ groups, before, after, children }) {
  if (!groups.length) return <tr>{before}{children}{after}</tr>;
  return <>
    <tr className="queue-metric-groups">
      {before}
      {groups.map(([label, fields]) => <th key={label} scope="colgroup" colSpan={fields.length} className="queue-metric-group-start">{label}</th>)}
      {after}
    </tr>
    <tr>{children}</tr>
  </>;
}

function StatColumnGroups({ groups, leading, actions }) {
  return <>
    {leading > 0 && <colgroup span={leading} />}
    {groups.map(([label, fields]) => <colgroup key={label} span={fields.length} />)}
    {actions && <colgroup span={1} />}
  </>;
}

function StatHeaders({ fields, starts, descriptions, jumpToJobs }) {
  return fields.map(field => {
    const label = statLabel(field);
    const linksToJob = jumpToJobs && states.some(state => field === 'current-jobs-' + state);
    return <th key={field} scope="col" title={descriptions[field]} className={'queue-stat-cell' + statGroupClass(field, starts)}>
      {linksToJob ? <a className="queue-stat-link" href={'#' + field}>{label}</a> : label}
    </th>;
  });
}

function StatCells({ fields, starts, record, previous }) {
  return fields.map(field => {
    const value = record?.[field];
    const changed = previous?.[field] != null && value !== previous[field];
    const zero = value === 0 || value === '0';
    const number = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value));
    const formatted = number && !['id', 'version', 'hostname', 'pid'].includes(field) ? statNumber.format(value) : value;
    const seconds = value != null && (field === 'pause' || field === 'pause-time-left');
    const status = Number(value) > 0 && ['current-jobs-buried', 'current-jobs-delayed'].includes(field) ? field.slice('current-jobs-'.length) : null;
    return <td key={field + ':' + value} name={field} className={'queue-stat-cell' + statGroupClass(field, starts) +
      (zero ? ' queue-stat-zero' : '') + (changed ? ' stat-changed' : '')}>
      {status ? <span className={'queue-stat-badge job-state-' + status}>{formatted}</span> : formatted ?? '—'}{seconds && ' s'}
    </td>;
  });
}

export function Skeleton({ className = '' }) {
  return <span className={'console-skeleton ' + className} aria-hidden="true" />;
}

function SkeletonStats({ fields, starts }) {
  return fields.map(field => <td key={field} aria-hidden="true" className={'queue-stat-cell' + statGroupClass(field, starts)}><Skeleton className="skeleton-stat" /></td>);
}

function SkeletonRow({ fields, starts, selection, actions, identity = true }) {
  return <tr aria-hidden="true">
    {selection && <td className="tube-select-column"><Skeleton className="skeleton-checkbox" /></td>}
    {identity && <td className="queue-identity"><Skeleton className="skeleton-name" /></td>}
    <SkeletonStats fields={fields} starts={starts} />
    {actions && <td className="queue-row-actions"><Skeleton className="skeleton-actions" /></td>}
  </tr>;
}

function ServerRow({ server, fields, starts, revision, interval, onAction, personalEnabled }) {
  const resource = useResource(queueURL(server, 'stats'), revision, interval);
  const loading = !resource.data && !resource.error;
  return <tr aria-busy={loading || undefined}>
    <th scope="row" className="queue-identity queue-server-identity"><a className={textLink} href={locationFor(server)}>{server.label}</a>
      {server.label !== server.endpoint && <small className="queue-panel-context">{server.endpoint}</small>}
    </th>
    {resource.data ? <StatCells fields={fields} starts={starts} record={resource.data} previous={resource.previousData} /> : loading
      ? <SkeletonStats fields={fields} starts={starts} />
      : fields.length > 0 && <td colSpan={fields.length} className="queue-server-error" title={resource.error}>{resource.error}</td>}
    {personalEnabled && <td className="queue-row-actions"><div className="d-inline-flex gap-1">
      <button type="button" className={neutral + ' console-icon-button'} title={'Edit server ' + server.label} aria-label={'Edit server ' + server.label}
        onClick={() => onAction({ type: 'server', server })}><Icon name="edit" weight="regular" /></button>
      <button type="button" className="btn btn-sm console-neutral console-icon-button console-danger-action"
        title={'Remove server ' + server.label} aria-label={'Remove server ' + server.label}
        onClick={() => onAction({ type: 'removeServer', server })}><Icon name="trashSimple" weight="regular" /></button>
    </div></td>}
  </tr>;
}

export function ServerSummary({ servers, fields, revision, interval, onAction, personalEnabled, loading }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const query = filter.trim().toLowerCase();
  const matches = servers.filter(server => server.label.toLowerCase().includes(query) || server.endpoint.includes(query));
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize);
  const groups = groupedFields(fields, serverGroups);
  const columns = groups.flatMap(([, keys]) => keys);
  const starts = groupStarts(groups);
  const columnCount = columns.length + 1 + Number(Boolean(personalEnabled));
  const rowSpan = groups.length ? 2 : undefined;
  return <section className="queue-panel queue-list-panel mt-4" aria-label="Servers">
      {loading && <span className="visually-hidden" role="status">Loading servers…</span>}
      {(servers.length > pageSize || filter) && <div className="queue-panel-tools">
        <input type="search" className="form-control form-control-sm w-auto mw-100" aria-label="Filter servers"
          placeholder="Filter servers" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} />
        <small className="text-body-secondary" role="status">{matches.length} of {servers.length} servers</small>
      </div>}
    <div className="table-responsive" tabIndex={0} role="region" aria-label="Server statistics"><table className="table queue-table align-middle mb-0" id="servers-index" aria-busy={loading || undefined}>
      <StatColumnGroups groups={groups} leading={1} actions={personalEnabled} />
      <thead>
        <StatHeaderRows groups={groups} before={<th scope="col" rowSpan={rowSpan} className="queue-identity">Server</th>}
          after={personalEnabled && <th scope="col" rowSpan={rowSpan} className="queue-row-actions">Actions</th>}>
          <StatHeaders fields={columns} starts={starts} descriptions={serverFieldDescriptions} />
        </StatHeaderRows>
      </thead>
      <tbody>{loading ? Array.from({ length: 3 }, (_, row) => <SkeletonRow key={row} fields={columns} starts={starts} actions={personalEnabled} />)
        : visible.length ? visible.map(server => <ServerRow key={server.id} fields={columns} {...{ server, starts, revision, interval, onAction, personalEnabled }} />)
          : <tr><td colSpan={columnCount} className="text-body-secondary text-center py-3">{query ? 'No matching servers' : 'No servers configured'}</td></tr>}</tbody>
    </table></div>
    <footer className="queue-panel-tools queue-panel-footer">
      {pageCount > 1 && <nav className="d-flex flex-wrap align-items-center gap-2" aria-label="Server list pages">
        <button type="button" className={neutral} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <small className="text-body-secondary" role="status">Page {currentPage} of {pageCount}</small>
        <button type="button" className={neutral} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
      </nav>}
      <button type="button" className={success + ' ms-auto'} id="addServer" onClick={() => onAction({ type: 'server' })} disabled={!personalEnabled}
        title={!loading && !personalEnabled ? 'Personal servers are disabled' : undefined}><Icon name="add" /> Add server</button>
    </footer>
  </section>;
}

export function TubeTable({ tubes = [], fields, server, selected, onSelect, previous, bulk, tubeName, detail, loading, headerSearch, footer, searchResults }) {
  const visibleSelected = tubes.filter(tube => selected?.includes(tube.name)).length;
  const selectRef = useRef(null);
  useEffect(() => {
    if (selectRef.current) selectRef.current.indeterminate = visibleSelected > 0 && visibleSelected < tubes.length;
  }, [visibleSelected, tubes.length]);
  const previousByName = new Map(previous?.map(item => [item.name, item]));
  const groups = groupedFields(fields, tubeGroups);
  const columns = groups.flatMap(([, keys]) => keys);
  const starts = groupStarts(groups);
  const pauseLeft = tubes[0]?.['pause-time-left'];
  const hasStats = !detail || columns.length > 0;
  const rowSpan = groups.length ? 2 : undefined;
  return <section id="summaryTable" className="mt-4" aria-labelledby={detail ? 'tube-table-title' : undefined} aria-label={detail ? undefined : 'Tubes'}>
    {bulk}
    <div className={'queue-panel' + (detail ? '' : ' queue-list-panel')}>
      {detail && <header className="queue-panel-header queue-tube-header">
        <a className="btn btn-sm queue-back-link" href={locationFor(server, searchResults ? tubeName : undefined)}
          aria-label={searchResults ? 'Back to tube detail' : 'Back to tube list'}>
          <Icon name="back" /> {searchResults ? 'Tube detail' : 'Tube list'}
        </a>
        <div className="queue-tube-identity">
          <h2 id="tube-table-title" className="queue-panel-title">{tubeName}</h2>
          {pauseLeft > 0 && <span className="queue-stat-badge job-state-delayed" title={`${pauseLeft} seconds remaining`}><Icon name="pause" /> Paused</span>}
        </div>
        {headerSearch}
      </header>}
        {hasStats && <div className="table-responsive" tabIndex={0} role="region" aria-label="Tube statistics">
          <table className={'table queue-table align-middle mb-0' + (detail ? ' queue-table-detail' : '')} aria-busy={loading || undefined}>
            <StatColumnGroups groups={groups} leading={detail ? 0 : 2} />
            <thead><StatHeaderRows groups={groups} before={!detail && <>
              <th scope="col" rowSpan={rowSpan} className="tube-select-column"><input ref={selectRef} type="checkbox" className="form-check-input" id="selectVisibleTubes" aria-label="Select all visible tubes"
                checked={tubes.length > 0 && visibleSelected === tubes.length} disabled={tubes.length === 0} onChange={event => onSelect(tubes.map(tube => tube.name), event.target.checked)} /></th>
              <th scope="col" rowSpan={rowSpan} className="queue-identity">Tube name</th>
            </>}>
              <StatHeaders fields={columns} starts={starts} descriptions={tubeFieldDescriptions} jumpToJobs={detail && !searchResults && !loading} />
            </StatHeaderRows></thead>
            <tbody>{loading ? Array.from({ length: detail ? 1 : 6 }, (_, row) => <SkeletonRow key={row} fields={columns} starts={starts} selection={!detail} identity={!detail} />)
              : tubes.length === 0 ? <tr><td colSpan={columns.length + 2} className="text-body-secondary text-center py-3">No tubes to display</td></tr> : tubes.map(tube => {
              const paused = tube['pause-time-left'] > 0;
              return <tr key={tube.name} data-selected={!detail && selected.includes(tube.name) ? true : undefined}
                className={!detail && paused ? 'queue-paused-row' : undefined}>
                {!detail && <td className="tube-select-column"><input className="form-check-input tube-row-select" type="checkbox" aria-label={'Select tube ' + tube.name}
                  checked={selected.includes(tube.name)} onChange={event => onSelect([tube.name], event.target.checked)} /></td>}
                {!detail && <th scope="row" className="queue-identity tube-name-cell" id={'tube-' + tube.name}><div className="tube-name-content">
                  <a href={locationFor(server, tube.name)} className={textLink}>{tube.name}</a>
                  {paused && <span className="tube-paused-indicator" role="img" aria-label={'Paused, ' + tube['pause-time-left'] + ' seconds remaining'}><Icon name="pause" weight="fill" /></span>}
                </div></th>}
                <StatCells fields={columns} starts={starts} record={tube} previous={previousByName.get(tube.name)} />
              </tr>;
            })}</tbody>
          </table>
        </div>}
        {footer}
    </div>
  </section>;
}

export function Alert({ message, error }) {
  return <div className={'alert mt-3 ' + (error ? 'alert-danger' : 'alert-info')} role={error ? 'alert' : 'status'}>
    {message}
  </div>;
}
