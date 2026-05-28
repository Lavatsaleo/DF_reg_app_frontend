import { useState } from "react";
import AccessibilityToolbar from "./components/AccessibilityToolbar";
import AppNavbar from "./components/AppNavbar";
import LandingPage from "./pages/LandingPage";
import RegistrationPage from "./pages/RegistrationPage";
import StatusCheckPage from "./pages/StatusCheckPage";
import { useAccessibilityPreferences } from "./hooks/useAccessibilityPreferences";
import { useRegistrationForm } from "./hooks/useRegistrationForm";

function App() {
  const registration = useRegistrationForm();
  const accessibility = useAccessibilityPreferences();
  const [currentView, setCurrentView] = useState("home");

  function handleShowHome() {
    setCurrentView("home");
    registration.handleBackToPathways();
  }

  function handleShowStatus() {
    setCurrentView("status");
    registration.handleBackToPathways();
  }

  function handlePathwaySelect(pathway) {
    setCurrentView("home");
    registration.handlePathwaySelect(pathway);
  }

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
      />

      <AccessibilityToolbar
        preferences={accessibility.preferences}
        onTogglePreference={accessibility.togglePreference}
        onResetPreferences={accessibility.resetPreferences}
      />

      {currentView === "status" ? (
        <StatusCheckPage
          onBackHome={handleShowHome}
          onStartApplication={handleShowHome}
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
          onBackToPathways={handleShowHome}
          onCheckStatus={handleShowStatus}
          onAnswerChange={registration.handleAnswerChange}
          onMultiSelectChange={registration.handleMultiSelectChange}
          onSubmit={registration.handleSubmit}
          onValidateQuestions={registration.handleValidateQuestions}
          onDocumentsChange={registration.setDocuments}
          onDocumentTypeChange={registration.setDocumentType}
          onClearDraft={registration.handleClearDraft}
        />
      )}
    </>
  );
}

export default App;
