/*
 * An application can be picked up again only after the consent and the jurat (who completed the
 * consent, and any assistance given) are both signed. Before that, leaving the page means starting
 * again from the beginning: progress is not kept, and the applicant returns to the home page.
 */
export function hasFinishedConsent(answers) {
  return answers?.ENTRY_STAGE === "application";
}

// Anything chosen on the way to consent (country, consent answers), so leaving would lose something.
export function hasStartedBeforeConsent(answers) {
  if (!answers || hasFinishedConsent(answers)) return false;
  return Object.entries(answers).some(([code, value]) =>
    !["COURSE_APPLIED_FOR", "APPLICATION_FORM_VERSION"].includes(code) &&
    value !== "" && value != null && !(Array.isArray(value) && value.length === 0)
  );
}
