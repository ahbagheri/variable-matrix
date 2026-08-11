import { isWritable } from '../../lib/matrix.js';
import { LockIcon, UnlockIcon } from '../ui';

export default function Cell({ group, variableName, actions }) {
  if (!group) {
    return (
      <td className="vm-cell vm-cell-missing vm-cell-readonly">
        <div className="vm-no-group">No variable group</div>
      </td>
    );
  }

  const writable = isWritable(group);
  const variable = group.variables?.[variableName];

  if (!variable) {
    return (
      <td className={`vm-cell vm-cell-missing ${writable ? '' : 'vm-cell-readonly'}`}>
        {writable ? (
          <button
            type="button"
            className="vm-add-missing"
            onClick={() => actions.addCell(group.id, variableName)}
          >
            + Add
          </button>
        ) : (
          <div className="vm-no-group">Not mapped</div>
        )}
      </td>
    );
  }

  const secret = !!variable.isSecret;
  const inputValue = secret
    ? variable._secretChanged
      ? String(variable.value ?? '')
      : ''
    : String(variable.value ?? '');
  const placeholder = secret ? 'Secret set. Type to replace' : '';
  const readonly = !writable || !!variable.isReadOnly;
  const showActions = writable && !variable.isReadOnly;

  return (
    <td className={`vm-cell ${secret ? 'vm-cell-secret' : ''} ${readonly ? 'vm-cell-readonly' : ''}`}>
      <div className="vm-cell-inner">
        <input
          className="vm-cell-input"
          type={secret ? 'password' : 'text'}
          value={inputValue}
          placeholder={placeholder}
          readOnly={readonly}
          onChange={(event) => actions.setValue(group.id, variableName, event.target.value)}
        />
        {showActions && (
          <div className="vm-cell-actions">
            <button
              type="button"
              className="vm-cell-action"
              title={secret ? 'Make non-secret' : 'Make secret'}
              onClick={() => actions.toggleSecret(group.id, variableName)}
            >
              {secret ? <LockIcon /> : <UnlockIcon />}
            </button>
            <button
              type="button"
              className="vm-cell-action vm-cell-action-danger"
              title="Remove variable from this environment"
              onClick={() => actions.deleteCell(group.id, variableName)}
            >
              ×
            </button>
          </div>
        )}
      </div>
      {secret && (
        <div className="vm-secret-pill">
          <LockIcon /> {variable._secretChanged ? 'replacement staged' : 'secret'}
        </div>
      )}
    </td>
  );
}
