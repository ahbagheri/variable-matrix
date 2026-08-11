import { Button, Dropdown, OverflowMenu, GearIcon, AddIcon, CopyIcon, LayersIcon, AppsIcon, TrashIcon } from '../ui';

export default function Toolbar({
  apps,
  selectedApp,
  onSelectApp,
  filter,
  canAddVariable,
  canCopy,
  canAddEnv,
  canDeleteApp,
  onAddVariable,
  onCopy,
  onAddEnv,
  onNewApplication,
  onDeleteApplication,
  onSettings,
}) {
  return (
    <div className="vm-toolbar">
      <div className="vm-toolbar-left">
        <Dropdown
          className="vm-toolbar-app"
          ariaLabel="Application"
          items={apps}
          value={selectedApp}
          onChange={onSelectApp}
          placeholder={apps.length ? 'Select application' : 'No applications detected'}
          disabled={!apps.length}
        />
        {filter}
      </div>
      <div className="vm-toolbar-right">
        <Button variant="subtle" onClick={onAddVariable} disabled={!canAddVariable} title="Add a variable to this application">
          <AddIcon /> Variable
        </Button>
        <Button variant="subtle" onClick={onCopy} disabled={!canCopy} title="Copy values from one environment to another">
          <CopyIcon /> Copy env
        </Button>
        <Button variant="subtle" onClick={onAddEnv} disabled={!canAddEnv} title="Create a variable group for a missing environment">
          <LayersIcon /> Env group
        </Button>
        <Button variant="subtle" onClick={onNewApplication} title="Create a new application (a set of variable groups)">
          <AppsIcon /> Application
        </Button>
        <Button variant="subtle" iconOnly onClick={onSettings} title="Matrix settings">
          <GearIcon />
        </Button>
        <OverflowMenu
          items={[
            {
              label: 'Delete application',
              icon: <TrashIcon />,
              disabled: !canDeleteApp,
              onClick: onDeleteApplication,
            },
          ]}
        />
      </div>
    </div>
  );
}
