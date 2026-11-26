import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { groupQuestionsBySection, isQuestionVisible } from "../utils/formUtils";
import { calculateFormProgress, validateAnswers } from "../utils/validationUtils";
import { useLocalDraft } from "./useLocalDraft";
import { clearAllDeviceDrafts, writeDeviceDraft } from "../utils/deviceDraftStorage";
import { hasFinishedConsent } from "../utils/applicationProgress";
import { resolveQuestionText } from "../utils/questionDisplay";

function createLocalReference(pathwayId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  const pathwayPart = String(pathwayId || "DF").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "DF";

  return `SS-${pathwayPart}-${datePart}-${randomPart}`;
}

function normalizeSubmissionResult(apiResult, selectedPathway, contactNumber) {
  const rawResult = apiResult || {};
  const nestedData = rawResult.data && typeof rawResult.data === "object" ? rawResult.data : {};
  const result = { ...rawResult, ...nestedData };
  const existingReference =
    result.applicationReference ||
    result.referenceNumber ||
    result.registrationReference ||
    result.registrationId ||
    result.id;
  const hideApplicationReference =
    result.hideApplicationReference === true ||
    result.screeningStatus === "NOT_ELIGIBLE" ||
    result.status === "INELIGIBLE";

  return {
    ...result,
    hideApplicationReference,
    allowStatusCheck: result.allowStatusCheck !== false && !hideApplicationReference,
    applicationReference: hideApplicationReference
      ? null
      : existingReference || createLocalReference(selectedPathway?.id),
    pathway: result.pathway || selectedPathway?.id,
    registrationMode: result.registrationMode || selectedPathway?.mode,
    status: result.status || "Submitted",
    message: result.message || "Your Application has been submitted successfully.",
    contactNumber: result.contactNumber || contactNumber || null,
    submittedAt: result.submittedAt || new Date().toISOString(),
  };
}

function shouldIncludeQuestionInApplicantView(question, answers) {
  if (question.questionCode === "COUNTRY") return false;
  if (question.hiddenFromApplicant) return false;
  if (question.section === "Jurat / Interpreter") return false;
  return isQuestionVisible(question, answers);
}

function shouldIncludeQuestionInSubmission(question, answers) {
  if (question.hiddenFromApplicant) {
    return answers[question.questionCode] !== undefined && answers[question.questionCode] !== null && answers[question.questionCode] !== "";
  }

  return isQuestionVisible(question, answers);
}

function getDigitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

// A portal draft is reopened later with a code sent to its email, so it needs a mobile number and an email.
function hasEnoughInformationForPortalDraft({ answers }) {
  return getDigitsOnly(answers?.CONTACT_NUMBER).length >= 7 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answers?.EMAIL || "").trim());
}

export { DRAFT_STORAGE_PREFIX } from "../utils/deviceDraftStorage";

const WAITING_FOR_CONTACT_MESSAGE =
  "Your answers are kept only in this browser tab. Enter your mobile number and email address to save them to the portal, so you can continue later with a code we email you.";

const LOCATION_DEPENDENT_QUESTIONS = {
  COUNTRY: ["COUNTY", "SUB_COUNTY", "STATE", "REGION", "DISTRICT"],
  COUNTY: ["SUB_COUNTY"],
  STATE: ["DISTRICT"],
  REGION: ["DISTRICT"],
};

