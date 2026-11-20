import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { useResource } from '../../lib/api.js';
import { sampleDestinations } from '../../lib/sample-destinations.js';
import { actionLocation, ActionLink, Alert, Divider, empty, Item, locationFor, Menu, nameOf, neutral, queueURL, Skeleton, states, success, textLink } from '../../components/console-ui.jsx';
import { Icon } from '../../components/icon.jsx';
import { FullPayload, PayloadEditor, PayloadViewer } from '../../components/payload.jsx';

export function BulkControls({ selected, allTubes, visibleTubes, run }) {
  const [count, setCount] = useState(1);
  const barRef = useRef(null);
  const total = selected.length;
  const visible = total > 0;
  const hidden = selected.filter(name => !visibleTubes.some(item => item.name === name)).length;
  const canKickAll = allTubes.some(tube => selected.includes(tube.name) && tube['current-jobs-buried'] > 0);
  const [summary, setSummary] = useState({ total, hidden, canKickAll });
  // Keep the last visible contents in place while the bar fades out.
  if (visible && (summary.total !== total || summary.hidden !== hidden || summary.canKickAll !== canKickAll)) {
    setSummary({ total, hidden, canKickAll });
  }

  useLayoutEffect(() => {
    if (!visible) return;
    const bar = barRef.current;
    const table = bar.closest('#summaryTable');
    const measure = () => table.style.setProperty('--tube-bulk-space', (bar.getBoundingClientRect().height + 16) + 'px');
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(bar);
    return () => {
      observer.disconnect();
      table.style.removeProperty('--tube-bulk-space');
    };
  }, [visible]);

  const disabled = summary.total > 50;
  const kick = value => run('kick', selected, { state: 'buried', limit: value });
  return <div ref={barRef} id="tubeBulkActions" className="tube-bulk-actions" data-visible={visible} inert={!visible}>
    <div className="tube-bulk-info" aria-live="polite"><strong>{summary.total} {summary.total === 1 ? 'tube' : 'tubes'} selected{summary.hidden > 0 && ' (' + summary.hidden + ' hidden by filter)'}</strong>{disabled && ' · select up to 50'}</div>
    <div className="tube-bulk-controls">
      <div className="tube-bulk-action-group" role="group" aria-label="Pause controls">
        <button type="button" className={neutral} disabled={disabled} onClick={() => run('pause', selected)}><Icon name="pause" weight="fill" /> Pause</button>
        <button type="button" className={neutral} disabled={disabled} onClick={() => run('resume', selected)}><Icon name="play" weight="fill" /> Resume</button>
      </div>
      <div className="tube-bulk-action-group" role="group" aria-label="Kick buried jobs">
        <button type="button" className={neutral} disabled={disabled} onClick={() => kick(1)}><Icon name="fastForward" weight="fill" /> Kick 1 job</button>
        <form className="input-group input-group-sm tube-kick-more" onSubmit={event => { event.preventDefault(); kick(count); }}>
          <input type="number" className="form-control console-inset" min="1" max="1000" required value={count} disabled={disabled}
            aria-label="Number of jobs to kick per tube" onChange={event => setCount(event.target.valueAsNumber || '')} />
          <button type="submit" className={neutral} disabled={disabled}><Icon name="skipForward" weight="fill" /> Kick more</button>
        </form>
        <button type="button" className={neutral} disabled={disabled || !summary.canKickAll}
          onClick={() => kick(1000)}><Icon name="fastForward" weight="fill" /> Kick all jobs</button>
      </div>
      <div className="tube-bulk-action-group">
        <button type="button" className={neutral + ' console-danger-action'} disabled={disabled}
          onClick={() => run('clear', selected, { state: 'all', limit: 1000 })}>
          <Icon name="trashSimple" /> Clear jobs
        </button>
      </div>
    </div>
  </div>;
}

function duration(value) {
  if (value == null || value === '') return '—';
  let seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 0) return String(value);
  const units = [];
  for (const [unit, size] of [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]]) {
    const count = Math.floor(seconds / size);
    if (count) units.push(count + unit);
    seconds %= size;
  }
  return units.join(' ') || '0s';
}

