import { useRef, useState } from 'react';
import { Alert, nameOf, neutral, states, success } from '../../components/console-ui.jsx';
import { ColumnFilter } from '../../components/column-filter.jsx';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/dialog.jsx';
import { Icon } from '../../components/icon.jsx';
import { DestinationPicker, serverPickerOption } from '../../components/navigation-picker.jsx';
import { PayloadEditor } from '../../components/payload.jsx';
import { sampleDestinations } from '../../lib/sample-destinations.js';

const defaults = { pause: -1, searchLimit: 25, json: true, base64: false, highlight: true };
export { defaults as defaultSettings };

export function CopyPayloadDialog({ payload, close, returnFocus }) {
  const field = useRef(null);
  function selectPayload() {
    field.current.focus({ preventScroll: true });
    field.current.select();
  }

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent dismissible returnFocus={returnFocus}>
      <div className="console-dialog-form">
        <DialogHeader><DialogTitle>Copy job data</DialogTitle></DialogHeader>
        <div className="console-dialog-body">
          <p>Automatic copy is unavailable. Select the data, then press <kbd>Ctrl+C</kbd> or <kbd>⌘C</kbd> to copy.</p>
          <textarea ref={field} aria-label="Job data" className="form-control font-monospace payload-editor-input"
            rows={8} readOnly spellCheck={false} value={payload} />
        </div>
        <DialogFooter>
          <DialogClose asChild><button type="button" className={neutral}>Close</button></DialogClose>
          <button type="button" className={success} onClick={selectPayload}>Select all</button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>;
}

function titleFor(action) {
  if (action.fromTubeList) {
    if (action.action === 'clear') return 'Clear jobs';
    if (action.action === 'kick') return 'Kick jobs';
    return nameOf(action.action) + (action.tubes.length === 1 ? ' tube' : ' tubes');
  }
  switch (action.type) {
    case 'add': return 'Add new job';
    case 'server': return action.server ? 'Edit Server' : 'Add Server';
    case 'loadSample': return action.pickDestination ? 'Send sample' : 'Kick sample job';
    case 'sample': return 'Add to samples';
    case 'columns': return 'Filter columns';
    case 'settings': return 'Advanced settings';
    case 'removeServer': return 'Remove server';
    case 'deleteSample': return 'Delete sample';
    case 'deleteJob': return 'Delete job';
    case 'kickJob': return 'Kick job';
    default:
      if (action.action === 'move') return 'Move all ' + action.state + ' jobs';
      if (action.action === 'clear') return action.state === 'all' ? 'Clear jobs' : 'Delete all ' + action.state + ' jobs';
      return nameOf(action.action) + (action.tubes.length > 1 ? ' selected tubes' : ' tube');
  }
}

function Field({ label, name, hint, fieldClassName = 'mb-3', ...props }) {
  const id = 'field-' + name;
  return <div className={fieldClassName}>
    <label className="form-label" htmlFor={id}>{label}</label>
    <input id={id} name={name} className="form-control form-control-sm focused" aria-describedby={hint ? id + '-hint' : undefined} {...props} />
    {hint && <small className="console-field-hint" id={id + '-hint'}>{hint}</small>}
  </div>;
}

function JobNumberField({ label, name, placeholder }) {
  const [value, setValue] = useState('');
  return <Field label={label} name={name} placeholder={placeholder} fieldClassName="" inputMode="numeric" pattern="[0-9]+" value={value}
    onChange={event => {
      const next = event.currentTarget.value;
      if (/^[0-9]*$/.test(next)) setValue(next);
    }} />;
}

function AddJobFields({ action }) {
  return <div className="console-preference-form">
    <Field label="Tube name" name="tubeName" defaultValue={action.tube || 'default'} fieldClassName=""
      autoCapitalize="none" spellCheck={false} maxLength="200" required />
    <fieldset className="console-job-options">
      <legend>Job options <small className="text-body-secondary fw-normal">(optional)</small></legend>
      <div className="add-job-options d-grid gap-2">
        <JobNumberField label="Priority" name="tubePriority" placeholder="1024" />
        <JobNumberField label="Delay (sec)" name="tubeDelay" placeholder="0" />
        <JobNumberField label="TTR (sec)" name="tubeTtr" placeholder="60" />
      </div>
      <small className="console-field-hint">Leave fields blank to use the shown defaults.</small>
    </fieldset>
    <PayloadEditor id="field-tubeData" name="tubeData" label="Job data" rows={10} defaultValue={action.payload} required />
  </div>;
}

