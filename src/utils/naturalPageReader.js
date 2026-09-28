const READER_VOICE_STORAGE_KEY = "digitalFuturesReaderVoice";
const MAX_CHUNK_LENGTH = 620;
const DEFAULT_RATE = 0.96;
const DEFAULT_PITCH = 1.0;
const DEFAULT_VOLUME = 1.0;

let activeReaderRun = 0;
let readerTimer = null;

function getSpeechEngine() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

function getLocale() {
  if (typeof navigator === "undefined") return "en";
  return navigator.language || "en";
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .trim();
}

function scoreVoice(voice) {
  const locale = getLocale().toLowerCase();
  const language = locale.split("-")[0];
  const voiceLang = String(voice?.lang || "").toLowerCase();
  const voiceName = String(voice?.name || "").toLowerCase();
  let score = 0;

  if (voiceLang === locale) score += 30;
  else if (voiceLang.startsWith(`${language}-`) || voiceLang === language) score += 22;
  else if (voiceLang.startsWith("en")) score += 14;

  // Prefer voices explicitly described as higher-quality by the OS/browser.
  if (/natural/.test(voiceName)) score += 36;
  if (/neural/.test(voiceName)) score += 34;
  if (/online/.test(voiceName)) score += 24;
  if (/enhanced|premium/.test(voiceName)) score += 20;

  // Common higher-quality browser / operating-system voices.
  if (/microsoft/.test(voiceName)) score += 12;
  if (/google/.test(voiceName)) score += 10;
  if (/aria|jenny|ava|sonia|libby|ryan|guy|samantha|serena|daniel|karen|moira/.test(voiceName)) score += 10;

  // Local voices are useful offline, but don't let that outweigh a clearly
  // better natural/online voice.
  if (voice?.localService) score += 2;

  // These engines are functional but often noticeably synthetic.
  if (/espeak|festival|compact/.test(voiceName)) score -= 28;

  return score;
}

function sortVoices(voices) {
  return [...voices].sort((a, b) => {
    const scoreDifference = scoreVoice(b) - scoreVoice(a);
    if (scoreDifference !== 0) return scoreDifference;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export function getAvailableReaderVoices() {
  const speech = getSpeechEngine();
  if (!speech || typeof speech.getVoices !== "function") return [];
  return sortVoices(speech.getVoices() || []);
}

export function waitForReaderVoices(timeoutMs = 1200) {
  const speech = getSpeechEngine();
  if (!speech || typeof speech.getVoices !== "function") return Promise.resolve([]);

  const existing = getAvailableReaderVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      speech.removeEventListener?.("voiceschanged", handleVoicesChanged);
      resolve(getAvailableReaderVoices());
    }

    function handleVoicesChanged() {
      if (getAvailableReaderVoices().length > 0) finish();
    }

    speech.addEventListener?.("voiceschanged", handleVoicesChanged);
    window.setTimeout(finish, timeoutMs);
  });
}

export function getSavedReaderVoiceName() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(READER_VOICE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveReaderVoiceName(name) {
  if (typeof window === "undefined") return;
  try {
    if (name) window.localStorage.setItem(READER_VOICE_STORAGE_KEY, name);
    else window.localStorage.removeItem(READER_VOICE_STORAGE_KEY);
  } catch {
    // Storage may be disabled. The reader still works for the current session.
  }
}

function chooseVoice(voices, requestedVoiceName = "") {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  if (requestedVoiceName) {
    const requested = voices.find((voice) => voice.name === requestedVoiceName);
    if (requested) return requested;
  }

  const savedName = getSavedReaderVoiceName();
  if (savedName) {
    const saved = voices.find((voice) => voice.name === savedName);
    if (saved) return saved;
  }

  return voices[0] || null;
}

function sentenceSegments(text) {
  const clean = normalizeText(text);
  if (!clean) return [];

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter(getLocale(), { granularity: "sentence" });
      const sentences = Array.from(segmenter.segment(clean), (item) => item.segment.trim()).filter(Boolean);
      if (sentences.length > 0) return sentences;
    } catch {
      // Fall through to the punctuation-based splitter.
    }
  }

  return clean.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
}

function buildNaturalChunks(text) {
  const paragraphs = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map(normalizeText)
    .filter(Boolean);

  const chunks = [];

  paragraphs.forEach((paragraph) => {
    const sentences = sentenceSegments(paragraph);
    let current = "";

    sentences.forEach((sentence) => {
      const candidate = current ? `${current} ${sentence}` : sentence;

      if (candidate.length <= MAX_CHUNK_LENGTH) {
        current = candidate;
        return;
      }

      if (current) chunks.push({ text: current, paragraphEnd: false });

      if (sentence.length <= MAX_CHUNK_LENGTH) {
        current = sentence;
        return;
      }

      // Very long sentences are broken at natural word boundaries only when
      // necessary to keep Chrome/Windows speech synthesis reliable.
      let remaining = sentence;
      while (remaining.length > MAX_CHUNK_LENGTH) {
        const candidateSlice = remaining.slice(0, MAX_CHUNK_LENGTH + 1);
        const breakAt = Math.max(candidateSlice.lastIndexOf(", "), candidateSlice.lastIndexOf("; "), candidateSlice.lastIndexOf(" "));
        const safeBreak = breakAt > MAX_CHUNK_LENGTH * 0.55 ? breakAt : MAX_CHUNK_LENGTH;
        chunks.push({ text: remaining.slice(0, safeBreak).trim(), paragraphEnd: false });
        remaining = remaining.slice(safeBreak).trim();
      }
      current = remaining;
    });

    if (current) chunks.push({ text: current, paragraphEnd: true });
    else if (chunks.length > 0) chunks[chunks.length - 1].paragraphEnd = true;
  });

  return chunks.filter((chunk) => chunk.text);
}

function clearReaderTimer() {
  if (!readerTimer) return;
  window.clearTimeout(readerTimer);
  readerTimer = null;
}

export function stopNaturalReading() {
  activeReaderRun += 1;
  clearReaderTimer();
  const speech = getSpeechEngine();
  speech?.cancel();
}

export async function readTextNaturally(text, options = {}) {
  const speech = getSpeechEngine();
  const chunks = buildNaturalChunks(text);

  if (!speech || chunks.length === 0 || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }

  const voices = await waitForReaderVoices();
  const voice = chooseVoice(voices, options.voiceName || "");
  const runId = ++activeReaderRun;

  clearReaderTimer();
  speech.cancel();

  function speakChunk(index) {
    if (runId !== activeReaderRun || index >= chunks.length) return;

    const chunk = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunk.text);

    utterance.rate = options.rate || DEFAULT_RATE;
    utterance.pitch = options.pitch || DEFAULT_PITCH;
    utterance.volume = DEFAULT_VOLUME;
    utterance.lang = voice?.lang || getLocale();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (runId !== activeReaderRun) return;
      const pause = chunk.paragraphEnd ? 150 : 45;
      readerTimer = window.setTimeout(() => {
        readerTimer = null;
        speakChunk(index + 1);
      }, pause);
    };

    utterance.onerror = (event) => {
      if (runId !== activeReaderRun) return;
      if (event.error === "canceled" || event.error === "interrupted") return;

      readerTimer = window.setTimeout(() => {
        readerTimer = null;
        speakChunk(index + 1);
      }, 120);
    };

    speech.speak(utterance);
  }

  speakChunk(0);
  return true;
}
