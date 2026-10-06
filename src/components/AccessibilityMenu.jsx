import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getReadablePageText, getSpeechSynthesis, stopSpeaking } from "../utils/speechUtils";
import {
  getSavedReaderVoiceName,
  readTextNaturally,
  saveReaderVoiceName,
  stopNaturalReading,
  waitForReaderVoices,
} from "../utils/naturalPageReader";
import {
  ACCESSIBILITY_PROFILES,
  BACKGROUND_OPTIONS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  TEXT_COLOUR_OPTIONS,
} from "../hooks/useAccessibilityPreferences";
import "../accessibility-menu.css";

const MENU_SELECTOR = ".a11y-menu-root";
const READABLE_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,label,legend,summary,caption,dt,dd,th,td,blockquote";
const isInMenu = node => Boolean(node?.closest?.(MENU_SELECTOR));
const isVisible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
const cleanText = value => String(value || "").replace(/\s+/g, " ").trim();

function nextOption(options, current) {
  const index = options.findIndex(option => option.id === current);
  return options[(index + 1) % options.length];
}

function getMainContent() {
  return document.querySelector("main") || document.getElementById("root") || document.body;
}

// Headings and text blocks in reading order, without nested duplicates or anything inside this menu.
function collectReadableBlocks() {
  const main = getMainContent();
  const blocks = [];
  for (const element of main.querySelectorAll(READABLE_SELECTOR)) {
    if (isInMenu(element) || !isVisible(element)) continue;
    if (element.parentElement?.closest(READABLE_SELECTOR) && main.contains(element.parentElement.closest(READABLE_SELECTOR))) continue;
    const text = cleanText(element.innerText);
    if (!text) continue;
    const level = /^H([1-6])$/.exec(element.tagName)?.[1];
    blocks.push({ element, text, level: level ? Number(level) : 0 });
  }
  return blocks;
}

function Tile({ icon, label, detail, pressed, onClick, disabled, steps, stepIndex }) {
  const isToggle = typeof pressed === "boolean";
  return (
    <button
      type="button"
      className={`a11y-tile${pressed ? " is-on" : ""}`}
      aria-pressed={isToggle ? pressed : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {pressed && <i className="bi bi-check-circle-fill a11y-tile-check" aria-hidden="true" />}
      <i className={`bi ${icon} a11y-tile-icon`} aria-hidden="true" />
      <span className="a11y-tile-label">{label}</span>
      {detail && <span className="a11y-tile-detail">{detail}</span>}
      {steps > 1 && (
        <span className="a11y-tile-steps" aria-hidden="true">
          {Array.from({ length: steps }, (_, index) => <span key={index} className={index === stepIndex ? "is-current" : undefined} />)}
        </span>
      )}
    </button>
  );
}

function Switch({ checked, onChange, label, describedBy }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} aria-describedby={describedBy} className="a11y-switch" onClick={onChange}>
      <span aria-hidden="true" />
    </button>
  );
}

function ProfileRow({ profile, active, onToggle }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoId = useId();
  return (
    <li className="a11y-profile">
      <div className="a11y-profile-row">
        <span className="a11y-profile-name">{profile.label}</span>
        <button type="button" className="a11y-icon-button small" aria-expanded={showInfo} aria-controls={infoId} aria-label={`About the ${profile.label} profile`} onClick={() => setShowInfo(value => !value)}>
          <i className="bi bi-info-circle" aria-hidden="true" />
        </button>
        <Switch checked={active} onChange={onToggle} label={`${profile.label} profile`} describedBy={infoId} />
      </div>
      <p id={infoId} className="a11y-profile-info" hidden={!showInfo}>{profile.description}</p>
    </li>
  );
}

