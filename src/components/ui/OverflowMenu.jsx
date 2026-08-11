import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreIcon } from './icons.jsx';

// Kebab (…) overflow menu of one-off commands, matching the Azure DevOps
// command-bar overflow pattern. `items` are { label, onClick, danger, disabled, icon }.
export default function OverflowMenu({ items = [], ariaLabel = 'More actions', title = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={`vm-overflow ${open ? 'vm-open' : ''}`}>
      <button
        type="button"
        className="vm-btn vm-btn-subtle vm-btn-icon"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
      </button>
      {open && (
        <ul className="vm-overflow-callout" role="menu" aria-label={ariaLabel}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={`vm-overflow-item ${item.danger ? 'vm-overflow-item-danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
              >
                {item.icon && <span className="vm-overflow-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