const jobIdentityFields = [['id', 'ID', 'key'], ['pri', 'Priority', 'priority'], ['file', 'File', 'file']];
const jobTimeFields = [['age', 'Age'], ['delay', 'Delay'], ['ttr', 'TTR'], ['time-left', 'Time left']];
const jobActivityFields = [
  ['reserves', 'Reserves'], ['timeouts', 'Timeouts'], ['releases', 'Releases'], ['buries', 'Buries'], ['kicks', 'Kicks'],
];

function JobMetadata({ job }) {
  function group(fields, kind, heading) {
    const timing = kind === 'timing';
    return <div className={'job-meta-' + kind}>
      {heading && <h6 className="job-meta-heading">{heading}</h6>}
      <dl className="job-meta-values">
        {fields.map(([key, label, icon]) => {
          const value = key === 'id' ? job?.id : job?.stats[key];
          const seconds = timing && value != null && value !== '' ? value + ' seconds' : undefined;
          return <div key={key} className="job-meta-item">
            <dt title={key === 'ttr' ? 'Time to run' : undefined}>{icon && <Icon name={icon} weight="regular" />}{label}</dt>
            <dd className={key === 'id' ? 'font-monospace' : undefined} title={seconds}>
              {job ? (timing ? duration(value) : value ?? '—') : <Skeleton className="skeleton-stat" />}
            </dd>
          </div>;
        })}
      </dl>
    </div>;
  }

  return <div className="job-metadata">
    {group(jobIdentityFields, 'identity')}
    {group(jobTimeFields, 'timing', 'Timing')}
    {group(jobActivityFields, 'activity', 'Activity')}
  </div>;
}

function sampleLink(server, tube, sample) {
  const url = new URL(locationFor(server, tube, 'loadSample'), location.href);
  url.searchParams.set('key', sample.id);
  return url.pathname + url.search;
}

function JobCard({ state, job, count, server, tube, onAction, onCopy, settings }) {
  return <div className="col-12 col-lg-4"><div className="card bg-body border-0 shadow-sm"><div className="card-body">
    <a id={'current-jobs-' + state} />
    <div className="job-card-heading">
      <h5 className="mb-0 fw-bold">Next <span className={'job-state-' + state}>{state}</span> job</h5>
      {job && <Menu button="btn btn-default btn-sm border-0 console-icon-button" title={'More ' + state + ' job actions'} label={<Icon name="more" className="fs-5" />} end>
        <Item onClick={() => onAction({ type: 'bulk', action: 'clear', state, tubes: [tube], clearCount: count })}>Delete all {state} jobs</Item>
        <Item onClick={() => onAction({ type: 'bulk', action: 'move', state, tubes: [tube] })}>Move all {state} to ..</Item>
        {state !== 'ready' && <Item onClick={() => onAction({ type: 'kickJob', job })}>Kick this job</Item>}
      </Menu>}
    </div>
    {!job ? <div className="row"><div className="col text-center">
      <img src={empty} className="img-fluid pt-2 opacity-25" alt="" width="200" /><h6 className="text-body-tertiary m-0 pb-3">Empty</h6>
    </div></div> : <div className="row show-grid">
      <div className="col-12"><JobMetadata job={job} /></div>
      <div className="col-sm-12 mt-2"><div className="row g-2">
        <div className="col-12"><small className="text-body-tertiary fs-11px fw-semibold"><Icon name="jobData" /> Job Data{job.encoding === 'base64' && ' (Base64)'}</small></div>
        <div className="col-12"><div className="card console-inset border-0"><div className={'card-body card-job-' + state}><div className="row">
          <div className="col-8 text-start d-inline">
            <button type="button" className="btn btn-sm console-neutral addSample" title="Add to samples" aria-label="Add to samples" disabled={job.encoding !== 'utf8'} onClick={() => onAction({ type: 'sample', job, data: { tubes: [tube] } })}><Icon name="add" /></button>{' '}
            <button type="button" className="btn btn-copy-job console-neutral btn-sm" title="Copy to clipboard" aria-label="Copy to clipboard" onClick={() => onCopy(job.payload)}><Icon name="copy" /></button>
          </div>
          <div className="col-4 text-end d-inline"><ActionLink className="btn btn-sm console-danger" title="Delete job" aria-label="Delete job"
            href={actionLocation(server, tube, 'deleteJob', { state, jobid: job.id })} onAction={() => onAction({ type: 'deleteJob', job })}><Icon name="trashSimple" weight="regular" /></ActionLink></div>
          <div className="col-12 json"><PayloadViewer id={'json-viewer-' + state} className={'json-viewer rounded-2 mt-2 ' + state} job={job} settings={settings} /></div>
        </div></div></div></div>
      </div></div>
    </div>}
  </div></div></div>;
}

