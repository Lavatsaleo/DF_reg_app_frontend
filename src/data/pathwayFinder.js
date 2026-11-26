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
    legend: "What do you most want from Digital Futures?",
    options: [
      { value: "job", label: "A job in IT or digital work" },
      { value: "business", label: "To start or grow my own business" },
      { value: "unsure", label: "I am not sure yet" },
    ],
  },
  {
    id: "time",
    legend: "How much time could you give to training?",
    options: [
      { value: "full", label: "Full-time: most of every weekday, for up to nine months" },
      { value: "part", label: "Part-time: about 10 to 15 hours a week, for three to four months" },
      { value: "little", label: "Less than 10 hours a week" },
    ],
  },
  {
    id: "education",
    legend: "What is your highest completed qualification?",
    options: [
      { value: "degree", label: "A bachelor's degree (or an HND in Nigeria)" },
      { value: "diploma", label: "A diploma (or an OND or NCE in Nigeria)" },
      { value: "secondary", label: "Secondary school" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "device",
    legend: "Which of these can you use regularly, with internet access?",
    options: [
      { value: "computer", label: "A laptop or computer" },
      { value: "phone", label: "A smartphone or tablet only" },
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
      reasons: ["Every pathway needs at least about 10 hours a week for the whole training."],
      notes: ["If your time frees up, you are welcome to apply in a later intake."],
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
    notes.push("Digital Entrepreneurship asks for secondary school in most countries. Check the requirements for your country before you apply.");
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
    reasons.push("You can train full-time, and you have the degree this academy asks for.");
    if (device !== "computer") reasons.push("You do not need your own computer: you learn in the training centre's computer labs.");
  }
  if (pathwayId === "VIRTUAL_ACADEMY") {
    reasons.push(time === "part"
      ? "It is part-time and online, so it fits around your other commitments."
      : "It is a shorter, online option. The Physical Academy needs a bachelor's degree (or an HND in Nigeria).");
    reasons.push("You have the diploma this academy asks for.");
  }
  if (pathwayId === "DIGITAL_ENTREPRENEURSHIP") {
    reasons.push(goal === "business"
      ? "You want to start or grow your own business."
      : "The IT academies ask for a diploma or a degree, while this pathway has the lowest education requirement.");
    reasons.push("It is part-time, mixing in-person workshops and online sessions.");
    if (goal !== "business") notes.push("This pathway is about earning through your own business or freelance work, rather than a job with an employer.");
  }

  // Mention a second option when the answers leave one open.
  const alternativeId = [...fits].find((id) => id !== pathwayId && !(id === "DIGITAL_ENTREPRENEURSHIP" && goal === "job"));
  if (!pathwayId) {
    reasons.push(device === "neither"
      ? "Our part-time pathways need a device and internet access, and the Physical Academy needs a bachelor's degree."
      : "Based on your answers, none of the pathways is a clear match.");
    notes.push("Check the eligibility for your country in the comparison below, or contact the programme team for advice.");
  }

  return { pathwayId, alternativeId: alternativeId || null, reasons, notes };
}
