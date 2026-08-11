import { useCallback, useEffect, useRef, useState } from 'react';

function normalize(items) {
  return items.map((item) =>
    typeof item === 'string' ? { value: item, text: item } : item
  );
}

// Single-select dropdown mirroring the Azure DevOps Dropdown component:
// trigger with chevron, popup listbox, checkmark + highlight on the selection.
export default function Dropdown({
  items,
  value,
  onChange,
  placeholder = 'Select',
  disabled,
  ariaLabel,
  className = '',
}) {
  const options = normalize(items);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, close]);

  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
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
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={`vm-dropdown-value ${selected ? '' : 'vm-placeholder'}`}>
          {selected ? selected.text : placeholder}
        </span>
        <svg className="vm-dropdown-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul className="vm-dropdown-callout" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`vm-dropdown-option ${isSelected ? 'vm-selected' : ''} ${
                  index === activeIndex ? 'vm-active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span className="vm-dropdown-check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
                <span className="vm-dropdown-option-text">{option.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
