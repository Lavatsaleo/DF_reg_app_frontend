export const PROGRAMME_COUNTRIES = ["Kenya", "Nigeria", "Ghana", "Zambia"];

// Contacts follow the country of residence the applicant selects; the device location is not used.
function isProgrammeCountry(country) {
  return PROGRAMME_COUNTRIES.includes(country);
}

export function getConsentContactCountries({ residenceCountry } = {}) {
  if (isProgrammeCountry(residenceCountry)) return [residenceCountry];
  return PROGRAMME_COUNTRIES;
}

export function getApplicationContactCountries({ residenceCountry } = {}) {
  if (isProgrammeCountry(residenceCountry)) return [residenceCountry];
  return PROGRAMME_COUNTRIES;
}

export function buildContactSnapshot(consent, countries) {
  const contacts = consent?.countryContacts || {};
  return countries.map((country) => ({
    country,
    safeguarding: contacts[country]?.safeguarding || "To be confirmed",
    questions: contacts[country]?.questions || "To be confirmed",
  }));
}
