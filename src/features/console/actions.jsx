import { useRef, useState } from 'react';
import { Alert, nameOf, neutral, success } from '../../components/console-ui.jsx';
import { ColumnFilter } from '../../components/column-filter.jsx';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/dialog.jsx';
import { PayloadEditor } from '../../components/payload.jsx';

const defaults = { pause: -1, interval: 500, auto: false, searchLimit: 25, json: true, unserialize: true, base64: false, highlight: true };
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
  switch (action.type) {
    case 'add': return 'Add new job';
    case 'server': return action.server ? 'Edit Server' : 'Add Server';
    case 'loadSample': return 'Kick sample job';
    case 'sample': return 'Add to samples';
    case 'columns': return 'Filter columns';
    case 'settings': return 'Settings';
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

function Field({ label, name, ...props }) {
  const id = 'field-' + name;
  return <div className="mb-3">
    <label className="form-label" htmlFor={id}>{label}</label>
    <input id={id} name={name} className="form-control form-control-sm focused" {...props} />
  </div>;
}

function JobNumberField({ label, name }) {
  const [value, setValue] = useState('');
  return <Field label={label} name={name} inputMode="numeric" pattern="[0-9]+" value={value}
    onChange={event => {
      const next = event.currentTarget.value;
      if (/^[0-9]*$/.test(next)) setValue(next);
    }} />;
}

function Checkbox({ name, checked, children, value }) {
  return <label className="form-check"><input type="checkbox" className="form-check-input" name={name} defaultChecked={checked} value={value} />{children}</label>;
}

function Settings({ settings }) {
  return <>
    <Field name="tubePauseSeconds" label={<><b>Tube pause seconds</b><small className="d-block text-body-tertiary">(-1 means the default: 3600, 0 is reserved for un-pause)</small></>} defaultValue={settings.pause} type="number" min="-1" max="4294967295" required />
    <Field name="autoRefreshTimeoutMs" label={<><b>Auto-refresh interval in milliseconds</b><small className="d-block text-body-tertiary">(Default: 500)</small></>} defaultValue={settings.interval} type="number" min="100" required />
    <Checkbox name="isEnabledAutoRefreshLoad" checked={settings.auto}>Auto-refresh on load</Checkbox>
    <div className="mt-3"><Field name="searchResultLimit" label={<><b>Search result limits</b><small className="d-block text-body-tertiary">(Default: 25)</small></>} defaultValue={settings.searchLimit} type="number" min="1" max="100" required /></div>
    <b>Preferred way to deal with job data</b>
    <Checkbox name="json" checked={settings.json}>Before display: json_decode()</Checkbox>
    <Checkbox name="unserialize" checked={settings.unserialize}>Before display: unserialize()</Checkbox>
    <Checkbox name="base64" checked={settings.base64}>Before display: base64_decode()</Checkbox>
    <Checkbox name="highlight" checked={settings.highlight}>After display: enable highlight</Checkbox>
  </>;
}

export function ActionDialog({ action, close, submit, settings, tubes, busy, error, returnFocus }) {
  const [move, setMove] = useState('new');
  const title = titleFor(action);
  const destructive = action.type.startsWith('delete') || action.type === 'removeServer' || action.action === 'clear';
  const primary = action.clearCount !== undefined ? 'Delete jobs' : action.type === 'add' ? 'Save changes'
    : ['sample', 'columns', 'settings', 'server'].includes(action.type) ? 'Save' : action.action === 'move' ? 'Move' : title;
  return <Dialog open onOpenChange={open => { if (!open && !busy) close(); }}>
    <DialogContent dismissible={!busy} returnFocus={returnFocus}>
      <form className="console-dialog-form" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="btn-close" aria-label="Close dialog" disabled={busy} />
          </DialogClose>
        </DialogHeader>
        <div className="console-dialog-body"><fieldset disabled={busy}>
          {action.type === 'add' && <>
            <Field label="*Tube name" name="tubeName" defaultValue={action.tube || 'default'} maxLength="200" required />
            <div className="add-job-options d-grid gap-2">
              <JobNumberField label="Priority" name="tubePriority" />
              <JobNumberField label="Delay" name="tubeDelay" />
              <JobNumberField label="TTR" name="tubeTtr" />
            </div>
            <div className="mb-3">
              <PayloadEditor id="field-tubeData" name="tubeData" label="Data" rows={5} defaultValue={action.payload} required />
            </div>
          </>}
          {action.type === 'server' && <>
            <Field label="Host" name="host" defaultValue={action.server?.host || 'localhost'} required maxLength="253" />
            <Field label="Port" name="port" defaultValue={action.server?.port ?? 11300} required min="1" max="65535" type="number" />
            <Field label="Name (optional)" name="label" defaultValue={action.server && action.server.label !== action.server.endpoint ? action.server.label : ''} maxLength="100" />
          </>}
          {action.type === 'loadSample' && <p>Place <strong>{action.sample.name}</strong> on <strong>{action.tube}</strong>?</p>}
          {action.type === 'sample' && <>
            <Field label={<><b>Name *</b> <i>(highlighted text is auto populated)</i></>} name="addsamplename" defaultValue={action.data?.name} autoComplete="off" required maxLength="200" />
            <label className="form-label"><b>Available on tubes *</b></label>
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {[...new Set([...action.data.tubes, ...tubes.map(({ name }) => name)])].map(name =>
                <Checkbox key={name} name="tubes[]" checked={action.data.tubes.includes(name)} value={name}>{name}</Checkbox>)}
            </div>
          </>}
          {action.type === 'columns' && <ColumnFilter fields={action.fields} visible={action.visible} tubeColumns={action.tubeColumns} />}
          {action.type === 'settings' && <Settings settings={settings} />}
          {action.type === 'bulk' && <>
            {action.action === 'move' ? <>
              <label className="form-check"><input className="form-check-input" type="radio" name="destinationMode" value="new" checked={move === 'new'} onChange={() => setMove('new')} />New tube</label>
              {move === 'new' && <Field label="Tube name" name="destTube" required maxLength="200" />}
              {tubes.filter(item => !action.tubes.includes(item.name)).map(item => <label key={item.name} className="form-check">
                <input className="form-check-input" type="radio" name="destinationMode" value={item.name} checked={move === item.name} onChange={() => setMove(item.name)} />{item.name}
              </label>)}
              {action.state === 'ready' && <label className="form-check"><input className="form-check-input" type="radio" name="destinationMode" value="$buried" checked={move === '$buried'} onChange={() => setMove('$buried')} />buried</label>}
            </> : action.clearCount !== undefined ? <>
              <p>Delete {action.state === 'all' ? 'ready, delayed, and buried' : action.state} jobs from <strong className="text-break">{action.tubes[0]}</strong>?</p>
              <Field type="number" name="clearCount" label="Maximum jobs to delete" defaultValue={action.clearCount}
                min="1" max={Number.MAX_SAFE_INTEGER} step="1" required />
              <p className="small text-body-secondary mb-0">New jobs do not increase this limit, but they may be included in the jobs deleted.</p>
            </> : action.action === 'clear' && action.state === 'all'
              ? <p className="mb-0">Delete ready, delayed, and buried jobs from <strong className="text-break">{action.tubes.join(', ')}</strong>?</p>
              : <p className="mb-0">{title} on <strong>{action.tubes.join(', ')}</strong>?</p>}
          </>}
          {action.type === 'removeServer' && <p className="mb-0">Remove <strong>{action.server.label}</strong> from this browser’s server list?</p>}
          {action.type === 'deleteSample' && <p className="mb-0">Delete <strong>{action.sample.name}</strong>?</p>}
          {['deleteJob', 'kickJob'].includes(action.type) && <p className="mb-0">{title} <strong className="font-monospace">#{action.job.id}</strong>?</p>}
          {error && <Alert error message={error} />}
        </fieldset></div>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy}>{action.type === 'server' ? 'Cancel' : 'Close'}</button>
          </DialogClose>
          <button type="submit" className={destructive ? 'btn btn-danger btn-sm' : success} disabled={busy}>{busy ? 'Working…' : primary}</button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
