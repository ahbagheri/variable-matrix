import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, MessageCard } from '../ui';
import { validateApplicationName, validateSeparator, validateVariableName } from '../../lib/validation.js';
import { SHARED_ENV_KEY } from '../../lib/constants.js';

// Azure DevOps requires each new group to contain at least one variable, so a
// new application is seeded with a starter variable — different defaults for the
// shared group vs. the environment-specific groups.
const DEFAULT_SHARED_SEED = 'COMMON_SETTING';
const DEFAULT_ENV_SEED = 'ENV_SETTING';

export default function NewApplicationModal({ envs, separator, existingApps, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [sep, setSep] = useState(separator);
  const [selected, setSelected] = useState(() => new Set(envs));
  const [sharedSeed, setSharedSeed] = useState(DEFAULT_SHARED_SEED);
  const [envSeed, setEnvSeed] = useState(DEFAULT_ENV_SEED);

  const trimmed = name.trim();
  const nameError = trimmed ? validateApplicationName(name) : '';
  const sepError = validateSeparator(sep);
  const exists =
    !!trimmed && existingApps.some((app) => app.toLowerCase() === trimmed.toLowerCase());
  const chosen = envs.filter((env) => selected.has(env));

  const includesShared = chosen.includes(SHARED_ENV_KEY);
  const includesEnv = chosen.some((env) => env !== SHARED_ENV_KEY);
  const sharedSeedError = includesShared ? validateVariableName(sharedSeed) : '';
  const envSeedError = includesEnv ? validateVariableName(envSeed) : '';

  const canCreate =
    !validateApplicationName(name) &&
    !exists &&
    !sepError &&
    chosen.length > 0 &&
    !sharedSeedError &&
    !envSeedError;

  const toggle = (env) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  };

  const seedFor = (env) => (env === SHARED_ENV_KEY ? sharedSeed.trim() : envSeed.trim());

  const submit = () =>
    onSubmit(trimmed, sep, chosen, { sharedSeed: sharedSeed.trim(), envSeed: envSeed.trim() });

  return (
    <Modal
      title="New application"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canCreate}>
            Create groups
          </Button>
        </>
      }
    >
      <div className="vm-field">
        <label className="vm-label" htmlFor="newAppName">
          Application name
        </label>
        <input
          className="vm-input"
          id="newAppName"
          placeholder="MyVariables"
          autoComplete="off"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {nameError && <div className="vm-help vm-help-error">{nameError}</div>}
        {exists && <div className="vm-help vm-help-error">An application named “{trimmed}” already exists.</div>}
      </div>

      <div className="vm-field">
        <label className="vm-label" htmlFor="newAppSep">
          Separator
        </label>
        <input
          className="vm-input"
          id="newAppSep"
          value={sep}
          maxLength={3}
          onChange={(event) => setSep(event.target.value)}
        />
        {sepError && <div className="vm-help vm-help-error">{sepError}</div>}
      </div>

      <div className="vm-field">
        <span className="vm-label">Environments to create</span>
        <div className="vm-checks">
          {envs.map((env) => (
            <label key={env} className="vm-check">
              <input type="checkbox" checked={selected.has(env)} onChange={() => toggle(env)} /> {env}
            </label>
          ))}
        </div>
      </div>

      {includesShared && (
        <div className="vm-field">
          <label className="vm-label" htmlFor="newAppSharedSeed">
            Starter variable for the shared group
          </label>
          <input
            className="vm-input"
            id="newAppSharedSeed"
            value={sharedSeed}
            autoComplete="off"
            onChange={(event) => setSharedSeed(event.target.value)}
          />
          {sharedSeedError && <div className="vm-help vm-help-error">{sharedSeedError}</div>}
        </div>
      )}

      {includesEnv && (
        <div className="vm-field">
          <label className="vm-label" htmlFor="newAppEnvSeed">
            Starter variable for the other environments
          </label>
          <input
            className="vm-input"
            id="newAppEnvSeed"
            value={envSeed}
            autoComplete="off"
            onChange={(event) => setEnvSeed(event.target.value)}
          />
          {envSeedError && <div className="vm-help vm-help-error">{envSeedError}</div>}
        </div>
      )}

      {chosen.length > 0 && trimmed && (
        <MessageCard severity="info">
          <div className="vm-create-preview-title">
            Creates {chosen.length} variable group{chosen.length === 1 ? '' : 's'} (each seeded with a
            starter variable you can rename):
          </div>
          <ul className="vm-create-preview">
            {chosen.map((env) => (
              <li key={env}>
                <code>{`${trimmed}${sep}${env}`}</code>
                {seedFor(env) ? <span className="vm-create-seed"> · {seedFor(env)}</span> : null}
              </li>
            ))}
          </ul>
        </MessageCard>
      )}
    </Modal>
  );
}
