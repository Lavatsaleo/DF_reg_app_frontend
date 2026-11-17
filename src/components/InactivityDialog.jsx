import { useEffect, useId, useRef } from "react";

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/*
 * "Are you still there?" before an applicant page is closed on a shared computer.
 * Escape keeps the page open (the safe choice); only the countdown or the Exit button closes it.
 */
function InactivityDialog({ open, secondsLeft, detail, onStay, onExit }) {
  const dialogRef = useRef(null);
  const stayRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      stayRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="df-confirm-dialog df-inactivity-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <h2 id={titleId} className="df-confirm-dialog-title">Are you still there?</h2>
      <div id={bodyId} className="df-confirm-dialog-body">
        <p>
          To protect your information on shared or public computers, this page will close and your information will be
          removed from this browser in <strong>{formatCountdown(secondsLeft)}</strong>.
        </p>
        {detail && <p>{detail}</p>}
      </div>
      <div className="df-confirm-dialog-actions">
        <button ref={stayRef} type="button" className="btn ss-btn-primary" onClick={onStay}>
          I am still here
        </button>
        <button type="button" className="btn ss-btn-outline" onClick={onExit}>
          Exit now
        </button>
      </div>
    </dialog>
  );
}

export default InactivityDialog;
