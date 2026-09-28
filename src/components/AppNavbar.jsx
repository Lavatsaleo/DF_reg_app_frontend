function AppNavbar({
  selectedPathway,
  currentView,
  onBackToPathways,
  onCheckStatus,
  onShowCommittee,
  onShowConsents,
  showConsentsButton = false,
  showStatusButton = true,
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
          <span className="ss-nav-chip df-portal-chip">
            <i className="bi bi-shield-check" aria-hidden="true" />
            <span>Application Portal</span>
          </span>

          {showStatusButton && (
            <button
              type="button"
              className={`btn df-nav-status ${isStatusPage ? "active" : ""}`}
              onClick={onCheckStatus}
              aria-current={isStatusPage ? "page" : undefined}
            >
              <i className="bi bi-search" aria-hidden="true" />
              <span className="df-nav-label">Check status</span>
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
