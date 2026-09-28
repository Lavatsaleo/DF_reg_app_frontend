import { useEffect, useMemo, useState } from "react";
import { getReadablePageText } from "../utils/speechUtils";
import {
  getSavedReaderVoiceName,
  readTextNaturally,
  saveReaderVoiceName,
  stopNaturalReading,
  waitForReaderVoices,
} from "../utils/naturalPageReader";

function AccessibilityToolbar({ preferences, onTogglePreference, onResetPreferences }) {
  const [readerVoices, setReaderVoices] = useState([]);
  const [readerVoiceName, setReaderVoiceName] = useState(() => getSavedReaderVoiceName());
  const [readerBusy, setReaderBusy] = useState(false);

  useEffect(() => {
    let active = true;

    waitForReaderVoices().then((voices) => {
      if (!active) return;
      setReaderVoices(voices);
    });

    return () => {
      active = false;
    };
  }, []);

  const visibleReaderVoices = useMemo(() => {
    const englishVoices = readerVoices.filter((voice) => String(voice.lang || "").toLowerCase().startsWith("en"));
    const source = englishVoices.length > 0 ? englishVoices : readerVoices;

    // Keep the control useful rather than presenting dozens of operating-system voices.
    return source.slice(0, 10);
  }, [readerVoices]);

  async function handleReadPage() {
    const text = getReadablePageText();
    setReaderBusy(true);

    const spoken = await readTextNaturally(text, { voiceName: readerVoiceName });
    setReaderBusy(false);

    if (!spoken) {
      window.alert("Read aloud is not available in this browser. You can still use a screen reader or your device accessibility tools.");
    }
  }

  function handleVoiceChange(event) {
    const nextVoiceName = event.target.value;
    setReaderVoiceName(nextVoiceName);
    saveReaderVoiceName(nextVoiceName);
    stopNaturalReading();
  }

  function handleStopReading() {
    stopNaturalReading();
    setReaderBusy(false);
  }

  return (
    <section className="ss-accessibility-toolbar" aria-label="Accessibility tools">
      <div className="container">
        <div className="ss-accessibility-inner">
          <div className="ss-accessibility-title">
            <i className="bi bi-universal-access" aria-hidden="true" />
            <span>Accessibility tools</span>
          </div>

          <div className="ss-accessibility-actions" role="group" aria-label="Accessibility display and reading options">
            <button
              type="button"
              className={`btn ss-a11y-btn ${preferences.largeText ? "active" : ""}`}
              onClick={() => onTogglePreference("largeText")}
              aria-pressed={preferences.largeText}
            >
              <i className="bi bi-fonts" aria-hidden="true" /> Larger text
            </button>

            <button
              type="button"
              className={`btn ss-a11y-btn ${preferences.highContrast ? "active" : ""}`}
              onClick={() => onTogglePreference("highContrast")}
              aria-pressed={preferences.highContrast}
            >
              <i className="bi bi-circle-half" aria-hidden="true" /> High contrast
            </button>

            <button
              type="button"
              className={`btn ss-a11y-btn ${preferences.reduceMotion ? "active" : ""}`}
              onClick={() => onTogglePreference("reduceMotion")}
              aria-pressed={preferences.reduceMotion}
            >
              <i className="bi bi-person-walking" aria-hidden="true" /> Reduce motion
            </button>

            {visibleReaderVoices.length > 1 && (
              <label className="ss-reader-voice-control">
                <span className="visually-hidden">Reading voice</span>
                <i className="bi bi-person-sound" aria-hidden="true" />
                <select
                  className="ss-reader-voice-select"
                  value={readerVoiceName}
                  onChange={handleVoiceChange}
                  aria-label="Choose reading voice"
                >
                  <option value="">Best available voice</option>
                  {visibleReaderVoices.map((voice) => (
                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button type="button" className="btn ss-a11y-btn" onClick={handleReadPage} disabled={readerBusy}>
              <i className="bi bi-volume-up" aria-hidden="true" /> {readerBusy ? "Starting..." : "Read page"}
            </button>

            <button type="button" className="btn ss-a11y-btn" onClick={handleStopReading}>
              <i className="bi bi-stop-circle" aria-hidden="true" /> Stop reading
            </button>

            <button type="button" className="btn ss-a11y-btn muted" onClick={onResetPreferences}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccessibilityToolbar;
