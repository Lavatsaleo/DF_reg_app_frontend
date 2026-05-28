import logo from "../assets/sightsavers-logo.png";

function AppNavbar({ selectedPathway, currentView, onBackToPathways, onCheckStatus }) {
  const isStatusPage = currentView === "status";

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
            <i className="bi bi-shield-check" aria-hidden="true" /> Registration Portal
          </span>

          <button
            type="button"
            className={`btn ${isStatusPage ? "ss-nav-back" : "ss-nav-status"}`}
            onClick={onCheckStatus}
            aria-current={isStatusPage ? "page" : undefined}
          >
            <i className="bi bi-search" aria-hidden="true" /> Check status
          </button>

          {(selectedPathway || isStatusPage) && (
            <button
              type="button"
              className="btn ss-nav-back"
              onClick={onBackToPathways}
            >
              <i className="bi bi-house" aria-hidden="true" /> Home
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
