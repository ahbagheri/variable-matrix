// Azure DevOps-style indeterminate spinner.
export default function Spinner({ label }) {
  return (
    <div className="vm-spinner" role="status" aria-live="polite">
      <span className="vm-spinner-circle" aria-hidden="true" />
      {label && <span className="vm-spinner-label">{label}</span>}
    </div>
  );
}