const SUPPLEMENTAL_CONSENT_RESPONSES = [
  { questionCode: "CONSENT_VERSION", questionText: "Consent version", section: "Consent", responseType: "TEXT" },
  { questionCode: "CONSENT_NAME_ID_CODE", questionText: "Applicant full name", section: "Consent", responseType: "TEXT" },
  { questionCode: "CONSENT_SIGNED_DATE", questionText: "Consent date", section: "Consent", responseType: "DATE" },
  { questionCode: "CONSENT_SIGNATURE_METHOD", questionText: "Applicant signature method", section: "Consent", responseType: "TEXT" },
  { questionCode: "CONSENT_SIGNATURE_DATA", questionText: "Applicant electronic signature", section: "Consent", responseType: "LONG_TEXT" },
  { questionCode: "CONSENT_CONTACT_CONTEXT", questionText: "Consent contact context", section: "Consent", responseType: "TEXT" },
  { questionCode: "CONSENT_CONTACTS_AT_SIGNING", questionText: "Contacts displayed at consent", section: "Consent", responseType: "LONG_TEXT" },
  { questionCode: "CONSENT_SUPPORT_REQUEST_NAME", questionText: "Name for consent explanation request", section: "Consent", responseType: "TEXT" },
  { questionCode: "CONSENT_SUPPORT_REQUEST_PHONE", questionText: "Contact number for consent explanation request", section: "Consent", responseType: "PHONE" },
  { questionCode: "CONSENT_SUPPORT_REQUEST_ACCOMMODATION", questionText: "Reasonable accommodation required for consent explanation", section: "Consent", responseType: "LONG_TEXT" },
  { questionCode: "CONSENT_COMPLETED_SELF", questionText: "Did you complete this consent section yourself?", section: "Consent assistance", responseType: "SINGLE_SELECT" },
  { questionCode: "CONSENT_ASSISTANT_NAME", questionText: "Full name of person who provided assistance", section: "Consent assistance", responseType: "TEXT" },
  { questionCode: "CONSENT_ASSISTANT_RELATIONSHIP", questionText: "Relationship to applicant", section: "Consent assistance", responseType: "SINGLE_SELECT" },
  { questionCode: "CONSENT_ASSISTANT_RELATIONSHIP_OTHER", questionText: "Other relationship, please specify", section: "Consent assistance", responseType: "TEXT" },
  { questionCode: "CONSENT_ASSISTANCE_TYPES", questionText: "Type of assistance provided", section: "Consent assistance", responseType: "MULTI_SELECT" },
  { questionCode: "CONSENT_ASSISTANCE_TYPE_OTHER", questionText: "Other assistance, please specify", section: "Consent assistance", responseType: "TEXT" },
  { questionCode: "CONSENT_ASSISTANCE_LANGUAGE", questionText: "Language or communication method used", section: "Consent assistance", responseType: "TEXT" },
  { questionCode: "CONSENT_ASSISTANT_SIGNATURE_METHOD", questionText: "Assistant signature method", section: "Consent assistance", responseType: "TEXT" },
  { questionCode: "CONSENT_ASSISTANT_SIGNATURE_DATA", questionText: "Assistant electronic signature", section: "Consent assistance", responseType: "LONG_TEXT" },
  { questionCode: "CONSENT_ASSISTANCE_DATE", questionText: "Date assistance was provided", section: "Consent assistance", responseType: "DATE" },
];

function clearDependentLocationAnswers(questionCode, nextAnswers) {
  const dependentQuestionCodes = LOCATION_DEPENDENT_QUESTIONS[questionCode] || [];

  dependentQuestionCodes.forEach((dependentQuestionCode) => {
    delete nextAnswers[dependentQuestionCode];
  });

  return dependentQuestionCodes;
}

