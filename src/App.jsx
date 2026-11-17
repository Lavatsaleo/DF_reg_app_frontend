import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import AccessibilityMenu from "./components/AccessibilityMenu";
import AppNavbar from "./components/AppNavbar";
import ConfirmDialog from "./components/ConfirmDialog";
import InactivityDialog from "./components/InactivityDialog";
import SiteFooter from "./components/SiteFooter";
import LandingPage from "./pages/LandingPage";
import ContextualApplicationPage from "./pages/ContextualApplicationPage";
// Only the home page and the application form load up front. Every other page is downloaded when it is
// first opened, so applicants on slow connections are not held up by the staff tools.
const StatusCheckPage = lazy(() => import("./pages/StatusCheckPage"));
const SkillsTestPage = lazy(() => import("./pages/SkillsTestPage"));
const ParticipantRegistrationPage = lazy(() => import("./pages/ParticipantRegistrationPage"));
const CommitteeDashboardPage = lazy(() => import("./pages/CommitteeDashboardPage"));
const ApplicationDashboardPage = lazy(() => import("./pages/ApplicationDashboardPage"));
const ConsentRecordsPage = lazy(() => import("./pages/ConsentRecordsPage"));
const StaffLoginPage = lazy(() => import("./pages/StaffLoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ParticipantsPage = lazy(() => import("./pages/ParticipantsPage"));
const ParticipantProfilePage = lazy(() => import("./pages/ParticipantProfilePage"));

import { useAccessibilityPreferences } from "./hooks/useAccessibilityPreferences";
import { useRegistrationForm } from "./hooks/useRegistrationForm";
import { useInactivityLock } from "./hooks/useInactivityLock";
import { clearRegistrationSession, purgeLegacyApplicantData, readDeviceDraft } from "./utils/deviceDraftStorage";
import { hasFinishedConsent, hasStartedBeforeConsent } from "./utils/applicationProgress";
import { clearStaffSession, loadStaffSession, saveStaffSession } from "./utils/staffAuthStorage";
import { pathways } from "./data/pathways";

function getInitialSkillsTestToken() {
  const match = window.location.pathname.match(/^\/basic-skills-test\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

// /staff/participants/<id> opens one profile; /staff/participants is the directory.
function getParticipantIdFromPath() {
  const match = window.location.pathname.match(/^\/staff\/participants\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

// Which staff page the address asks for.
function getRequestedStaffView() {
  const path = window.location.pathname;
  if (path.startsWith("/staff/participants")) return "participants";
  if (path.endsWith("dashboard")) return "dashboard";
  return "committee";
}

function getPasswordResetToken() {
  const match = window.location.pathname.match(/^\/reset-password\/([^/]+)\/?$/);
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

// An application is picked up again on return only once its consent and jurat are both signed.
function canResumeApplication(pathway) {
  return Boolean(pathway && hasFinishedConsent(readDeviceDraft(pathway.id)?.answers));
}

function staffView(session, requested = "committee") {
  if (!session?.token) return "staff-login";
  if (session.user?.role === "VIEWER") return "dashboard";
  if (requested === "participants" && ["ADMIN", "COUNTRY_ADMIN"].includes(session.user?.role)) return "participants";
  return requested === "dashboard" && session.user?.role === "ADMIN" ? "dashboard" : "committee";
}

function getInitialView() {
  if (getPasswordResetToken()) return "reset-password";
  if (window.location.pathname.startsWith("/staff/")) return staffView(loadStaffSession(), getRequestedStaffView());
  if (getInitialParticipantRegistrationToken()) return "participant-registration";
  if (getInitialSkillsTestToken() || window.location.pathname === "/basic-skills-test") return "skills-test";
  if (window.location.pathname === "/status") return "status";
  if (window.location.pathname === "/continue") return "continue";
  const linkedPathway = getPathwayFromBrowserPath();
  if (linkedPathway && canResumeApplication(linkedPathway)) return "application";
  // Consent not finished: start again from the home page.
  if (linkedPathway) window.history.replaceState({ digitalFutures: true }, "", "/");
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
  "reset-password": "Choose a new password",
  committee: "Committee workspace",
  dashboard: "Application dashboard",
  consents: "Signed consent records",
  participants: "Participants",
};

// Applicant pages close after this long with no activity (shared and public computers).
const INACTIVITY_WARN_AFTER_MS = 15 * 60 * 1000;
const INACTIVITY_GRACE_MS = 2 * 60 * 1000;

// Earlier versions left applicant answers in this browser's permanent storage: remove them.
purgeLegacyApplicantData();

// Shown while a page's code downloads.
function PageLoading() {
  return (
    <main id="main-content" className="df-page-loading" aria-busy="true">
      <span className="spinner-border" aria-hidden="true" />
      <p role="status">Loading…</p>
    </main>
  );
}

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
  const [participantId, setParticipantId] = useState(getParticipantIdFromPath);
  // A pathway switch waiting for the applicant to confirm in the dialog.
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);
  // A page change asked for before consent is finished, waiting for the applicant to confirm.
  const [pendingLeave, setPendingLeave] = useState(null);
  // Shown on the home page after an applicant page was closed (Exit, or no activity).
  const [privacyNotice, setPrivacyNotice] = useState("");
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

  // Before the consent and jurat are signed, leaving the application means starting again.
  const leavingLosesProgress = Boolean(
    currentView === "application" &&
      registration.selectedPathway &&
      !registration.submitResult &&
      hasStartedBeforeConsent(registration.answers)
  );
  const leaveState = useRef({ losesProgress: false, reset: () => {} });
  useEffect(() => {
    leaveState.current = { losesProgress: leavingLosesProgress, reset: registration.handleBackToPathways };
  });

  function requestLeave(action) {
    if (!leavingLosesProgress) {
      action();
      return;
    }
    setPendingLeave({ action });
  }

  function confirmLeave() {
    const action = pendingLeave?.action;
    setPendingLeave(null);
    registration.handleBackToPathways();
    action?.();
  }

  // For links and buttons that leave the application page.
  const guarded = (handler) => (handler ? (...args) => requestLeave(() => handler(...args)) : handler);

  // Any page holding an applicant's information closes itself when nobody is using it.
  const hasApplicationInMemory = Boolean(
    registration.selectedPathway &&
      (registration.submitResult ||
        Object.entries(registration.answers).some(([code, answer]) =>
          !["COURSE_APPLIED_FOR", "APPLICATION_FORM_VERSION"].includes(code) &&
          answer !== "" && answer != null && !(Array.isArray(answer) && answer.length === 0)
        ))
  );
  const inactivityLock = useInactivityLock({
    enabled: hasApplicationInMemory || ["status", "continue", "participant-registration"].includes(currentView),
    warnAfterMs: INACTIVITY_WARN_AFTER_MS,
    graceMs: INACTIVITY_GRACE_MS,
    onTimeout: () => handleExitApplication("timeout"),
  });

  // A direct link to /apply/<pathway> restores the same application and its local draft.
  useEffect(() => {
    const deepLinkedPathway = getPathwayFromBrowserPath();
    if (deepLinkedPathway) registration.handlePathwaySelect(deepLinkedPathway);
    // The popstate listener handles navigation after initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleBrowserNavigation() {
      if (leaveState.current.losesProgress && !getPathwayFromBrowserPath()) leaveState.current.reset();
      const participantRegistrationTokenFromPath = getInitialParticipantRegistrationToken();
      const invitedToken = getInitialSkillsTestToken();
      const pathway = getPathwayFromBrowserPath();
      if (getPasswordResetToken()) {
        setCurrentView("reset-password");
      } else if (participantRegistrationTokenFromPath) {
        setParticipantRegistrationToken(participantRegistrationTokenFromPath);
        setCurrentView("participant-registration");
      } else if (invitedToken || window.location.pathname === "/basic-skills-test") {
        setSkillsTestToken(invitedToken);
        setCurrentView("skills-test");
      } else if (pathway) {
        if (historySelectedPathway?.id !== pathway.id) historySelectPathway(pathway);
        setCurrentView("application");
      } else if (window.location.pathname.startsWith("/staff/")) {
        setParticipantId(getParticipantIdFromPath());
        setCurrentView(staffView(loadStaffSession(), getRequestedStaffView()));
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
    : currentView === "participants" && participantId
      ? "Participant profile"
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
    // Leaving the participant registration ends its session in this tab (a new code is needed to return).
    clearRegistrationSession();
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

  /*
    Leaves any applicant page and removes the applicant's information from this browser:
    the Exit button on the form, or no activity on a shared computer.
  */
  function handleExitApplication(reason = "exit") {
    const wasRegistration = currentView === "participant-registration";
    const { savedOnPortal } = registration.exitAndClearDevice();
    clearRegistrationSession();
    setPendingSwitch(null);
    setParticipantRegistrationToken("");
    setSkillsTestToken("");
    setSkillsTestReference("");
    navigateTo("/");
    setCurrentView("home");

    const opening = reason === "timeout"
      ? "For your privacy, we closed the page because it was not used for a while, and removed your information from this browser."
      : "You have left the application, and your information has been removed from this browser.";
    const howToContinue = wasRegistration
      ? "Your registration answers are saved. To continue, open the link in your email again and enter the new code we send you."
      : savedOnPortal
        ? "Your answers are saved on the portal. To continue, choose Continue my application and enter the code we email you."
        : "";
    setPrivacyNotice([opening, howToContinue, "On a shared computer, also close the browser when you finish."].filter(Boolean).join(" "));
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

  // Super admins: dashboard users and API keys live on the dashboard's "Access management" tab.
  function handleShowAccessManagement() {
    navigateTo("/staff/dashboard#access");
    setCurrentView(staffView(staffSession, "dashboard"));
  }

  function handleShowParticipants() {
    navigateTo("/staff/participants");
    setParticipantId("");
    setCurrentView(staffView(staffSession, "participants"));
  }

  function handleOpenParticipant(id) {
    navigateTo(`/staff/participants/${encodeURIComponent(id)}`);
    setParticipantId(id);
    setCurrentView("participants");
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

  // One application at a time: switching deletes the unfinished one (here and on the portal).
  async function confirmPathwaySwitch() {
    if (switching) return;
    setSwitching(true);
    setSwitchError("");
    await registration.discardForPathwaySwitch();
    setSwitching(false);
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
  const canViewParticipants = Boolean(staffSession?.token && ["ADMIN", "COUNTRY_ADMIN"].includes(staffSession?.user?.role));

  return (
    <>
      <a className="ss-skip-link" href="#main-content">Skip to main content</a>

      <AppNavbar
        selectedPathway={registration.selectedPathway}
        currentView={["staff-login", "reset-password"].includes(currentView) ? "committee" : currentView}
        onBackToPathways={guarded(handleShowHome)}
        onShowPortal={guarded(handleShowPortal)}
        onCheckStatus={guarded(handleShowStatus)}
        showStatusButton={showStatusButton}
        onShowCommittee={staffSession?.user?.role === "VIEWER" ? undefined : guarded(handleShowCommittee)}
        onShowDashboard={guarded(handleShowDashboard)}
        showDashboardButton={Boolean(staffSession?.token && ["ADMIN", "VIEWER"].includes(staffSession?.user?.role))}
        onShowConsents={guarded(handleShowConsents)}
        showConsentsButton={canViewConsentArchive}
        onShowParticipants={guarded(handleShowParticipants)}
        showParticipantsButton={canViewParticipants}
      />

      <AccessibilityMenu
        preferences={accessibility.preferences}
        onTogglePreference={accessibility.togglePreference}
        onSetPreference={accessibility.setPreference}
        onToggleProfile={accessibility.toggleProfile}
        onResetPreferences={accessibility.resetPreferences}
      />

      <Suspense fallback={<PageLoading />}>
      {currentView === "staff-login" ? (
        <StaffLoginPage onLogin={handleStaffLogin} onBackHome={handleShowHome} />
      ) : currentView === "reset-password" ? (
        <ResetPasswordPage
          token={getPasswordResetToken()}
          onBackToSignIn={() => {
            navigateTo("/staff/committee");
            setCurrentView(staffView(loadStaffSession()));
          }}
        />
      ) : currentView === "participants" && participantId ? (
        <ParticipantProfilePage
          key={participantId}
          participantId={participantId}
          token={staffSession?.token}
          onBack={handleShowParticipants}
          onSessionExpired={handleSessionExpired}
        />
      ) : currentView === "participants" ? (
        <ParticipantsPage
          token={staffSession?.token}
          staffUser={staffSession?.user}
          onOpenParticipant={handleOpenParticipant}
          onSessionExpired={handleSessionExpired}
        />
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
          onManageAccess={handleShowAccessManagement}
          onShowParticipants={handleShowParticipants}
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
          privacyNotice={privacyNotice}
          onDismissPrivacyNotice={() => setPrivacyNotice("")}
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
          onBackToPathways={guarded(handleShowHome)}
          onStartNewApplication={handleStartNewApplication}
          onCheckStatus={guarded(handleShowStatus)}
          onContinueApplication={guarded(handleShowContinue)}
          onTakeSkillsTest={handleShowSkillsTest}
          onAnswerChange={registration.handleAnswerChange}
          onMultiSelectChange={registration.handleMultiSelectChange}
          onSubmit={registration.handleSubmit}
          onValidateQuestions={registration.handleValidateQuestions}
          onDocumentsChange={registration.setDocuments}
          onDocumentTypeChange={registration.setDocumentType}
          onClearDraft={registration.handleClearDraft}
          onExitApplication={() => handleExitApplication("exit")}
          onStepChange={registration.handleCurrentStepChange}
        />
      )}
      </Suspense>

      {!["staff-login", "reset-password", "dashboard", "committee", "consents", "participants"].includes(currentView) && <SiteFooter />}

      <ConfirmDialog
        open={Boolean(pendingSwitch)}
        title="Switch to a different pathway?"
        confirmLabel={switching ? "Switching…" : pendingSwitch ? `Delete and switch to ${pendingSwitch.title}` : "Delete and switch"}
        cancelLabel={registration.selectedPathway ? `Stay on ${registration.selectedPathway.title}` : "Stay on this pathway"}
        error={switchError}
        onConfirm={confirmPathwaySwitch}
        onCancel={() => setPendingSwitch(null)}
      >
        <p>
          You have started an application for {registration.selectedPathway?.title}. You can apply for one pathway at a time.
        </p>
        <p>
          If you switch, your answers for {registration.selectedPathway?.title} will be deleted, from this browser and from the portal, and you will start a new application for {pendingSwitch?.title}.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(pendingLeave)}
        title="Leave before finishing the consent?"
        confirmLabel="Leave and start again later"
        cancelLabel="Stay and finish the consent"
        focusCancel
        onConfirm={confirmLeave}
        onCancel={() => setPendingLeave(null)}
      >
        <p>
          You have not finished signing the consent and the jurat yet. If you leave this page now, your progress will not be kept and you will start again from the beginning.
        </p>
      </ConfirmDialog>

      <InactivityDialog
        open={inactivityLock.warning}
        secondsLeft={inactivityLock.secondsLeft}
        detail={
          currentView === "participant-registration"
            ? "You can open the link in your email again to continue your registration."
            : registration.selectedPathway && hasApplicationInMemory && !registration.submitResult
              ? registration.draftSaveStatus === "saved"
                ? "Your answers are saved on the portal. You can continue later from Continue my application, with a code we email you."
                : "Your answers are not saved on the portal yet, so they will be lost. They are saved once you enter your mobile number and email address."
              : ""
        }
        onStay={inactivityLock.stayActive}
        onExit={() => handleExitApplication("exit")}
      />
    </>
  );
}

export default App;
