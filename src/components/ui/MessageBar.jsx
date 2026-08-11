// Full-width message banner matching the Azure DevOps global message bar.
const ICONS = {
  error: (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M8 1l7 13H1z" fill="currentColor" />
      <path d="M8 6v4M8 11.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M4.5 8.5l2 2 5-5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M8 7v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.7" r="0.9" fill="#fff" />
    </svg>
  ),
};

export default function MessageBar({ severity = 'error', onDismiss, children }) {
  return (
    <div className={`vm-messagebar vm-messagebar-${severity}`} role={severity === 'error' ? 'alert' : 'status'}>
      <span className="vm-messagebar-icon" aria-hidden="true">
        {ICONS[severity] ?? ICONS.info}
      </span>
      <div className="vm-messagebar-text">{children}</div>
      {onDismiss && (
        <button type="button" className="vm-messagebar-dismiss" onClick={onDismiss} title="Dismiss" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
