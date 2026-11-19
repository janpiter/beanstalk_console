import { useRef, useState } from 'react';

function JsonValue({ value, property }) {
  const [collapsed, setCollapsed] = useState(false);
  const array = Array.isArray(value);
  const entries = value !== null && typeof value === 'object' ? Object.entries(value) : null;
  const left = array ? '[' : '{';
  const right = array ? ']' : '}';
  const key = property !== undefined ? property : null;
  if (!entries) return <>{key != null && key + ': '}<span className={typeof value === 'string' ? 'json-string' : 'json-literal'}>{JSON.stringify(value)}</span></>;
  if (!entries.length) return <>{key != null && key + ': '}{left + right}</>;
  const List = array ? 'ol' : 'ul';
  return <>
    <a href="#" className={'json-toggle' + (collapsed ? ' collapsed' : '')} aria-expanded={!collapsed}
      aria-label={key == null ? (collapsed ? 'Expand JSON' : 'Collapse JSON') : undefined} onClick={event => {
      event.preventDefault();
      setCollapsed(!collapsed);
    }}>{key ?? left}</a>{key != null && ': ' + left}
    {collapsed ? <a className="json-placeholder" href="#" onClick={event => { event.preventDefault(); setCollapsed(false); }}>{entries.length} {entries.length === 1 ? 'item' : 'items'}</a>
      : <List className={array ? 'json-array' : 'json-dict'}>{entries.map(([field, item], index) =>
        <li key={field}><JsonValue property={array ? undefined : field} value={item} />{index < entries.length - 1 ? ',' : ''}</li>)}</List>}
    {right}
  </>;
}

const jsonPreviewSettings = { json: true, highlight: true };

function displayPayload(job, settings) {
  if (settings.unserialize && job.unserialized !== undefined) return job.unserialized;
  let data = job.payload;
  if (job.encoding === 'utf8' && settings.base64) {
    try {
      data = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(data), char => char.charCodeAt(0)));
    } catch { /* Display the original payload when it is not UTF-8 Base64. */ }
  }
  return data;
}

function Payload({ job, settings }) {
  const data = displayPayload(job, settings);
  if (settings.unserialize && job.unserialized !== undefined) {
    const decoded = JSON.parse(data);
    return typeof decoded === 'object' ? <JsonValue value={decoded} /> : String(decoded ?? '');
  }
  if (settings.json) {
    try { return <JsonValue value={JSON.parse(data)} />; } catch { /* Display plain text. */ }
  }
  return data;
}

export function PayloadViewer({ job, settings = jsonPreviewSettings, id, className = '' }) {
  return <div id={id} className={'legacy-payload font-monospace ' + className + (settings.highlight ? '' : ' no-highlight')}>
    <Payload job={job} settings={settings} />
  </div>;
}

const jsonToken = /"(?:[^"\\]|\\.)*"|[^\s{}\[\],:"]+|[{}\[\],:]/g;

function isJson(value) {
  try { JSON.parse(value); return true; } catch { return false; }
}

function formatJson(value) {
  const tokens = value.match(jsonToken);
  let depth = 0;
  let previous = '';
  return tokens.map(token => {
    const opening = token === '{' || token === '[';
    const closing = token === '}' || token === ']';
    const afterOpening = previous === '{' || previous === '[';
    if (closing) depth -= 1;
    const newline = (afterOpening && !closing) || (closing && !afterOpening) || previous === ',';
    const prefix = newline ? '\n' + '  '.repeat(depth) : previous === ':' ? ' ' : '';
    if (opening) depth += 1;
    previous = token;
    return prefix + token;
  }).join('');
}

function highlightJson(value) {
  let end = 0;
  const parts = [];
  for (const match of value.matchAll(jsonToken)) {
    const [token] = match;
    const start = match.index;
    if (start > end) parts.push(value.slice(end, start));
    const className = token.startsWith('"') ? 'json-string' : /^[\d\-tfn]/.test(token) ? 'json-literal' : undefined;
    parts.push(className ? <span key={start} className={className}>{token}</span> : token);
    end = start + token.length;
  }
  return [...parts, value.slice(end)];
}

export function PayloadEditor({ id, name, label, defaultValue = '', rows, required }) {
  const [value, setValue] = useState(defaultValue);
  const mirror = useRef(null);
  const validJson = isJson(value);
  return <div className="payload-editor">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
      <label className="form-label fw-semibold mb-0" htmlFor={id}>{label}</label>
      <button type="button" className="btn btn-sm console-neutral" disabled={!validJson}
        onClick={() => setValue(formatJson(value))}>Format JSON</button>
    </div>
    <div className={'payload-editor-surface' + (validJson ? ' has-highlight' : '')}>
      {validJson && <pre ref={mirror} aria-hidden="true" className="form-control font-monospace payload-editor-mirror">
        {highlightJson(value)}{'\n'}
      </pre>}
      <textarea id={id} name={name} className="form-control font-monospace payload-editor-input"
        rows={rows} spellCheck={false} required={required} value={value}
        onChange={event => setValue(event.target.value)} onScroll={event => {
          if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop;
        }} />
    </div>
  </div>;
}

export function FullPayload({ job, settings }) {
  const payload = displayPayload(job, settings);
  const validJson = isJson(payload);
  const formatted = validJson ? formatJson(payload) : payload;
  return <pre className="legacy-payload full-payload console-inset font-monospace border rounded p-2 mt-2 mb-0"
    tabIndex={0} aria-label="Full job payload">{validJson && settings.highlight ? highlightJson(formatted) : formatted}</pre>;
}
