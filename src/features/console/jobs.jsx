import { useRef, useState } from 'react';
import { useResource } from '../../lib/api.js';
import { actionLocation, ActionLink, Alert, Divider, empty, Item, locationFor, Menu, nameOf, neutral, queueURL, Skeleton, states, success, textLink } from '../../components/console-ui.jsx';
import { Icon } from '../../components/icon.jsx';
import { FullPayload, PayloadEditor, PayloadViewer } from '../../components/payload.jsx';

export function BulkControls({ selected, allTubes, visibleTubes, run }) {
  const [count, setCount] = useState(1);
  if (!selected.length) return null;
  const disabled = selected.length > 50;
  const hidden = selected.filter(name => !visibleTubes.some(item => item.name === name)).length;
  const kick = value => run('kick', selected, { state: 'buried', limit: value });
  return <div id="tubeBulkActions" className="tube-bulk-actions" aria-live="polite">
    <div className="tube-bulk-info"><strong>{selected.length} {selected.length === 1 ? 'tube' : 'tubes'} selected{hidden > 0 && ' (' + hidden + ' hidden by filter)'}</strong>{disabled && ' · select up to 50'}</div>
    <div className="tube-bulk-controls">
      <div className="tube-bulk-action-group" role="group" aria-label="Kick buried jobs">
        <button type="button" className={neutral} disabled={disabled} onClick={() => kick(1)}><Icon name="fastForward" weight="fill" /> Kick 1 job</button>
        <form className="input-group input-group-sm tube-kick-more" onSubmit={event => { event.preventDefault(); kick(count); }}>
          <button type="submit" className={neutral} disabled={disabled}><Icon name="skipForward" weight="fill" /> Kick more</button>
          <input type="number" className="form-control console-inset" min="1" max="1000" required value={count}
            aria-label="Number of jobs to kick per tube" onChange={event => setCount(event.target.valueAsNumber || '')} />
        </form>
        <button type="button" className={neutral} disabled={disabled || !allTubes.some(tube => selected.includes(tube.name) && tube['current-jobs-buried'] > 0)}
          onClick={() => kick(1000)}><Icon name="fastForward" weight="fill" /> Kick all jobs</button>
      </div>
      <div className="tube-bulk-action-group tube-bulk-pause-group" role="group" aria-label="Pause controls">
        <button type="button" className={neutral} disabled={disabled} onClick={() => run('pause', selected)}><Icon name="pause" weight="fill" /> Pause</button>
        <button type="button" className={neutral} disabled={disabled} onClick={() => run('resume', selected)}><Icon name="play" weight="fill" /> Resume</button>
      </div>
      <button type="button" className={neutral + ' console-danger-action'} disabled={disabled}
        onClick={() => run('clear', selected, { state: 'all' })}>
        <Icon name="trashSimple" /> Clear jobs
      </button>
    </div>
  </div>;
}

function duration(value) {
  let seconds = Math.max(0, Number(value) || 0);
  const units = [];
  for (const [unit, size] of [['days', 86400], ['hours', 3600], ['minutes', 60], ['seconds', 1]]) {
    const count = Math.floor(seconds / size);
    if (count) units.push(count + ' ' + unit);
    seconds %= size;
  }
  return units.join(' ') || '0';
}

const jobFields = [
  ['id', 'ID', 'key'], ['pri', 'Priority', 'priority'], ['ttr', 'TTR', 'history'],
  ['file', 'File', 'file'], ['reserves', 'Reserves', 'restart'], ['timeouts', 'Timeouts', 'pulse'],
  ['releases', 'Releases', 'release'], ['buries', 'Buries', 'flame'], ['kicks', 'Kicks', 'fastForward'],
];
const timeFields = [['age', 'clock'], ['delay', 'timer'], ['time-left', 'compass']];

function sampleLink(server, tube, sample, redirect = false) {
  const url = new URL(locationFor(server, tube, 'loadSample'), location.href);
  url.searchParams.set('key', sample.id);
  if (redirect) url.searchParams.set('redirect', './?action=manageSamples');
  return url.pathname + url.search;
}

