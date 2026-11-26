// Card wording agreed with the programme team (website wording, October 2026), rewritten in plainer language
// after the November 2026 content review ("Am I eligible? Which pathway is right for me? What will I learn?
// What will participation require? What support will I get? What happens after?").
//
// `compare` feeds the side-by-side comparison on the landing page (All countries view). Every statement is
// drawn from countryPathwayContent.js. Items still awaiting programme-team confirmation (exact weekly hours
// for every country, how start-up funding works, whether internships are paid) are worded so they stay true
// until confirmed: update them here once the team replies.
export const pathways = [
  {
    id: "PHYSICAL_ACADEMY",
    title: "Physical Academy",
    mode: "PHYSICAL",
    status: "open",
    tag: "In-person learning",
    icon: "bi-building-check",
    description:
      "For you if you want a career in IT, hold a degree, and can attend training in person, full-time, for about nine months.",
    facts: [
      { icon: "bi-calendar3", label: "About 9 months" },
      { icon: "bi-clock", label: "Full-time, in person" },
      { icon: "bi-mortarboard", label: "Degree needed" },
    ],
    highlights: [
      "Courses such as Software Development, Cybersecurity, Networking or Data Analytics, depending on your country",
      "Learn in a classroom and computer lab, with an instructor in the room",
      "Full-time, in person, for about 9 months",
      "Mentoring and career coaching",
      "Help to find an internship or a job after training",
    ],
    compare: {
      bestFor: "You want a career in IT, already hold a degree, and can make training your main daily activity for nine months.",
      howYouLearn: "In person, in a classroom and computer lab at a training centre or university, with an instructor in the room.",
      timeCommitment: "Full-time for about nine months. Plan for it to be like a full-time job or course: you attend every scheduled class and practical session for the whole period.",
      youWillLearn: "In-depth technical skills for an IT job. Depending on your country: Software Development, Cybersecurity, Cisco Networking, or Data Analytics and Business Intelligence. You build real projects you can show employers, and some courses prepare you for an industry certification exam.",
      education: "A bachelor's degree in any field (in Nigeria, a Higher National Diploma (HND) is also accepted).",
      whatYouNeed: "To be able to attend in person for the whole course. Computers are provided in the training centre's labs. In Ghana, you live on campus, with free accommodation.",
      support: "Free training, learning materials and computer labs, disability support (such as sign language interpreters and assistive technology), mentoring and career coaching.",
      afterYouFinish: "A certificate of completion, and help to find work experience (an internship) or a job. We make referrals and introductions to employers; a job is not guaranteed.",
    },
  },
  {
    id: "VIRTUAL_ACADEMY",
    title: "Virtual Academy",
    mode: "VIRTUAL",
    status: "open",
    tag: "Online learning",
    icon: "bi-laptop",
    description:
      "For you if you want a career in IT or digital work, hold a diploma, and want to learn online, part-time, for about four months.",
    facts: [
      { icon: "bi-calendar3", label: "About 4 months" },
      { icon: "bi-clock", label: "Part-time, online" },
      { icon: "bi-mortarboard", label: "Diploma needed" },
    ],
    highlights: [
      "Courses such as Data Analytics, IT Support, Web Development or Digital Marketing, depending on your country",
      "Online classes with an instructor, plus work you do in your own time",
      "Part-time for about 4 months (about 13 hours a week in Kenya and Nigeria)",
      "Mentoring and career coaching",
      "Help to find work experience (an internship) after training",
    ],
    compare: {
      bestFor: "You want a career in IT or digital work, hold a diploma, and need to learn from home around other commitments.",
      howYouLearn: "Mainly online: classes with an instructor (on platforms such as Zoom or Microsoft Teams) plus lessons and assignments you complete in your own time. Some countries add occasional in-person days.",
      timeCommitment: "Part-time for about four months. In Kenya and Nigeria this is about 13 hours a week for 16 weeks: for example, between 2 and 3 hours on each weekday.",
      youWillLearn: "Job-ready digital skills. Depending on your country: Data Analytics, IT Support and Networking, Web and Front-end Development, or Digital Marketing and E-commerce. Some courses prepare you for an industry certification exam.",
      education: "A diploma in any field (in Nigeria, an Ordinary National Diploma (OND) or NCE).",
      whatYouNeed: "Regular access to a laptop or computer and a reliable internet connection for the whole course (in Zambia, a tablet or smartphone may be enough).",
      support: "Free training and online learning materials, disability support, mentoring and career coaching. In Ghana, your data costs are covered.",
      afterYouFinish: "A certificate of completion, and help to find work experience (an internship) or a job. We make referrals and introductions to employers; a job is not guaranteed.",
    },
  },
  {
    id: "DIGITAL_ENTREPRENEURSHIP",
    title: "Digital Entrepreneurship",
    mode: "UNKNOWN",
    status: "open",
    tag: "Start or grow your business",
    icon: "bi-rocket-takeoff",
    description:
      "For you if you have a business idea or a small business and want to use digital tools, such as social media and selling online, to start or grow it. You do not need to run a technology business.",
    facts: [
      { icon: "bi-calendar3", label: "About 3 months" },
      { icon: "bi-clock", label: "Part-time, in person and online" },
      { icon: "bi-mortarboard", label: "Secondary school in most countries" },
    ],
    highlights: [
      "Learn to test your idea, sell online and manage your business finances",
      "Business coaching and mentoring",
      "You may have the chance to present your business idea for a chance to receive start-up funding",
      "Part-time for about 3 months, in person and online",
    ],
    compare: {
      bestFor: "You have a business idea or a small business and want to use digital tools to start or grow it. You do not need a technology business, and in most countries you do not need a business that is already running: an idea is enough.",
      howYouLearn: "A mix of in-person workshops and online sessions, with hands-on practice, coaching and learning from other participants.",
      timeCommitment: "Part-time for about three months (about six months in Kenya), with business support continuing after the training ends.",
      youWillLearn: "How to test a business idea, market and sell online, keep financial records, register your business, and present your business to people who could fund it.",
      education: "The lowest of the three pathways in most countries: from Junior High School in Ghana and secondary school in Nigeria. In Zambia, a diploma is required.",
      whatYouNeed: "A smartphone or computer and internet access for the online parts, and the ability to reach the in-person sessions in your country.",
      support: "Free training, business coaching and mentoring, and disability support.",
      afterYouFinish: "A certificate of completion and ongoing business mentoring. You may have the chance to present your business idea for a chance to receive start-up funding. Who can take part, and how the funding works, depends on your country: see your country's pathway details.",
    },
  },
];

// Row order and labels for the comparison table (All countries view).
// Other parts of the landing page (the pathway finder) open the collapsed comparison with this event.
export const OPEN_COMPARISON_EVENT = "df-open-comparison";

export const COMPARE_ROWS = [
  { key: "bestFor", label: "Best for you if", icon: "bi-person-heart" },
  { key: "timeCommitment", label: "Time you need to give", icon: "bi-clock" },
  { key: "youWillLearn", label: "What you will learn", icon: "bi-mortarboard" },
  { key: "education", label: "Minimum education", icon: "bi-journal-check" },
  { key: "howYouLearn", label: "How you learn", icon: "bi-easel" },
  { key: "whatYouNeed", label: "What you need", icon: "bi-laptop" },
  { key: "support", label: "Support you will receive", icon: "bi-gift" },
  { key: "afterYouFinish", label: "After you finish", icon: "bi-signpost-2" },
];
