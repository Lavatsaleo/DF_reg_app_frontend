const SUBMITTED_APPLICATIONS_KEY = "sightsavers-submitted-applications";

function readApplications() {
  try {
    const rawValue = window.localStorage.getItem(SUBMITTED_APPLICATIONS_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.warn("Unable to read saved application confirmations", error);
    return [];
  }
}

function writeApplications(applications) {
  try {
    window.localStorage.setItem(
      SUBMITTED_APPLICATIONS_KEY,
      JSON.stringify(applications.slice(0, 20))
    );
  } catch (error) {
    console.warn("Unable to save application confirmation", error);
  }
}

export function saveSubmittedApplication(result, selectedPathway) {
  if (!result?.applicationReference) return;

  const applications = readApplications();
  const normalizedReference = String(result.applicationReference).trim().toUpperCase();

  const savedApplication = {
    ...result,
    applicationReference: normalizedReference,
    pathwayTitle: selectedPathway?.title || result.pathwayTitle || result.pathway,
    savedAt: new Date().toISOString(),
  };

  const withoutDuplicate = applications.filter(
    (application) =>
      String(application.applicationReference || "").trim().toUpperCase() !== normalizedReference
  );

  writeApplications([savedApplication, ...withoutDuplicate]);
}

export function findSubmittedApplication(reference) {
  if (!reference) return null;

  const normalizedReference = String(reference).trim().toUpperCase();
  return (
    readApplications().find(
      (application) =>
        String(application.applicationReference || "").trim().toUpperCase() === normalizedReference
    ) || null
  );
}

export function listSubmittedApplications() {
  return readApplications();
}
