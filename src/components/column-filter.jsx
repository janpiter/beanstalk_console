import { useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { nameOf, serverFieldDescriptions, tubeFieldDescriptions } from './console-ui.jsx';

const tubeCurrent = [
  'current-jobs-buried', 'current-jobs-delayed', 'current-jobs-ready',
  'current-jobs-reserved', 'current-jobs-urgent', 'current-using', 'current-waiting', 'current-watching',
];
const tubeOther = ['cmd-delete', 'cmd-pause-tube', 'pause', 'pause-time-left', 'total-jobs'];
const serverGroups = ['binlog', 'cmd', 'current', 'other'];
const groupLabels = { binlog: 'Binlog', cmd: 'Commands', current: 'Current', other: 'Other' };

export function ColumnFilter({ fields, visible, tubeColumns }) {
  const [selected, setSelected] = useState(() => new Set(visible));
  const descriptions = tubeColumns ? tubeFieldDescriptions : serverFieldDescriptions;
  const groups = tubeColumns
    ? [['current', tubeCurrent], ['other', tubeOther]]
    : serverGroups.map(group => [group, fields.filter(field => {
      if (group === 'other') return !serverGroups.slice(0, -1).some(prefix => field.startsWith(prefix + '-'));
      return field.startsWith(group + '-');
    })]);

  function toggle(key, checked) {
    setSelected(previous => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return <TabsPrimitive.Root className="console-column-filter" defaultValue={groups[0][0]}>
    <div className="console-column-filter-summary">
      <span>{tubeColumns ? 'Tube table' : 'Server table'}</span>
      <span className="console-column-count" role="status">{fields.filter(field => selected.has(field)).length} of {fields.length} selected</span>
    </div>
    <TabsPrimitive.List className="console-column-tabs" aria-label="Column groups">
      {groups.map(([group]) => <TabsPrimitive.Trigger key={group} value={group} className="btn btn-sm console-column-tab">
        {groupLabels[group]}
      </TabsPrimitive.Trigger>)}
    </TabsPrimitive.List>
    {groups.map(([group, keys]) => <TabsPrimitive.Content key={group} value={group} forceMount className="console-column-grid">
      {keys.map(key => <label className="console-column-option" key={key}>
        <input type="checkbox" className="form-check-input" name="filter" value={key} checked={selected.has(key)}
          onChange={event => toggle(key, event.target.checked)} />
        <span>
          <strong>{nameOf(key)}</strong>
          <small>{descriptions[key]}</small>
        </span>
      </label>)}
    </TabsPrimitive.Content>)}
  </TabsPrimitive.Root>;
}
