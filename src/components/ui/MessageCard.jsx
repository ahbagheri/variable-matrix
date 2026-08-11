// Inline notice matching the Azure DevOps MessageCard component.
const GLYPHS = { info: 'i', warning: '!', error: '×', success: '✓' };

export default function MessageCard({ severity = 'info', children }) {
  return (
    <div className={`vm-message-card vm-message-${severity}`} role="note">
      <span className="vm-message-icon" aria-hidden="true">
        {GLYPHS[severity] ?? 'i'}
      </span>
      <div className="vm-message-content">{children}</div>
    </div>
  );
}