export function TubeJobsSkeleton() {
  return <>
    <section id="actionsRow" aria-hidden="true"><div className="row"><div className="col">
      <div className="card rounded-bottom-2 rounded-top-0 bg-body border-0 shadow-sm"><div className="card-body pt-4">
        <div className="row g-1">
          {[0, 1, 2, 3].map(index => <div className="col-md-2 col-12" key={index}><Skeleton className="skeleton-button w-100" /></div>)}
          <div className="col-md-4 col-12 text-end"><Skeleton className="skeleton-button skeleton-name" /></div>
        </div>
      </div></div>
    </div></div></section>
    <section className="jobsShowcase" aria-hidden="true"><div className="row mt-3 mb-5 pb-5"><div className="col"><div className="row g-2 mt-0">
      {states.map(state => <div className="col-12 col-lg-4" key={state}>
        <div className="card bg-body border-0 shadow-sm"><div className="card-body">
          <div className="job-card-heading"><Skeleton className="skeleton-title" /></div>
          <JobMetadata />
          <Skeleton className="skeleton-job-payload w-100 mt-3" />
        </div></div>
      </div>)}
    </div></div></div></section>
  </>;
}

export function TubeJobs({ detail, server, tube, samples, onAction, onCopy, settings, run }) {
  const [count, setCount] = useState(10);
  const paused = detail.stats['pause-time-left'] > 0;
  const buried = Number(detail.stats['current-jobs-buried']);
  const sampleJobs = (samples || []).filter(sample => sample.tubes.includes(tube));
  const kick = (limit, state = 'any') => run('kick', [tube], { limit, state });
  return <>
    <section id="actionsRow"><div className="row"><div className="col text-end">
      <div className="card rounded-bottom-2 rounded-top-0 bg-body border-0 shadow-sm"><div className="card-body pt-4"><div className="row g-1">
        <div className="col-md-2 col-12 text-start"><ActionLink className={neutral + ' w-100'} title={paused ? 'Pause seconds left: ' + detail.stats['pause-time-left'] : 'Temporarily prevent jobs being reserved from the given tube'}
          href={actionLocation(server, tube, 'pause', { count: paused ? 0 : -1 })} onAction={() => run(paused ? 'resume' : 'pause', [tube])}><Icon name={paused ? 'play' : 'pause'} weight="fill" /> {paused ? 'Unpause tube' : 'Pause tube'}</ActionLink></div>
        <div className="col-md-2 col-12"><ActionLink className={neutral + ' w-100'} href={actionLocation(server, tube, 'kick', { count: 1 })} onAction={() => kick(1)}><Icon name="fastForward" weight="fill" /> Kick 1 job</ActionLink></div>
        <div className="col-md-2 col-12"><form onSubmit={event => { event.preventDefault(); kick(count); }}><div className="input-group input-group-sm">
          <input type="number" value={count} min="1" max="1000" required className="form-control form-control-sm console-inset kick_jobs_no col-5"
            aria-label="Number of jobs to kick" onChange={event => setCount(event.target.valueAsNumber || '')} />
          <button type="submit" className={neutral + ' col-7'}><Icon name="skipForward" weight="fill" /> Kick more</button>
        </div></form></div>
        <div className="col-md-2 col-12"><ActionLink className={neutral + ' w-100'} href={actionLocation(server, tube, 'kick', { count: Math.min(buried, 1000) })}
          onAction={() => buried > 0 && kick(Math.min(buried, 1000), 'buried')}><Icon name="fastForward" weight="fill" /> Kick all jobs</ActionLink></div>
        <div className="col-md-4 col-12 text-end"><div className="btn-group">
          <button type="button" className={success} id="addJob" onClick={() => onAction({ type: 'add', tube })}><Icon name="addCircle" weight="fill" /> Add job</button>
          <Menu className="btn-group" button={success + ' dropdown-toggle'} title="Saved jobs" end label="">
            {sampleJobs.length ? <>
              {sampleJobs.map(sample => <Item key={sample.id} href={sampleLink(server, tube, sample)}>{sample.name}</Item>)}
              <Divider /><Item href={locationFor(null, null, 'manageSamples')}>Manage samples</Item>
            </> : <li><span className="dropdown-item">There are no sample jobs</span></li>}
          </Menu>
        </div></div>
      </div></div></div>
    </div></div></section>
    <section className="jobsShowcase"><div className="row mt-3 mb-5 pb-5"><div className="col"><div className="row g-2 mt-0">
      {states.map(state => <JobCard key={state} count={detail.stats['current-jobs-' + state] ?? ''}
        {...{ state, job: detail.jobs[state], server, tube, onAction, onCopy, settings }} />)}
    </div></div></div></section>
  </>;
}

