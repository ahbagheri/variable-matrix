import { useState } from 'react';
import Modal from './Modal.jsx';
import { Button, MessageCard } from '../ui';

// Destructive confirmation that requires typing the exact name to enable Delete,
// matching the Azure DevOps "Delete project" pattern.
export default function ConfirmDeleteModal({
  title,
  intro,
  confirmText,
  groupNames = [],
  readOnlyCount = 0,
  onConfirm,
  onClose,
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === confirmText;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={!matches}>
            Delete
          </Button>
        </>
      }
    >
      <p className="vm-confirm-intro">{intro}</p>

      {groupNames.length > 0 && (
        <div className="vm-confirm-groups">
          <div className="vm-confirm-groups-label">
            This permanently deletes {groupNames.length} variable group
            {groupNames.length === 1 ? '' : 's'}:
          </div>
          <ul className="vm-confirm-list">
            {groupNames.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {readOnlyCount > 0 && (
        <MessageCard severity="warning">
          {readOnlyCount} read-only group{readOnlyCount === 1 ? '' : 's'} cannot be deleted and will
          be skipped.
        </MessageCard>
      )}

      <div className="vm-field">
        <label className="vm-label" htmlFor="confirmDelete">
          To confirm, type <strong>{confirmText}</strong>
        </label>
        <input
          id="confirmDelete"
          className="vm-input"
          type="text"
          autoFocus
          autoComplete="off"
          value={typed}
          placeholder={confirmText}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches) onConfirm();
          }}
        />
      </div>
    </Modal>
  );
}