function JobCard({ state, job, server, tube, onAction, onCopy, settings }) {
  return <div className="col-12 col-sm-4"><div className="card bg-body border-0 shadow-sm"><div className="card-body">
    <a id={'current-jobs-' + state} />
    <div className="text-start">
      <h5 className="mb-2 fw-bold d-inline">Next job in <span className={'job-state-' + state}>{state}</span> state</h5>
      {job && <Menu className="dropdown float-end" button="btn btn-default btn-sm border-0 console-icon-button" title={'More ' + state + ' job actions'} label={<Icon name="more" className="fs-5" />} end>
        <Item onClick={() => onAction({ type: 'bulk', action: 'clear', state, tubes: [tube] })}>Delete all {state} jobs</Item>
        <Item onClick={() => onAction({ type: 'bulk', action: 'move', state, tubes: [tube] })}>Move all {state} to ..</Item>
        {state !== 'ready' && <Item onClick={() => onAction({ type: 'kickJob', job })}>Kick this job</Item>}
      </Menu>}
      <hr />
    </div>
    <div className="clearfix" />
    {!job ? <div className="row"><div className="col text-center">
      <img src={empty} className="img-fluid pt-2 opacity-25" alt="" width="200" /><h6 className="text-body-tertiary m-0 pb-3">Empty</h6>
    </div></div> : <div className="row show-grid">
      <div className="col-sm-12">
        <div className="row g-2">{jobFields.map(([key, name, icon]) => <div key={key} className="col-md-4 col-6">
          <small className="text-body-tertiary fs-11px fw-semibold"><small><Icon name={icon} /> {name}</small></small>
          <p className={'mb-0 fs-13px item text-body' + (key === 'id' ? ' font-monospace' : '')}>{key === 'id' ? job.id : job.stats[key]}</p>
        </div>)}</div>
        <div className="row g-2 mt-1">{timeFields.map(([key, icon]) => <div key={key} className="col-md-4 col-12">
          <small className="text-body-tertiary fs-11px fw-semibold"><small><Icon name={icon} /> {nameOf(key)}</small></small>
          <p className="mb-0 fs-13px item text-body" style={{ lineHeight: 1.5, minHeight: 39 }}>{duration(job.stats[key])}</p>
        </div>)}</div>
      </div>
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
      {states.map(state => <div className="col-12 col-sm-4" key={state}>
        <div className="card bg-body border-0 shadow-sm"><div className="card-body">
          <Skeleton className="skeleton-title" /><hr />
          <div className="row g-3">
            {jobFields.map(([key]) => <div className="col-md-4 col-6" key={key}>
              <Skeleton className="skeleton-name d-block mb-2" />
              <Skeleton className="skeleton-stat d-block" />
            </div>)}
          </div>
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
        <div className="col-md-2 col-12"><ActionLink className={neutral + ' w-100'} href={actionLocation(server, tube, 'kick', { count: 1 })} onAction={() => kick(1)}><Icon name="fastForward" weight="fill" /> Kick 1 job</ActionLink></div>
        <div className="col-md-2 col-12"><form onSubmit={event => { event.preventDefault(); kick(count); }}><div className="input-group input-group-sm">
          <button type="submit" className={neutral + ' col-7'}><Icon name="skipForward" weight="fill" /> Kick more</button>
          <input type="number" value={count} min="1" max="1000" required className="form-control form-control-sm console-inset kick_jobs_no col-5"
            aria-label="Number of jobs to kick" onChange={event => setCount(event.target.valueAsNumber || '')} />
        </div></form></div>
        <div className="col-md-2 col-12"><ActionLink className={neutral + ' w-100'} href={actionLocation(server, tube, 'kick', { count: Math.min(buried, 1000) })}
          onAction={() => buried > 0 && kick(Math.min(buried, 1000), 'buried')}><Icon name="fastForward" weight="fill" /> Kick all jobs</ActionLink></div>
        <div className="col-md-2 col-12 text-start"><ActionLink className={neutral + ' w-100'} title={paused ? 'Pause seconds left: ' + detail.stats['pause-time-left'] : 'Temporarily prevent jobs being reserved from the given tube'}
          href={actionLocation(server, tube, 'pause', { count: paused ? 0 : -1 })} onAction={() => run(paused ? 'resume' : 'pause', [tube])}><Icon name={paused ? 'play' : 'pause'} weight="fill" /> {paused ? 'Unpause tube' : 'Pause tube'}</ActionLink></div>
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
      {states.map(state => <JobCard key={state} {...{ state, job: detail.jobs[state], server, tube, onAction, onCopy, settings }} />)}
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

export function Samples({ resource, servers }) {
  const [filter, setFilter] = useState('');
  const samples = resource.data || [];
  const query = filter.trim().toLowerCase();
  const visible = samples.filter(sample => {
    const destinations = sample.tubes.length ? sample.tubes : ['default'];
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
      {visible.length > 0 && <div className="table-responsive"><table className="table table-striped align-middle mb-0 sample-table" aria-label="Saved job samples">
        <thead><tr>
          <th scope="col" className="sample-name-column">Name</th>
          <th scope="col">Send to tube</th>
          <th scope="col" className="text-end">Actions</th>
        </tr></thead>
        <tbody>{visible.map(sample => <tr key={sample.id}>
          <td><a className={textLink + ' fw-semibold sample-name'} href={sampleEditorLink(sample)}>{sample.name}</a></td>
          <td>
            <div className="d-flex flex-wrap gap-1">
              {(sample.tubes.length ? sample.tubes : ['default']).map(tube => servers.length === 1
                ? <a className={neutral + ' sample-destination'} key={tube} href={sampleLink(servers[0], tube, sample, true)}><Icon name="play" /> {tube}</a>
                : servers.length > 1
                  ? <Menu key={tube} button={neutral + ' dropdown-toggle sample-destination'} title={'Select server for ' + tube}
                    label={<><Icon name="play" /> {tube}</>} scroll>
                    {servers.map(server => <Item key={server.id} href={sampleLink(server, tube, sample, true)}>{server.label}</Item>)}
                  </Menu>
                  : <button type="button" key={tube} className={neutral + ' sample-destination'} disabled>{tube}</button>)}
            </div>
          </td>
          <td className="text-end text-nowrap"><div className="d-inline-flex gap-1">
            <a className={neutral} href={sampleEditorLink(sample)} aria-label={'Edit ' + sample.name}><Icon name="edit" weight="regular" /> Edit</a>
            <a className="btn btn-sm console-neutral console-danger-action" href={sampleEditorLink(sample, 'deleteSample')}
              aria-label={'Delete ' + sample.name}><Icon name="trashSimple" weight="regular" /> Delete</a>
          </div></td>
        </tr>)}</tbody>
      </table></div>}
    </div></div>}
  </section>;
}

function AvailableSampleTubes({ server, checked, toggle, query, initiallyOpen }) {
  const resource = useResource(queueURL(server, 'overview'), 0);
  const tubes = [...(resource.data?.tubes || [])]
    .filter(({ name }) => name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <details className="sample-server" open={initiallyOpen}>
    <summary>
      <span className="fw-semibold">{server.label}</span>
      {server.label !== server.endpoint && <small className="d-block text-body-secondary">{server.endpoint}</small>}
    </summary>
    <div className="sample-server-tubes">
      {resource.error ? <p className="small text-danger-emphasis mb-0" role="alert">{resource.error}</p>
        : !resource.data ? <p className="small text-body-secondary mb-0" role="status">Loading tubes…</p>
        : tubes.length ? tubes.map(({ name }) => <label className="sample-tube-option" key={name}>
          <input type="checkbox" className="form-check-input" name={'tubes[' + name + ']'} value="1"
            checked={checked.includes(name)} onChange={event => toggle(name, event.target.checked)} />
          <span>{name}</span>
        </label>) : <p className="small text-body-secondary mb-0">{query ? 'No matching tubes' : 'No tubes available'}</p>}
    </div>
  </details>;
}

export function SampleEditor({ sample, servers, save, busy, error }) {
  const [checked, setChecked] = useState(sample?.tubes || []);
  const [filter, setFilter] = useState('');
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
        <div className="card-body sample-editor-layout">
          <div>
            <label className="form-label fw-semibold" htmlFor="addsamplename">Sample name</label>
            <input id="addsamplename" className="form-control" name="name" defaultValue={sample?.name}
              placeholder="e.g. Notification replay" autoComplete="off" required maxLength="200" />
            <div className="mt-3">
              <PayloadEditor id="jobdata" name="jobdata" label="Job payload" rows={12} defaultValue={sample?.data} />
            </div>
          </div>
          <div className="sample-editor-tubes">
            <h2 className="h6 mb-1">Available on tubes</h2>
            <p className="small text-body-secondary mb-3">
              {checked.length ? checked.length + (checked.length === 1 ? ' tube selected' : ' tubes selected') : 'Uses the default tube if you leave this empty.'}
            </p>
            {checked.length > 0 && <ul className="d-flex flex-wrap gap-1 list-unstyled mb-3">
              {checked.map(name => <li key={name}>
                <button type="button" className={neutral + ' sample-destination'} onClick={() => toggle(name, false)}
                  aria-label={'Remove tube ' + name}>{name} <Icon name="close" /></button>
              </li>)}
            </ul>}
            {servers.length > 0 ? <>
              <SampleFilter label="Filter tubes" value={filter} onChange={setFilter} />
              <div className="d-grid gap-2 mt-3">
                {servers.map((server, index) => <AvailableSampleTubes key={server.id} {...{ server, checked, toggle }}
                  query={filter.trim().toLowerCase()} initiallyOpen={index === 0} />)}
              </div>
            </> : <p className="small text-body-secondary mb-0">Add a server to browse its tubes.</p>}
          </div>
        </div>
        <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
          <a className={neutral} href={listLink}>Cancel</a>
          <button type="submit" className={success}>{busy ? 'Saving…' : sample ? 'Save changes' : 'Create sample'}</button>
        </div>
      </fieldset>
    </form>
  </section>;
}

function SearchPayload({ job, query, settings }) {
  const [expanded, setExpanded] = useState(false);
  const { payload, encoding } = job;
  const previewLength = 240;
  const match = encoding === 'utf8' ? payload.indexOf(query) : -1;
  const start = Math.max(0, match - 60);
  const end = Math.min(payload.length, start + previewLength);
  const matchEnd = Math.min(match + query.length, end);
  return <>
    {encoding === 'base64' && <small className="d-block text-body-secondary mb-1">Base64</small>}
    <div className="job-search-preview font-monospace">
      {start > 0 && '…'}
      {match < 0 ? payload.slice(start, end) : <>
        {payload.slice(start, match)}<mark>{payload.slice(match, matchEnd)}</mark>{payload.slice(matchEnd, end)}
      </>}
      {end < payload.length && '…'}
    </div>
    {payload && <details className="job-search-payload mt-2" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>View full payload</summary>
      {expanded && <FullPayload job={job} settings={settings} />}
    </details>}
  </>;
}

export function SearchResults({ server, tube, query, results, settings, onAction, next, retry }) {
  const heading = useRef(null);
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
      {loading && <div className="console-inset rounded p-3" aria-hidden="true">
        <Skeleton className="skeleton-title" />
        <div className="mt-2"><Skeleton className="skeleton-name" /></div>
      </div>}
      {error && <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="text-danger-emphasis" role="alert">Search failed. {error}</div>
        <button type="button" className={neutral} onClick={retry}>Retry search</button>
      </div>}
      {!error && data?.jobs.length > 0 && <div className="table-responsive job-search-table border rounded">
        <table className="table align-middle mb-0" aria-label="Matching jobs">
          <thead><tr><th scope="col" className="text-nowrap">Job ID</th><th scope="col">State</th><th scope="col">Payload</th><th scope="col" className="text-center">Actions</th></tr></thead>
          <tbody>{data.jobs.map(job => <tr key={job.id}>
            <td className="font-monospace text-nowrap">{job.id}</td>
            <td><span className={'job-search-state job-state-' + job.stats.state}>{nameOf(job.stats.state)}</span></td>
            <td className="job-search-data"><SearchPayload job={job} query={query} settings={settings} /></td>
            <td className="text-center"><Menu button={neutral + ' console-icon-button'} title={'Actions for job #' + job.id} label={<Icon name="more" />} end>
              {job.encoding === 'utf8' && <Item onClick={() => onAction({ type: 'sample', job, data: { tubes: [tube] } })}><Icon name="add" /> Add to samples</Item>}
              <Item onClick={() => onAction({ type: 'deleteJob', job })}><Icon name="trashSimple" weight="regular" /> Delete</Item>
              {job.stats.state !== 'ready' && <Item onClick={() => onAction({ type: 'kickJob', job })}><Icon name="fastForward" weight="fill" /> Kick</Item>}
            </Menu></td>
          </tr>)}</tbody>
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
