import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AccessibilityToolbar from "./components/AccessibilityToolbar";
import AppNavbar from "./components/AppNavbar";
import LandingPage from "./pages/LandingPage";
import RegistrationPage from "./pages/RegistrationPage";
import StatusCheckPage from "./pages/StatusCheckPage";
import SkillsTestPage from "./pages/SkillsTestPage";
import CommitteeDashboardPage from "./pages/CommitteeDashboardPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StaffSsoCompletePage from "./pages/StaffSsoCompletePage";
import { useAccessibilityPreferences } from "./hooks/useAccessibilityPreferences";
import { useRegistrationForm } from "./hooks/useRegistrationForm";
import { applyAuthToken, clearStaffSession, loadStaffSession, markStaffActivity } from "./utils/authSession";
import { API_BASE_URL } from "./config/api";

function getInitialSkillsTestToken() {
  const match = window.location.pathname.match(/^\/basic-skills-test\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getInitialPasswordResetToken() {
  const match = window.location.pathname.match(/^\/reset-password\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getInitialSsoResult() {
  if (window.location.pathname !== "/staff-sso") {
    return { token: "", error: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get("token") || "",
    error: params.get("error") || "",
  };
}

const DEFAULT_IDLE_TIMEOUT_MINUTES = Number(import.meta.env.VITE_STAFF_IDLE_TIMEOUT_MINUTES || 20);
const DEFAULT_IDLE_WARNING_SECONDS = Number(import.meta.env.VITE_STAFF_IDLE_WARNING_SECONDS || 60);

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${remainingSeconds} seconds`;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function App() {
  const registration = useRegistrationForm();
  const accessibility = useAccessibilityPreferences();
  const initialSkillsTestToken = getInitialSkillsTestToken();
  const initialPasswordResetToken = getInitialPasswordResetToken();
  const initialSsoResult = getInitialSsoResult();
  const initialView = initialSkillsTestToken
    ? "skills-test"
    : initialPasswordResetToken
      ? "reset-password"
      : (initialSsoResult.token || initialSsoResult.error)
        ? "sso-complete"
        : "home";
  const [currentView, setCurrentView] = useState(initialView);
  const [skillsTestReference, setSkillsTestReference] = useState("");
  const [skillsTestToken, setSkillsTestToken] = useState(initialSkillsTestToken);
  const [passwordResetToken, setPasswordResetToken] = useState(initialPasswordResetToken);
  const [ssoResult, setSsoResult] = useState(initialSsoResult);
  const [staffSession, setStaffSession] = useState(() => {
    const session = loadStaffSession();
    applyAuthToken(session?.token || "");
    return session;
  });
  const [sessionNotice, setSessionNotice] = useState("");
  const [idleConfig, setIdleConfig] = useState({
    timeoutMs: Math.max(5, DEFAULT_IDLE_TIMEOUT_MINUTES) * 60 * 1000,
    warningMs: Math.max(15, DEFAULT_IDLE_WARNING_SECONDS) * 1000,
  });
  const [lastStaffActivityAt, setLastStaffActivityAt] = useState(() => Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(0);

  function resetBrowserPath() {
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  }

  function handleShowHome() {
    resetBrowserPath();
    setCurrentView("home");
    setSkillsTestReference("");
    setSkillsTestToken("");
    setPasswordResetToken("");
    setSsoResult({ token: "", error: "" });
    registration.handleBackToPathways();
  }

  function handleShowStatus() {
    resetBrowserPath();
    setCurrentView("status");
    setSkillsTestReference("");
    setSkillsTestToken("");
    registration.handleBackToPathways();
  }


  function handleShowCommittee() {
    resetBrowserPath();
    setCurrentView("committee");
    setSkillsTestReference("");
    setSkillsTestToken("");
    registration.handleBackToPathways();
  }

  function handleShowSkillsTest(reference = "") {
    resetBrowserPath();
    setCurrentView("skills-test");
    setSkillsTestReference(reference || "");
    setSkillsTestToken("");
    registration.handleBackToPathways();
  }

  function handleResumeApplication(draft) {
    resetBrowserPath();
    setCurrentView("home");
    setSkillsTestReference("");
    setSkillsTestToken("");
    registration.handleResumeDraft(draft);
  }

  function handlePathwaySelect(pathway) {
    resetBrowserPath();
    setCurrentView("home");
    registration.handlePathwaySelect(pathway);
  }

  function handleStaffAuthenticated(session) {
    setStaffSession(session);
    setSessionNotice("");
    setShowIdleWarning(false);
    setLastStaffActivityAt(Date.now());
    markStaffActivity();
    setCurrentView("committee");
  }

  const handleStaffLogout = useCallback((options = {}) => {
    const reason = options?.reason || "";
    const stayOnStaffSignIn = Boolean(options?.stayOnStaffSignIn);

    clearStaffSession();
    setStaffSession(null);
    setShowIdleWarning(false);
    setIdleSecondsRemaining(0);
    setSessionNotice(reason);
    setCurrentView(stayOnStaffSignIn ? "committee" : "home");
  }, []);

  function handleContinueStaffSession() {
    setLastStaffActivityAt(Date.now());
    setShowIdleWarning(false);
    markStaffActivity();
  }

  function handleShowStaffSignIn() {
    resetBrowserPath();
    setPasswordResetToken("");
    setSsoResult({ token: "", error: "" });
    setCurrentView("committee");
  }

  useEffect(() => {
    if (!staffSession?.token) return undefined;

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleStaffLogout({
            reason: "Your session expired. Please sign in again.",
            stayOnStaffSignIn: true,
          });
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, [handleStaffLogout, staffSession?.token]);

  useEffect(() => {
    if (!staffSession?.token) return undefined;

    let cancelled = false;

    async function loadSessionConfig() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/session-config`);
        if (cancelled) return;

        const timeoutMinutes = Number(response.data?.idleTimeoutMinutes || DEFAULT_IDLE_TIMEOUT_MINUTES);
        const warningSeconds = Number(response.data?.idleWarningSeconds || DEFAULT_IDLE_WARNING_SECONDS);

        setIdleConfig({
          timeoutMs: Math.max(5, timeoutMinutes) * 60 * 1000,
          warningMs: Math.max(15, warningSeconds) * 1000,
        });
      } catch {
        if (!cancelled) {
          setIdleConfig({
            timeoutMs: Math.max(5, DEFAULT_IDLE_TIMEOUT_MINUTES) * 60 * 1000,
            warningMs: Math.max(15, DEFAULT_IDLE_WARNING_SECONDS) * 1000,
          });
        }
      }
    }

    loadSessionConfig();

    return () => {
      cancelled = true;
    };
  }, [staffSession?.token]);

  useEffect(() => {
    if (!staffSession?.token) return undefined;

    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    const handleActivity = () => {
      setLastStaffActivityAt(Date.now());
      setShowIdleWarning(false);
      markStaffActivity();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [staffSession?.token]);

  useEffect(() => {
    if (!staffSession?.token) return undefined;

    const intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - lastStaffActivityAt;
      const remainingMs = idleConfig.timeoutMs - elapsedMs;

      if (remainingMs <= 0) {
        handleStaffLogout({
          reason: "You were signed out because there was no activity for a while.",
          stayOnStaffSignIn: true,
        });
        return;
      }

      if (remainingMs <= idleConfig.warningMs) {
        setIdleSecondsRemaining(Math.ceil(remainingMs / 1000));
        setShowIdleWarning(true);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [handleStaffLogout, idleConfig, lastStaffActivityAt, staffSession?.token]);

  const showStatusButton = !(
    registration.submitResult?.hideApplicationReference === true ||
    registration.submitResult?.status === "INELIGIBLE" ||
    registration.submitResult?.screeningStatus === "NOT_ELIGIBLE"
  );

  return (
    <>
      <a className="ss-skip-link" href="#main-content">
        Skip to main content
      </a>

      <AppNavbar
        selectedPathway={registration.selectedPathway}
        currentView={currentView}
        onBackToPathways={handleShowHome}
        onCheckStatus={handleShowStatus}
        showStatusButton={showStatusButton}
        onShowCommittee={handleShowCommittee}
        staffUser={staffSession?.user}
        onStaffLogout={handleStaffLogout}
      />

      <AccessibilityToolbar
        preferences={accessibility.preferences}
        onTogglePreference={accessibility.togglePreference}
        onResetPreferences={accessibility.resetPreferences}
      />

      {currentView === "reset-password" ? (
        <ResetPasswordPage
          token={passwordResetToken}
          onBackToSignIn={handleShowStaffSignIn}
        />
      ) : currentView === "sso-complete" ? (
        <StaffSsoCompletePage
          token={ssoResult.token}
          error={ssoResult.error}
          onAuthenticated={handleStaffAuthenticated}
          onBackToSignIn={handleShowStaffSignIn}
        />
      ) : currentView === "committee" ? (
        staffSession?.token ? (
          <CommitteeDashboardPage
            onBackHome={handleShowHome}
            currentUser={staffSession.user}
            onLogout={handleStaffLogout}
          />
        ) : (
          <StaffLoginPage
            onBackHome={handleShowHome}
            onAuthenticated={handleStaffAuthenticated}
            sessionNotice={sessionNotice}
          />
        )
      ) : currentView === "status" ? (
        <StatusCheckPage
          onBackHome={handleShowHome}
          onStartApplication={handleShowHome}
          onTakeSkillsTest={handleShowSkillsTest}
          onResumeApplication={handleResumeApplication}
        />
      ) : currentView === "skills-test" ? (
        <SkillsTestPage
          initialReference={skillsTestReference}
          initialToken={skillsTestToken}
          onBackHome={handleShowHome}
          onCheckStatus={handleShowStatus}
        />
      ) : !registration.selectedPathway ? (
        <LandingPage
          pathwayMessage={registration.pathwayMessage}
          onPathwaySelect={handlePathwaySelect}
          onCheckStatus={handleShowStatus}
        />
      ) : (
        <RegistrationPage
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
          serverDraftReference={registration.serverDraftReference}
          serverDraftLastSavedAt={registration.serverDraftLastSavedAt}
          serverDraftMessage={registration.serverDraftMessage}
          savingServerDraft={registration.savingServerDraft}
          onBackToPathways={handleShowHome}
          onCheckStatus={handleShowStatus}
          onTakeSkillsTest={handleShowSkillsTest}
          onAnswerChange={registration.handleAnswerChange}
          onMultiSelectChange={registration.handleMultiSelectChange}
          onSubmit={registration.handleSubmit}
          onValidateQuestions={registration.handleValidateQuestions}
          onDocumentsChange={registration.setDocuments}
          onDocumentTypeChange={registration.setDocumentType}
          onClearDraft={registration.handleClearDraft}
          onSaveDraftNow={registration.handleSaveDraftNow}
          onSectionComplete={registration.handleSectionComplete}
        />
      )}

      {showIdleWarning && staffSession?.token && (
        <div className="ss-session-warning-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="session-warning-title">
          <div className="ss-session-warning-card">
            <div className="ss-session-warning-icon" aria-hidden="true">
              <i className="bi bi-hourglass-split" />
            </div>
            <div>
              <span className="ss-small-label dark">Session timeout</span>
              <h2 id="session-warning-title">Are you still working?</h2>
              <p>For security, you will be signed out after a period of inactivity.</p>
              <strong>{formatCountdown(idleSecondsRemaining)} remaining</strong>
            </div>
            <div className="ss-session-warning-actions">
              <button type="button" className="btn committee-primary-action" onClick={handleContinueStaffSession}>
                Continue session
              </button>
              <button type="button" className="btn ss-btn-outline" onClick={() => handleStaffLogout()}>
                Sign out now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;