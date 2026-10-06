import { useEffect, useState } from "react";

const STORAGE_KEY = "sightsavers-accessibility-preferences";

export const FONT_SCALE_MIN = -2;
export const FONT_SCALE_MAX = 4;

// Background and text options reuse Digital Futures brand tones only.
export const BACKGROUND_OPTIONS = [
  { id: "", label: "Default" },
  { id: "cream", label: "Cream", surface: "#fff4cc", page: "#fff0e8" },
  { id: "mint", label: "Mint", surface: "#e8f8f4", page: "#f0f7df" },
  { id: "stone", label: "Stone", surface: "#f3f1ef", page: "#ebe8e5" },
];

export const TEXT_COLOUR_OPTIONS = [
  { id: "", label: "Default" },
  { id: "black", label: "Black", ink: "#000000" },
  { id: "green", label: "Dark green", ink: "#405b11" },
  { id: "red", label: "Red", ink: "#d22a2f" },
];

export const defaultPreferences = {
  highContrast: false,
  fontScale: 0,
  reduceMotion: false,
  clickToRead: false,
  describeImages: false,
  hideImages: false,
  background: "",
  textColour: "",
  saturation: "",
  invert: false,
  dictionary: false,
  highlightFocus: false,
  highlightLinks: false,
  letterSpacing: false,
  lineHeight: false,
  cursor: "",
  muteSound: false,
  readingBar: false,
  readingMask: false,
  dyslexiaFont: false,
  announce: false,
  profiles: [],
};

// Each profile switches on a bundle of tools; switching it off returns those tools to default.
export const ACCESSIBILITY_PROFILES = [
  { id: "dyslexia", label: "Dyslexia", description: "Clearer font with wider letter and line spacing.", settings: { dyslexiaFont: true, letterSpacing: true, lineHeight: true } },
  { id: "seizure", label: "Seizure safe", description: "Stops animation and softens strong colours.", settings: { reduceMotion: true, saturation: "low" } },
  { id: "vision", label: "Visual impairment", description: "Larger text and cursor, with links and focus highlighted.", settings: { fontScale: 2, cursor: "large", highlightLinks: true, highlightFocus: true } },
  { id: "adhd", label: "ADHD", description: "A reading mask to reduce distraction, with animation paused.", settings: { readingMask: true, reduceMotion: true, highlightFocus: true } },
  { id: "cognitive", label: "Cognitive impairment", description: "A reading guide with clearly marked links and focus.", settings: { readingBar: true, highlightLinks: true, highlightFocus: true, reduceMotion: true } },
  { id: "epilepsy", label: "Epilepsy", description: "Stops animation, mutes sound and softens colours.", settings: { reduceMotion: true, muteSound: true, saturation: "low" } },
];

function readStoredPreferences() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPreferences;
    const { largeText, ...saved } = JSON.parse(stored);
    // Earlier versions stored a single "larger text" switch.
    if (largeText && saved.fontScale === undefined) saved.fontScale = 1;
    return { ...defaultPreferences, ...saved };
  } catch {
    return defaultPreferences;
  }
}

function buildFilter(preferences) {
  const filters = [];
  if (preferences.saturation === "monochrome") filters.push("grayscale(1)");
  if (preferences.saturation === "low") filters.push("saturate(0.5)");
  if (preferences.saturation === "high") filters.push("saturate(1.8)");
  if (preferences.invert) filters.push("invert(1) hue-rotate(180deg)");
  return filters.join(" ");
}

const CLASS_FLAGS = {
  "ss-high-contrast": p => p.highContrast,
  "ss-large-text": p => p.fontScale > 0,
  "ss-reduce-motion": p => p.reduceMotion,
  "a11y-hide-images": p => p.hideImages,
  "a11y-invert": p => p.invert,
  "a11y-highlight-focus": p => p.highlightFocus,
  "a11y-highlight-links": p => p.highlightLinks,
  "a11y-letter-spacing": p => p.letterSpacing,
  "a11y-line-height": p => p.lineHeight,
  "a11y-cursor-large": p => p.cursor === "large",
  "a11y-cursor-dark": p => p.cursor === "dark",
  "a11y-dyslexia-font": p => p.dyslexiaFont,
  "a11y-click-to-read": p => p.clickToRead,
  "a11y-custom-background": p => Boolean(p.background),
  "a11y-custom-text": p => Boolean(p.textColour),
};

export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState(readStoredPreferences);

  useEffect(() => {
    const root = document.documentElement;
    for (const [className, isOn] of Object.entries(CLASS_FLAGS)) root.classList.toggle(className, isOn(preferences));

    // 12.5% per step matches the original "larger text" size at +1.
    root.style.fontSize = preferences.fontScale ? `${100 + preferences.fontScale * 12.5}%` : "";
    // A filter on the root element keeps position: fixed working for the rest of the page.
    root.style.filter = buildFilter(preferences);

    const background = BACKGROUND_OPTIONS.find(option => option.id === preferences.background);
    const text = TEXT_COLOUR_OPTIONS.find(option => option.id === preferences.textColour);
    for (const [name, value] of [
      ["--a11y-surface", background?.surface],
      ["--a11y-page", background?.page],
      ["--a11y-ink", text?.ink],
    ]) {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The app still works even when localStorage is disabled.
    }
  }, [preferences]);

  // Media elements added later (for example on another page) still respect the mute setting.
  useEffect(() => {
    if (!preferences.muteSound) return undefined;
    const muteAll = () => document.querySelectorAll("audio, video").forEach(media => { media.muted = true; });
    muteAll();
    const observer = new MutationObserver(muteAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [preferences.muteSound]);

  function togglePreference(key) {
    setPreferences(current => ({ ...current, [key]: !current[key] }));
  }

  function setPreference(key, value) {
    setPreferences(current => ({ ...current, [key]: value }));
  }

  function toggleProfile(profileId) {
    const profile = ACCESSIBILITY_PROFILES.find(item => item.id === profileId);
    if (!profile) return;
    setPreferences(current => {
      const active = current.profiles.includes(profileId);
      const next = { ...current, profiles: active ? current.profiles.filter(id => id !== profileId) : [...current.profiles, profileId] };
      for (const [key, value] of Object.entries(profile.settings)) next[key] = active ? defaultPreferences[key] : value;
      // Profiles that stay on keep the tools they share with the one switched off.
      if (active) {
        for (const other of ACCESSIBILITY_PROFILES.filter(item => next.profiles.includes(item.id))) Object.assign(next, other.settings);
      }
      return next;
    });
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
  }

  return {
    preferences,
    togglePreference,
    setPreference,
    toggleProfile,
    resetPreferences,
  };
}