function JobSource({ tube }) {
  return <div className="console-job-source">
    <span>Source tube</span><strong>{tube}</strong>
  </div>;
}

function MoveJobFields({ action, tubes, mode, setMode }) {
  const available = tubes.filter(item => !action.tubes.includes(item.name));
  const choices = [
    { value: 'new', label: 'New tube' },
    { value: 'existing', label: 'Existing tube', disabled: !available.length },
    ...(action.state === 'ready' ? [{ value: '$buried', label: 'Bury here' }] : []),
  ];

  return <div className="console-preference-form">
    <JobSource tube={action.tubes[0]} />
    <fieldset className="console-job-destination">
      <legend>Destination</legend>
      <div className="console-job-destination-options">
        {choices.map(({ value, label, disabled }) => <label key={value} className="console-job-destination-choice">
          <input type="radio" className="form-check-input" name="destinationMode" value={value} disabled={disabled}
            checked={mode === value} onChange={() => setMode(value)} />
          {label}
        </label>)}
      </div>
    </fieldset>
    {mode === 'new' ? <Field label="New tube name" name="destTube" fieldClassName="" maxLength="200"
      placeholder="e.g. retry-jobs" autoCapitalize="none" spellCheck={false} required />
      : mode === 'existing' ? <DestinationPicker name="destTube" label="Destination tube" icon="tube"
        options={available.map(({ name }) => ({ id: name, label: name }))} />
        : <p className="small text-body-secondary mb-0">Jobs stay in this tube and change to the buried state.</p>}
  </div>;
}

function ClearJobFields({ action }) {
  return <div className="console-preference-form">
    <JobSource tube={action.tubes[0]} />
    <Field type="number" name="clearCount" label="Maximum jobs to delete" defaultValue={action.clearCount}
      fieldClassName="" min="1" max={Number.MAX_SAFE_INTEGER} step="1" required />
    <p className="console-job-delete-note mb-0"><Icon name="warning" weight="regular" />
      <span>Deletion is permanent. New jobs may be included, but they do not raise this limit.</span></p>
  </div>;
}

const tubeActionIcons = { clear: 'trashSimple', kick: 'fastForward', pause: 'pause', resume: 'play' };

const tubeActionDescriptions = {
  clear: 'Permanently delete ready, delayed, and buried jobs.',
  kick: 'Make buried jobs ready for workers to reserve.',
  pause: 'Temporarily stop workers from reserving jobs.',
  resume: 'Allow workers to reserve jobs again.',
};

