import { useEffect, useId, useRef } from "react";

/*
 * Accessible replacement for window.confirm. The native <dialog> opened with showModal()
 * moves focus inside, keeps it there, closes on Escape and returns focus to the control
 * that opened it, so screen reader and keyboard users always know where they are.
 */
function ConfirmDialog({ open, title, children, confirmLabel = "Continue", cancelLabel = "Cancel", error = "", onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="df-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} className="df-confirm-dialog-title">{title}</h2>
      <div id={bodyId} className="df-confirm-dialog-body">{children}</div>
      {error && <p className="df-confirm-dialog-error" role="alert">{error}</p>}
      <div className="df-confirm-dialog-actions">
        <button ref={confirmRef} type="button" className="btn ss-btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn ss-btn-outline" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
