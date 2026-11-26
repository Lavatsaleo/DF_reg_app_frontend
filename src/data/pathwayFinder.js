/*
 * Pathway finder questions and rules (used by components/PathwayFinder.jsx).
 * Nothing is saved or sent anywhere. The rules follow the eligibility in countryPathwayContent.js:
 *   Physical Academy  - full-time, in person, degree (HND in Nigeria)
 *   Virtual Academy   - part-time, online, diploma (OND/NCE in Nigeria), laptop or computer + internet
 *                       (a tablet or smartphone may be enough in Zambia)
 *   Digital Entrepreneurship - part-time, business goal, secondary school in most countries, any device
 * Update these alongside pathways.js when the programme team confirms hours and requirements.
 */

export const QUESTIONS = [
  {
    id: "goal",
    legend: "What do you want most from Digital Futures?",
    options: [
      { value: "job", label: "A job in IT or digital work" },
      { value: "business", label: "To start or grow my own business" },
      { value: "unsure", label: "I am not sure yet" },
    ],
  },
  {
    id: "time",
    legend: "How much time can you give to training?",
    options: [
      { value: "full", label: "Full-time: most of every weekday, for up to 9 months" },
      { value: "part", label: "Part-time: about 10 to 15 hours a week, for 3 to 4 months" },
      { value: "little", label: "Less than 10 hours a week" },
    ],
  },
  {
    id: "education",
    legend: "What is the highest level of education you have finished?",
    options: [
      { value: "degree", label: "A university degree (or an HND in Nigeria)" },
      { value: "diploma", label: "A college diploma (or an OND or NCE in Nigeria)" },
      { value: "secondary", label: "Secondary school" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "device",
    legend: "Which of these can you use often, with internet?",
    options: [
      { value: "computer", label: "A laptop or computer" },
      { value: "phone", label: "Only a smartphone or tablet" },
      { value: "neither", label: "Neither" },
    ],
  },
];

export const PATHWAY_TITLES = {
  PHYSICAL_ACADEMY: "Physical Academy",
  VIRTUAL_ACADEMY: "Virtual Academy",
  DIGITAL_ENTREPRENEURSHIP: "Digital Entrepreneurship",
};

export function suggestPathway({ goal, time, education, device }) {
  const notes = [];

  if (time === "little") {
    return {
      pathwayId: null,
      reasons: ["Every pathway needs at least about 10 hours a week, from the start to the end of the training."],
      notes: ["If you have more time later, you are welcome to apply next time."],
    };
  }

  // Remove the pathways the answers rule out.
  const fits = new Set(Object.keys(PATHWAY_TITLES));
  if (time === "part") fits.delete("PHYSICAL_ACADEMY");
  if (education !== "degree") fits.delete("PHYSICAL_ACADEMY");
  if (education === "secondary" || education === "none") fits.delete("VIRTUAL_ACADEMY");
  if (device === "neither") {
    fits.delete("VIRTUAL_ACADEMY");
    fits.delete("DIGITAL_ENTREPRENEURSHIP");
  }
  if (device === "phone" && fits.has("VIRTUAL_ACADEMY")) {
    notes.push("The Virtual Academy needs a laptop or computer in most countries. In Zambia, a tablet or smartphone may be enough.");
  }
  if (education === "none" && fits.has("DIGITAL_ENTREPRENEURSHIP")) {
    notes.push("Digital Entrepreneurship asks for secondary school in most countries. Check what your country asks for before you apply.");
  }

  let pathwayId = null;
  if (goal === "business" && fits.has("DIGITAL_ENTREPRENEURSHIP")) pathwayId = "DIGITAL_ENTREPRENEURSHIP";
  else if (time === "full" && fits.has("PHYSICAL_ACADEMY")) pathwayId = "PHYSICAL_ACADEMY";
  else if (fits.has("VIRTUAL_ACADEMY") && device !== "phone") pathwayId = "VIRTUAL_ACADEMY";
  else if (fits.has("DIGITAL_ENTREPRENEURSHIP")) pathwayId = "DIGITAL_ENTREPRENEURSHIP";
  else if (fits.has("VIRTUAL_ACADEMY")) pathwayId = "VIRTUAL_ACADEMY";
  else if (fits.has("PHYSICAL_ACADEMY")) pathwayId = "PHYSICAL_ACADEMY";

  const reasons = [];
  if (pathwayId === "PHYSICAL_ACADEMY") {
    reasons.push("You can train full-time, and you have the university degree this academy asks for.");
    if (device !== "computer") reasons.push("You do not need your own computer. The training centre has computers.");
  }
  if (pathwayId === "VIRTUAL_ACADEMY") {
    reasons.push(time === "part"
      ? "It is part-time and online, so you can fit it around the rest of your life."
      : "It is shorter and online. The Physical Academy needs a university degree (or an HND in Nigeria).");
    reasons.push("You have the college diploma this academy asks for.");
  }
  if (pathwayId === "DIGITAL_ENTREPRENEURSHIP") {
    reasons.push(goal === "business"
      ? "You want to start or grow your own business."
      : "The two academies need a college diploma or a university degree. This pathway needs less education.");
    reasons.push("It is part-time, with workshops in person and sessions online.");
    if (goal !== "business") notes.push("This pathway helps you earn money through your own business or freelance work, not a job with an employer.");
  }

  // Mention a second option when the answers leave one open.
  const alternativeId = [...fits].find((id) => id !== pathwayId && !(id === "DIGITAL_ENTREPRENEURSHIP" && goal === "job"));
  if (!pathwayId) {
    reasons.push(device === "neither"
      ? "The part-time pathways need a phone or computer with internet. The Physical Academy needs a university degree."
      : "From your answers, no pathway is a clear match.");
    notes.push("Check what your country asks for in the comparison, or contact our team for advice.");
  }

  return { pathwayId, alternativeId: alternativeId || null, reasons, notes };
}
