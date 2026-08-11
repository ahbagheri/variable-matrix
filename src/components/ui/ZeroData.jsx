// Empty-state pattern matching the Azure DevOps ZeroData component.
export default function ZeroData({ title, children, action }) {
  return (
    <div className="vm-zero-data">
      <svg className="vm-zero-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="10" width="36" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="2" />
        <line x1="18" y1="18" x2="18" y2="38" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="vm-zero-title">{title}</div>
      {children && <div className="vm-zero-text">{children}</div>}
      {action && <div className="vm-zero-action">{action}</div>}
    </div>
  );
}