function sampleEditorLink(sample, operation = 'editSample') {
  return './?' + new URLSearchParams({ action: operation, ...(sample && { key: sample.id }) });
}

function SampleFilter({ label, value, onChange }) {
  return <div className="sample-filter">
    <Icon name="search" />
    <input type="search" className="form-control form-control-sm" aria-label={label}
      placeholder={label} value={value} onChange={event => onChange(event.target.value)} />
  </div>;
}

export function Samples({ resource, servers, onAction }) {
  const [filter, setFilter] = useState('');
  const samples = resource.data || [];
  const query = filter.trim().toLowerCase();
  const visible = samples.filter(sample => {
    const destinations = sampleDestinations(sample);
    return sample.name.toLowerCase().includes(query) || destinations.some(tube => tube.toLowerCase().includes(query));
  });
  const loading = !resource.data && !resource.error;
  return <section className="my-4" aria-labelledby="sample-list-title">
    <header className="sample-page-heading">
      <h1 id="sample-list-title" className="h4 mb-0">Job samples</h1>
      <a className={success} href={sampleEditorLink(null, 'newSample')}><Icon name="add" /> New sample</a>
    </header>
    {resource.error && <Alert error message={resource.error} />}
    {loading && <div className="card border-0 shadow-sm p-3" role="status">
      <span className="visually-hidden">Loading samples…</span>
      <Skeleton className="skeleton-title mb-3" />
      <Skeleton className="skeleton-name" />
    </div>}
    {resource.data && !resource.error && <div className="card bg-body border-0 shadow-sm"><div className="card-body">
      {samples.length > 0 && <div className="sample-list-toolbar mb-3">
        <SampleFilter label="Filter by name or tube" value={filter} onChange={setFilter} />
        <span className="small text-body-secondary" role="status">
          {query ? visible.length + ' of ' : ''}{samples.length} {samples.length === 1 ? 'sample' : 'samples'}
        </span>
      </div>}
      {!samples.length && <div className="sample-empty">
        <Icon name="listChecks" />
        <h2 className="h6 mb-1">No saved samples yet</h2>
        <p className="text-body-secondary small mb-0">Create a sample here or save a job from a tube.</p>
      </div>}
      {samples.length > 0 && !visible.length && <div className="sample-empty">
        <Icon name="search" />
        <h2 className="h6 mb-1">No matching samples</h2>
        <button type="button" className="btn btn-link btn-sm" onClick={() => setFilter('')}>Clear filter</button>
      </div>}
      {visible.length > 0 && <div className="table-responsive sample-table-frame"><table className="table table-hover align-middle mb-0 sample-table" aria-label="Saved job samples">
        <thead><tr>
          <th scope="col" className="sample-name-column">Name</th>
          <th scope="col">Available tubes</th>
          <th scope="col" className="text-end">Actions</th>
        </tr></thead>
        <tbody>{visible.map(sample => <tr key={sample.id}>
          <th scope="row"><a className={textLink + ' fw-semibold sample-name'} href={sampleEditorLink(sample)}>{sample.name}</a></th>
          <td>
            <div className="d-flex flex-wrap gap-1">
              {sampleDestinations(sample).map(tube => <span className="sample-tube-tag" key={tube}>{tube}</span>)}
            </div>
          </td>
          <td className="text-end text-nowrap"><div className="d-inline-flex gap-1">
            <button type="button" className="btn btn-sm sample-send-button" disabled={!servers.length}
              title={!servers.length ? 'Add a server to send samples' : undefined} aria-label={'Send ' + sample.name}
              onClick={() => onAction({ type: 'loadSample', sample, pickDestination: true })}><Icon name="play" weight="fill" /> Send</button>
            <a className={neutral + ' console-icon-button'} href={sampleEditorLink(sample)} title="Edit sample" aria-label={'Edit ' + sample.name}>
              <Icon name="edit" weight="regular" /></a>
            <a className="btn btn-sm console-neutral console-icon-button console-danger-action" href={sampleEditorLink(sample, 'deleteSample')}
              title="Delete sample" aria-label={'Delete ' + sample.name}><Icon name="trashSimple" weight="regular" /></a>
          </div></td>
        </tr>)}</tbody>
      </table></div>}
    </div></div>}
  </section>;
}

