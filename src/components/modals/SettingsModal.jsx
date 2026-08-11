import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, MessageCard } from '../ui';
import { validateEnvKey, validateSeparator } from '../../lib/validation.js';

let uid = 0;
const nextId = () => (uid += 1);

// Turns stored envDefs into an editable tree model (aliases exclude the key,
// which is always implicitly an alias).
function toRows(envDefs) {
  return envDefs.map((def) => ({
    id: nextId(),
    key: def.key,
    aliases: (def.aliases || []).filter((alias) => alias.toLowerCase() !== def.key.toLowerCase()),
    expanded: true,
  }));
}

function toEnvDefs(rows) {
  return rows.map((row) => ({
    key: row.key.trim(),
    aliases: [row.key.trim(), ...row.aliases.map((a) => a.trim()).filter(Boolean)],
  }));
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
      className={`vm-tree-chevron ${open ? 'vm-open' : ''}`}
    >
      <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function SettingsModal({ envDefs, createSeparator, canManage, scopeLabel, onSubmit, onClose }) {
  const [rows, setRows] = useState(() => toRows(envDefs));
  const [separator, setSeparator] = useState(createSeparator);

  const update = (id, patch) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addEnv = () =>
    setRows((current) => [...current, { id: nextId(), key: '', aliases: [], expanded: true }]);

  const removeEnv = (id) => setRows((current) => current.filter((row) => row.id !== id));

  const addAlias = (id) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, expanded: true, aliases: [...row.aliases, ''] } : row
      )
    );

  const setAlias = (id, index, value) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, aliases: row.aliases.map((a, i) => (i === index ? value : a)) }
          : row
      )
    );

  const removeAlias = (id, index) =>
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, aliases: row.aliases.filter((_, i) => i !== index) } : row
      )
    );

  const keyErrors = rows.map((row) =>
    row.key.trim() ? validateEnvKey(row.key) : 'Environment name is required.'
  );
  const lowerKeys = rows.map((row) => row.key.trim().toLowerCase());
  const duplicate = lowerKeys.find((key, i) => key && lowerKeys.indexOf(key) !== i);
  const sepError = validateSeparator(separator);
  const canSave = rows.length > 0 && !keyErrors.some(Boolean) && !duplicate && !sepError;

  return (
    <Modal
      title="Matrix settings"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(toEnvDefs(rows), separator)}
            disabled={!canSave}
          >
            Save settings
          </Button>
        </>
      }
    >
      <MessageCard severity={canManage ? 'info' : 'warning'}>
        {canManage
          ? `Settings are saved for the whole project${scopeLabel ? ` (${scopeLabel})` : ''}.`
          : 'You do not have permission to save project-wide settings. Changes are saved to your browser only.'}
      </MessageCard>

      <div className="vm-field">
        <span className="vm-label">Environments and aliases</span>
        <div className="vm-tree" role="tree" aria-label="Environments and aliases">
          {rows.map((row, rowIndex) => (
            <div key={row.id} className="vm-tree-node" role="treeitem" aria-expanded={row.expanded}>
              <div className="vm-tree-row">
                <button
                  type="button"
                  className="vm-tree-toggle"
                  onClick={() => update(row.id, { expanded: !row.expanded })}
                  aria-label={row.expanded ? 'Collapse' : 'Expand'}
                  title={row.expanded ? 'Collapse aliases' : 'Expand aliases'}
                >
                  <Chevron open={row.expanded} />
                </button>
                <input
                  className="vm-input vm-tree-key"
                  value={row.key}
                  placeholder="environment key"
                  autoComplete="off"
                  onChange={(event) => update(row.id, { key: event.target.value })}
                />
                <button
                  type="button"
                  className="vm-cell-action"
                  title="Add alias"
                  onClick={() => addAlias(row.id)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="vm-cell-action vm-cell-action-danger"
                  title="Remove environment"
                  onClick={() => removeEnv(row.id)}
                >
                  ×
                </button>
              </div>
              {keyErrors[rowIndex] && (
                <div className="vm-help vm-help-error vm-tree-error">{keyErrors[rowIndex]}</div>
              )}
              {row.expanded && (
                <div className="vm-tree-children" role="group">
                  {row.aliases.map((alias, index) => (
                    <div key={index} className="vm-tree-leaf" role="treeitem">
                      <span className="vm-tree-bullet" aria-hidden="true" />
                      <input
                        className="vm-input vm-tree-alias"
                        value={alias}
                        placeholder="alias"
                        autoComplete="off"
                        onChange={(event) => setAlias(row.id, index, event.target.value)}
                      />
                      <button
                        type="button"
                        className="vm-cell-action vm-cell-action-danger"
                        title="Remove alias"
                        onClick={() => removeAlias(row.id, index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="vm-tree-add-alias"
                    onClick={() => addAlias(row.id)}
                  >
                    + Add alias
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {duplicate && (
          <div className="vm-help vm-help-error">Duplicate environment key “{duplicate}”.</div>
        )}
        <Button variant="subtle" size="small" onClick={addEnv} className="vm-tree-add-env">
          + Add environment
        </Button>
        <div className="vm-help">
          The environment key is the column header and is always matched. Add aliases (matched
          case-insensitively) for alternate group-name suffixes, e.g. <code>dev</code> with{' '}
          <code>develop</code>, <code>development</code>. Column order follows this list; missing
          environments are hidden.
        </div>
      </div>

      <div className="vm-field">
        <label className="vm-label" htmlFor="settingsSeparator">
          Separator for newly created groups
        </label>
        <input
          className="vm-input"
          id="settingsSeparator"
          value={separator}
          maxLength={3}
          onChange={(event) => setSeparator(event.target.value)}
        />
        {sepError && <div className="vm-help vm-help-error">{sepError}</div>}
        <div className="vm-help">
          A single character (<code>-</code>, <code>_</code>, <code>.</code>, or space). Example:
          application + separator + environment = checkin-webapp-dev.
        </div>
      </div>
    </Modal>
  );
}
