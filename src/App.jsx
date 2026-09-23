import { useEffect, useState } from "react";
import axios from "axios";
import AccessibilityToolbar from "./components/AccessibilityToolbar";
import AppNavbar from "./components/AppNavbar";
import LandingPage from "./pages/LandingPage";
import ContextualApplicationPage from "./pages/ContextualApplicationPage";
import StatusCheckPage from "./pages/StatusCheckPage";
import SkillsTestPage from "./pages/SkillsTestPage";
import CommitteeDashboardPage from "./pages/CommitteeDashboardPage";
import ConsentRecordsPage from "./pages/ConsentRecordsPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import { useAccessibilityPreferences } from "./hooks/useAccessibilityPreferences";
import { useRegistrationForm } from "./hooks/useRegistrationForm";
import { clearStaffSession, loadStaffSession, saveStaffSession } from "./utils/staffAuthStorage";
import { pathways } from "./data/pathways";

function getInitialSkillsTestToken() {
  const match = window.location.pathname.match(/^\/basic-skills-test\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

const PATHWAY_SLUGS = {
  PHYSICAL_ACADEMY: "physical-academy",
  VIRTUAL_ACADEMY: "virtual-academy",
};

function getPathwayFromBrowserPath() {
  const match = window.location.pathname.match(/^\/apply\/([^/]+)\/?$/);
  if (!match) return null;
  return pathways.find((pathway) => PATHWAY_SLUGS[pathway.id] === match[1] && pathway.status === "open") || null;
}

function getInitialView() {
  if (getInitialSkillsTestToken() || window.location.pathname === "/basic-skills-test") return "skills-test";
  if (window.location.pathname === "/status") return "status";
  if (getPathwayFromBrowserPath()) return "application";
  return "home";
}

function navigateTo(path) {
  if (window.location.pathname !== path) window.history.pushState({ digitalFutures: true }, "", path);
}

function configureAxiosAuth(token) {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
}

function App() {
  const registration = useRegistrationForm();
  const accessibility = useAccessibilityPreferences();
  const initialSkillsTestToken = getInitialSkillsTestToken();
  const [currentView, setCurrentView] = useState(getInitialView);
  const [skillsTestReference, setSkillsTestReference] = useState("");
  const [skillsTestToken, setSkillsTestToken] = useState(initialSkillsTestToken);
  const [staffSession, setStaffSession] = useState(() => loadStaffSession());

  useEffect(() => {
    configureAxiosAuth(staffSession?.token || "");
  }, [staffSession?.token]);

  useEffect(() => {
    const hasActiveApplication = Boolean(
      currentView === "application" && registration.selectedPathway && !registration.submitResult
    );

    if (!hasActiveApplication) return undefined;

    function protectApplicationProgress(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", protectApplicationProgress);
    return () => window.removeEventListener("beforeunload", protectApplicationProgress);
  }, [currentView, registration.selectedPathway, registration.submitResult]);

  // A direct link to /apply/<pathway> restores the same application and its local draft.
  useEffect(() => {
    const deepLinkedPathway = getPathwayFromBrowserPath();
    if (deepLinkedPathway) registration.handlePathwaySelect(deepLinkedPathway);
    // The popstate listener handles navigation after initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleBrowserNavigation() {
      const invitedToken = getInitialSkillsTestToken();
      const pathway = getPathwayFromBrowserPath();
      if (invitedToken || window.location.pathname === "/basic-skills-test") {
        setSkillsTestToken(invitedToken);
        setCurrentView("skills-test");
      } else if (pathway) {
        if (registration.selectedPathway?.id !== pathway.id) registration.handlePathwaySelect(pathway);
        setCurrentView("application");
      } else if (window.location.pathname === "/status") {
        setCurrentView("status");
      } else {
        setCurrentView("home");
      }
    }
    window.addEventListener("popstate", handleBrowserNavigation);
    return () => window.removeEventListener("popstate", handleBrowserNavigation);
  }, [registration.selectedPathway]);

  // NVDA should encounter the heading before the applicant-support card.
  useEffect(() => {
    if (currentView !== "status") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById("status-page-title");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentView]);

  function handleShowHome() {
    navigateTo("/");
    setCurrentView("home");
    setSkillsTestReference("");
    setSkillsTestToken("");
    // Keep the selected pathway and all draft answers while returning to the homepage.
  }

  function handleStartNewApplication() {
    registration.handleBackToPathways();
    handleShowHome();
  }

  function handleShowStatus() {
    navigateTo("/status");
    setCurrentView("status");
    setSkillsTestReference("");
    setSkillsTestToken("");
  }

  function handleShowCommittee() {
    navigateTo("/");
    setCurrentView(staffSession?.token ? "committee" : "staff-login");
    setSkillsTestReference("");
    setSkillsTestToken("");
  }

  function handleShowConsents() {
    navigateTo("/");
    if (!staffSession?.token) {
      setCurrentView("staff-login");
      return;
    }
    if (staffSession?.user?.role !== "ADMIN") {
      setCurrentView("committee");
      return;
    }
    setCurrentView("consents");
  }

  function handleStaffLogin(session) {
    saveStaffSession(session);
    configureAxiosAuth(session.token);
    setStaffSession(session);
    setCurrentView("committee");
  }

  function handleStaffLogout() {
    clearStaffSession();
    configureAxiosAuth("");
    setStaffSession(null);
    setCurrentView("staff-login");
  }

  function handleSessionExpired() {
    clearStaffSession();
    configureAxiosAuth("");
    setStaffSession(null);
    setCurrentView("staff-login");
  }

  function handleShowSkillsTest(reference = "") {
    navigateTo("/basic-skills-test");
    setCurrentView("skills-test");
    setSkillsTestReference(reference || "");
    setSkillsTestToken("");
  }

  function handlePathwaySelect(pathway) {
    if (pathway.status !== "open" || !PATHWAY_SLUGS[pathway.id]) {
      registration.handlePathwaySelect(pathway);
      return;
    }

    const switchingDraft = registration.selectedPathway &&
      registration.selectedPathway.id !== pathway.id && !registration.submitResult &&
      Object.entries(registration.answers).some(([code, answer]) =>
        code !== "COURSE_APPLIED_FOR" && answer !== "" && answer != null
      );

    if (switchingDraft) {
      const confirmed = window.confirm(
        "Switching pathways will start a different application. Save your current progress on this device and switch?"
      );
      if (!confirmed) return;

      // The normal autosave is debounced; persist answers synchronously before switching.
      try {
        const storageKey = "sightsavers-registration-draft-" + registration.selectedPathway.id;
        window.localStorage.setItem(storageKey, JSON.stringify({
          answers: registration.answers,
          documentType: registration.documentType,
          draftReference: registration.draftReference,
          currentStep: registration.currentStep,
          savedAt: new Date().toISOString(),
        }));
      } catch {
        window.alert("Unable to save the current draft on this device. Please stay on this pathway and try again.");
        return;
      }
    }

    registration.handlePathwaySelect(pathway);
    navigateTo("/apply/" + PATHWAY_SLUGS[pathway.id]);
    setCurrentView("application");
  }

  const showStatusButton = !(
    registration.submitResult?.hideApplicationReference === true ||
    registration.submitResult?.status === "INELIGIBLE" ||
    registration.submitResult?.screeningStatus === "NOT_ELIGIBLE"
  );
  const canViewConsentArchive = staffSession?.user?.role === "ADMIN";

  return (
    <>
      <a className="ss-skip-link" href="#main-content">Skip to main content</a>

      <AppNavbar
        selectedPathway={registration.selectedPathway}
        currentView={currentView === "staff-login" ? "committee" : currentView}
        onBackToPathways={handleShowHome}
        onCheckStatus={handleShowStatus}
        showStatusButton={showStatusButton}
        onShowCommittee={handleShowCommittee}
        onShowConsents={handleShowConsents}
        showConsentsButton={canViewConsentArchive}
      />

      <AccessibilityToolbar
        preferences={accessibility.preferences}
        onTogglePreference={accessibility.togglePreference}
        onResetPreferences={accessibility.resetPreferences}
      />

      {currentView === "staff-login" ? (
        <StaffLoginPage onLogin={handleStaffLogin} onBackHome={handleShowHome} />
      ) : currentView === "committee" ? (
        <CommitteeDashboardPage
          staffUser={staffSession?.user}
          onBackHome={handleShowHome}
          onStaffLogout={handleStaffLogout}
          onSessionExpired={handleSessionExpired}
        />
      ) : currentView === "consents" ? (
        <ConsentRecordsPage
          onBack={handleShowCommittee}
          onSessionExpired={handleSessionExpired}
        />
      ) : currentView === "status" ? (
        <StatusCheckPage
          onBackHome={handleShowHome}
          onStartApplication={handleShowHome}
          onTakeSkillsTest={handleShowSkillsTest}
        />
      ) : currentView === "skills-test" ? (
        <SkillsTestPage
          initialReference={skillsTestReference}
          initialToken={skillsTestToken}
          onBackHome={handleShowHome}
          onCheckStatus={handleShowStatus}
        />
      ) : currentView !== "application" || !registration.selectedPathway ? (
        <LandingPage
          pathwayMessage={registration.pathwayMessage}
          onPathwaySelect={handlePathwaySelect}
          onCheckStatus={handleShowStatus}
        />
      ) : (
        <ContextualApplicationPage
          selectedPathway={registration.selectedPathway}
          groupedQuestions={registration.groupedQuestions}
          answers={registration.answers}
          documents={registration.documents}
          documentType={registration.documentType}
          loadingQuestions={registration.loadingQuestions}
          submitting={registration.submitting}
          submitResult={registration.submitResult}
          errorMessage={registration.errorMessage}
          fieldErrors={registration.fieldErrors}
          formProgress={registration.formProgress}
          draftLastSavedAt={registration.draftLastSavedAt}
          draftReference={registration.draftReference}
          draftSaveStatus={registration.draftSaveStatus}
          draftSaveMessage={registration.draftSaveMessage}
          currentStep={registration.currentStep}
          onBackToPathways={handleShowHome}
          onStartNewApplication={handleStartNewApplication}
          onCheckStatus={handleShowStatus}
          onTakeSkillsTest={handleShowSkillsTest}
          onAnswerChange={registration.handleAnswerChange}
          onMultiSelectChange={registration.handleMultiSelectChange}
          onSubmit={registration.handleSubmit}
          onValidateQuestions={registration.handleValidateQuestions}
          onDocumentsChange={registration.setDocuments}
          onDocumentTypeChange={registration.setDocumentType}
          onClearDraft={registration.handleClearDraft}
          onStepChange={registration.handleCurrentStepChange}
        />
      )}
    </>
  );
}

export default App;
