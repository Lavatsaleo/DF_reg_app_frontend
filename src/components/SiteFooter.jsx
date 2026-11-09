import partnerLockup from "../assets/digital-futures-partner-lockup.png";

// The approved partner lock-up, shown as supplied (never recoloured or rearranged) on every public page.
function SiteFooter() {
  return (
    <footer className="df-site-footer">
      <div className="container">
        <h2 className="visually-hidden">Programme partners</h2>
        <img
          src={partnerLockup}
          width="1783"
          height="312"
          loading="lazy"
          className="df-site-footer-lockup"
          alt="In partnership with Mastercard Foundation, African Center for Economic Transformation (ACET), African Disability Forum (ADF), International Labour Organization (ILO) and Sightsavers"
        />
      </div>
    </footer>
  );
}

export default SiteFooter;
