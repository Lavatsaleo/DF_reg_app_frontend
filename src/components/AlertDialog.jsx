import { useEffect, useId, useRef } from "react";

/*
 * Pop-up message that needs the applicant's attention (not eligible, application already exists).
 *
 * Screen reader behaviour:
 * - Native <dialog> opened with showModal(): the rest of the page becomes inert, focus moves inside and
 *   stays there, and Escape closes it.
 * - role="alertdialog" with aria-labelledby/aria-describedby: when focus lands on the first button, screen
 *   readers announce "alert dialog", the title and the full message before the button name.
 * - Focus starts on the action marked `initialFocus` (the least drastic choice), never on "Back to home page".
 * - The caller decides where focus goes after closing (for example, the answer that needs changing).
 */
function AlertDialog({ open, title, icon = "bi-exclamation-circle", tone = "warning", children, actions = [], onClose }) {
  const dialogRef = useRef(null);
  const actionRefs = useRef([]);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const index = Math.max(0, actions.findIndex((action) => action.initialFocus));
      actionRefs.current[index]?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, actions]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={`df-alert-dialog is-${tone}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
    >
      <div className="df-alert-dialog-head">
        <span className="df-alert-dialog-icon" aria-hidden="true"><i className={`bi ${icon}`} /></span>
        <h2 id={titleId} className="df-alert-dialog-title">{title}</h2>
      </div>
      <div id={bodyId} className="df-alert-dialog-body">{children}</div>
      <div className="df-alert-dialog-actions">
        {actions.map((action, index) => (
          <button
            key={action.label}
            ref={(element) => { actionRefs.current[index] = element; }}
            type="button"
            className={`btn ${action.variant === "primary" ? "ss-btn-primary" : action.variant === "link" ? "ss-link-button" : "ss-btn-outline"}`}
            onClick={action.onClick}
          >
            {action.icon && <i className={`bi ${action.icon}`} aria-hidden="true" />} {action.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}

export default AlertDialog;
