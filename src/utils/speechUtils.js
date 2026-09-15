let activeSpeechRun = 0;
let speechTimer = null;

const PAGE_READER_RATE = 0.82;
const PAGE_READER_PITCH = 0.96;
const PAGE_READER_VOLUME = 0.9;
const SENTENCE_PAUSE_MS = 180;
const PARAGRAPH_PAUSE_MS = 420;
const MAX_UTTERANCE_LENGTH = 360;

export function getSpeechSynthesis() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

function clearSpeechTimer() {
  if (speechTimer) {
    window.clearTimeout(speechTimer);
    speechTimer = null;
  }
}

function normalizeSpokenText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .trim();
}

function ensureNaturalEnding(value) {
  const text = normalizeSpokenText(value);
  if (!text) return "";

  // Give headings, labels and short interface text a natural stopping point.
  if (!/[.!?;:]$/.test(text)) return `${text}.`;
  return text;
}

function splitLongSentence(sentence) {
  const clean = normalizeSpokenText(sentence);
  if (!clean) return [];
  if (clean.length <= MAX_UTTERANCE_LENGTH) return [clean];

  const chunks = [];
  let remaining = clean;

  while (remaining.length > MAX_UTTERANCE_LENGTH) {
    const windowText = remaining.slice(0, MAX_UTTERANCE_LENGTH + 1);
    const punctuationBreak = Math.max(
      windowText.lastIndexOf(", "),
      windowText.lastIndexOf("; "),
      windowText.lastIndexOf(": ")
    );
    const wordBreak = windowText.lastIndexOf(" ");
    const breakAt = punctuationBreak > MAX_UTTERANCE_LENGTH * 0.55
      ? punctuationBreak + 1
      : wordBreak > MAX_UTTERANCE_LENGTH * 0.55
        ? wordBreak
        : MAX_UTTERANCE_LENGTH;

    chunks.push(ensureNaturalEnding(remaining.slice(0, breakAt)));
    remaining = remaining.slice(breakAt).trim();
  }

  if (remaining) chunks.push(ensureNaturalEnding(remaining));
  return chunks.filter(Boolean);
}

function splitIntoSentences(paragraph) {
  const clean = normalizeSpokenText(paragraph);
  if (!clean) return [];

  let sentences = [];

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const locale = typeof navigator !== "undefined" ? navigator.language : "en";
      const segmenter = new Intl.Segmenter(locale || "en", { granularity: "sentence" });
      sentences = Array.from(segmenter.segment(clean), (item) => item.segment.trim()).filter(Boolean);
    } catch {
      sentences = [];
    }
  }

  if (sentences.length === 0) {
    sentences = clean.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
  }

  return sentences.flatMap(splitLongSentence);
}

function buildSpeechSegments(text) {
  const paragraphs = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map(normalizeSpokenText)
    .filter(Boolean);

  const segments = [];

  paragraphs.forEach((paragraph) => {
    const sentences = splitIntoSentences(paragraph);

    sentences.forEach((sentence, index) => {
      segments.push({
        text: ensureNaturalEnding(sentence),
        pauseAfter: index === sentences.length - 1 ? PARAGRAPH_PAUSE_MS : SENTENCE_PAUSE_MS,
      });
    });
  });

  return segments;
}

function getPreferredVoice(speech) {
  if (!speech || typeof speech.getVoices !== "function") return null;

  const voices = speech.getVoices() || [];
  if (voices.length === 0) return null;

  const locale = (typeof navigator !== "undefined" && navigator.language) || "en-US";
  const language = locale.split("-")[0].toLowerCase();

  function scoreVoice(voice) {
    const voiceLang = String(voice.lang || "").toLowerCase();
    const voiceName = String(voice.name || "").toLowerCase();
    let score = 0;

    if (voiceLang === locale.toLowerCase()) score += 8;
    else if (voiceLang.startsWith(`${language}-`) || voiceLang === language) score += 5;

    if (/natural|neural|enhanced|premium/.test(voiceName)) score += 4;
    if (/google|microsoft|samantha|serena|daniel|zira|karen|moira/.test(voiceName)) score += 2;
    if (voice.localService) score += 1;
    if (/espeak|festival/.test(voiceName)) score -= 4;

    return score;
  }

  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

export function speakText(text) {
  const speech = getSpeechSynthesis();
  const segments = buildSpeechSegments(text);

  if (!speech || segments.length === 0) {
    return false;
  }

  activeSpeechRun += 1;
  const runId = activeSpeechRun;
  clearSpeechTimer();
  speech.cancel();

  function speakSegment(index) {
    if (runId !== activeSpeechRun || index >= segments.length) return;

    const segment = segments[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    const preferredVoice = getPreferredVoice(speech);

    utterance.rate = PAGE_READER_RATE;
    utterance.pitch = PAGE_READER_PITCH;
    utterance.volume = PAGE_READER_VOLUME;

    if (typeof navigator !== "undefined" && navigator.language) {
      utterance.lang = navigator.language;
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      if (preferredVoice.lang) utterance.lang = preferredVoice.lang;
    }

    utterance.onend = () => {
      if (runId !== activeSpeechRun) return;

      speechTimer = window.setTimeout(() => {
        speechTimer = null;
        speakSegment(index + 1);
      }, segment.pauseAfter);
    };

    utterance.onerror = (event) => {
      if (runId !== activeSpeechRun) return;
      if (event.error === "canceled" || event.error === "interrupted") return;

      // If one sentence fails, continue calmly with the next one rather than
      // abandoning the entire page reading session.
      speechTimer = window.setTimeout(() => {
        speechTimer = null;
        speakSegment(index + 1);
      }, PARAGRAPH_PAUSE_MS);
    };

    speech.speak(utterance);
  }

  speakSegment(0);
  return true;
}

export function stopSpeaking() {
  activeSpeechRun += 1;
  clearSpeechTimer();

  const speech = getSpeechSynthesis();
  if (speech) speech.cancel();
}

function isReadableElement(element) {
  if (!element) return false;
  if (element.closest("[hidden], [aria-hidden='true'], .visually-hidden, .ss-accessibility-toolbar")) return false;

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (element.getClientRects().length === 0) return false;

  return true;
}

function hasReadableAncestor(element, root, selector) {
  let parent = element.parentElement;

  while (parent && parent !== root) {
    if (parent.matches(selector) && isReadableElement(parent)) return true;
    parent = parent.parentElement;
  }

  return false;
}

function prepareReadableBlock(element) {
  let text = normalizeSpokenText(element.innerText || element.textContent || "");
  if (!text) return "";

  // A visible asterisk is useful visually, but speech should say what it means.
  text = text.replace(/\s*\*\s*$/, " required");
  return ensureNaturalEnding(text);
}

export function getReadablePageText() {
  if (typeof document === "undefined" || typeof window === "undefined") return "";

  const main = document.querySelector("main") || document.body;
  const readableSelector = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "legend",
    "label",
    "summary",
    "dt",
    "dd",
    "caption",
    "th",
    "td",
    "button",
  ].join(",");

  const blocks = Array.from(main.querySelectorAll(readableSelector))
    .filter((element) => isReadableElement(element))
    .filter((element) => !hasReadableAncestor(element, main, readableSelector))
    .map(prepareReadableBlock)
    .filter(Boolean);

  if (blocks.length > 0) {
    return blocks.join("\n\n");
  }

  // Fallback for unusual pages without semantic block elements.
  return normalizeSpokenText(main.innerText || main.textContent || "");
}
