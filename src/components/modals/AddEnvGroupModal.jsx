import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, Dropdown } from '../ui';

export default function AddEnvGroupModal({ app, separator, missing, onSubmit, onClose }) {
  const [env, setEnv] = useState(missing[0] ?? '');

  return (
    <Modal
      title="Add environment group"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSubmit(env)} disabled={!env}>
            Create group
          </Button>
        </>
      }
    >
      <div className="vm-field">
        <label className="vm-label" htmlFor="addEnv">
          Environment
        </label>
        <Dropdown ariaLabel="Environment" items={missing} value={env} onChange={setEnv} />
        <div className="vm-help">
          Creates the Azure DevOps variable group{' '}
          <code>{env ? `${app}${separator}${env}` : '…'}</code>.
        </div>
      </div>
    </Modal>
  );
}