function ReadingGuide({ mode }) {
  const [y, setY] = useState(() => window.innerHeight / 2);
  useEffect(() => {
    const onPointer = event => setY(event.clientY);
    // Keyboard users get the guide on whatever they move focus to.
    const onFocus = event => {
      if (isInMenu(event.target)) return;
      const box = event.target.getBoundingClientRect?.();
      if (box) setY(box.top + box.height / 2);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);
  if (mode === "bar") return <div className="a11y-reading-bar" style={{ top: y - 9 }} aria-hidden="true" />;
  const half = 64;
  return (
    <div aria-hidden="true">
      <div className="a11y-reading-mask" style={{ top: 0, height: Math.max(0, y - half) }} />
      <div className="a11y-reading-mask" style={{ top: y + half, bottom: 0 }} />
    </div>
  );
}

function ImageDescriptions({ onRead }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = [];
      for (const element of document.querySelectorAll("img, svg[role='img'], [role='img'][aria-label]")) {
        if (isInMenu(element) || element.closest("[aria-hidden='true']")) continue;
        const box = element.getBoundingClientRect();
        if (box.width < 24 || box.height < 24 || box.bottom < 0 || box.top > window.innerHeight) continue;
        const alt = element.tagName === "IMG" ? element.getAttribute("alt") : element.getAttribute("aria-label");
        const text = alt === "" ? "Decorative image" : cleanText(alt) || "No description provided for this image";
        next.push({ key: next.length, top: Math.max(4, box.top + 4), left: Math.max(4, box.left + 4), maxWidth: Math.max(140, box.width - 8), text });
      }
      setItems(next);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  return items.map(item => (
    <button key={item.key} type="button" className="a11y-image-label" style={{ top: item.top, left: item.left, maxWidth: item.maxWidth }} onClick={() => onRead(item.text)}>
      <i className="bi bi-card-image" aria-hidden="true" /> {item.text}
    </button>
  ));
}

function WordHelper({ onSpeak }) {
  const [word, setWord] = useState(null);
  useEffect(() => {
    const check = event => {
      if (isInMenu(event.target)) return;
      const selection = window.getSelection();
      const text = cleanText(selection?.toString());
      if (!text || text.length > 40 || text.split(" ").length > 3 || !selection.rangeCount) return;
      const box = selection.getRangeAt(0).getBoundingClientRect();
      setWord({ text, top: Math.min(box.bottom + 10, window.innerHeight - 180), left: Math.min(Math.max(12, box.left), window.innerWidth - 292) });
    };
    document.addEventListener("mouseup", check);
    document.addEventListener("keyup", check);
    return () => {
      document.removeEventListener("mouseup", check);
      document.removeEventListener("keyup", check);
    };
  }, []);
  if (!word) return null;
  const letters = word.text.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase().split("");
  return (
    <div className="a11y-word-helper" role="dialog" aria-label={`Word helper: ${word.text}`} style={{ top: word.top, left: word.left }}>
      <div className="a11y-word-head"><strong>{word.text}</strong><button type="button" className="a11y-icon-button small" aria-label="Close word helper" onClick={() => setWord(null)}><i className="bi bi-x-lg" aria-hidden="true" /></button></div>
      <p className="a11y-word-spelling" aria-label={`Spelling: ${letters.join(", ")}`}>{letters.join(" · ")}</p>
      <div className="a11y-word-actions">
        <button type="button" className="a11y-pill" onClick={() => onSpeak(word.text)}><i className="bi bi-volume-up" aria-hidden="true" /> Read word</button>
        <button type="button" className="a11y-pill" onClick={() => onSpeak(letters.join(", "))}><i className="bi bi-spellcheck" aria-hidden="true" /> Spell it out</button>
      </div>
    </div>
  );
}

function ReadingMode({ onClose }) {
  const [blocks] = useState(() => collectReadableBlocks().map(({ text, level }) => ({ text, level })));
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = event => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="a11y-reading-mode a11y-menu-root" role="dialog" aria-modal="true" aria-labelledby="a11y-reading-mode-title">
      <div className="a11y-reading-mode-bar">
        <span id="a11y-reading-mode-title"><i className="bi bi-file-text" aria-hidden="true" /> Reading mode</span>
        <button ref={closeRef} type="button" className="a11y-pill" onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /> Close reading mode</button>
      </div>
      <article className="a11y-reading-mode-body">
        {blocks.length ? blocks.map((block, index) => block.level
          ? <h2 key={index} className={`level-${Math.min(block.level, 3)}`}>{block.text}</h2>
          : <p key={index}>{block.text}</p>) : <p>There is no text to show on this page.</p>}
      </article>
    </div>
  );
}

function AccessibilityMenu({ preferences, onTogglePreference, onSetPreference, onToggleProfile, onResetPreferences }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("tools");
  const [showAbout, setShowAbout] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [readerBusy, setReaderBusy] = useState(false);
  const [readerVoices, setReaderVoices] = useState([]);
  const [readerVoiceName, setReaderVoiceName] = useState(() => getSavedReaderVoiceName());
  const [announcement, setAnnouncement] = useState("");
  const [outline, setOutline] = useState([]);
  const launcherRef = useRef(null);
  const panelRef = useRef(null);
  const headingId = useId();
  const panelId = useId();

  useEffect(() => {
    let active = true;
    waitForReaderVoices().then(voices => { if (active) setReaderVoices(voices); });
    return () => { active = false; };
  }, []);

  const visibleReaderVoices = useMemo(() => {
    const englishVoices = readerVoices.filter(voice => String(voice.lang || "").toLowerCase().startsWith("en"));
    // Keep the control useful rather than presenting dozens of operating-system voices.
    return (englishVoices.length > 0 ? englishVoices : readerVoices).slice(0, 10);
  }, [readerVoices]);

  const speak = useCallback(async text => {
    if (preferences.muteSound) {
      setAnnouncement("Sound is muted. Turn off Mute Sound to hear reading.");
      return false;
    }
    const spoken = await readTextNaturally(text, { voiceName: readerVoiceName });
    if (!spoken) setAnnouncement("Read aloud is not available in this browser. You can still use a screen reader or your device accessibility tools.");
    return spoken;
  }, [preferences.muteSound, readerVoiceName]);

  function announce(message) {
    setAnnouncement(message);
    if (preferences.announce && !preferences.muteSound) void readTextNaturally(message, { voiceName: readerVoiceName });
  }

  function toggle(key, label) {
    onTogglePreference(key);
    announce(`${label} ${preferences[key] ? "off" : "on"}`);
  }

  function setChoice(key, value, message) {
    onSetPreference(key, value);
    announce(message);
  }

  const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    setView("tools");
    if (restoreFocus) launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector("h2")?.focus());
    const onKey = event => { if (event.key === "Escape" && !readingMode) closeMenu(); };
    const onPointerDown = event => { if (!isInMenu(event.target)) closeMenu({ restoreFocus: false }); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, readingMode, closeMenu]);

  // Click to Read speaks the text block that was clicked; the click itself still does its normal job.
  useEffect(() => {
    if (!preferences.clickToRead) return undefined;
    const onClick = event => {
      if (isInMenu(event.target)) return;
      const block = event.target.closest?.(`${READABLE_SELECTOR},button,a,[role='button']`);
      const text = cleanText(block?.innerText || block?.getAttribute?.("aria-label"));
      if (text) void speak(text.slice(0, 800));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [preferences.clickToRead, speak]);

  // The reader does not report when it finishes, so watch the speech engine go quiet.
  useEffect(() => {
    if (!readerBusy) return undefined;
    let quietChecks = 0;
    const timer = window.setInterval(() => {
      const engine = getSpeechSynthesis();
      quietChecks = engine?.speaking || engine?.pending ? 0 : quietChecks + 1;
      if (quietChecks >= 2) setReaderBusy(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [readerBusy]);

  useEffect(() => {
    if (!preferences.muteSound) return;
    stopNaturalReading();
    stopSpeaking();
  }, [preferences.muteSound]);

  async function handleReadPage() {
    if (readerBusy) {
      stopNaturalReading();
      setReaderBusy(false);
      announce("Reading stopped");
      return;
    }
    setReaderBusy(true);
    const spoken = await speak(getReadablePageText());
    if (!spoken) setReaderBusy(false);
  }

  function handleVoiceChange(event) {
    setReaderVoiceName(event.target.value);
    saveReaderVoiceName(event.target.value);
    stopNaturalReading();
    setReaderBusy(false);
  }

  function showOutline() {
    setOutline(collectReadableBlocks().filter(block => block.level && block.level <= 3));
    setView("outline");
  }

  function jumpTo(element) {
    closeMenu({ restoreFocus: false });
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
    element.scrollIntoView({ block: "start", behavior: preferences.reduceMotion ? "auto" : "smooth" });
    element.focus({ preventScroll: true });
  }

  function handleReset() {
    stopNaturalReading();
    setReaderBusy(false);
    onResetPreferences();
    announce("All accessibility settings reset");
  }

  const background = BACKGROUND_OPTIONS.find(option => option.id === preferences.background) || BACKGROUND_OPTIONS[0];
  const textColour = TEXT_COLOUR_OPTIONS.find(option => option.id === preferences.textColour) || TEXT_COLOUR_OPTIONS[0];
  const fontLabel = preferences.fontScale > 0 ? `+${preferences.fontScale}` : String(preferences.fontScale);
  const activeCount = Object.entries(preferences).filter(([key, value]) => !["announce", "profiles"].includes(key) && value && value !== 0).length;

  const saturationTile = (id, label, icon) => (
    <Tile icon={icon} label={label} pressed={preferences.saturation === id} onClick={() => setChoice("saturation", preferences.saturation === id ? "" : id, `${label} ${preferences.saturation === id ? "off" : "on"}`)} />
  );
  const cursorTile = (id, label, icon) => (
    <Tile icon={icon} label={label} pressed={preferences.cursor === id} onClick={() => setChoice("cursor", preferences.cursor === id ? "" : id, `${label} ${preferences.cursor === id ? "off" : "on"}`)} />
  );

  const overlays = (
    <>
      {preferences.readingBar && <ReadingGuide mode="bar" />}
      {preferences.readingMask && <ReadingGuide mode="mask" />}
      {preferences.describeImages && <div className="a11y-menu-root"><ImageDescriptions onRead={text => void speak(text)} /></div>}
      {preferences.dictionary && <div className="a11y-menu-root"><WordHelper onSpeak={text => void speak(text)} /></div>}
      {readingMode && <ReadingMode onClose={() => { setReadingMode(false); launcherRef.current?.focus(); }} />}
    </>
  );

  return (
    <>
      {createPortal(overlays, document.body)}
      <div className="a11y-menu-root">
        <button
          ref={launcherRef}
          type="button"
          className="a11y-launcher"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Accessibility menu${activeCount ? `, ${activeCount} settings on` : ""}`}
          onClick={() => (open ? closeMenu() : setOpen(true))}
        >
          <i className="bi bi-universal-access-circle" aria-hidden="true" />
          {activeCount > 0 && <span className="a11y-launcher-badge" aria-hidden="true">{activeCount}</span>}
        </button>

        <div ref={panelRef} id={panelId} className="a11y-menu" role="dialog" aria-labelledby={headingId} hidden={!open}>
          <header className="a11y-menu-header">
            <h2 id={headingId} tabIndex={-1}>Accessibility Menu</h2>
            <div className="a11y-menu-header-actions">
              <button type="button" className="a11y-icon-button" aria-expanded={showAbout} aria-label="About this menu" onClick={() => setShowAbout(value => !value)}><i className="bi bi-info-circle" aria-hidden="true" /></button>
              <label className="a11y-announce-toggle">
                <i className="bi bi-volume-up" aria-hidden="true" />
                <Switch checked={preferences.announce} onChange={() => onTogglePreference("announce")} label="Speak changes aloud" />
              </label>
              <button type="button" className="a11y-icon-button" aria-label="Close accessibility menu" onClick={() => closeMenu()}><i className="bi bi-x-lg" aria-hidden="true" /></button>
            </div>
          </header>

          {showAbout && (
            <div className="a11y-about">
              <p>Choose a profile for a ready-made set of tools, or switch on individual tools below. Your choices are saved in this browser and apply to every page.</p>
              <p>Press <kbd>Esc</kbd> to close this menu. The speaker switch reads each change aloud.</p>
            </div>
          )}

          <div className="a11y-menu-body">
            {view === "outline" ? (
              <section aria-label="Page sections">
                <button type="button" className="a11y-pill" onClick={() => setView("tools")}><i className="bi bi-arrow-left" aria-hidden="true" /> Back to tools</button>
                <h3 className="a11y-section-title">Sections on this page</h3>
                {outline.length ? (
                  <ol className="a11y-outline">
                    {outline.map((item, index) => <li key={index} className={`level-${item.level}`}><button type="button" onClick={() => jumpTo(item.element)}>{item.text}</button></li>)}
                  </ol>
                ) : <p className="a11y-muted">This page has no section headings.</p>}
              </section>
            ) : (
              <>
                <section className="a11y-profiles">
                  <button type="button" className="a11y-profiles-toggle" aria-expanded={profilesOpen} onClick={() => setProfilesOpen(value => !value)}>
                    Select your accessibility profile <i className={`bi bi-chevron-down${profilesOpen ? " is-open" : ""}`} aria-hidden="true" />
                  </button>
                  {profilesOpen && (
                    <ul className="a11y-profile-list">
                      {ACCESSIBILITY_PROFILES.map(profile => (
                        <ProfileRow
                          key={profile.id}
                          profile={profile}
                          active={preferences.profiles.includes(profile.id)}
                          onToggle={() => { onToggleProfile(profile.id); announce(`${profile.label} profile ${preferences.profiles.includes(profile.id) ? "off" : "on"}`); }}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                <div className="a11y-tiles" role="group" aria-label="Accessibility tools">
                  <Tile icon={readerBusy ? "bi-stop-circle" : "bi-volume-up"} label={readerBusy ? "Stop Reading" : "Read Page"} pressed={readerBusy} onClick={handleReadPage} />
                  <Tile icon="bi-hand-index" label="Click to Read" pressed={preferences.clickToRead} onClick={() => toggle("clickToRead", "Click to read")} />
                  <Tile icon="bi-card-image" label="Describe Image" pressed={preferences.describeImages} onClick={() => toggle("describeImages", "Image descriptions")} />
                  <Tile icon="bi-eye-slash" label="Hide Images" pressed={preferences.hideImages} onClick={() => toggle("hideImages", "Hide images")} />
                  <Tile icon="bi-circle-half" label="High Contrast" pressed={preferences.highContrast} onClick={() => toggle("highContrast", "High contrast")} />
                  <Tile
                    icon="bi-palette"
                    label="Change Background Color"
                    detail={background.label}
                    steps={BACKGROUND_OPTIONS.length}
                    stepIndex={BACKGROUND_OPTIONS.indexOf(background)}
                    pressed={Boolean(preferences.background)}
                    onClick={() => { const next = nextOption(BACKGROUND_OPTIONS, preferences.background); setChoice("background", next.id, `Background colour: ${next.label}`); }}
                  />
                  <Tile
                    icon="bi-brush"
                    label="Change Text Color"
                    detail={textColour.label}
                    steps={TEXT_COLOUR_OPTIONS.length}
                    stepIndex={TEXT_COLOUR_OPTIONS.indexOf(textColour)}
                    pressed={Boolean(preferences.textColour)}
                    onClick={() => { const next = nextOption(TEXT_COLOUR_OPTIONS, preferences.textColour); setChoice("textColour", next.id, `Text colour: ${next.label}`); }}
                  />
                  <Tile icon="bi-zoom-in" label="Font Increase" detail={`Size ${fontLabel}`} disabled={preferences.fontScale >= FONT_SCALE_MAX} onClick={() => setChoice("fontScale", preferences.fontScale + 1, `Text size ${preferences.fontScale + 1}`)} />
                  <Tile icon="bi-zoom-out" label="Font Decrease" detail={`Size ${fontLabel}`} disabled={preferences.fontScale <= FONT_SCALE_MIN} onClick={() => setChoice("fontScale", preferences.fontScale - 1, `Text size ${preferences.fontScale - 1}`)} />
                  {saturationTile("monochrome", "Monochrome", "bi-droplet")}
                  {saturationTile("low", "Low Saturation", "bi-droplet-half")}
                  {saturationTile("high", "High Saturation", "bi-droplet-fill")}
                  <Tile icon="bi-yin-yang" label="Invert Colors" pressed={preferences.invert} onClick={() => toggle("invert", "Invert colours")} />
                  <Tile icon="bi-list-nested" label="Summarize Page" detail="Jump to a section" onClick={showOutline} />
                  <Tile icon="bi-spellcheck" label="Dictionary" detail="Select a word" pressed={preferences.dictionary} onClick={() => toggle("dictionary", "Word helper")} />
                  <Tile icon="bi-bounding-box" label="Highlight Focus" pressed={preferences.highlightFocus} onClick={() => toggle("highlightFocus", "Highlight focus")} />
                  <Tile icon="bi-link-45deg" label="Highlight Links" pressed={preferences.highlightLinks} onClick={() => toggle("highlightLinks", "Highlight links")} />
                  <Tile icon="bi-arrows-expand-vertical" label="Letter Spacing" pressed={preferences.letterSpacing} onClick={() => toggle("letterSpacing", "Letter spacing")} />
                  <Tile icon="bi-arrows-expand" label="Line Height" pressed={preferences.lineHeight} onClick={() => toggle("lineHeight", "Line height")} />
                  {cursorTile("large", "Increase Cursor", "bi-cursor")}
                  {cursorTile("dark", "Increase and Darken Cursor", "bi-cursor-fill")}
                  <Tile icon="bi-volume-mute" label="Mute Sound" pressed={preferences.muteSound} onClick={() => toggle("muteSound", "Mute sound")} />
                  <Tile icon="bi-pause-circle" label="Pause Animations" pressed={preferences.reduceMotion} onClick={() => toggle("reduceMotion", "Pause animations")} />
                  <Tile icon="bi-dash-lg" label="Reading Bar" pressed={preferences.readingBar} onClick={() => toggle("readingBar", "Reading bar")} />
                  <Tile icon="bi-view-stacked" label="Reading Mask" pressed={preferences.readingMask} onClick={() => toggle("readingMask", "Reading mask")} />
                  <Tile icon="bi-type" label="Font for Dyslexia" pressed={preferences.dyslexiaFont} onClick={() => toggle("dyslexiaFont", "Dyslexia-friendly font")} />
                  <Tile icon="bi-file-text" label="Reading Mode" pressed={readingMode} onClick={() => { closeMenu({ restoreFocus: false }); setReadingMode(true); }} />
                </div>
              </>
            )}
          </div>

          <footer className="a11y-menu-footer">
            {visibleReaderVoices.length > 1 && (
              <label className="a11y-voice">
                <span>Reading voice</span>
                <select value={readerVoiceName} onChange={handleVoiceChange}>
                  <option value="">Best available voice</option>
                  {visibleReaderVoices.map(voice => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
                </select>
              </label>
            )}
            <button type="button" className="a11y-reset" onClick={handleReset}><i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset all settings</button>
          </footer>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
      </div>
    </>
  );
}

export default AccessibilityMenu;
