export default function Modal({ title, children, footer, onClose }) {
  return (
    <div className="vm-modal-backdrop" onClick={onClose}>
      <div
        className="vm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vm-modal-header">{title}</div>
        <div className="vm-modal-body">{children}</div>
        <div className="vm-modal-footer">{footer}</div>
      </div>
    </div>
  );
}