function AvailableSampleTubes({ server, checked, toggle, query }) {
  const [revision, setRevision] = useState(0);
  const resource = useResource(queueURL(server, 'overview'), revision);
  const tubes = [...(resource.data?.tubes || [])]
    .filter(({ name }) => name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <div className="sample-tube-list" role="group" aria-label={'Tubes on ' + server.label}>
    {resource.error ? <div className="sample-tube-message">
      <p className="small text-danger-emphasis mb-2" role="alert">{resource.error}</p>
      <button type="button" className={neutral} onClick={() => setRevision(value => value + 1)}>Retry</button>
    </div> : !resource.data ? <p className="sample-tube-message" role="status">Loading tubes…</p>
      : tubes.length ? tubes.map(({ name }) => <label className="sample-tube-option" key={name}>
        <input type="checkbox" className="form-check-input" checked={checked.includes(name)}
          onChange={event => toggle(name, event.target.checked)} />
        <span>{name}</span>
      </label>) : <p className="sample-tube-message">{query ? 'No matching tubes' : 'No tubes available'}</p>}
  </div>;
}

export function SampleEditor({ sample, servers, save, busy, error }) {
  const [checked, setChecked] = useState(sample?.tubes || []);
  const [filter, setFilter] = useState('');
  const [serverId, setServerId] = useState('');
  const activeServer = servers.find(server => server.id === serverId) ?? servers[0];
  const toggle = (name, enabled) => setChecked(previous => enabled ? [...new Set([...previous, name])] : previous.filter(item => item !== name));
  const listLink = locationFor(null, null, 'manageSamples');
  return <section className="my-4" aria-labelledby="sample-editor-title">
    <header className="sample-page-heading">
      <h1 id="sample-editor-title" className="h4 mb-0">{sample ? 'Edit job sample' : 'New job sample'}</h1>
      <a href={listLink} className={neutral}><Icon name="back" /> Back to samples</a>
    </header>
    <form name="sampleJobsEdit" className="card bg-body border-0 shadow-sm"
      action={sampleEditorLink(sample, sample ? 'editSample' : 'newSample')} method="post" onSubmit={event => {
      event.preventDefault();
      save(new FormData(event.currentTarget), checked, sample);
    }}>
      {error && <div className="px-3"><Alert error message={error} /></div>}
      <fieldset disabled={busy} aria-busy={busy}>
        <div className="sample-editor-layout">
          <div className="sample-editor-fields">
            <label className="form-label fw-semibold" htmlFor="addsamplename">Sample name</label>
            <input id="addsamplename" className="form-control form-control-sm" name="name" defaultValue={sample?.name}
              placeholder="e.g. Notification replay" autoComplete="off" required maxLength="200" />
            <div className="mt-3">
              <PayloadEditor id="jobdata" name="jobdata" label="Job payload" rows={8} defaultValue={sample?.data} />
            </div>
          </div>
          <section className="sample-editor-tubes" aria-labelledby="sample-tubes-title">
            <div className="sample-tube-heading">
              <h2 id="sample-tubes-title" className="h6 mb-0">Available on tubes</h2>
              <small className="sample-tube-count" role="status">{checked.length} selected</small>
            </div>
            {!checked.length && <p className="small text-body-secondary mb-0">Uses the default tube if you leave this empty.</p>}
            {checked.length > 0 && <ul className="sample-selected-tubes list-unstyled mb-0" aria-label="Selected tubes">
              {checked.map(name => <li key={name}>
                <button type="button" className="sample-tube-chip" onClick={() => toggle(name, false)}
                  aria-label={'Remove tube ' + name}><span>{name}</span><Icon name="close" /></button>
              </li>)}
            </ul>}
            {activeServer ? <>
              <div>
                <label className="form-label fw-semibold mb-1" htmlFor="sample-tube-server">Browse server</label>
                <select className="form-select form-select-sm" id="sample-tube-server" value={activeServer.id}
                  onChange={event => setServerId(event.target.value)}>
                  {servers.map(server => <option key={server.id} value={server.id}>
                    {server.label === server.endpoint ? server.label : server.label + ' (' + server.endpoint + ')'}
                  </option>)}
                </select>
              </div>
              <SampleFilter label="Filter tubes" value={filter} onChange={setFilter} />
              <AvailableSampleTubes key={activeServer.id} server={activeServer} checked={checked} toggle={toggle}
                query={filter.trim().toLowerCase()} />
            </> : <p className="small text-body-secondary mb-0">Add a server to browse its tubes.</p>}
          </section>
        </div>
        <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
          <a className={neutral} href={listLink}>Cancel</a>
          <button type="submit" className={success}>{busy ? 'Saving…' : sample ? 'Save changes' : 'Create sample'}</button>
        </div>
      </fieldset>
    </form>
  </section>;
}

function SearchPayloadPreview({ job, query }) {
  const { payload, encoding } = job;
  const previewLength = 240;
  const match = encoding === 'utf8' ? payload.indexOf(query) : -1;
  const start = Math.max(0, match - 60);
  const end = Math.min(payload.length, start + previewLength);
  const matchEnd = Math.min(match + query.length, end);
  const suffix = end < payload.length ? '…' : '';
  if (!payload) return <span className="text-body-secondary">Empty payload</span>;
  return <div className="job-search-preview font-monospace">
    {encoding === 'base64' && <span className="job-search-encoding">Base64</span>}
    {match < 0 ? <span>{payload.slice(start, end)}{suffix}</span> : <>
      {start < match && <span className="job-search-preview-context">{start > 0 && '…'}{payload.slice(start, match)}</span>}
      <mark>{payload.slice(match, matchEnd)}</mark>
      <span>{payload.slice(matchEnd, end)}{suffix}</span>
    </>}
  </div>;
}

function SearchSkeletonRows() {
  return [0, 1, 2, 3, 4].map(row => <tr key={row}>
    <td><Skeleton className="skeleton-stat" /></td>
    <td><Skeleton className="job-search-skeleton-state" /></td>
    <td><Skeleton className="job-search-skeleton-preview" /></td>
    <td><div className="d-flex justify-content-end gap-1">
      <Skeleton className="skeleton-button job-search-payload-toggle" />
      <Skeleton className="skeleton-button skeleton-actions" />
      <Skeleton className="skeleton-button skeleton-actions" />
    </div></td>
  </tr>);
}

export function SearchResults({ server, tube, query, results, settings, onAction, onCopy, next, retry }) {
  const heading = useRef(null);
  const [openPayload, setOpenPayload] = useState(null);
  const { data, error } = results;
  const loading = !data && !error;
  return <section id="searchResult" className="card border-0 shadow-sm mt-4" aria-labelledby="job-search-heading">
    <div className="card-body">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="text-break">
          <h2 id="job-search-heading" className="h5 mb-1" ref={heading} tabIndex={-1}>Search results</h2>
          <p className="text-body-secondary small mb-0">
            <strong>“{query}”</strong> in <strong>{tube}</strong>
            <span role="status">{loading ? ' · Searching…' : !error && <>
              {' · '}{data.jobs.length.toLocaleString()} {data.jobs.length === 1 ? 'match' : 'matches'}
              {' · '}{data.scanned.toLocaleString()} IDs scanned
            </>}</span>
          </p>
        </div>
        <a className={neutral} href={locationFor(server, tube)}><Icon name="back" /> Back to tube</a>
      </div>
      {error && <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="text-danger-emphasis" role="alert">Search failed. {error}</div>
        <button type="button" className={neutral} onClick={retry}>Retry search</button>
      </div>}
      {(loading || (!error && data?.jobs.length > 0)) && <div className="table-responsive job-search-table border rounded">
        <table className="table table-hover align-middle mb-0" aria-label="Matching jobs" aria-busy={loading}>
          <thead><tr><th scope="col" className="job-search-id">Job ID</th><th scope="col" className="job-search-state-column">State</th><th scope="col">Payload preview</th><th scope="col" className="job-search-actions-column text-end">Actions</th></tr></thead>
          {loading ? <tbody aria-hidden="true"><SearchSkeletonRows /></tbody> : <tbody>{data.jobs.map(job => {
            const expanded = Boolean(job.payload && openPayload?.id === job.id && openPayload.url === results.url);
            const panelId = 'search-job-payload-' + job.id;
            const toggleLabel = expanded ? 'Hide payload' : 'View payload';
            return <Fragment key={job.id}>
              <tr>
                <th scope="row" className="font-monospace fw-normal text-break">{job.id}</th>
                <td><span className={'job-search-state job-state-' + job.stats.state}>{nameOf(job.stats.state)}</span></td>
                <td><SearchPayloadPreview job={job} query={query} /></td>
                <td><div className="d-flex justify-content-end align-items-center gap-1">
                  {job.payload != null && <button type="button" className={neutral + ' console-icon-button'} title="Copy payload to clipboard"
                    aria-label={'Copy payload for job #' + job.id} onClick={() => onCopy(job.payload)}><Icon name="copy" /></button>}
                  {job.payload && <button type="button" className={neutral + ' job-search-payload-toggle text-nowrap'}
                    aria-label={toggleLabel + ' for job #' + job.id} aria-expanded={expanded} aria-controls={expanded ? panelId : undefined}
                    onClick={() => setOpenPayload(expanded ? null : { id: job.id, url: results.url })}>
                    <Icon name="caretDown" /> {toggleLabel}
                  </button>}
                  <Menu button={neutral + ' console-icon-button'} title={'Actions for job #' + job.id} label={<Icon name="more" />} end>
                    {job.encoding === 'utf8' && <Item onClick={() => onAction({ type: 'sample', job, data: { tubes: [tube] } })}><Icon name="add" /> Add to samples</Item>}
                    <Item onClick={() => onAction({ type: 'deleteJob', job })}><Icon name="trashSimple" weight="regular" /> Delete</Item>
                    {job.stats.state !== 'ready' && <Item onClick={() => onAction({ type: 'kickJob', job })}><Icon name="fastForward" weight="fill" /> Kick</Item>}
                  </Menu>
                </div></td>
              </tr>
              {expanded && <tr className="job-search-payload-row">
                <td colSpan={4}>
                  <div className="job-search-payload-panel" id={panelId}>
                    <div className="text-body-secondary fw-semibold">Payload · <span className="font-monospace">#{job.id}</span></div>
                    <FullPayload job={job} settings={settings} />
                  </div>
                </td>
              </tr>}
            </Fragment>;
          })}</tbody>}
        </table>
      </div>}
      {!error && data?.jobs.length === 0 && <div className="console-inset rounded py-4 px-3 text-center">
        <span className="fs-4 text-body-secondary"><Icon name="search" /></span>
        <p className="fw-semibold mt-2 mb-1">No matching jobs in this range</p>
        <p className="small text-body-secondary mb-0">{data.nextId ? 'Try another search term or scan the next range.' : 'Try another search term.'}</p>
      </div>}
      {!error && data?.nextId && <div className="d-flex justify-content-end mt-3">
        <button type="button" className={success} onClick={() => {
          next(data.nextId);
          heading.current?.focus();
        }}>Scan next range <Icon name="fastForward" weight="fill" /></button>
      </div>}
    </div>
  </section>;
}
