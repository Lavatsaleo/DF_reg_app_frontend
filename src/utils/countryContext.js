export const PROGRAMME_COUNTRIES = ["Kenya", "Nigeria", "Ghana", "Zambia"];

const COUNTRY_BOUNDS = [
  { country: "Kenya", minLat: -4.9, maxLat: 5.3, minLon: 33.9, maxLon: 41.9 },
  { country: "Nigeria", minLat: 4.0, maxLat: 14.0, minLon: 2.6, maxLon: 14.7 },
  { country: "Ghana", minLat: 4.5, maxLat: 11.2, minLon: -3.3, maxLon: 1.3 },
  { country: "Zambia", minLat: -18.1, maxLat: -8.2, minLon: 21.9, maxLon: 33.8 },
];

export function detectProgrammeCountry(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const match = COUNTRY_BOUNDS.find((bounds) =>
    latitude >= bounds.minLat &&
    latitude <= bounds.maxLat &&
    longitude >= bounds.minLon &&
    longitude <= bounds.maxLon
  );

  return match?.country || null;
}

export function requestProgrammeCountry() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ country: null, status: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const country = detectProgrammeCountry(
          position.coords.latitude,
          position.coords.longitude
        );
        resolve({ country, status: country ? "detected" : "outside_programme_countries" });
      },
      (error) => {
        const status = error?.code === 1 ? "permission_denied" : "unavailable";
        resolve({ country: null, status });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

export function getContactCountries({ residenceCountry, detectedCountry }) {
  if (PROGRAMME_COUNTRIES.includes(residenceCountry)) return [residenceCountry];
  if (PROGRAMME_COUNTRIES.includes(detectedCountry)) return [detectedCountry];
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
