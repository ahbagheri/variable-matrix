import { useEffect, useRef, useState } from 'react';

function normalize(items) {
  return items.map((item) =>
    typeof item === 'string' ? { value: item, text: item } : item
  );
}

// Multi-select dropdown mirroring the Azure DevOps multi-select Dropdown:
// trigger with a summary, popup with checkbox items.
export default function MultiSelectDropdown({
  items,
  selected,
  onChange,
  summary,
  placeholder = 'Select',
  ariaLabel,
  disabled,
  className = '',
}) {
  const options = normalize(items);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedSet = new Set(selected);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value) => {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange([...next]);
  };

  return (
    <div ref={rootRef} className={`vm-dropdown ${open ? 'vm-open' : ''} ${className}`}>
      <button
        type="button"
        className="vm-dropdown-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`vm-dropdown-value ${selected.length ? '' : 'vm-placeholder'}`}>
          {summary || (selected.length ? `${selected.length} selected` : placeholder)}
        </span>
        <svg className="vm-dropdown-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul className="vm-dropdown-callout" role="listbox" aria-multiselectable="true" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = selectedSet.has(option.value);
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className="vm-dropdown-option vm-dropdown-check-option"
                onClick={() => toggle(option.value)}
              >
                <input type="checkbox" checked={isSelected} readOnly tabIndex={-1} />
                <span className="vm-dropdown-option-text">{option.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
