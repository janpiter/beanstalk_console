import { useRef, useState } from 'react';
import { Icon } from './icon.jsx';
import { Menu } from './console-ui.jsx';

function PickerOptions({ title, icon, options, selected, loading, unavailable }) {
  const [filter, setFilter] = useState('');
  const search = useRef(null);
  const query = filter.trim().toLowerCase();
  const matches = options.filter(({ label, description }) =>
    label.toLowerCase().includes(query) || description?.toLowerCase().includes(query));

  function handleKey(event) {
    if (event.nativeEvent.isComposing || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    const links = Array.from(event.currentTarget.querySelectorAll('a[href]'));
    if (event.target === search.current) {
      if (event.key === 'Enter') {
        event.preventDefault();
        links[0]?.click();
      } else if (links.length) {
        event.preventDefault();
        links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus();
      }
      return;
    }
    const index = links.indexOf(event.target);
    if (index < 0 || event.key === 'Enter') return;
    event.preventDefault();
    if (event.key === 'ArrowDown') links[index + 1]?.focus();
    else (links[index - 1] || search.current)?.focus();
  }

  return <div className="navigation-picker-content" onKeyDown={handleKey}>
    <div className="navigation-picker-search">
      <Icon name="search" />
      <input type="search" ref={search} className="form-control form-control-sm" aria-label={'Find ' + title}
        placeholder={'Find ' + title + '…'} value={filter} onChange={event => setFilter(event.target.value)} />
    </div>
    <div className="navigation-picker-results">
      {matches.length > 0 && <ul className="list-unstyled mb-0">
        {matches.map(option => <li key={option.id}>
          <a className="dropdown-item navigation-picker-option" href={option.href}
            aria-current={option.id === selected ? 'true' : undefined}>
            <Icon name={icon} weight="regular" />
            <span className={'navigation-picker-option-label' + (option.description ? ' with-description' : '')}>
              <span title={option.description ? option.label : undefined}>{option.label}</span>
              {option.description && <small title={option.description}>{option.description}</small>}
            </span>
            {option.id === selected && <Icon name="check" />}
          </a>
        </li>)}
      </ul>}
      {loading && <p className="navigation-picker-status" role="status">Loading {title}…</p>}
      {unavailable && <p className="navigation-picker-status" role="status">Unable to load {title}.</p>}
      {!loading && !unavailable && !matches.length &&
        <p className="navigation-picker-status" role="status">No matching {title}.</p>}
    </div>
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
