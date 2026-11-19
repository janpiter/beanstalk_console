import { useRef, useState } from 'react';
import { Icon } from './icon.jsx';
import { Menu } from './console-ui.jsx';

function PickerOptions({ title, icon, options, selected, loading, unavailable, onSelect }) {
  const [filter, setFilter] = useState('');
  const search = useRef(null);
  const query = filter.trim().toLowerCase();
  const matches = options.filter(({ label, description }) =>
    label.toLowerCase().includes(query) || description?.toLowerCase().includes(query));

  function handleKey(event) {
    if (event.nativeEvent.isComposing || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll('[data-picker-option]'));
    if (event.target === search.current) {
      if (event.key === 'Enter') {
        event.preventDefault();
        items[0]?.click();
      } else if (items.length) {
        event.preventDefault();
        items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus();
      }
      return;
    }
    const index = items.indexOf(event.target);
    if (index < 0 || event.key === 'Enter') return;
    event.preventDefault();
    if (event.key === 'ArrowDown') items[index + 1]?.focus();
    else (items[index - 1] || search.current)?.focus();
  }

  const Option = onSelect ? 'button' : 'a';
  return <div className="navigation-picker-content" onKeyDown={handleKey}>
    <div className="navigation-picker-search">
      <Icon name="search" />
      <input type="search" ref={search} className="form-control form-control-sm" aria-label={'Find ' + title}
        placeholder={'Find ' + title + '…'} value={filter} onChange={event => setFilter(event.target.value)} />
    </div>
    <div className="navigation-picker-results">
      {matches.length > 0 && <ul className="list-unstyled mb-0">
        {matches.map(option => <li key={option.id}>
          <Option className="dropdown-item navigation-picker-option" data-picker-option
            {...(onSelect ? { type: 'button', 'aria-pressed': option.id === selected, onClick: () => onSelect(option.id) }
              : { href: option.href, 'aria-current': option.id === selected ? 'true' : undefined })}>
            <Icon name={icon} weight="regular" />
            <span className={'navigation-picker-option-label' + (option.description ? ' with-description' : '')}>
              <span title={option.description ? option.label : undefined}>{option.label}</span>
              {option.description && <small title={option.description}>{option.description}</small>}
            </span>
            {option.id === selected && <Icon name="check" />}
          </Option>
        </li>)}
      </ul>}
      {loading && <p className="navigation-picker-status" role="status">Loading {title}…</p>}
      {unavailable && <p className="navigation-picker-status" role="status">Unable to load {title}.</p>}
      {!loading && !unavailable && !matches.length &&
        <p className="navigation-picker-status" role="status">No matching {title}.</p>}
    </div>
  </div>;
}

export function serverPickerOption(server) {
  return { id: server.id, label: server.label, description: server.label === server.endpoint ? undefined : server.endpoint };
}

export function DestinationPicker({ name, label, icon, options }) {
  const [selected, setSelected] = useState('');
  const current = options.find(option => option.id === selected) ?? (options.length === 1 ? options[0] : undefined);
  const text = current?.label ?? 'Choose a ' + icon;
  return <div>
    <span className="form-label d-block">{label}</span>
    <input type="hidden" name={name} value={current?.id ?? ''} />
    <Menu className={icon === 'tube' ? 'dropdown navigation-picker-tubes' : 'dropdown'}
      button="btn btn-sm console-neutral dropdown-toggle navigation-picker-trigger console-destination-trigger"
      title={`${label}: ${text}`} label={<><Icon name={icon} weight="regular" /><span>{text}</span></>} searchable scroll>
      <PickerOptions title={icon + 's'} icon={icon} options={options} selected={current?.id} onSelect={setSelected} />
    </Menu>
  </div>;
}

export function NavigationPicker({ title, icon, options, selected, loading, unavailable }) {
  const current = options.find(option => option.id === selected);
  return <Menu className={icon === 'tube' ? 'dropdown navigation-picker-tubes' : 'dropdown'}
    button="nav-link dropdown-toggle navigation-picker-trigger" title={'Choose ' + title + ': ' + current.label}
    label={<><Icon name={icon} weight="regular" /><span>{current.label}</span></>} searchable scroll>
    <PickerOptions {...{ title, icon, options, selected, loading, unavailable }} />
  </Menu>;
}
