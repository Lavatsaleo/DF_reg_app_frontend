import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import AccessibilityMenu from "./components/AccessibilityMenu";
import AppNavbar from "./components/AppNavbar";
import ConfirmDialog from "./components/ConfirmDialog";
import SiteFooter from "./components/SiteFooter";
import LandingPage from "./pages/LandingPage";
import ContextualApplicationPage from "./pages/ContextualApplicationPage";
import StatusCheckPage from "./pages/StatusCheckPage";
import SkillsTestPage from "./pages/SkillsTestPage";
import ParticipantRegistrationPage from "./pages/ParticipantRegistrationPage";
import CommitteeDashboardPage from "./pages/CommitteeDashboardPage";
import ApplicationDashboardPage from "./pages/ApplicationDashboardPage";
import ConsentRecordsPage from "./pages/ConsentRecordsPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import { useAccessibilityPreferences } from "./hooks/useAccessibilityPreferences";
import { DRAFT_STORAGE_PREFIX, useRegistrationForm } from "./hooks/useRegistrationForm";
import { clearStaffSession, loadStaffSession, saveStaffSession } from "./utils/staffAuthStorage";
import { pathways } from "./data/pathways";

function getInitialSkillsTestToken() {
  const match = window.location.pathname.match(/^\/basic-skills-test\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getInitialParticipantRegistrationToken() {
  const match = window.location.pathname.match(/^\/participant-registration\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

const PATHWAY_SLUGS = {
  PHYSICAL_ACADEMY: "physical-academy",
  VIRTUAL_ACADEMY: "virtual-academy",
  DIGITAL_ENTREPRENEURSHIP: "digital-entrepreneurship",
};

function getPathwayFromBrowserPath() {
  const match = window.location.pathname.match(/^\/apply\/([^/]+)\/?$/);
  if (!match) return null;
  return pathways.find((pathway) => PATHWAY_SLUGS[pathway.id] === match[1] && pathway.status === "open") || null;
}

function staffView(session, requested = "committee") {
  if (!session?.token) return "staff-login";
  if (session.user?.role === "VIEWER") return "dashboard";
  return requested === "dashboard" && session.user?.role === "ADMIN" ? "dashboard" : "committee";
}

function getInitialView() {
  if (window.location.pathname.startsWith("/staff/")) return staffView(loadStaffSession(), window.location.pathname.endsWith("dashboard") ? "dashboard" : "committee");
  if (getInitialParticipantRegistrationToken()) return "participant-registration";
  if (getInitialSkillsTestToken() || window.location.pathname === "/basic-skills-test") return "skills-test";
  if (window.location.pathname === "/status") return "status";
  if (window.location.pathname === "/continue") return "continue";
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

// Child pages fetch in their own effects, which run before App's; attach the saved token before the first render.
function loadInitialStaffSession() {
  const session = loadStaffSession();
  configureAxiosAuth(session?.token || "");
  return session;
}

const VIEW_TITLES = {
  home: "Apply for digital skills training",
  status: "Check your application status",
  continue: "Continue my application",
  "skills-test": "Basic IT skills test",
  "participant-registration": "Participant registration and baseline survey",
  "staff-login": "Staff sign in",
  committee: "Committee workspace",
  dashboard: "Application dashboard",
  consents: "Signed consent records",
};

function App() {
  const registration = useRegistrationForm();
  const { selectedPathway: historySelectedPathway, handlePathwaySelect: historySelectPathway } = registration;
  const accessibility = useAccessibilityPreferences();
  const initialSkillsTestToken = getInitialSkillsTestToken();
  const initialParticipantRegistrationToken = getInitialParticipantRegistrationToken();
  const [currentView, setCurrentView] = useState(getInitialView);
  const [skillsTestReference, setSkillsTestReference] = useState("");
  const [skillsTestToken, setSkillsTestToken] = useState(initialSkillsTestToken);
  const [participantRegistrationToken, setParticipantRegistrationToken] = useState(initialParticipantRegistrationToken);
  const [staffSession, setStaffSession] = useState(loadInitialStaffSession);
  // A pathway switch waiting for the applicant to confirm in the dialog.
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [switchError, setSwitchError] = useState("");
  // Where focus should land after the next view change, when not the page heading.
  const focusTargetAfterViewChange = useRef("");

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
      const participantRegistrationTokenFromPath = getInitialParticipantRegistrationToken();
      const invitedToken = getInitialSkillsTestToken();
      const pathway = getPathwayFromBrowserPath();
      if (participantRegistrationTokenFromPath) {
        setParticipantRegistrationToken(participantRegistrationTokenFromPath);
        setCurrentView("participant-registration");
      } else if (invitedToken || window.location.pathname === "/basic-skills-test") {
        setSkillsTestToken(invitedToken);
        setCurrentView("skills-test");
      } else if (pathway) {
        if (historySelectedPathway?.id !== pathway.id) historySelectPathway(pathway);
        setCurrentView("application");
      } else if (window.location.pathname.startsWith("/staff/")) {
        setCurrentView(staffView(loadStaffSession(), window.location.pathname.endsWith("dashboard") ? "dashboard" : "committee"));
      } else if (window.location.pathname === "/status") {
        setCurrentView("status");
      } else if (window.location.pathname === "/continue") {
        setCurrentView("continue");
      } else {
        setCurrentView("home");
      }
    }
    window.addEventListener("popstate", handleBrowserNavigation);
    return () => window.removeEventListener("popstate", handleBrowserNavigation);
  }, [historySelectedPathway, historySelectPathway]);

  // Screen readers announce the title, so each view gets its own.
  const pageTitle = currentView === "application" && registration.selectedPathway
    ? `${registration.selectedPathway.title} application`
    : VIEW_TITLES[currentView];
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | Digital Futures` : "Digital Futures";
  }, [pageTitle]);

  // A view change replaces the page without a reload, so move focus to the new heading unless the page already placed it.
  const previousView = useRef(currentView);
  useEffect(() => {
    if (previousView.current === currentView) return undefined;
    previousView.current = currentView;
    const frame = window.requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const requested = focusTargetAfterViewChange.current && document.getElementById(focusTargetAfterViewChange.current);
      focusTargetAfterViewChange.current = "";
      if (requested) {
        requested.scrollIntoView({ block: "start" });
        requested.focus({ preventScroll: true });
        return;
      }
      if (!main || main.contains(document.activeElement)) return;
      const heading = main.querySelector("h1") || main;
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      window.scrollTo(0, 0);
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentView]);

  // NVDA should encounter the heading before the applicant-support card.
  useEffect(() => {
    if (currentView !== "status" && currentView !== "continue") return undefined;
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
    setParticipantRegistrationToken("");
    // Keep the selected pathway and all draft answers while returning to the homepage.
  }

  // "Application Portal" always does something visible: it opens the pathway choices and moves focus there.
  function handleShowPortal() {
    if (currentView === "home") {
      const section = document.getElementById("pathways");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
      return;
    }
    focusTargetAfterViewChange.current = "pathways";
    handleShowHome();
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

  function handleShowContinue() {
    navigateTo("/continue");
    setCurrentView("continue");
  }

  function handleShowCommittee() {
    const next = staffView(staffSession);
    navigateTo(next === "dashboard" ? "/staff/dashboard" : "/staff/committee");
    setCurrentView(next);
    setSkillsTestReference("");
    setSkillsTestToken("");
  }

  function handleShowDashboard() {
    navigateTo("/staff/dashboard");
    setCurrentView(staffView(staffSession, "dashboard"));
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
    const next = staffView(session);
    navigateTo(next === "dashboard" ? "/staff/dashboard" : "/staff/committee");
    setCurrentView(next);
  }

  function handleStaffLogout() {
    clearStaffSession();
    configureAxiosAuth("");
    setStaffSession(null);
    setCurrentView("staff-login");
  }

  const handleSessionExpired = useCallback(() => {
    clearStaffSession();
    configureAxiosAuth("");
    setStaffSession(null);
    setCurrentView("staff-login");
  }, []);

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
      setSwitchError("");
      setPendingSwitch(pathway);
      return;
    }

    openPathway(pathway);
  }

  function openPathway(pathway) {
    registration.handlePathwaySelect(pathway);
    navigateTo("/apply/" + PATHWAY_SLUGS[pathway.id]);
    setCurrentView("application");
  }

  function confirmPathwaySwitch() {
    // The normal autosave is debounced; persist answers synchronously before switching.
    try {
      const storageKey = DRAFT_STORAGE_PREFIX + registration.selectedPathway.id;
      window.localStorage.setItem(storageKey, JSON.stringify({
        answers: registration.answers,
        documentType: registration.documentType,
        draftReference: registration.draftReference,
        currentStep: registration.currentStep,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      setSwitchError("We could not save your current application on this device. Please stay on this pathway and try again.");
      return;
    }
    const pathway = pendingSwitch;
    setPendingSwitch(null);
    openPathway(pathway);
  }

  // A saved draft found on the status page (after the email code) opens in the application form.
  function handleResumeDraft(draft) {
    const pathway = pathways.find((item) => item.id === draft.pathway && item.status === "open");
    if (!pathway || !PATHWAY_SLUGS[pathway.id]) return;
    registration.resumeSavedDraft(pathway, draft);
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
        onShowPortal={handleShowPortal}
        onCheckStatus={handleShowStatus}
        showStatusButton={showStatusButton}
        onShowCommittee={staffSession?.user?.role === "VIEWER" ? undefined : handleShowCommittee}
        onShowDashboard={handleShowDashboard}
        showDashboardButton={Boolean(staffSession?.token && ["ADMIN", "VIEWER"].includes(staffSession?.user?.role))}
        onShowConsents={handleShowConsents}
        showConsentsButton={canViewConsentArchive}
      />

      <AccessibilityMenu
        preferences={accessibility.preferences}
        onTogglePreference={accessibility.togglePreference}
        onSetPreference={accessibility.setPreference}
        onToggleProfile={accessibility.toggleProfile}
        onResetPreferences={accessibility.resetPreferences}
      />

      {currentView === "staff-login" ? (
        <StaffLoginPage onLogin={handleStaffLogin} onBackHome={handleShowHome} />
      ) : currentView === "dashboard" ? (
        <ApplicationDashboardPage
          staffUser={staffSession?.user}
          token={staffSession?.token}
          onStaffLogout={handleStaffLogout}
          onSessionExpired={handleSessionExpired}
          onShowCommittee={handleShowCommittee}
        />
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
      ) : currentView === "status" || currentView === "continue" ? (
        <StatusCheckPage
          key={currentView}
          mode={currentView}
          onBackHome={handleShowHome}
          onStartApplication={handleShowHome}
          onTakeSkillsTest={handleShowSkillsTest}
          onResumeDraft={handleResumeDraft}
        />
      ) : currentView === "skills-test" ? (
        <SkillsTestPage
          initialReference={skillsTestReference}
          initialToken={skillsTestToken}
          onBackHome={handleShowHome}
          onCheckStatus={handleShowStatus}
        />
      ) : currentView === "participant-registration" ? (
        <ParticipantRegistrationPage
          initialToken={participantRegistrationToken}
          onBackHome={handleShowHome}
          onCheckStatus={handleShowStatus}
        />
      ) : currentView !== "application" || !registration.selectedPathway ? (
        <LandingPage
          pathwayMessage={registration.pathwayMessage}
          onPathwaySelect={handlePathwaySelect}
          onCheckStatus={handleShowStatus}
          onContinueApplication={handleShowContinue}
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
          onContinueApplication={handleShowContinue}
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

      {!["staff-login", "dashboard", "committee", "consents"].includes(currentView) && <SiteFooter />}

      <ConfirmDialog
        open={Boolean(pendingSwitch)}
        title="Switch to a different pathway?"
        confirmLabel={pendingSwitch ? `Save and switch to ${pendingSwitch.title}` : "Save and switch"}
        cancelLabel={registration.selectedPathway ? `Stay on ${registration.selectedPathway.title}` : "Stay on this pathway"}
        error={switchError}
        onConfirm={confirmPathwaySwitch}
        onCancel={() => setPendingSwitch(null)}
      >
        <p>
          You have started an application for {registration.selectedPathway?.title}. You can apply for one pathway only.
        </p>
        <p>
          If you switch, we will save your current answers on this device so you can come back to them, and start a new application for {pendingSwitch?.title}.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default App;
