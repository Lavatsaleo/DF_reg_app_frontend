import logo from "../assets/sightsavers-logo.png";

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
    <nav className="navbar navbar-expand-lg ss-navbar sticky-top" aria-label="Main navigation">
      <div className="container py-2">
        <button
          type="button"
          className="navbar-brand border-0 bg-transparent d-flex align-items-center gap-3 p-0"
          onClick={onBackToPathways}
          aria-label="Digital Futures home"
        >
          <img src={logo} alt="Sightsavers" className="ss-logo" />
          <span className="ss-brand-divider" aria-hidden="true" />
          <span className="ss-brand-text">Digital Futures</span>
        </button>

        <div className="d-flex align-items-center gap-2 ms-auto">
          <span className="ss-nav-chip d-none d-xl-inline-flex">
            <i className="bi bi-shield-check" aria-hidden="true" /> Application Portal
          </span>

          {showStatusButton && (
            <button
              type="button"
              className={`btn ${isStatusPage ? "ss-nav-back" : "ss-nav-status"}`}
              onClick={onCheckStatus}
              aria-current={isStatusPage ? "page" : undefined}
            >
              <i className="bi bi-search" aria-hidden="true" /> Check status
            </button>
          )}

          {showConsentsButton && onShowConsents && (
            <button
              type="button"
              className={`btn ${isConsentsPage ? "ss-nav-back" : "ss-nav-status"}`}
              onClick={onShowConsents}
              aria-current={isConsentsPage ? "page" : undefined}
            >
              <i className="bi bi-file-earmark-check" aria-hidden="true" /> Consents
            </button>
          )}

          {(selectedPathway || isStatusPage || isCommitteePage || isConsentsPage) && (
            <button type="button" className="btn ss-nav-back" onClick={onBackToPathways}>
              <i className="bi bi-house" aria-hidden="true" /> Home
            </button>
          )}

          {onShowCommittee && (
            <button
              type="button"
              className={`btn ss-committee-corner ${isCommitteePage ? "active" : ""}`}
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
