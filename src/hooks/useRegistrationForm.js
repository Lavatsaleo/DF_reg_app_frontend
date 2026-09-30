import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { groupQuestionsBySection, isQuestionVisible } from "../utils/formUtils";
import { calculateFormProgress, validateAnswers } from "../utils/validationUtils";
import { useLocalDraft } from "./useLocalDraft";
import { saveSubmittedApplication } from "../utils/applicationStatusStorage";
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

function hasEnoughInformationForPortalDraft({ draftReference, answers }) {
  if (draftReference) return true;
  return getDigitsOnly(answers?.CONTACT_NUMBER).length >= 7;
}

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
  const [portalDraftLastSavedAt, setPortalDraftLastSavedAt] = useState(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState("waiting_for_mobile");
  const [draftSaveMessage, setDraftSaveMessage] = useState(
    "Draft is saved on this device. Enter a mobile number to also save it to the portal."
  );
  const [currentStep, setCurrentStep] = useState(0);

  const draftStorageKey = selectedPathway
    ? `sightsavers-registration-draft-v4-${selectedPathway.id}`
    : "";

  const restoreDraft = useCallback((draft) => {
    if (draft.answers && Object.keys(draft.answers).length > 0) {
      setAnswers({
        ...draft.answers,
        ...(selectedPathway ? { COURSE_APPLIED_FOR: selectedPathway.title } : {}),
      });
    }

    if (draft.documentType) setDocumentType(draft.documentType);

    if (draft.draftReference) {
      setServerDraftReference(draft.draftReference);
      setDraftSaveStatus("saved");
      setDraftSaveMessage("Draft restored from this device and linked to the portal draft record.");
    }

    if (Number.isFinite(Number(draft.currentStep))) {
      setCurrentStep(Math.max(0, Number(draft.currentStep)));
    }
  }, [selectedPathway]);

  const { lastSavedAt: draftLastSavedAt, clearDraft } = useLocalDraft({
    storageKey: draftStorageKey,
    enabled: Boolean(selectedPathway),
    answers,
    documentType,
    draftReference: serverDraftReference,
    currentStep,
    onRestoreDraft: restoreDraft,
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
      setDraftSaveMessage("Draft is saved on this device. Enter a mobile number to also save it to the portal.");
      return;
    }

    if (!hasEnoughInformationForPortalDraft({ draftReference: serverDraftReference, answers })) {
      setDraftSaveStatus("waiting_for_mobile");
      setDraftSaveMessage("Draft is saved on this device. Enter a mobile number to also save it to the portal.");
      return;
    }

    let isCurrentSave = true;
    const saveTimeout = window.setTimeout(async () => {
      try {
        setDraftSaveStatus("saving");
        setDraftSaveMessage("Saving draft to the portal...");

        const response = await axios.post(`${API_BASE_URL}/api/registrations/drafts`, {
          draftReference: serverDraftReference || undefined,
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
        setPortalDraftLastSavedAt(savedDraft.lastSavedAt || savedDraft.savedAt || new Date().toISOString());
        setDraftSaveStatus("saved");
        setDraftSaveMessage("Draft saved to the portal.");
      } catch (error) {
        if (!isCurrentSave) return;
        const apiMessage = error.response?.data?.message;
        setDraftSaveStatus("error");
        setDraftSaveMessage(apiMessage || "Draft is still saved on this device, but it could not be saved to the portal.");
      }
    }, 1200);

    return () => {
      isCurrentSave = false;
      window.clearTimeout(saveTimeout);
    };
  }, [answers, currentStep, documentType, selectedPathway, serverDraftReference]);
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
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage("Draft is saved on this device. Enter a mobile number to also save it to the portal.");
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
    setDraftSaveMessage("Draft is saved on this device. Enter a mobile number to also save it to the portal.");
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
    const updatedValues = currentValues.includes(option)
      ? currentValues.filter((item) => item !== option)
      : [...currentValues, option];

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
      formData.append("responses", JSON.stringify(buildResponsesPayload()));

      for (const file of documents) formData.append("documents", file);

      const response = await axios.post(`${API_BASE_URL}/api/registrations`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const normalizedResult = normalizeSubmissionResult(response.data, selectedPathway, answers.CONTACT_NUMBER);
      saveSubmittedApplication(normalizedResult, selectedPathway);
      setSubmitResult(normalizedResult);
      setAnswers({});
      setDocuments([]);
      setFieldErrors({});
      clearDraft();
      setServerDraftReference("");
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
        saveSubmittedApplication(duplicateResult, selectedPathway);
        setSubmitResult(duplicateResult);
        setAnswers({});
        setDocuments([]);
        setFieldErrors({});
        clearDraft();
        setServerDraftReference("");
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

  function handleClearDraft() {
    clearDraft();
    setAnswers({});
    setDocuments([]);
    setDocumentType("DISABILITY_DOCUMENT");
    setServerDraftReference("");
    setPortalDraftLastSavedAt(null);
    setDraftSaveStatus("waiting_for_mobile");
    setDraftSaveMessage("Draft cleared from this device. Enter a mobile number to save a new draft to the portal.");
    setCurrentStep(0);
    setFieldErrors({});
    setErrorMessage("");
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
    handleCurrentStepChange: setCurrentStep,
    setDocuments,
    setDocumentType,
  };
}