function TubeListActionSummary({ action }) {
  const { action: operation, tubes, options } = action;
  const pause = operation === 'pause';
  const duration = pause && (options.seconds === 3600 ? '1 hour' :
    new Intl.NumberFormat('en', { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(options.seconds));

  return <div className="console-preference-form">
    <p className="small text-body-secondary mb-0">{tubeActionDescriptions[operation]}</p>
    {pause && <dl className="console-tube-action-detail">
      <dt>Pause duration</dt>
      <dd>{duration}</dd>
    </dl>}
    <section aria-labelledby="selected-tubes-heading">
      <h6 id="selected-tubes-heading" className="console-tube-action-heading">
        {tubes.length} {tubes.length === 1 ? 'tube' : 'tubes'} selected
      </h6>
      <ul className="console-tube-action-list" tabIndex={0}>
        {tubes.map(tube => <li key={tube}><Icon name="tube" weight="regular" /><span>{tube}</span></li>)}
      </ul>
    </section>
  </div>;
}

const clearScopes = ['all', ...states];
const clearScopeLabel = scope => scope === 'all' ? 'All 3 states' : nameOf(scope);

function TubeJobLimits({ action, limits, counts, changeCount, scope, changeScope }) {
  const clearing = Boolean(action.limitsByState);
  return <div className="console-preference-form">
    {clearing && <fieldset className="console-clear-scope">
      <legend>Delete from</legend>
      <div className="theme-options console-clear-scope-options">
        {clearScopes.map(state => <label key={state}>
          <input type="radio" className="btn-check" name="clearState" value={state} checked={scope === state}
            onChange={() => changeScope(state)} />
          <span>{clearScopeLabel(state)}</span>
        </label>)}
      </div>
    </fieldset>}
    <p className={clearing ? 'console-job-delete-note mb-0' : 'small text-body-secondary mb-0'}>
      {clearing ? <>
        <Icon name="warning" weight="regular" />
        <span><strong>Permanently delete</strong> {scope === 'all' ? 'ready, delayed, and buried' : scope} jobs.</span>
      </> : <span>{tubeActionDescriptions[action.action]}</span>}
    </p>
    <section aria-labelledby="selected-tube-limits">
      <div className="console-tube-limit-heading">
        <h6 id="selected-tube-limits" className="console-tube-action-heading mb-0">
          {action.tubes.length} {action.tubes.length === 1 ? 'tube' : 'tubes'} selected
        </h6>
        {clearing && <span className="small text-body-secondary">Limit per tube</span>}
      </div>
      {!clearing && <p className="small text-body-secondary mb-2">Limits use the job count when each tube was selected.</p>}
      <ul className="console-tube-action-list console-tube-limit-list">
        {action.tubes.map((tube, index) => {
          const id = 'jobLimit-' + index;
          const max = limits[index];
          return <li key={tube}>
            <div>
              <label htmlFor={id}>{tube}</label>
              <div id={id + '-max'} className="text-body-secondary">{clearing && max === 0
                ? `No ${scope === 'all' ? 'eligible' : scope} jobs at selection`
                : `Max. ${max.toLocaleString()} jobs`}</div>
            </div>
            <input id={id} name={id} className="form-control form-control-sm" type="number" inputMode="numeric"
              aria-label={'Job limit for ' + tube} aria-describedby={id + '-max'} min={0} max={max} step={1} required
              readOnly={max === 0} value={counts[index]}
              onChange={event => changeCount(index, event.target.value)} />
          </li>;
        })}
      </ul>
    </section>
    <p className="small text-body-secondary mb-0">{clearing && 'Limits use counts from when the tubes were selected. '}Enter 0 to skip a tube.</p>
  </div>;
}

function SaveSampleFields({ action, tubes }) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(() => new Set(action.data.tubes));
  const state = action.job.stats?.state;
  const query = filter.trim().toLowerCase();
  const available = [...new Set([...action.data.tubes, ...tubes.map(({ name }) => name)])];
  const visible = available.filter(name => name.toLowerCase().includes(query));

  function toggle(name, checked) {
    setSelected(previous => {
      const next = new Set(previous);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  return <div className="console-preference-form">
    <div className="console-job-source">
      <span>Source job</span><strong className="font-monospace">#{action.job.id}</strong>
      {state && <strong className={'job-state-' + state}>{nameOf(state)}</strong>}
    </div>
    <Field label="Sample name" name="addsamplename" defaultValue={action.data.name} fieldClassName=""
      placeholder="e.g. Retry notification" autoComplete="off" maxLength="200" required />
    <fieldset className="console-save-sample-tubes">
      <legend>Available on tubes</legend>
      <div className="sample-filter">
        <Icon name="search" />
        <input type="search" className="form-control form-control-sm" aria-label="Filter tubes" placeholder="Filter tubes"
          value={filter} onChange={event => setFilter(event.target.value)} />
      </div>
      <div className="sample-tube-list" role="group" aria-label="Available tubes">
        {visible.length ? visible.map(name => <label className="sample-tube-option" key={name}>
          <input type="checkbox" className="form-check-input" checked={selected.has(name)}
            onChange={event => toggle(name, event.target.checked)} />
          <span>{name}</span>
        </label>) : <p className="sample-tube-message">No matching tubes</p>}
      </div>
      <small className="text-body-secondary" role="status">
        {selected.size ? `${selected.size} selected` : 'Uses the default tube if none are selected.'}
      </small>
      {[...selected].map(name => <input type="hidden" name="tubes[]" value={name} key={name} />)}
    </fieldset>
  </div>;
}

function ServerFields({ server }) {
  return <div className="console-preference-form">
    <div className="console-server-address">
      <Field name="host" label="Host" defaultValue={server?.host ?? ''} placeholder="Hostname or IP address"
        fieldClassName="" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength="253" required />
      <Field name="port" label="Port" defaultValue={server?.port ?? 11300} fieldClassName=""
        type="number" min="1" max="65535" required />
    </div>
    <Field name="label" label={<>Display name <small className="text-body-secondary fw-normal">(optional)</small></>}
      defaultValue={server && server.label !== server.endpoint ? server.label : ''} placeholder="e.g. Production queue"
      hint="The server address is shown if you leave this blank." fieldClassName="" maxLength="100" />
  </div>;
}

function DestinationField({ name, label, options }) {
  return <div>
    {options.length === 1 ? <>
      <span className="form-label d-block">{label}</span>
      <div className="sample-send-fixed">{options[0].label}</div>
      <input type="hidden" name={name} value={options[0].value} />
    </> : <>
      <label className="form-label" htmlFor={name}>{label}</label>
      <select className="form-select form-select-sm" id={name} name={name} defaultValue="" required>
        <option value="" disabled>Choose a {label.toLowerCase()}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </>}
  </div>;
}

function SampleSendFields({ sample, servers }) {
  return <div className="console-preference-form">
    <p className="text-break mb-0">Create a job from <strong>{sample.name}</strong>.</p>
    <DestinationPicker name="sendServer" label="Server" icon="server" options={servers.map(serverPickerOption)} />
    <DestinationField name="sendTube" label="Tube" options={sampleDestinations(sample).map(tube => ({ value: tube, label: tube }))} />
  </div>;
}

function SettingsSwitch({ name, checked, children }) {
  return <label className="console-settings-switch form-switch">
    <span>{children}</span>
    <input type="checkbox" role="switch" className="form-check-input" name={name} defaultChecked={checked} />
  </label>;
}

function Settings({ settings }) {
  return <div className="console-preference-form">
    <fieldset className="console-settings-section">
      <legend>Queue and search</legend>
      <div className="console-settings-grid">
        <Field name="tubePauseSeconds" label="Tube pause (sec)" defaultValue={settings.pause}
          fieldClassName="" type="number" min="-1" max="4294967295" aria-describedby="pause-value-hint" required />
        <Field name="searchResultLimit" label="Search result limit" defaultValue={settings.searchLimit}
          fieldClassName="" type="number" min="1" max="100" required />
      </div>
      <p className="console-field-hint mb-0" id="pause-value-hint">A pause of −1 or 0 uses 1 hour. Use Resume to unpause.</p>
    </fieldset>
    <fieldset className="console-settings-section">
      <legend>Job data display</legend>
      <div className="console-settings-switches">
        <SettingsSwitch name="json" checked={settings.json}>Decode JSON</SettingsSwitch>
        <SettingsSwitch name="base64" checked={settings.base64}>Decode Base64</SettingsSwitch>
        <SettingsSwitch name="highlight" checked={settings.highlight}>Syntax highlighting</SettingsSwitch>
      </div>
    </fieldset>
  </div>;
}

export function ActionDialog({ action, close, submit, settings, servers, tubes, busy, error, returnFocus }) {
  const [move, setMove] = useState('new');
  const [scope, changeScope] = useState('all');
  const [drafts, setDrafts] = useState({});
  const clearing = Boolean(action.limitsByState);
  const limits = action.limitsByState?.[scope] ?? action.limits;
  const counts = drafts[scope] ?? limits?.map(String);
  const validCounts = counts?.every((value, index) => value !== '' && Number.isSafeInteger(Number(value)) &&
    Number(value) >= 0 && Number(value) <= limits[index]);
  const total = validCounts ? counts.reduce((sum, count) => sum + BigInt(Number(count)), 0n) : null;
  const activeTubes = validCounts ? counts.filter(count => Number(count) > 0).length : 0;
  function changeCount(index, value) {
    setDrafts(previous => ({ ...previous, [scope]: (previous[scope] ?? limits.map(String))
      .map((count, item) => item === index ? value : count) }));
  }
  const title = titleFor(action);
  const variant = action.pickDestination ? 'send' : action.clearCount !== undefined ? 'clear'
    : action.action === 'move' ? 'move' : action.fromTubeList ? 'tube-action' : action.type;
  const preferenceIcon = action.fromTubeList ? tubeActionIcons[action.action]
    : { server: 'server', settings: 'advancedSettings', columns: 'listChecks', send: 'play', add: 'addCircle', move: 'release', clear: 'trashSimple', sample: 'listChecks' }[variant];
  const preferenceAction = {
    server: action.server ? 'Save changes' : 'Add server', settings: 'Save settings', columns: 'Apply columns',
    send: 'Send job', add: 'Add job', move: move === '$buried' ? 'Bury jobs' : 'Move jobs', clear: 'Delete jobs', sample: 'Save sample',
  }[variant];
  const destructive = action.type.startsWith('delete') || action.type === 'removeServer' || action.action === 'clear';
  const primary = clearing
    ? (total !== null && total > 0n ? `Delete up to ${total.toLocaleString()} ${total === 1n ? 'job' : 'jobs'}` : 'Delete jobs')
    : preferenceAction ?? title;
  return <Dialog open onOpenChange={open => { if (!open && !busy) close(); }}>
    <DialogContent dismissible={!busy} returnFocus={returnFocus}
      className={preferenceIcon
        ? `console-preference-dialog console-preference-dialog-${variant}${destructive ? ' console-preference-dialog-danger' : ''}` : ''}>
      <form className="console-dialog-form" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
        <DialogHeader>
          {preferenceIcon ? <div className="console-preference-heading">
            <span className="console-preference-icon"><Icon name={preferenceIcon} weight="regular" /></span>
            <DialogTitle>{title}</DialogTitle>
          </div> : <DialogTitle>{title}</DialogTitle>}
          <DialogClose asChild>
            <button type="button" className="btn-close" aria-label="Close dialog" disabled={busy} />
          </DialogClose>
        </DialogHeader>
        <div className="console-dialog-body"><fieldset disabled={busy}>
          {action.type === 'add' && <AddJobFields action={action} />}
          {action.type === 'server' && <ServerFields server={action.server} />}
          {action.type === 'loadSample' && (action.pickDestination
            ? <SampleSendFields sample={action.sample} servers={servers} />
            : <p>Place <strong>{action.sample.name}</strong> on <strong>{action.tube}</strong>?</p>)}
          {action.type === 'sample' && <SaveSampleFields action={action} tubes={tubes} />}
          {action.type === 'columns' && <ColumnFilter fields={action.fields} visible={action.visible} tubeColumns={action.tubeColumns} />}
          {action.type === 'settings' && <Settings settings={settings} />}
          {action.type === 'bulk' && <>
            {limits ? <TubeJobLimits {...{ action, limits, counts, changeCount, scope, changeScope }} />
              : action.fromTubeList ? <TubeListActionSummary action={action} />
              : action.action === 'move' ? <MoveJobFields action={action} tubes={tubes} mode={move} setMode={setMove} />
              : action.clearCount !== undefined ? <ClearJobFields action={action} />
              : action.action === 'clear' && action.state === 'all'
              ? <p className="mb-0">Delete ready, delayed, and buried jobs from <strong className="text-break">{action.tubes.join(', ')}</strong>?</p>
              : <p className="mb-0">{title} on <strong>{action.tubes.join(', ')}</strong>?</p>}
          </>}
          {action.type === 'removeServer' && <p className="mb-0">Remove <strong>{action.server.label}</strong> from this browser’s server list?</p>}
          {action.type === 'deleteSample' && <p className="mb-0">Delete <strong>{action.sample.name}</strong>?</p>}
          {['deleteJob', 'kickJob'].includes(action.type) && <p className="mb-0">{title} <strong className="font-monospace">#{action.job.id}</strong>?</p>}
          {error && <Alert error message={error} />}
        </fieldset></div>
        <DialogFooter>
          {limits && <span className="console-tube-limit-total text-body-secondary" aria-live="polite">
            {total === null ? 'Enter valid job limits' : clearing
              ? (total === 0n ? 'No jobs to delete' : `${activeTubes} ${activeTubes === 1 ? 'tube' : 'tubes'} · ${clearScopeLabel(scope)}`)
              : <>Up to <strong className="text-body">{total.toLocaleString()}</strong> jobs</>}
          </span>}
          <DialogClose asChild>
            <button type="button" className={preferenceIcon ? neutral : 'btn btn-secondary btn-sm'} disabled={busy}>{preferenceIcon ? 'Cancel' : 'Close'}</button>
          </DialogClose>
          <button type="submit" className={destructive ? 'btn btn-danger btn-sm' : success}
            disabled={busy || (action.pickDestination && !servers.length) || Boolean(limits && (!validCounts || total === 0n))}>{busy ? (action.pickDestination ? 'Sending…' : 'Working…') : primary}</button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
