// Pathway wording for the landing page, in plain language (November 2026 donor content review).
// Written so someone with a disability, including a learning or cognitive disability or a screen reader user,
// can answer before applying: Am I eligible? Which pathway is right for me? What will I learn? What will it
// ask of me? What support will I get? What happens after?
//
// Plain-language rules used here: short sentences with one idea each; everyday words; "you"; any term we
// cannot avoid (pathway, mentor, internship, assistive technology) is explained the first time it appears.
//
// Every fact comes from countryPathwayContent.js. Items still waiting for programme-team confirmation
// (weekly hours in Ghana and Zambia, how start-up money works, whether internships are paid) are worded so
// they stay true until confirmed: update them here once the team replies.
export const pathways = [
  {
    id: "PHYSICAL_ACADEMY",
    title: "Physical Academy",
    mode: "PHYSICAL",
    status: "open",
    tag: "Learn in a classroom",
    icon: "bi-building-check",
    description:
      "Learn skills for a job in IT (computers and technology). Classes are in person at a training centre. It is full-time, like a job, for about 9 months.",
    facts: [
      { icon: "bi-calendar3", label: "About 9 months" },
      { icon: "bi-clock", label: "Full-time, in person" },
      { icon: "bi-mortarboard", label: "University degree needed" },
    ],
    highlights: [
      "Courses such as making software, cyber security, computer networks or working with data. The courses depend on your country.",
      "A teacher in the classroom, and a computer lab to practise in",
      "A mentor: an experienced person who guides and advises you",
      "Help planning your career",
      "Help to find an internship (short work experience with an employer) or a job",
    ],
    compare: {
      bestFor: "You want a job in IT. You have a university degree. You can train full-time, like a job, for about 9 months.",
      howYouLearn: "In a classroom and a computer lab, with a teacher in the room. Training is at a training centre or university in your country.",
      timeCommitment: "Full-time for about 9 months. Treat it like a full-time job: you go to every class and practical session.",
      youWillLearn: {
        intro: "Skills for an IT job. Depending on your country, you learn one of these:",
        items: ["Making software", "Cyber security (keeping computers and information safe)", "Computer networks", "Working with data"],
        outro: "You build real projects to show employers. Some courses prepare you for a professional exam that employers know and trust.",
      },
      education: "A university degree in any subject. In Nigeria, a Higher National Diploma (HND) is also accepted.",
      whatYouNeed: "You must be able to attend in person for the whole course. You do not need your own computer: the training centre has computers. In Ghana, you live at the university for free.",
      support: "Free training and learning materials. Support for your disability, such as sign language interpreters and assistive technology (tools such as screen readers). A mentor and help planning your career.",
      afterYouFinish: "A certificate. Help to find an internship (short work experience with an employer) or a job. We introduce you to employers, but we cannot promise you a job.",
    },
  },
  {
    id: "VIRTUAL_ACADEMY",
    title: "Virtual Academy",
    mode: "VIRTUAL",
    status: "open",
    tag: "Learn online from home",
    icon: "bi-laptop",
    description:
      "Learn skills for a job in IT or digital work. You learn online, from home. It is part-time, so you can do other things too. It lasts about 4 months.",
    facts: [
      { icon: "bi-calendar3", label: "About 4 months" },
      { icon: "bi-clock", label: "Part-time, online" },
      { icon: "bi-mortarboard", label: "College diploma needed" },
    ],
    highlights: [
      "Courses such as working with data, IT support (fixing computers and networks), making websites or online marketing. The courses depend on your country.",
      "Online classes with a teacher, and lessons you do in your own time",
      "About 13 hours a week in Kenya and Nigeria",
      "A mentor: an experienced person who guides and advises you",
      "Help to find an internship (short work experience with an employer)",
    ],
    compare: {
      bestFor: "You want a job in IT or digital work. You have a college diploma. You want to learn from home and fit training around the rest of your life.",
      howYouLearn: "Mostly online. You join classes with a teacher on Zoom or Microsoft Teams. You also do lessons and tasks in your own time. Some countries have a few in-person days.",
      timeCommitment: "Part-time for about 4 months. In Kenya and Nigeria, this is about 13 hours a week for 16 weeks. For example, 2 to 3 hours each weekday.",
      youWillLearn: {
        intro: "Skills for IT and digital jobs. Depending on your country, you learn one of these:",
        items: ["Working with data", "IT support (fixing computers and networks)", "Making websites", "Online marketing and selling"],
        outro: "Some courses prepare you for a professional exam that employers know and trust.",
      },
      education: "A college diploma in any subject. In Nigeria, an Ordinary National Diploma (OND) or NCE.",
      whatYouNeed: "A laptop or computer and good internet for the whole course. In Zambia, a tablet or smartphone may be enough.",
      support: "Free training and online learning materials. Support for your disability. A mentor and help planning your career. In Ghana, we pay for your internet data.",
      afterYouFinish: "A certificate. Help to find an internship (short work experience with an employer) or a job. We introduce you to employers, but we cannot promise you a job.",
    },
  },
  {
    id: "DIGITAL_ENTREPRENEURSHIP",
    title: "Digital Entrepreneurship",
    mode: "UNKNOWN",
    status: "open",
    tag: "Start or grow your own business",
    icon: "bi-rocket-takeoff",
    description:
      "Learn to start or grow your own business using your phone or computer, for example by selling online. You do not need a business yet. In most countries, an idea is enough.",
    facts: [
      { icon: "bi-calendar3", label: "About 3 months" },
      { icon: "bi-clock", label: "Part-time, in person and online" },
      { icon: "bi-mortarboard", label: "Secondary school (most countries)" },
    ],
    highlights: [
      "Learn to test your business idea, sell online and look after your money",
      "A business coach and a mentor to guide you",
      "You may get the chance to present your business idea to win money to help start your business",
      "You do not need a technology business. Any kind of business can use digital tools.",
    ],
    compare: {
      bestFor: "You have a business idea or a small business. You want to use your phone or computer to start or grow it. You do not need a technology business. In most countries, you do not need a business yet: an idea is enough.",
      howYouLearn: "Workshops in person and sessions online. You practise, get coaching and learn from other people in the group.",
      timeCommitment: "Part-time for about 3 months (about 6 months in Kenya). Help with your business continues after the training ends.",
      youWillLearn: {
        intro: "How to:",
        items: [
          "Test your business idea",
          "Sell and advertise online",
          "Keep records of your money",
          "Register your business",
          "Present your business to people who might fund it",
        ],
      },
      education: "Less than the other pathways in most countries. In Ghana, Junior High School. In Nigeria, secondary school. In Zambia, a diploma is needed.",
      whatYouNeed: "A smartphone or computer and internet for the online parts. You must be able to get to the in-person sessions.",
      support: "Free training. A business coach and a mentor. Support for your disability.",
      afterYouFinish: "A certificate, and more help from a business mentor. You may get the chance to present your business idea to win money to help start or grow it. Who can do this, and whether the money must be paid back, is different in each country. See your country's details.",
    },
  },
];

// Other parts of the landing page (the pathway finder) open the collapsed comparison with this event.
export const OPEN_COMPARISON_EVENT = "df-open-comparison";

// Row order and labels for the comparison table (All countries view).
export const COMPARE_ROWS = [
  { key: "bestFor", label: "This may suit you if", icon: "bi-person-heart" },
  { key: "timeCommitment", label: "How much time it takes", icon: "bi-clock" },
  { key: "youWillLearn", label: "What you will learn", icon: "bi-mortarboard" },
  { key: "education", label: "Education you need", icon: "bi-journal-check" },
  { key: "howYouLearn", label: "How you learn", icon: "bi-easel" },
  { key: "whatYouNeed", label: "What you need", icon: "bi-laptop" },
  { key: "support", label: "Support you get", icon: "bi-gift" },
  { key: "afterYouFinish", label: "After you finish", icon: "bi-signpost-2" },
];
