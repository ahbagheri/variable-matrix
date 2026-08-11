import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button } from '../ui';
import { validateVariableName } from '../../lib/validation.js';
import { SHARED_ENV_KEY } from '../../lib/constants.js';

// A variable is normally either shared (in the shared group) or environment-
// specific. This dialog guides that choice, with an override to add everywhere.
export default function AddVariableModal({ envs, writableEnvs, onSubmit, onClose }) {
  const hasShared = envs.includes(SHARED_ENV_KEY);
  const otherEnvs = envs.filter((env) => env !== SHARED_ENV_KEY);
  const hasOthers = otherEnvs.length > 0;
  const choose = hasShared && hasOthers;

  const [name, setName] = useState('');
  const [mode, setMode] = useState(hasShared ? 'shared' : 'specific');
  const [selected, setSelected] = useState(
    () => new Set(otherEnvs.filter((env) => writableEnvs.includes(env)))
  );
  const [addAll, setAddAll] = useState(false);

  const toggle = (env) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  };

  let targets;
  if (addAll) {
    targets = envs.filter((env) => writableEnvs.includes(env));
  } else if (!choose) {
    // Only shared, or only environments: use whatever is present.
    targets = hasShared
      ? [SHARED_ENV_KEY].filter((env) => writableEnvs.includes(env))
      : [...selected].filter((env) => writableEnvs.includes(env));
  } else if (mode === 'shared') {
    targets = writableEnvs.includes(SHARED_ENV_KEY) ? [SHARED_ENV_KEY] : [];
  } else {
    targets = [...selected].filter((env) => writableEnvs.includes(env));
  }

  const nameError = name.trim() ? validateVariableName(name) : '';
  const canSubmit = !validateVariableName(name) && targets.length > 0;

  return (
    <Modal
      title="Add variable"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSubmit(name, targets)} disabled={!canSubmit}>
            Add variable
          </Button>
        </>
      }
    >
      <div className="vm-field">
        <label className="vm-label" htmlFor="newVariableName">
          Variable name
        </label>
        <input
          className="vm-input"
          id="newVariableName"
          placeholder="API_URL"
          autoComplete="off"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {nameError && <div className="vm-help vm-help-error">{nameError}</div>}
      </div>

      {choose ? (
        <div className="vm-field">
          <span className="vm-label">Add to</span>
          <label className="vm-check">
            <input
              type="radio"
              name="add-mode"
              checked={mode === 'shared'}
              disabled={addAll || !writableEnvs.includes(SHARED_ENV_KEY)}
              onChange={() => setMode('shared')}
            />{' '}
            Shared <span className="vm-muted-text">— one value for all environments</span>
          </label>
          <label className="vm-check">
            <input
              type="radio"
              name="add-mode"
              checked={mode === 'specific'}
              disabled={addAll}
              onChange={() => setMode('specific')}
            />{' '}
            Specific environments
          </label>

          {mode === 'specific' && !addAll && (
            <div className="vm-checks vm-add-envs">
              {otherEnvs.map((env) => {
                const enabled = writableEnvs.includes(env);
                return (
                  <label key={env} className="vm-check">
                    <input
                      type="checkbox"
                      checked={enabled && selected.has(env)}
                      disabled={!enabled}
                      onChange={() => toggle(env)}
                    />{' '}
                    {env}
                    {enabled ? '' : ' (read-only)'}
                  </label>
                );
              })}
            </div>
          )}

          <label className="vm-check vm-add-all">
            <input type="checkbox" checked={addAll} onChange={(event) => setAddAll(event.target.checked)} />{' '}
            Override: add to every group (shared + all environments)
          </label>
        </div>
      ) : (
        <div className="vm-field">
          <span className="vm-label">Add to environments</span>
          <div className="vm-checks">
            {envs.map((env) => {
              const enabled = writableEnvs.includes(env);
              return (
                <label key={env} className="vm-check">
                  <input
                    type="checkbox"
                    checked={enabled && (hasShared ? true : selected.has(env))}
                    disabled={!enabled || hasShared}
                    onChange={() => toggle(env)}
                  />{' '}
                  {env}
                  {enabled ? '' : ' (read-only)'}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="vm-help">
        New variables start as non-secret with an empty value. Fill the cells, then save.
      </div>
    </Modal>
  );
}
