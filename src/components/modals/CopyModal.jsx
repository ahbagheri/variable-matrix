import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, Dropdown, MessageCard } from '../ui';
import { SHARED_ENV_KEY } from '../../lib/constants.js';
import { validateEnvKey } from '../../lib/validation.js';

export default function CopyModal({ app, separator, available, onSubmit, onClose }) {
  const NEW_TARGET = '__new__';
  const [source, setSource] = useState(available[0] ?? '');
  const [target, setTarget] = useState(available.length >= 2 ? available[1] : NEW_TARGET);
  const [newEnv, setNewEnv] = useState('');
  const [overwrite, setOverwrite] = useState(true);

  const isNew = target === NEW_TARGET;
  const newEnvError = isNew && newEnv.trim() ? validateEnvKey(newEnv) : '';

  // A new environment is always environment-specific, never the shared group.
  const sourceIsShared = source === SHARED_ENV_KEY;
  const targetIsShared = !isNew && target === SHARED_ENV_KEY;
  const crossTier = sourceIsShared !== targetIsShared;

  const submit = () => {
    if (isNew) onSubmit(source, { type: 'new', name: newEnv }, overwrite);
    else onSubmit(source, { type: 'existing', env: target }, overwrite);
  };

  return (
    <Modal
      title="Copy environment"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={isNew && (!newEnv.trim() || !!newEnvError)}>
            Copy
          </Button>
        </>
      }
    >
      {crossTier && (
        <MessageCard severity="warning">
          {sourceIsShared
            ? 'Not recommended: copying from the shared group into an environment duplicates shared values into an environment-specific group, which defeats the purpose of sharing.'
            : 'Not recommended: copying environment-specific values into the shared group makes them apply to every environment.'}
        </MessageCard>
      )}
      <MessageCard severity="warning">
        Azure DevOps never returns existing secret values. Secret variables are skipped during copy.
      </MessageCard>
      <div className="vm-field">
        <label className="vm-label" htmlFor="copySource">
          Source
        </label>
        <Dropdown
          ariaLabel="Source"
          items={available}
          value={source}
          onChange={setSource}
        />
      </div>
      <div className="vm-field">
        <label className="vm-label" htmlFor="copyTarget">
          Target
        </label>
        <Dropdown
          ariaLabel="Target"
          items={[...available.map((env) => ({ value: env, text: env })), { value: NEW_TARGET, text: '+ Create new environment…' }]}
          value={target}
          onChange={setTarget}
        />
      </div>
      {isNew && (
        <div className="vm-field">
          <label className="vm-label" htmlFor="copyNewEnv">
            New environment name
          </label>
          <input
            className="vm-input"
            id="copyNewEnv"
            placeholder="e.g. sandbox"
            autoComplete="off"
            autoFocus
            value={newEnv}
            onChange={(event) => setNewEnv(event.target.value)}
          />
          {newEnvError && <div className="vm-help vm-help-error">{newEnvError}</div>}
          <div className="vm-help">
            Creates the group <code>{newEnv.trim() ? `${app}${separator}${newEnv.trim()}` : '…'}</code>,
            adds this environment to project settings, and stages the copied values for review.
          </div>
        </div>
      )}
      <label className="vm-check">
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(event) => setOverwrite(event.target.checked)}
        />{' '}
        Overwrite existing non-secret variables in target
      </label>
    </Modal>
  );
}
