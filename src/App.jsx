import Toolbar from './components/Toolbar';
import MatrixTable from './components/MatrixTable';
import Footer from './components/Footer';
import {
  AddVariableModal,
  CopyModal,
  SettingsModal,
  AddEnvGroupModal,
  NewApplicationModal,
  ConfirmDeleteModal,
} from './components/modals';
import { Button, Pill, Spinner, MultiSelectDropdown, MessageCard, RefreshIcon } from './components/ui';
import { useVariableMatrix } from './hooks/useVariableMatrix.js';

function columnFilterSummary(showShared, showOthers) {
  if (showShared && showOthers) return 'All environments';
  if (showShared) return 'Shared only';
  if (showOthers) return 'Environments only';
  return 'None shown';
}

export default function App() {
  const vm = useVariableMatrix();

  if (vm.loading) {
    return (
      <div className="vm-page">
        <Spinner label="Loading variable groups…" />
      </div>
    );
  }

  return (
    <>
      <div className="vm-app">
        <div className="vm-page">
          <div className="vm-header">
          <div>
            <h1 className="vm-title">Variable Matrix</h1>
            <div className="vm-subtitle">Azure Pipelines Library variable groups by environment</div>
          </div>
          <div className="vm-header-right">
            {vm.demo && <Pill tone="warning">DEMO</Pill>}
            <span className="vm-project-name" title="Current project">
              {vm.project?.name || ''}
            </span>
            <Button
              variant="primary"
              onClick={vm.saveAll}
              disabled={!vm.dirtyCount || vm.saving}
              title={
                vm.dirtyCount
                  ? `Save ${vm.dirtyCount} changed group${vm.dirtyCount === 1 ? '' : 's'}`
                  : 'No unsaved changes'
              }
            >
              {vm.saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="subtle" iconOnly onClick={vm.refresh} title="Reload from Azure DevOps">
              <RefreshIcon />
            </Button>
          </div>
        </div>

        <Toolbar
          apps={vm.apps.map((app) => app.name)}
          selectedApp={vm.selectedApp}
          onSelectApp={vm.setSelectedApp}
          filter={
            vm.hasSharedColumn && vm.hasOtherColumns ? (
              <MultiSelectDropdown
                className="vm-column-filter"
                ariaLabel="Show column groups"
                items={[
                  { value: 'shared', text: 'Shared' },
                  { value: 'others', text: 'Other environments' },
                ]}
                selected={[
                  ...(vm.showShared ? ['shared'] : []),
                  ...(vm.showOthers ? ['others'] : []),
                ]}
                onChange={(sel) => {
                  vm.setShowShared(sel.includes('shared'));
                  vm.setShowOthers(sel.includes('others'));
                }}
                summary={columnFilterSummary(vm.showShared, vm.showOthers)}
              />
            ) : null
          }
          canAddVariable={vm.columns.length > 0}
          canCopy={!!vm.appInfo && !vm.appInfo.standalone && vm.columnEnvs.length >= 1}
          canAddEnv={!!vm.appInfo && !vm.appInfo.standalone && vm.missing.length > 0}
          canDeleteApp={!!vm.appInfo && vm.columns.some((column) => column.group)}
          onAddVariable={vm.openAddVariable}
          onCopy={vm.openCopy}
          onAddEnv={vm.openAddEnv}
          onNewApplication={vm.openNewApplication}
          onDeleteApplication={vm.openDeleteApplication}
          onSettings={() => vm.setModal({ type: 'settings' })}
        />

        <div className="vm-search-row">
          <input
            className="vm-input vm-search-input"
            type="search"
            value={vm.search}
            placeholder="Search variables"
            title="Filter variables by name"
            onChange={(event) => vm.setSearch(event.target.value)}
          />
          <span className={`vm-status-text ${vm.dirtyCount ? 'vm-dirty' : ''}`}>
            {vm.dirtyCount
              ? `${vm.dirtyCount} group${vm.dirtyCount === 1 ? '' : 's'} changed`
              : 'No unsaved changes'}
          </span>
        </div>

        {vm.appInfo?.standalone && (
          <div className="vm-standalone-note">
            <MessageCard severity="info">
              <strong>{vm.selectedApp}</strong> is a <strong>standalone variable group</strong> — its
              name has no environment suffix, so it appears as a single value column. Environment
              actions (<em>Copy env</em>, <em>Env group</em>) don’t apply here. To manage it across
              environments, name groups like <code>{vm.selectedApp}-dev</code> or{' '}
              <code>{vm.selectedApp}-qa</code>, or create a new application.
            </MessageCard>
          </div>
        )}

        <MatrixTable
          columns={vm.columns}
          variableNames={vm.variableNames}
          selectedApp={vm.selectedApp}
          search={vm.search}
          actions={vm.cellActions}
          showShared={vm.showShared}
          showOthers={vm.showOthers}
        />
      </div>

        <Footer />
      </div>

      {vm.modal?.type === 'add-variable' && (
        <AddVariableModal
          envs={vm.columnEnvs}
          writableEnvs={vm.writableEnvs}
          onSubmit={vm.submitAddVariable}
          onClose={() => vm.setModal(null)}
        />
      )}
      {vm.modal?.type === 'copy' && (
        <CopyModal
          app={vm.selectedApp}
          separator={vm.createSeparator}
          available={vm.columnEnvs}
          onSubmit={vm.submitCopy}
          onClose={() => vm.setModal(null)}
        />
      )}
      {vm.modal?.type === 'add-env' && (
        <AddEnvGroupModal
          app={vm.selectedApp}
          separator={vm.createSeparator}
          missing={vm.missing}
          onSubmit={(env) => {
            vm.setModal(null);
            vm.cellActions.createGroup(env);
          }}
          onClose={() => vm.setModal(null)}
        />
      )}
      {vm.modal?.type === 'new-app' && (
        <NewApplicationModal
          envs={vm.envDefs.map((def) => def.key)}
          separator={vm.createSeparator}
          existingApps={vm.apps.map((app) => app.name)}
          onSubmit={vm.createApplication}
          onClose={() => vm.setModal(null)}
        />
      )}
      {vm.modal?.type === 'settings' && (
        <SettingsModal
          envDefs={vm.envDefs}
          createSeparator={vm.createSeparator}
          canManage={vm.demo || vm.canManage}
          scopeLabel={vm.project?.name}
          onSubmit={vm.submitSettings}
          onClose={() => vm.setModal(null)}
        />
      )}
      {vm.modal?.type === 'delete' && (
        <ConfirmDeleteModal
          title={vm.modal.title}
          intro={vm.modal.intro}
          confirmText={vm.modal.confirmText}
          groupNames={vm.modal.groupNames}
          readOnlyCount={vm.modal.readOnlyCount}
          onConfirm={vm.submitDelete}
          onClose={() => vm.setModal(null)}
        />
      )}
    </>
  );
}
