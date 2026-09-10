export const PROGRAMME_COUNTRIES = ["Kenya", "Nigeria", "Ghana", "Zambia"];

const COUNTRY_BOUNDS = [
  { country: "Kenya", minLat: -4.9, maxLat: 5.3, minLon: 33.9, maxLon: 41.9 },
  { country: "Nigeria", minLat: 4.0, maxLat: 14.0, minLon: 2.6, maxLon: 14.7 },
  { country: "Ghana", minLat: 4.5, maxLat: 11.2, minLon: -3.3, maxLon: 1.3 },
  { country: "Zambia", minLat: -18.1, maxLat: -8.2, minLon: 21.9, maxLon: 33.8 },
];

const COUNTRY_CACHE_KEY = "digital-futures-programme-country-context";
const COUNTRY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isProgrammeCountry(country) {
  return PROGRAMME_COUNTRIES.includes(country);
}

function readCountryCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COUNTRY_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const detectedAt = Number(parsed?.detectedAt || 0);
    const age = Date.now() - detectedAt;

    if (!isProgrammeCountry(parsed?.country) || !detectedAt || age < 0 || age > COUNTRY_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(COUNTRY_CACHE_KEY);
      return null;
    }

    return {
      country: parsed.country,
      detectedAt,
      status: "cached",
    };
  } catch {
    return null;
  }
}

function writeCountryCache(country) {
  if (typeof window === "undefined" || !isProgrammeCountry(country)) return;

  try {
    // Store only the programme country and timestamp. Raw GPS coordinates are not retained.
    window.localStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify({
      country,
      detectedAt: Date.now(),
    }));
  } catch {
    // Location remains usable for the current session even when storage is unavailable.
  }
}

export function getCachedProgrammeCountry() {
  return readCountryCache() || { country: null, detectedAt: null, status: "not_cached" };
}

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
    const cached = readCountryCache();
    const fallback = (status) => {
      if (cached?.country) {
        resolve({ country: cached.country, status: "cached", detectedAt: cached.detectedAt });
        return;
      }
      resolve({ country: null, status });
    };

    if (typeof window !== "undefined" && !window.isSecureContext) {
      fallback("insecure_context");
      return;
    }

    if (!navigator.geolocation) {
      fallback("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const country = detectProgrammeCountry(
          position.coords.latitude,
          position.coords.longitude
        );

        if (country) {
          writeCountryCache(country);
          resolve({ country, status: "detected", detectedAt: Date.now() });
          return;
        }

        fallback("outside_programme_countries");
      },
      (error) => {
        const status = error?.code === 1 ? "permission_denied" : "unavailable";
        fallback(status);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

export function getConsentContactCountries({ detectedCountry, residenceCountry } = {}) {
  if (isProgrammeCountry(residenceCountry)) return [residenceCountry];
  if (isProgrammeCountry(detectedCountry)) return [detectedCountry];
  return PROGRAMME_COUNTRIES;
}

export function getApplicationContactCountries({ residenceCountry } = {}) {
  if (isProgrammeCountry(residenceCountry)) return [residenceCountry];
  return PROGRAMME_COUNTRIES;
}

// Retained for compatibility with any older components still using the helper.
export function getContactCountries({ residenceCountry, detectedCountry } = {}) {
  if (isProgrammeCountry(residenceCountry)) return [residenceCountry];
  if (isProgrammeCountry(detectedCountry)) return [detectedCountry];
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
