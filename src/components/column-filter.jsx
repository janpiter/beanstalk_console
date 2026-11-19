import * as TabsPrimitive from '@radix-ui/react-tabs';
import { nameOf, serverFieldDescriptions, tubeFieldDescriptions } from './console-ui.jsx';

const tubeCurrent = [
  'current-jobs-buried', 'current-jobs-delayed', 'current-jobs-ready',
  'current-jobs-reserved', 'current-jobs-urgent', 'current-using', 'current-waiting', 'current-watching',
];
const tubeOther = ['cmd-delete', 'cmd-pause-tube', 'pause', 'pause-time-left', 'total-jobs'];
const serverGroups = ['binlog', 'cmd', 'current', 'other'];

export function ColumnFilter({ fields, visible, tubeColumns }) {
  const descriptions = tubeColumns ? tubeFieldDescriptions : serverFieldDescriptions;
  const groups = tubeColumns
    ? [['current', tubeCurrent], ['other', tubeOther]]
    : serverGroups.map(group => [group, fields.filter(field => {
      if (group === 'other') return !serverGroups.slice(0, -1).some(prefix => field.startsWith(prefix + '-'));
      return field.startsWith(group + '-');
    })]);

  return <TabsPrimitive.Root data-slot="tabs" defaultValue={groups[0][0]}>
    <TabsPrimitive.List data-slot="tabs-list" className="nav nav-tabs nav-justified" aria-label="Column groups">
      {groups.map(([group]) => <TabsPrimitive.Trigger data-slot="tabs-trigger" key={group} value={group}
        className="nav-link text-body">
        {nameOf(group)}
      </TabsPrimitive.Trigger>)}
    </TabsPrimitive.List>
    <div className={tubeColumns ? undefined : 'server-column-panels'}>
      {groups.map(([group, keys]) => <TabsPrimitive.Content data-slot="tabs-content" key={group} value={group} forceMount className="column-panel pt-3">
        {keys.map(key => <label className="form-check mb-2" key={key}>
          <input type="checkbox" className="form-check-input" name="filter" value={key} defaultChecked={visible.includes(key)} />
          <span className="form-check-label">
            <strong className="d-block">{nameOf(key)}</strong>
            <small className="d-block text-body-secondary lh-sm">{descriptions[key][0].toUpperCase() + descriptions[key].slice(1)}</small>
          </span>
        </label>)}
      </TabsPrimitive.Content>)}
    </div>
  </TabsPrimitive.Root>;
}
