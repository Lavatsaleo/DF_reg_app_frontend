function AppNavbar({
  selectedPathway,
  currentView,
  onBackToPathways,
  onShowPortal,
  onCheckStatus,
  onShowCommittee,
  onShowDashboard,
  showDashboardButton = false,
  onShowConsents,
  showConsentsButton = false,
  showStatusButton = true,
  onShowParticipants,
  showParticipantsButton = false,
}) {
  const isStatusPage = currentView === "status";
  const isCommitteePage = currentView === "committee";
  const isConsentsPage = currentView === "consents";

  return (
    <nav className="navbar ss-navbar sticky-top" aria-label="Main navigation">
      <div className="container df-nav-shell">
        <button
          type="button"
          className="navbar-brand df-wordmark-button border-0 bg-transparent p-0"
          onClick={onBackToPathways}
          aria-label="Digital Futures home"
        >
          <span className="df-wordmark">Digital Futures</span>
        </button>

        <div className="df-nav-actions ms-auto">
          <button
            type="button"
            className="ss-nav-chip df-portal-chip"
            onClick={onShowPortal || onBackToPathways}
            aria-label="Application Portal: choose a pathway"
          >
            <span>Application Portal</span>
          </button>

          {showStatusButton && (
            <button
              type="button"
              className={`btn df-nav-status ${isStatusPage ? "active" : ""}`}
              onClick={onCheckStatus}
              aria-current={isStatusPage ? "page" : undefined}
            >
              <i className="bi bi-clipboard2-check" aria-hidden="true" />
              <span className="df-nav-label">Check status</span>
            </button>
          )}

          {showParticipantsButton && onShowParticipants && (
            <button
              type="button"
              className={`btn df-nav-status ${currentView === "participants" ? "active" : ""}`}
              onClick={onShowParticipants}
              aria-current={currentView === "participants" ? "page" : undefined}
            >
              <i className="bi bi-people" aria-hidden="true" />
              <span className="df-nav-label">Participants</span>
            </button>
          )}

          {showConsentsButton && onShowConsents && (
            <button
              type="button"
              className={`btn df-nav-status ${isConsentsPage ? "active" : ""}`}
              onClick={onShowConsents}
              aria-current={isConsentsPage ? "page" : undefined}
            >
              <i className="bi bi-file-earmark-check" aria-hidden="true" />
              <span className="df-nav-label">Consents</span>
            </button>
          )}

          {(selectedPathway || isStatusPage || isCommitteePage || isConsentsPage) && (
            <button type="button" className="btn df-nav-icon" onClick={onBackToPathways} aria-label="Home" title="Home">
              <i className="bi bi-house" aria-hidden="true" />
            </button>
          )}

          {showDashboardButton && (
            <button type="button" className={`btn df-nav-status ${currentView === "dashboard" ? "active" : ""}`} onClick={onShowDashboard} aria-current={currentView === "dashboard" ? "page" : undefined}>
              <i className="bi bi-bar-chart" aria-hidden="true" /> Dashboard
            </button>
          )}

          {onShowCommittee && (
            <button
              type="button"
              className={`btn df-nav-icon ${isCommitteePage ? "active" : ""}`}
              onClick={onShowCommittee}
              aria-label="Staff workspace"
              title="Staff workspace"
              aria-current={isCommitteePage ? "page" : undefined}
            >
              <i className="bi bi-person-circle" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
