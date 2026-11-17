import { useEffect, useMemo, useRef, useState } from "react";
import { readDeviceDraft, removeDeviceDraft, writeDeviceDraft } from "../utils/deviceDraftStorage";

// Keeps the application being filled in for this browser tab only (see deviceDraftStorage).
export function useLocalDraft({
  pathwayId,
  enabled,
  answers,
  documentType,
  draftReference,
  draftToken,
  currentStep,
  onRestoreDraft,
  canRestore = () => true,
}) {
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const hasCompletedInitialRestore = useRef(false);
  const skipNextSave = useRef(false);

  const draftPayload = useMemo(
    () => ({ answers, documentType, draftReference, draftToken, currentStep }),
    [answers, documentType, draftReference, draftToken, currentStep]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled || !pathwayId) return;

    hasCompletedInitialRestore.current = false;

    let storedDraft = readDeviceDraft(pathwayId);
    // A copy that may not be picked up again (consent not finished) is removed: start from the beginning.
    if (storedDraft && !canRestore(storedDraft)) {
      removeDeviceDraft(pathwayId);
      storedDraft = null;
    }

    if (storedDraft) {
      onRestoreDraft?.({
        answers: storedDraft.answers || {},
        documentType: storedDraft.documentType,
        draftReference: storedDraft.draftReference,
        draftToken: storedDraft.draftToken,
        currentStep: storedDraft.currentStep,
      });
      setLastSavedAt(storedDraft.savedAt || null);
    } else {
      setLastSavedAt(null);
    }

    window.requestAnimationFrame(() => {
      hasCompletedInitialRestore.current = true;
    });
    // canRestore is a fixed rule; only a new pathway or restore handler should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pathwayId, onRestoreDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!enabled || !pathwayId || !hasCompletedInitialRestore.current) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const saveTimeout = window.setTimeout(() => {
      if (writeDeviceDraft(pathwayId, draftPayload)) {
        setLastSavedAt(new Date().toISOString());
      }
    }, 450);

    return () => window.clearTimeout(saveTimeout);
  }, [enabled, pathwayId, draftPayload]);

  function clearDraft() {
    if (!pathwayId) return;
    skipNextSave.current = true;
    removeDeviceDraft(pathwayId);
    setLastSavedAt(null);
  }

  return {
    lastSavedAt,
    clearDraft,
  };
}