export function useRegistrationForm() {
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState("DISABILITY_DOCUMENT");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [pathwayMessage, setPathwayMessage] = useState("");
  const [serverDraftReference, setServerDraftReference] = useState("");
  // Private token that lets this tab, and only this tab, keep changing the portal draft.
  const [serverDraftToken, setServerDraftToken] = useState("");
  const [portalDraftLastSavedAt, setPortalDraftLastSavedAt] = useState(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState("waiting_for_mobile");
  const [draftSaveMessage, setDraftSaveMessage] = useState(
    WAITING_FOR_CONTACT_MESSAGE
  );
  const [currentStep, setCurrentStep] = useState(0);
  // The autosave reads the latest status from a ref, so a status change never re-runs the save by itself.
  // (It used to: a duplicate result re-posted every ~1.2s until the duplicate-notice rate limit answered
  // with a plain 429, which was treated as an ordinary save error and lifted the duplicate block.)
  const draftSaveStatusRef = useRef(draftSaveStatus);
  useEffect(() => {
    draftSaveStatusRef.current = draftSaveStatus;
  }, [draftSaveStatus]);
  // The identity details (country, mobile, email, national ID) that matched an existing application.
  // Saving stays paused until the applicant changes one of them.
  const duplicateIdentityRef = useRef("");

  const restoreDraft = useCallback((draft) => {
    if (draft.answers && Object.keys(draft.answers).length > 0) {
      setAnswers({
        ...draft.answers,
        ...(selectedPathway ? { COURSE_APPLIED_FOR: selectedPathway.title } : {}),
      });
    }

    if (draft.documentType) setDocumentType(draft.documentType);

    if (draft.draftReference && draft.draftToken) {
      setServerDraftReference(draft.draftReference);
      setServerDraftToken(draft.draftToken);
      setDraftSaveStatus("saved");
      setDraftSaveMessage("Draft saved to the portal.");
    }

    if (Number.isFinite(Number(draft.currentStep))) {
      setCurrentStep(Math.max(0, Number(draft.currentStep)));
    }
  }, [selectedPathway]);

  const { lastSavedAt: draftLastSavedAt, clearDraft } = useLocalDraft({
    pathwayId: selectedPathway?.id || "",
    enabled: Boolean(selectedPathway),
    answers,
    documentType,
    draftReference: serverDraftReference,
    draftToken: serverDraftToken,
    currentStep,
    onRestoreDraft: restoreDraft,
    canRestore: (draft) => hasFinishedConsent(draft.answers),
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedPathway) return;

    const hasAnswers = Object.values(answers).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });

    if (!hasAnswers) {
      setDraftSaveStatus("waiting_for_mobile");
      setDraftSaveMessage(WAITING_FOR_CONTACT_MESSAGE);
      return;
    }

    // A portal draft this tab may no longer change (continued on another device, or closed).
    if (draftSaveStatusRef.current === "locked") return;

    // Already told this person they have an application: do not ask again until the details change.
    const identityKey = [answers.COUNTRY, answers.CONTACT_NUMBER, answers.EMAIL, answers.NATIONAL_ID_NUMBER]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .join("|");
    const isDuplicate = ["existing_application", "existing_draft"].includes(draftSaveStatusRef.current);
    if (isDuplicate && duplicateIdentityRef.current === identityKey) return;

    if (!hasEnoughInformationForPortalDraft({ answers })) {
      setDraftSaveStatus("waiting_for_mobile");
      setDraftSaveMessage(WAITING_FOR_CONTACT_MESSAGE);
      return;
    }

    let isCurrentSave = true;
    const saveTimeout = window.setTimeout(async () => {
      try {
        // While changed details are rechecked, keep the duplicate block in place until the server clears it.
        if (!isDuplicate) {
          setDraftSaveStatus("saving");
          setDraftSaveMessage("Saving draft to the portal...");
        }

        const response = await axios.post(`${API_BASE_URL}/api/registrations/drafts`, {
          draftReference: serverDraftReference || undefined,
          draftToken: serverDraftToken || undefined,
          pathway: selectedPathway.id,
          documentType,
          currentStep,
          answers: {
            ...answers,
            COURSE_APPLIED_FOR: selectedPathway.title,
          },
        });

        if (!isCurrentSave) return;

        const savedDraft = response.data?.data || {};
        setServerDraftReference(savedDraft.draftReference || serverDraftReference || "");
        if (savedDraft.draftToken) setServerDraftToken(savedDraft.draftToken);
        setPortalDraftLastSavedAt(savedDraft.lastSavedAt || savedDraft.savedAt || new Date().toISOString());
        duplicateIdentityRef.current = "";
        setDraftSaveStatus("saved");
        setDraftSaveMessage("Draft saved to the portal.");
      } catch (error) {
        if (!isCurrentSave) return;
        const apiMessage = error.response?.data?.message;
        // Tell the applicant straight away, before they fill in the rest of the form.
        const reasonCode = error.response?.data?.reasonCode;
        if (reasonCode === "APPLICATION_EXISTS" || reasonCode === "DRAFT_EXISTS") {
          duplicateIdentityRef.current = identityKey;
          setDraftSaveStatus(reasonCode === "DRAFT_EXISTS" ? "existing_draft" : "existing_application");
          setDraftSaveMessage(apiMessage);
          return;
        }
        if (reasonCode === "DRAFT_LOCKED" || reasonCode === "DRAFT_CLOSED") {
          setDraftSaveStatus("locked");
          setDraftSaveMessage(apiMessage);
          return;
        }
        // A failed recheck (network error, rate limit) must not lift an existing duplicate block.
        if (isDuplicate) return;
        setDraftSaveStatus("error");
        setDraftSaveMessage(apiMessage || "Draft is still saved on this device, but it could not be saved to the portal.");
      }
    }, 1200);

    return () => {
      isCurrentSave = false;
      window.clearTimeout(saveTimeout);
    };
  }, [answers, currentStep, documentType, selectedPathway, serverDraftReference, serverDraftToken]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!selectedPathway) return;

    async function fetchQuestions() {
      try {
        setLoadingQuestions(true);
        setErrorMessage("");
        setFieldErrors({});

        const response = await axios.get(`${API_BASE_URL}/api/registrations/form/questions`, {
          params: { pathway: selectedPathway.id },
        });
        setQuestions(response.data.questions || []);
        setAnswers((previousAnswers) => ({
          ...previousAnswers,
          COURSE_APPLIED_FOR: selectedPathway.title,
          APPLICATION_FORM_VERSION: response.data.formVersion || "",
        }));
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load the Application form. Please try again.");
      } finally {
        setLoadingQuestions(false);
      }
    }

    fetchQuestions();
  }, [selectedPathway]);

  const groupedQuestions = useMemo(() => {
    const visibleQuestions = questions.filter((question) => shouldIncludeQuestionInApplicantView(question, answers));
    return groupQuestionsBySection(visibleQuestions);
  }, [questions, answers]);

  const formProgress = useMemo(
    () => calculateFormProgress({ groupedQuestions, answers }),
    [groupedQuestions, answers]
  );

  // Opens a draft saved on the portal (found on the status page after an email code) on this device.
  function resumeSavedDraft(pathway, draft) {
    const payload = {
      // A portal draft is saved only after consent, from the application form itself.
      answers: { ...(draft.answers || {}), ENTRY_STAGE: draft.answers?.ENTRY_STAGE || "application" },
      documentType: draft.documentType,
      draftReference: draft.draftReference,
      draftToken: draft.draftToken,
      currentStep: draft.currentStep || 0,
    };
    // Storage can be unavailable (private mode); the draft is still restored below for this visit.
    writeDeviceDraft(pathway.id, payload);

    setPathwayMessage("");
    setSubmitResult(null);
    setErrorMessage("");
    setFieldErrors({});
    setDocuments([]);

    if (selectedPathway?.id === pathway.id) {
      restoreDraft(payload);
      return;
    }
    // A new pathway key makes useLocalDraft restore the payload written above.
    setServerDraftReference("");
    setServerDraftToken("");
    setCurrentStep(0);
    setAnswers({ COURSE_APPLIED_FOR: pathway.title });
    setSelectedPathway(pathway);
  }

  function handlePathwaySelect(pathway) {
    // Navigating back to the same pathway resumes the in-progress draft.
    if (selectedPathway?.id === pathway.id && !submitResult && pathway.status === "open") {
      setPathwayMessage("");
      return;
    }

    setPathwayMessage("");
    setSubmitResult(null);
    setErrorMessage("");
    setFieldErrors({});
    setServerDraftReference("");
    setServerDraftToken("");
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage(WAITING_FOR_CONTACT_MESSAGE);
    setCurrentStep(0);

    if (pathway.status !== "open") {
      setPathwayMessage(`${pathway.title} is not yet open for applications.`);
      return;
    }

    setSelectedPathway(pathway);
    setAnswers((previousAnswers) => ({
      ...(selectedPathway?.id === pathway.id ? previousAnswers : {}),
      COURSE_APPLIED_FOR: pathway.title,
    }));
    if (selectedPathway?.id !== pathway.id) setDocuments([]);
  }

  function handleBackToPathways() {
    clearAllDeviceDrafts();
    duplicateIdentityRef.current = "";
    setSelectedPathway(null);
    setAnswers({});
    setDocuments([]);
    setSubmitResult(null);
    setErrorMessage("");
    setFieldErrors({});
    setPathwayMessage("");
    setServerDraftReference("");
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage(WAITING_FOR_CONTACT_MESSAGE);
    setCurrentStep(0);
  }

  function handleAnswerChange(question, value) {
    const dependentQuestionCodes = LOCATION_DEPENDENT_QUESTIONS[question.questionCode] || [];

    setAnswers((previousAnswers) => {
      const nextAnswers = {
        ...previousAnswers,
        [question.questionCode]: value,
      };

      clearDependentLocationAnswers(question.questionCode, nextAnswers);
      return nextAnswers;
    });

    setFieldErrors((previousErrors) => {
      const updatedErrors = { ...previousErrors };
      delete updatedErrors[question.questionCode];
      dependentQuestionCodes.forEach((questionCode) => delete updatedErrors[questionCode]);
      return updatedErrors;
    });

    if (errorMessage) setErrorMessage("");
  }

  function handleMultiSelectChange(question, option) {
    const currentValues = Array.isArray(answers[question.questionCode]) ? answers[question.questionCode] : [];
    const exclusive = question.metadata?.exclusiveOptions || [];
    // Choosing "None of the above" clears the other choices, and choosing another clears it.
    const updatedValues = currentValues.includes(option)
      ? currentValues.filter((item) => item !== option)
      : exclusive.includes(option)
        ? [option]
        : [...currentValues.filter((item) => !exclusive.includes(item)), option];

    handleAnswerChange(question, updatedValues);
  }

  function buildResponsesPayload() {
    const formResponses = questions
      .filter((question) => shouldIncludeQuestionInSubmission(question, answers))
      .map((question) => ({
        questionCode: question.questionCode,
        questionNumber: question.questionNumber,
        questionText: resolveQuestionText(question, answers),
        section: question.section,
        responseType: question.responseType,
        answer: answers[question.questionCode] === undefined ? null : answers[question.questionCode],
      }));

    const supplementalConsentResponses = SUPPLEMENTAL_CONSENT_RESPONSES
      .filter((question) => answers[question.questionCode] !== undefined && answers[question.questionCode] !== null && answers[question.questionCode] !== "")
      .map((question) => ({
        ...question,
        questionNumber: null,
        answer: answers[question.questionCode],
      }));

    return [...formResponses, ...supplementalConsentResponses];
  }

  function scrollToFormErrors() {
    window.requestAnimationFrame(() => {
      const errorElement = document.querySelector(".ss-error-summary, .ss-question-card.has-error");
      errorElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleValidateQuestions(questionList) {
    const validationErrors = validateAnswers({ questions: questionList, answers, isQuestionVisible });

    setFieldErrors((previousErrors) => {
      const updatedErrors = { ...previousErrors };
      questionList.forEach((question) => delete updatedErrors[question.questionCode]);
      return { ...updatedErrors, ...validationErrors };
    });

    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      setErrorMessage("Please complete the highlighted questions in this section before continuing.");
      return false;
    }

    setErrorMessage("");
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitResult(null);
    setErrorMessage("");

    const validationErrors = validateAnswers({
      questions: questions.filter((question) => shouldIncludeQuestionInApplicantView(question, answers)),
      answers,
      isQuestionVisible,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setErrorMessage("Please correct the highlighted fields before submitting.");
      scrollToFormErrors();
      return;
    }

    setFieldErrors({});

    try {
      setSubmitting(true);
      const formData = new FormData();

      formData.append("pathway", selectedPathway.id);
      formData.append("registrationMode", selectedPathway.mode);
      formData.append("documentType", documentType);
      if (serverDraftReference) formData.append("draftReference", serverDraftReference);
      if (serverDraftToken) formData.append("draftToken", serverDraftToken);
      formData.append("responses", JSON.stringify(buildResponsesPayload()));

      for (const file of documents) formData.append("documents", file);

      const response = await axios.post(`${API_BASE_URL}/api/registrations`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const normalizedResult = normalizeSubmissionResult(response.data, selectedPathway, answers.CONTACT_NUMBER);
      setSubmitResult(normalizedResult);
      setAnswers({});
      setDocuments([]);
      setFieldErrors({});
      clearDraft();
      setServerDraftReference("");
      setServerDraftToken("");
      setPortalDraftLastSavedAt(null);
      setDraftSaveStatus("submitted");
      setDraftSaveMessage("Application submitted. Draft closed.");
      setCurrentStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      const responseData = error.response?.data || {};

      if (error.response?.status === 409 && responseData.duplicate) {
        const duplicateResult = normalizeSubmissionResult({ ...responseData, duplicate: true }, selectedPathway, answers.CONTACT_NUMBER);
        setSubmitResult(duplicateResult);
        setAnswers({});
        setDocuments([]);
        setFieldErrors({});
        clearDraft();
        setServerDraftReference("");
        setServerDraftToken("");
        setPortalDraftLastSavedAt(null);
        setDraftSaveStatus("submitted");
        setDraftSaveMessage("Application submitted. Draft closed.");
        setCurrentStep(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (Array.isArray(responseData.missingRequiredQuestions)) {
        const missingErrors = responseData.missingRequiredQuestions.reduce((accumulator, item) => {
          const question = questions.find((entry) => entry.questionCode === item.questionCode) || item;
          accumulator[item.questionCode] = `${resolveQuestionText(question, answers)} is required.`;
          return accumulator;
        }, {});
        setFieldErrors(missingErrors);
      }

      if (Array.isArray(responseData.invalidQuestions)) {
        const formatErrors = responseData.invalidQuestions.reduce((accumulator, item) => {
          const question = questions.find((entry) => entry.questionCode === item.questionCode) || item;
          accumulator[item.questionCode] = item.message || `${resolveQuestionText(question, answers)} is not valid.`;
          return accumulator;
        }, {});
        setFieldErrors(formatErrors);
      }

      const apiMessage = responseData.message || responseData.error || "Failed to submit Application. Please try again.";
      setErrorMessage(apiMessage);
      scrollToFormErrors();
    } finally {
      setSubmitting(false);
    }
  }

  // Deletes the portal copy too, so the mobile number, email and ID are free for a new application.
  async function discardPortalDraft() {
    if (!serverDraftReference || !serverDraftToken) return true;
    try {
      await axios.post(`${API_BASE_URL}/api/registrations/drafts/discard`, {
        draftReference: serverDraftReference,
        draftToken: serverDraftToken,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function handleClearDraft() {
    const deleted = await discardPortalDraft();
    clearDraft();
    setAnswers(selectedPathway ? { COURSE_APPLIED_FOR: selectedPathway.title } : {});
    setDocuments([]);
    setDocumentType("DISABILITY_DOCUMENT");
    setServerDraftReference("");
    setServerDraftToken("");
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage(
      deleted
        ? "Your answers were deleted from this browser and from the portal."
        : "Your answers were deleted from this browser. We could not reach the portal to delete the saved copy; it will be deleted automatically if you do not continue it."
    );
    setCurrentStep(0);
    setFieldErrors({});
    setErrorMessage("");
    return deleted;
  }

  // Switching pathway: one application at a time, so the current one is deleted everywhere.
  async function discardForPathwaySwitch() {
    await discardPortalDraft();
    clearAllDeviceDrafts();
  }

  /*
    Leaves the application and removes it from this browser (Exit button, or no activity on a
    shared computer). Returns whether the answers are saved on the portal, so the applicant can
    be told how to continue.
  */
  function exitAndClearDevice() {
    const savedOnPortal = Boolean(serverDraftReference) && draftSaveStatus === "saved";
    clearAllDeviceDrafts();
    setSelectedPathway(null);
    setQuestions([]);
    setAnswers({});
    setDocuments([]);
    setDocumentType("DISABILITY_DOCUMENT");
    setSubmitResult(null);
    setServerDraftReference("");
    setServerDraftToken("");
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage(WAITING_FOR_CONTACT_MESSAGE);
    setCurrentStep(0);
    setFieldErrors({});
    setErrorMessage("");
    setPathwayMessage("");
    return { savedOnPortal };
  }

  return {
    selectedPathway,
    groupedQuestions,
    answers,
    documents,
    documentType,
    loadingQuestions,
    submitting,
    submitResult,
    errorMessage,
    fieldErrors,
    pathwayMessage,
    formProgress,
    draftLastSavedAt: portalDraftLastSavedAt || draftLastSavedAt,
    localDraftLastSavedAt: draftLastSavedAt,
    portalDraftLastSavedAt,
    draftReference: serverDraftReference,
    resumeSavedDraft,
    draftSaveStatus,
    draftSaveMessage,
    currentStep,
    handlePathwaySelect,
    handleBackToPathways,
    handleAnswerChange,
    handleMultiSelectChange,
    handleSubmit,
    handleValidateQuestions,
    handleClearDraft,
    discardForPathwaySwitch,
    exitAndClearDevice,
    handleCurrentStepChange: setCurrentStep,
    setDocuments,
    setDocumentType,
  };
}
