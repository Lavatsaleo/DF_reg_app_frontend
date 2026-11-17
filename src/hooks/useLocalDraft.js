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

    const storedDraft = readDeviceDraft(pathwayId);

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
