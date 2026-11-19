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

function StatCells({ fields, record, previous }) {
  return fields.map(field => {
    const value = record?.[field];
    const changed = previous?.[field] != null && value !== previous[field];
    return <td key={field + ':' + value} name={field} className={'td-' + field + (value && value !== '0' ? ' hasValue' : '') + (changed ? ' stat-changed' : '')}>{value ?? ''}</td>;
  });
}

export function Skeleton({ className = '' }) {
  return <span className={'console-skeleton ' + className} aria-hidden="true" />;
}

function SkeletonStats({ fields }) {
  return fields.map(field => <td key={field} aria-hidden="true"><Skeleton className="skeleton-stat" /></td>);
}

function SkeletonRow({ fields, selection, actions }) {
  return <tr aria-hidden="true">
    {selection && <td className="tube-select-column"><Skeleton className="skeleton-checkbox" /></td>}
    <td><Skeleton className="skeleton-name" /></td>
    <SkeletonStats fields={fields} />
    {actions && <td className="text-center"><Skeleton className="skeleton-actions" /></td>}
  </tr>;
}

function ServerRow({ server, fields, revision, interval, onAction, personalEnabled }) {
  const resource = useResource(queueURL(server, 'stats'), revision, interval);
  const loading = !resource.data && !resource.error;
  return <tr aria-busy={loading || undefined}>
    <td className="text-nowrap"><a className={textLink} href={locationFor(server)}>{server.label}</a></td>
    {resource.data ? <StatCells fields={fields} record={resource.data} previous={resource.previousData} /> : loading
      ? <SkeletonStats fields={fields} />
      : fields.length > 0 && <td colSpan={fields.length} className="row-full" title={resource.error}><span className="visually-hidden">{resource.error}</span></td>}
    <td className="text-center text-nowrap">{personalEnabled && <div className="d-inline-flex gap-1">
      <button type="button" className={neutral + ' console-icon-button'} title={'Edit server ' + server.label} aria-label={'Edit server ' + server.label}
        onClick={() => onAction({ type: 'server', server })}><Icon name="edit" weight="regular" /></button>
      <button type="button" className="btn btn-sm console-neutral console-icon-button console-danger-action"
        title={'Remove server ' + server.label} aria-label={'Remove server ' + server.label}
        onClick={() => onAction({ type: 'removeServer', server })}><Icon name="trashSimple" weight="regular" /></button>
    </div>}</td>
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
  return <div className="row"><div className="col-md-12 col-12 mt-4"><div className="card bg-body border-0 shadow-sm">
    <div className="card-body">
      {loading && <span className="visually-hidden" role="status">Loading servers…</span>}
      {(servers.length > pageSize || filter) && <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <input type="search" className="form-control form-control-sm w-auto mw-100" aria-label="Filter servers"
          placeholder="Filter servers" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} />
        <small className="text-body-secondary" role="status">{matches.length} of {servers.length} servers</small>
      </div>}
      <div className="table-responsive"><table className="table table-striped border-dark-subtle align-middle mb-0" id="servers-index" aria-busy={loading || undefined}>
      <thead><tr><th>Name</th>{fields.map(field => <th key={field} scope="col">{nameOf(field)}</th>)}<th>&nbsp;</th></tr></thead>
      <tbody>{loading ? Array.from({ length: 3 }, (_, row) => <SkeletonRow key={row} fields={fields} actions />)
        : visible.length ? visible.map(server => <ServerRow key={server.id} {...{ server, fields, revision, interval, onAction, personalEnabled }} />)
          : query && <tr><td colSpan={fields.length + 2} className="text-body-secondary text-center py-3">No matching servers</td></tr>}</tbody>
    </table></div></div>
    <div className="card-body pt-1 d-flex flex-wrap align-items-center justify-content-end gap-2">
      {pageCount > 1 && <nav className="d-flex align-items-center gap-2 me-auto" aria-label="Server list pages">
        <button type="button" className={neutral} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <small className="text-body-secondary" role="status">Page {currentPage} of {pageCount}</small>
        <button type="button" className={neutral} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
      </nav>}
      <button type="button" className={success} id="addServer" onClick={() => onAction({ type: 'server' })} disabled={!personalEnabled} title={!loading && !personalEnabled ? 'Personal servers are disabled' : undefined}>Add server</button>
    </div>
  </div></div></div>;
}

export function TubeTable({ tubes = [], fields, server, selected, onSelect, previous, bulk, detail, loading }) {
  const visibleSelected = tubes.filter(tube => selected?.includes(tube.name)).length;
  const selectRef = useRef(null);
  useEffect(() => {
    if (selectRef.current) selectRef.current.indeterminate = visibleSelected > 0 && visibleSelected < tubes.length;
  }, [visibleSelected, tubes.length]);
  const previousByName = new Map(previous?.map(item => [item.name, item]));
  return <section id="summaryTable"><div className="row"><div className="col-md-12 col-12 mt-4">
    <div className={'card bg-body border-0 shadow-sm' + (detail ? ' rounded-top-2 rounded-bottom-0' : '')}>
      <div className={'card-body' + (detail ? ' pb-0' : '')}>{bulk}
        <div className="table-responsive mb-0">
          <table className="table table-striped border-dark-subtle align-middle mb-0" aria-busy={loading || undefined}>
            <thead><tr>
              {!detail && <th scope="col" className="tube-select-column"><input ref={selectRef} type="checkbox" className="form-check-input" id="selectVisibleTubes" aria-label="Select all visible tubes"
                checked={tubes.length > 0 && visibleSelected === tubes.length} disabled={tubes.length === 0} onChange={event => onSelect(tubes.map(tube => tube.name), event.target.checked)} /></th>}
              <th scope="col">Tube Name</th>
              {fields.map(field => <th key={field} scope="col">{detail && !loading && states.some(state => field === 'current-jobs-' + state)
                ? <a className="a-unstyled" href={'#' + field}>{nameOf(field)}</a> : nameOf(field)}</th>)}
            </tr></thead>
            <tbody>{loading ? Array.from({ length: detail ? 1 : 6 }, (_, row) => <SkeletonRow key={row} fields={fields} selection={!detail} />)
              : tubes.map(tube => {
              const paused = tube['pause-time-left'] > 0;
              return <tr key={tube.name} className={paused ? 'tr-tube-paused' : ''} title={paused ? 'Pause seconds left: ' + tube['pause-time-left'] : undefined}>
                {!detail && <td className="tube-select-column"><input className="form-check-input tube-row-select" type="checkbox" aria-label={'Select tube ' + tube.name}
                  checked={selected.includes(tube.name)} onChange={event => onSelect([tube.name], event.target.checked)} /></td>}
                <td className={detail ? undefined : 'tube-name-cell'} id={'tube-' + tube.name}>{detail ? tube.name : <div className="tube-name-content">
                  <a href={locationFor(server, tube.name)} className={textLink}>{tube.name}</a>
                  {paused && <span className="tube-paused-indicator" role="img" aria-label={'Paused, ' + tube['pause-time-left'] + ' seconds remaining'}><Icon name="pause" weight="fill" /></span>}
                </div>}</td>
                <StatCells fields={fields} record={tube} previous={previousByName.get(tube.name)} />
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div></div></section>;
}

export function Alert({ message, error }) {
  return <div className={'alert mt-3 ' + (error ? 'alert-danger' : 'alert-info')} role={error ? 'alert' : 'status'}>
    {message}
  </div>;
}
