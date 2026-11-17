import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "input", "scroll"];

/*
 * Closes an applicant's page on a shared computer when nobody is using it.
 *
 * After `warnAfterMs` with no activity a warning is shown; `graceMs` later `onTimeout` runs.
 * Times are measured with the clock, not by counting timer ticks, so a tab that was hidden or
 * a computer that went to sleep is closed as soon as it is looked at again.
 * Meets WCAG 2.2.1 (Timing adjustable): the person is warned and can continue with one action.
 */
export function useInactivityLock({ enabled, warnAfterMs, graceMs, onTimeout }) {
  const lastActivityAt = useRef(0);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(graceMs / 1000));
  const onTimeoutRef = useRef(onTimeout);
  const warningRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stayActive = useCallback(() => {
    lastActivityAt.current = Date.now();
    warningRef.current = false;
    setWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    lastActivityAt.current = Date.now();

    // While the warning is open only its buttons count, so a passing mouse does not keep the page open.
    function recordActivity() {
      if (!warningRef.current) lastActivityAt.current = Date.now();
    }

    function check() {
      const idleFor = Date.now() - lastActivityAt.current;
      if (idleFor >= warnAfterMs + graceMs) {
        warningRef.current = false;
        setWarning(false);
        onTimeoutRef.current?.();
        return;
      }
      if (idleFor >= warnAfterMs) {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((warnAfterMs + graceMs - idleFor) / 1000)));
      }
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, recordActivity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, recordActivity, { capture: true }));
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
      // Leaving the page (or finishing) closes any open warning.
      warningRef.current = false;
      setWarning(false);
    };
  }, [enabled, warnAfterMs, graceMs]);

  return { warning: enabled && warning, secondsLeft, stayActive };
}
