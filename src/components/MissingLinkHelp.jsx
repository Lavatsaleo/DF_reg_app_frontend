import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Who to write to, with the country team's address when the lookup returned one.
export function SupportContact({ supportEmail }) {
  if (!supportEmail) return <>contact the Digital Futures programme team in your country</>;
  return <>email <a href={`mailto:${supportEmail}`}>{supportEmail}</a></>;
}

// Applicants who can't find the test email can ask for a new link (sent only to the address on file) or contact support.
function MissingLinkHelp({ reference, supportEmail }) {
  const [state, setState] = useState({ sending: false, message: "", error: "" });

  async function requestNewLink() {
    setState({ sending: true, message: "", error: "" });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/basic-skills-test/invitations/request-new-link`, { reference });
      setState({ sending: false, message: response.data?.message || "If this application is waiting for the test, a new link is on its way.", error: "" });
    } catch (error) {
      setState({
        sending: false,
        message: "",
        error: error.response?.status === 429
          ? "You have asked for a new link several times. Please wait an hour and try again, or contact the programme team."
          : error.response?.data?.message || "We could not send a new link just now. Please try again later.",
      });
    }
  }

  return (
    <div className="ss-status-help-block">
      <h3 className="h6">Haven&apos;t received your test link?</h3>
      {reference ? (
        <>
          <p className="mb-2">
            We can send a new link to the email address on your application. Any earlier link will stop working.
          </p>
          <button type="button" className="btn ss-btn-outline" onClick={requestNewLink} disabled={state.sending}>
            <i className="bi bi-envelope-arrow-up" aria-hidden="true" /> {state.sending ? "Sending…" : "Send me a new link"}
          </button>
          <div role="status" aria-live="polite">
            {state.message && <p className="mt-2 mb-0">{state.message}</p>}
          </div>
          {state.error && <p className="mt-2 mb-0 ss-status-help-error" role="alert">{state.error}</p>}
        </>
      ) : (
        <p className="mb-2">
          Search again with the application reference from your confirmation (it starts with APP-DF) to ask for a new link.
        </p>
      )}
      <p className="mt-2 mb-0">
        If your email address has changed or you still need help, <SupportContact supportEmail={supportEmail} /> and include your application reference.
      </p>
    </div>
  );
}

export default MissingLinkHelp;
