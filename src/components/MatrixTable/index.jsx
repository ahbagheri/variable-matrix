import { useCallback, useState } from 'react';
import Cell from './Cell.jsx';
import { isWritable } from '../../lib/matrix.js';
import { SHARED_ENV_KEY } from '../../lib/constants.js';
import { ZeroData, Pill, TrashIcon } from '../ui';

const VAR_KEY = '__var__';
const DEFAULT_VAR_WIDTH = 280;
const DEFAULT_COL_WIDTH = 240;
const MIN_COL_WIDTH = 120;

function DisabledCell({ label }) {
  return (
    <td className="vm-cell vm-cell-disabled">
      <div className="vm-cell-disabled-note">{label}</div>
    </td>
  );
}

export default function MatrixTable({
  columns,
  variableNames,
  selectedApp,
  search,
  actions,
  showShared = true,
  showOthers = true,
}) {
  const [widths, setWidths] = useState({});

  const widthOf = useCallback(
    (key) => widths[key] ?? (key === VAR_KEY ? DEFAULT_VAR_WIDTH : DEFAULT_COL_WIDTH),
    [widths]
  );

  // Drag a column edge to resize; listeners live on window so the drag keeps
  // tracking even when the pointer leaves the thin handle.
  const startResize = useCallback(
    (key, event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = widthOf(key);
      const onMove = (moveEvent) => {
        const next = Math.max(MIN_COL_WIDTH, startWidth + (moveEvent.clientX - startX));
        setWidths((prev) => ({ ...prev, [key]: next }));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.classList.remove('vm-col-resizing');
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      document.body.classList.add('vm-col-resizing');
    },
    [widthOf]
  );

  if (!selectedApp) {
    return (
      <ZeroData title="No variable groups detected">
        This project has no Library variable groups yet, or none match the configured environments.
        Standalone groups without an environment suffix also appear here once they exist.
      </ZeroData>
    );
  }

  if (!columns.length) {
    return (
      <ZeroData title="No environments to show">
        None of the configured environments have a variable group for this application.
      </ZeroData>
    );
  }

  const isSharedColumn = (column) => !column.standalone && column.env === SHARED_ENV_KEY;
  const sharedColumn = columns.find(isSharedColumn);
  const sharedNames = new Set(sharedColumn ? Object.keys(sharedColumn.group?.variables || {}) : []);

  const visibleColumns = columns.filter((column) =>
    isSharedColumn(column) ? showShared : showOthers
  );

  if (!visibleColumns.length) {
    return (
      <ZeroData title="No column groups selected">
        Use the column filter to show Shared and/or other environments.
      </ZeroData>
    );
  }

  const sharedVars = showShared ? variableNames.filter((name) => sharedNames.has(name)) : [];
  const envVars = showOthers ? variableNames.filter((name) => !sharedNames.has(name)) : [];

  const totalWidth =
    widthOf(VAR_KEY) + visibleColumns.reduce((sum, column) => sum + widthOf(column.env), 0);

  const resizer = (key) => (
    <span
      className="vm-col-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onPointerDown={(event) => startResize(key, event)}
      onClick={(event) => event.stopPropagation()}
    />
  );

  const colgroup = (
    <colgroup>
      <col style={{ width: widthOf(VAR_KEY) }} />
      {visibleColumns.map((column) => (
        <col key={column.env} style={{ width: widthOf(column.env) }} />
      ))}
    </colgroup>
  );

  const headers = visibleColumns.map((column) => (
    <th key={column.env} className={`vm-env-head ${isSharedColumn(column) ? 'vm-env-head-shared' : ''}`}>
      <div className="vm-env-title">
        <span className="vm-env-name">
          {column.standalone ? <Pill tone="neutral">standalone</Pill> : column.env}
        </span>
        {isWritable(column.group) && actions.deleteEnv && (
          <button
            type="button"
            className="vm-cell-action vm-cell-action-danger vm-env-delete"
            title={
              column.standalone
                ? `Delete variable group ${column.group?.name}`
                : `Delete the ${column.env} environment`
            }
            onClick={() => actions.deleteEnv(column.env)}
          >
            <TrashIcon />
          </button>
        )}
      </div>
      <span className="vm-group-name" title={column.group?.name}>
        {column.group?.name}
        {isWritable(column.group) ? '' : ' · read-only'}
      </span>
      {resizer(column.env)}
    </th>
  ));

  const variableHead = (
    <th className="vm-variable-head">
      Variables
      {resizer(VAR_KEY)}
    </th>
  );

  if (!sharedVars.length && !envVars.length) {
    return (
      <div className="vm-table-wrap">
        <table className="vm-table" style={{ width: totalWidth, tableLayout: 'fixed' }}>
          {colgroup}
          <thead>
            <tr>
              {variableHead}
              {headers}
            </tr>
          </thead>
        </table>
        <ZeroData title="No matching variables">
          {search
            ? 'Clear the search or adjust the column filter.'
            : 'Add the first variable to this application.'}
        </ZeroData>
      </div>
    );
  }

  const renderRow = (name, kind) => {
    let present = 0;
    let secretCount = 0;
    for (const column of visibleColumns) {
      const variable = column.group?.variables?.[name];
      if (variable) {
        present += 1;
        if (variable.isSecret) secretCount += 1;
      }
    }
    const meta =
      kind === 'shared'
        ? `Shared${secretCount ? ' · secret' : ''}`
        : `${present}/${visibleColumns.length} ${visibleColumns.length === 1 ? 'group' : 'environments'}${
            secretCount ? ` · ${secretCount} secret` : ''
          }`;

    return (
      <tr key={name}>
        <td className="vm-variable-cell">
          <div className="vm-variable-row">
            <div>
              <div className={`vm-variable-name ${kind === 'shared' ? 'vm-variable-shared' : ''}`}>
                {kind === 'shared' && <Pill tone="info" className="vm-shared-pill">shared</Pill>}
                {name}
              </div>
              <div className="vm-variable-meta">{meta}</div>
            </div>
            <button
              type="button"
              className="vm-cell-action vm-cell-action-danger vm-variable-delete"
              title="Remove from all environments"
              onClick={() => actions.deleteVariableEverywhere(name)}
            >
              ×
            </button>
          </div>
        </td>
        {visibleColumns.map((column) => {
          const sharedCol = isSharedColumn(column);
          if (kind === 'shared') {
            return sharedCol ? (
              <Cell key={column.env} group={column.group} variableName={name} actions={actions} />
            ) : (
              <DisabledCell key={column.env} label="From shared" />
            );
          }
          return sharedCol ? (
            <DisabledCell key={column.env} label="Not shared" />
          ) : (
            <Cell key={column.env} group={column.group} variableName={name} actions={actions} />
          );
        })}
      </tr>
    );
  };

  const showSections = sharedVars.length > 0 && envVars.length > 0;

  return (
    <div className="vm-table-wrap">
      <table className="vm-table" style={{ width: totalWidth, tableLayout: 'fixed' }}>
        {colgroup}
        <thead>
          <tr>
            {variableHead}
            {headers}
          </tr>
        </thead>
        <tbody>
          {showSections && (
            <tr className="vm-section-row">
              <td colSpan={visibleColumns.length + 1}>Shared — applies to all environments</td>
            </tr>
          )}
          {sharedVars.map((name) => renderRow(name, 'shared'))}
          {showSections && (
            <tr className="vm-section-row">
              <td colSpan={visibleColumns.length + 1}>Environment-specific</td>
            </tr>
          )}
          {envVars.map((name) => renderRow(name, 'env'))}
        </tbody>
      </table>
    </div>
  );
}
