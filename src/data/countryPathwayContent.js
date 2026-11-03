/*
 * Country pages shown after an applicant chooses their country, before consent.
 * Source: "Web page prompts" documents from the country programme managers (November 2026),
 * pending copy-edit review. Revise each application cycle.
 *
 * Text blocks: a string is a paragraph; an array of strings is a bulleted list.
 * A country with comingSoon: true shows a "details coming soon" notice instead of pathway content.
 */

const GENERAL_FAQS = {
  multiplePathways: {
    question: "Can I apply for more than one pathway in a single application?",
    answer: [
      "No. Applicants can only apply for one pathway in each application cycle.",
      "Please review all the pathways and choose the one that best matches your interests, experience, career goals and availability. During recruitment, the programme team may recommend a more suitable pathway if another option better matches your skills and goals.",
    ],
  },
  onBehalf: {
    question: "Can someone else apply on my behalf?",
    answer: [
      "No. You must complete and submit the application yourself.",
      "This makes sure the information is accurate and that you understand and agree to the application process. If you need accessibility support, a trusted person may help you through the process, but the information must be your own and you must give your own consent.",
    ],
  },
  successful: {
    question: "How do I know if I am successful?",
    answer: [
      "We will contact all applicants using the email address given in the application. Applicants who move to the next stages will receive information about:",
      ["the basic IT skills assessment (where it applies)", "interviews", "additional verification requirements"],
      "Successful applicants will receive an official email with onboarding instructions, training schedules and the next steps for joining their pathway. Please check your inbox and your spam or junk folder regularly after you apply.",
    ],
  },
  defer: {
    question: "Can I defer my application once it is submitted?",
    answer: [
      "No. Applications cannot be deferred to a future cohort.",
      "If you are selected but cannot take part during the scheduled training period, you may need to apply again when applications reopen. Please apply only if you are confident you can commit to the full training.",
    ],
  },
  provides: {
    question: "What does the programme provide?",
    answer: [
      "Selected participants will receive:",
      [
        "high-quality technical training from qualified instructors",
        "access to learning materials and practical labs",
        "certification preparation support",
        "career readiness and employability skills training",
        "mentorship and coaching",
        "support with referrals to internship and employment opportunities where available",
      ],
      "Additional support may include:",
      [
        "accessible learning environments",
        "sign language interpretation where required",
        "accommodation and support services for eligible participants at the physical academy",
      ],
      "The exact support package depends on the pathway.",
    ],
  },
  device: {
    question: "What if I do not have a digital device?",
    answer: [
      "Requirements vary by pathway. Physical academy participants can use the learning facilities, computer labs and training equipment at the training centre.",
      "Virtual academy participants need reliable access to a suitable device, such as a laptop or computer, and an internet connection to take part fully in online learning.",
      "If you do not have access to a device, please say so in your application so the programme team can understand your circumstances and offer guidance where possible. We cannot guarantee access to a device.",
    ],
  },
  certificate: {
    question: "Will I receive a certificate?",
    answer: [
      "Yes. Participants who complete their pathway receive a certificate of completion.",
      "Depending on the pathway, participants may also sit a professional certification exam. Those who pass receive the industry-recognised certification. Certificates show the knowledge and skills you gained and can strengthen your job prospects.",
    ],
  },
};

function whoCanApply(country) {
  return {
    question: "Who can apply?",
    answer: [
      `The Digital Futures ${country} programme is open to persons with disabilities who meet the eligibility requirements for their chosen pathway. Applicants must:`,
      [
        "meet the age requirement for the pathway",
        "show an interest in technology, digital careers or entrepreneurship",
        "have basic digital skills, such as using a computer or smartphone",
        "meet the minimum education requirement for the pathway",
        "be available for the full training programme",
      ],
      "Please read the eligibility criteria for your pathway carefully before you apply.",
    ],
  };
}

function familyMember(country) {
  return {
    question: "Can I apply if I am not a person with a disability, but I have a family member with a disability?",
    answer: [
      "No. The programme is designed for persons with disabilities, and only eligible persons with disabilities can apply.",
      `If you have a family member, friend or colleague with a disability who may benefit, please encourage them to apply and share the application link with them. We welcome applications from eligible persons with disabilities across ${country}.`,
    ],
  };
}

function tuitionFees(country, contactEmail) {
  return {
    question: "Do I need to pay tuition fees?",
    answer: [
      `No. The Digital Futures ${country} programme is free for all selected participants.`,
      "You will never be asked to pay an application, registration, tuition, examination or accommodation fee, or any other charge. If anyone asks you for payment in exchange for admission, training, certification, accommodation, placement or any programme service, please report it immediately.",
      { label: "For safeguarding concerns or to report suspected fraud, contact", email: contactEmail },
    ],
  };
}

const WEST_AFRICA_JOURNEY = [
  "Select the IT academy pathway that best fits you: physical academy, virtual academy or Digital Entrepreneurship. You can only select one pathway.",
  "Check your eligibility by reading the eligibility criteria for your pathway.",
  "Complete the consent check.",
  "Fill out your application. All required fields must be completed.",
  "Submit your application.",
  "Check your application status.",
  "Complete the basic IT skills assessment, done remotely. This is only for applicants who meet the eligibility criteria.",
  "Complete an interview, held remotely.",
  "Successful applicants join their selected or recommended pathway.",
];

const STANDARD_PROVIDES = [
  "Technical training delivered by qualified instructors",
  "Access to learning materials and practical labs",
  "Certification preparation support",
  "Career readiness and employability skills training",
  "Mentorship and coaching",
  "Support with referrals to internship and job placement opportunities where available",
];

const GHANA = {
  journey: WEST_AFRICA_JOURNEY,
  pathways: {
    PHYSICAL_ACADEMY: {
      summary: "Nine months of full-time, residential IT training at the University of Ghana, Legon, where you live and learn on campus.",
      courses: [
        {
          name: "Software Development + AI",
          description: "Learn to build websites, applications and digital solutions, using artificial intelligence (AI) tools to work more productively and creatively.",
          learn: [
            "Advanced programming and software design principles, professional and client-facing workplace readiness, back-end development with Node.js/Express or Python/Django, advanced SQL and database design, Docker, containerisation and DevOps basics, React and full-stack integration, testing, quality assurance and debugging, security for developers, AI-augmented software engineering, an applied practicum or employer-linked project, a capstone project, and certification and career readiness.",
          ],
          certification: "No external certification. You will build a GitHub portfolio, real-life projects and practical technical assessments.",
          careers: "Junior Software Developer, Front-End Developer, Web Developer, Application Support Officer, Technical Product Associate, AI Application Developer (entry level), Freelance Developer",
        },
        {
          name: "Cybersecurity + AI",
          description: "Gain the skills to identify, prevent, monitor and respond to cybersecurity threats in modern digital environments.",
          learn: [
            "Cybersecurity foundations and the threat landscape, professional and client-facing workplace readiness, networking fundamentals for security practitioners, Linux and scripting for security operations, identity and access management and cryptography, governance, risk, compliance and Ghana's legal framework, ethical hacking and penetration testing (reconnaissance, scanning, exploitation and reporting), digital forensics fundamentals, security operations and incident response, AI in cybersecurity, certification preparation for CompTIA Security+ (SY0-701), and a capstone simulated organisational security assessment.",
          ],
          certification: "CompTIA Security+",
          careers: "Cybersecurity Analyst, Security Operations Centre (SOC) Analyst, IT Security Officer, Security Compliance Assistant, Risk and Governance Officer, Information Security Officer",
        },
      ],
      location: [
        "University of Ghana, Legon campus, Accra: ground floor of the Assistive Technology Lab, University of Ghana Information Technology Directorate (UGITD).",
        "The academy is a fully accessible environment where participants live and learn on campus for the whole training period. Free hostel accommodation, aid support and sign language interpreters are provided for successful candidates for the duration of the training.",
      ],
      dates: ["Training is expected to run for nine months, from January to September 2027, followed by internship and employment preparation activities."],
      provides: [
        "Technical training delivered by qualified instructors",
        "Accessibility and inclusion support",
        "A residential facility and reasonable accommodation",
        "Access to learning materials and practical labs",
        "Certification preparation support",
        "Career readiness and employability skills training",
        "Mentorship and coaching",
        "Support with referrals to internship and job placement opportunities where available",
      ],
      expected: [
        "Live on campus for the full programme",
        "Attend all scheduled classes and practical sessions",
        "Complete assignments and projects",
        "Take part in mentorship and career readiness activities",
        "Sit certification examinations where required",
        "Follow programme rules, safeguarding requirements and codes of conduct",
      ],
      eligibility: [
        "Be aged 18–35 at the end of the training",
        "Be a person with a disability",
        "Be willing to stay on the University of Ghana campus for nine months",
        "Be available to attend training for the full nine months",
        "Show an interest in a career in IT and technology",
        "Hold a bachelor's degree in any field",
      ],
    },
    VIRTUAL_ACADEMY: {
      summary: "Four months of online IT training with periodic in-person sessions, open to applicants from all regions of Ghana.",
      learning: [
        "The virtual academy is delivered mainly online through Microsoft Teams, Zoom and the programme's learning management system (LMS), with periodic in-person engagement.",
      ],
      courses: [
        {
          name: "IT Support / Networking",
          description: "Learn to install, maintain, troubleshoot and support computer systems, software applications and network infrastructure.",
          learn: [
            "Digital literacy and professional foundations, computer hardware fundamentals, operating systems and software troubleshooting, networking fundamentals and cloud networking awareness, security fundamentals for IT support, remote and helpdesk support practice with ticketing systems, cloud and modern IT environments, a capstone project, and certification and career readiness.",
          ],
          certification: "CompTIA Network+",
          careers: "IT Support Officer, Helpdesk Analyst, Technical Support Specialist, Network Support Technician, Systems Support Assistant, IT Administrator, Service Desk Analyst",
        },
        {
          name: "Digital Marketing",
          description: "Learn to plan, create, manage and measure digital marketing campaigns across online platforms.",
          learn: [
            "Digital literacy and professional foundations, digital marketing fundamentals and content strategy, social media marketing and Meta Ads Manager, search engine optimisation and Google marketing tools, e-commerce fundamentals and conversion rate optimisation, analytics, measurement and campaign reporting, a capstone project, and certification and career readiness.",
          ],
          certification: "Meta Certified Digital Marketing Associate",
          careers: "Digital Marketing Officer, Social Media Manager, Content Creator, SEO Specialist, Marketing Assistant, Digital Advertising Associate, Communications Officer, Freelance Digital Marketer",
        },
      ],
      location: ["The virtual academy is delivered mainly online, with periodic in-person engagement. It is open to applicants from all regions of Ghana."],
      dates: ["Training is expected to run for four months: January to April 2027 for cohort 1, and July to October 2027 for cohort 2."],
      provides: [
        "Technical training delivered by qualified instructors",
        "Access to learning materials and practical labs on a learning management system",
        "Certification preparation support",
        "Career readiness and employability skills training",
        "Mentorship and coaching",
        "Support with referrals to internship and job placement opportunities where available",
        "Data costs to take part in the training",
      ],
      eligibility: [
        "Be a young woman or young man with a disability",
        "Be aged 18–35 at the end of the training",
        "Hold a minimum of a diploma in any field",
        "Show an interest in technology and digital careers",
        "Have access to a laptop or computer and a stable internet connection",
        "Be available for the whole programme",
        "Be committed to completing assignments, projects and assessments",
      ],
    },
    DIGITAL_ENTREPRENEURSHIP: {
      summary: "A three-month hybrid programme delivered by Sightsavers with Mind Builders Africa, the programme's business development services partner, open to applicants from all regions of Ghana.",
      learning: [
        "Digital Entrepreneurship has the lowest barrier to entry: it needs only secondary school education and basic digital literacy. It supports young persons with disabilities to develop the skills, knowledge, networks and resources to start and grow sustainable digital businesses, combining entrepreneurship training, digital skills, business coaching, mentorship and access to start-up funding opportunities.",
        "The three-month hybrid model aims for about 70% in-person and 30% online time, and may include:",
        [
          "in-person sessions: discussion, mentoring, hands-on practice and peer learning",
          "digital and self-paced parts: short lessons, templates and take-home tasks delivered through low-bandwidth channels such as WhatsApp, SMS or a simple learning platform",
        ],
      ],
      courses: [
        {
          name: "Curriculum overview",
          description: "The pathway helps participants set up and grow technology-enabled businesses.",
          learn: [[
            "Entrepreneurial mindset and foundations",
            "Digital business models",
            "Market research and validation",
            "Business planning and formalisation",
            "Digital marketing and online presence",
            "Digital sales and e-commerce operations",
            "Financial management",
            "AI and automation for nano and micro entrepreneurs",
            "Digital tools, data protection and cybersecurity",
            "Customer relationship and reputation management",
            "Growth, networking and sustainability",
            "Green digital skills",
            "Capstone: pitching and launch plan",
          ]],
        },
      ],
      location: ["Open to applicants from all regions of Ghana."],
      dates: ["Training is expected to run for three months, from April to June 2027, for cohort 1. Participants who complete the training can apply for a grant, and grant recipients receive mentorship to start their business."],
      eligibility: [
        "Be a person with a disability",
        "Be aged 18–45 at the end of the training",
        "Have basic numeracy and digital literacy skills",
        "Live in Ghana",
        "Be available for the training",
        "Have a basic business idea or an existing business",
        "Have at least a secondary school qualification",
        "Have a nano enterprise (1–2 employees) or micro enterprise (3–5 employees)",
        "Show passion, interest and motivation to start or grow a digital enterprise",
        "Clearly define the problem the business will solve, understand the target audience and offer a logical digital-led solution",
        "Have a business with socio-economic impact, such as the potential to create jobs or benefit the community",
      ],
    },
  },
  faqs: [
    whoCanApply("Ghana"),
    GENERAL_FAQS.multiplePathways,
    GENERAL_FAQS.onBehalf,
    familyMember("Ghana"),
    GENERAL_FAQS.successful,
    GENERAL_FAQS.defer,
    tuitionFees("Ghana", "ratengdem@sightsavers.org"),
    GENERAL_FAQS.provides,
    GENERAL_FAQS.device,
    GENERAL_FAQS.certificate,
    {
      question: "Where will the training take place?",
      answer: [[
        "Physical academy: Assistive Technology Lab, University of Ghana Information Technology Directorate (UGITD), Accra",
        "Virtual academy: online through Microsoft Teams, Zoom and the programme learning management system (LMS)",
        "Digital Entrepreneurship: a hybrid of online and in-person learning, with priority given to in-person participation where possible",
      ]],
    },
    {
      question: "How long does the training last?",
      answer: [
        [
          "Physical academy: nine months (January to September 2027)",
          "Virtual academy: four months per cohort",
          "Digital Entrepreneurship: three months per cohort",
        ],
        "All pathways include mentorship, internship preparation, job-readiness activities or business support after the training.",
      ],
    },
  ],
};

const KENYA = {
  journey: [
    "Select the IT academy pathway that best fits you: physical academy, virtual academy or Digital Entrepreneurship, then choose Kenya.",
    "Check your eligibility against the criteria for your pathway.",
    "Complete the consent check. This confirms you agree to apply and to how we will use your information.",
    "Fill out your application. The application portal has been tested by young people with many different disabilities. If you need help, a family member, caregiver or organisation of persons with disabilities (OPD) can support you.",
    "Submit your application.",
    "Check your application status on the portal.",
    "Complete a basic IT skills assessment (physical and virtual academy only). This is done remotely, and you can ask for reasonable accommodation.",
    "Complete an interview. This is held remotely, with sign language interpretation or other support if you need it.",
  ],
  pathways: {
    PHYSICAL_ACADEMY: {
      summary: "Nine months of full-time, hands-on IT training in a classroom and computer lab, with an instructor in the room. It suits you if you want to build deep technical skills and can attend in person every week for the whole course.",
      courses: [
        {
          name: "Software Development",
          description: "Learn to build working software, web and mobile applications from the ground up. This is the course Kenyan employers ask for most: software development makes up almost 4 in 10 IT job vacancies in Kenya.",
          learn: [
            "You start with digital and professional foundations, then learn:",
            [
              "programming fundamentals in JavaScript and Python",
              "mobile app development",
              "databases (SQL) and connecting applications through APIs",
              "working in a team with Git, plus DevOps basics",
              "testing, debugging and writing secure code",
              "using AI tools responsibly in software development",
              "cloud fundamentals for developers",
            ],
            "You finish with a real project for an employer and a capstone project for your portfolio. Employability skills are built in throughout.",
          ],
          certification: "There is no single industry certificate for entry-level software developers, and employers in Kenya told us they value a strong portfolio most. You will graduate with a portfolio of working projects, an employer-linked project record and a certificate of completion from Strathmore University, which is delivering the training and certification.",
          careers: "Junior Software Developer, Junior Web or Mobile App Developer, Software Tester (QA), Junior Back-end Developer",
        },
      ],
      location: [
        "Training is hosted by the National Industrial Training Authority (NITA), a national public training institution. In this cycle the physical academy runs at two NITA campuses:",
        [
          "NITA Nairobi: Commercial Street, Industrial Area, Nairobi",
          "NITA Athi River: Namanga Road, Athi River / Kitengela border, Machakos County",
        ],
        "NITA has carried out accessibility audits of its campuses with the programme, and accessibility improvements are being completed before training begins. Accommodation will be provided in the NITA hostels. The NITA campuses in Kisumu and Mombasa are expected to join in a later intake, from mid-2027.",
      ],
      dates: ["Training is expected to run for nine months, from March to November 2027, and includes job-readiness support. After the nine months, learners move on to six months of internship where opportunities arise."],
      provides: [
        "Free, full-time technical training delivered by qualified instructors",
        "Access to computer labs, software and learning materials",
        "Reasonable accommodation for your disability, such as Kenyan Sign Language interpreters, screen readers and other assistive technology, and accessible learning materials",
        "Support from learner-support assistants throughout the course",
        "Preparation for, and the exam fee for, the industry certification linked to your course (where the course leads to one)",
        "Employability and soft skills training, including CV writing, interview practice and workplace readiness",
        "Mentorship and coaching",
        "Support to prepare for and apply to internships and jobs with employers, including members of the Kenya Business and Disability Network (KBDN)",
      ],
      expected: [
        "Attend training for the full nine months and take part in all practical sessions",
        "Complete your assignments, assessments and final project",
        "Take part in follow-up surveys after you finish, so we can learn how the programme helped you",
      ],
      eligibility: [
        "Be a person with a disability",
        "Be aged 18 to 35",
        "Have a bachelor's degree",
        "Live in Kenya",
        "Be able to attend in person at NITA Nairobi or NITA Athi River for the full nine months",
        "Be able to read and write in English and have basic numeracy",
        "Show an interest in a career in IT and technology",
      ],
      note: "Women with disabilities are strongly encouraged to apply.",
    },
    VIRTUAL_ACADEMY: {
      summary: "A fully online academy delivered by Strathmore University, about 13 hours a week for 16 weeks. You can join from anywhere in Kenya.",
      learning: [
        "The virtual academy is fully online. It is delivered by Strathmore University through its online learning platform, which is designed to work on low-bandwidth connections. Each week combines live, interactive online classes with an instructor and guided practice you complete in your own time. The course takes about 13 hours a week, and the learning platform tracks your progress so tutors can step in early if you need support.",
      ],
      courses: [
        {
          name: "Data Analytics",
          description: "Learn to turn raw data into clear insights and dashboards that help organisations make decisions. Data analytics is the second most in-demand IT skill in Kenya, making up almost 1 in 5 IT job vacancies. This is a 16-week (about four-month) entry-level course for people new to data; no technical background is needed.",
          learn: [
            [
              "digital and professional foundations",
              "cleaning and organising data with spreadsheets and SQL",
              "analysing data with Python (pandas)",
              "building accessible dashboards in Microsoft Power BI or Tableau",
              "statistical thinking and an introduction to R",
              "using AI tools to speed up analysis, and checking their results",
            ],
            "You finish with a capstone project and a portfolio of at least two analysis projects.",
          ],
          certification: "Expected to be Microsoft Power BI Data Analyst Associate (PL-300)",
          careers: "Junior Data Analyst, Reporting or Business Intelligence Assistant, Monitoring and Evaluation (Data) Assistant",
        },
      ],
      location: ["You can join from anywhere in Kenya. You will need regular access to a laptop or computer and a reliable internet connection."],
      dates: ["The first cohort is expected to start in March 2027 and finish around June 2027. Further cohorts will follow."],
      provides: [
        "Free online training with live tutor support",
        "Access to the learning platform, software and learning materials",
        "Reasonable accommodation for your disability, such as sign language interpretation for live sessions, captioning and screen-reader-accessible materials",
        "Preparation for, and the exam fee for, your industry certification",
        "Employability skills, mentorship and links to internships and jobs",
      ],
      expected: [
        "Attend your live sessions",
        "Complete your weekly learning and assessments",
        "Take part in follow-up surveys",
      ],
      eligibility: [
        "Be a person with a disability aged 18 to 35 and living in Kenya",
        "Hold a diploma",
        "Be able to read and write in English and have basic numeracy",
        "Have regular access to a laptop or computer and the internet",
        "Be available for about 13 hours a week for 16 weeks",
      ],
    },
    DIGITAL_ENTREPRENEURSHIP: {
      summary: "A hybrid programme with Strathmore University that combines in-person workshops in Nairobi with online learning, followed by business support.",
      learning: [
        "Digital Entrepreneurship combines in-person workshops with online learning. It is delivered with Strathmore University and runs for about six months, including 40 hours of structured training. Business support continues after the training ends.",
        "In-person learning takes place at the iBizAfrica lab at Strathmore University, Nairobi. Online sessions use Strathmore's online learning platform, which is designed to work on low-bandwidth connections.",
      ],
      courses: [
        {
          name: "Digital Entrepreneurship",
          description: "A practical programme for young people with disabilities who want to start or grow a business, or earn income through online and freelance work, using digital tools.",
          learn: [[
            "developing and testing a business idea",
            "using digital tools to run a business",
            "digital marketing and selling online",
            "financial management and record-keeping",
            "registering and formalising a business",
            "accessing finance and pitching your business",
            "freelancing and online platform work",
          ]],
          afterTraining: "At least six months of mentorship and business development support. Participants can also pitch for seed funding, which is awarded competitively and managed by a regulated financial institution.",
          certification: "Certificate of completion from Strathmore University",
          careers: "Digital business owner, freelancer or online service provider, self-employed digital professional",
        },
      ],
      location: ["Participants must be based in Nairobi and its environs. The in-person sessions are in Nairobi, and applicants must be able to attend them."],
      dates: ["Expected to start in March 2027."],
      eligibility: [
        "Be a person with a disability aged 18 to 45 and living in Kenya",
        "Have a business idea or an early-stage business",
        "Be able to attend the in-person sessions in Nairobi and complete the online learning",
      ],
      note: "Women with disabilities are especially encouraged to apply: we aim for three in four places in this pathway to go to women.",
    },
  },
  faqs: [
    {
      question: "Who can apply?",
      answer: ["Young women and men with disabilities who live in Kenya and meet the eligibility criteria for their chosen pathway: aged 18 to 35 for the physical and virtual academies, and 18 to 45 for Digital Entrepreneurship. Women with disabilities are strongly encouraged to apply."],
    },
    {
      question: "Can I apply for more than one pathway in a single application?",
      answer: ["No. Please choose the one pathway that best fits your goals and availability."],
    },
    {
      question: "Can someone else apply on my behalf?",
      answer: ["A family member, caregiver or OPD can help you complete the application. However, the application must be in your name and you must give your own consent through the consent check."],
    },
    {
      question: "Can I apply if I am not a person with a disability, but I have a family member with a disability?",
      answer: ["No. The programme is for young people with disabilities. You are welcome to help your family member apply."],
    },
    {
      question: "How do I know if I am successful?",
      answer: ["You can check your application status on the portal. We will also offer feedback by the communication method you choose in your application."],
    },
    {
      question: "Can I defer my application once it is submitted?",
      answer: ["Please contact us as soon as possible. Where places allow, we may consider you for a later intake."],
    },
    {
      question: "Do I need to pay tuition fees?",
      answer: ["No. Training is free for everyone selected."],
    },
    {
      question: "What does the programme provide?",
      answer: ["Free training, learning materials, reasonable accommodation for your disability, certification support, employability training, business development support and mentorship. The pathway details above explain what each pathway offers."],
    },
    {
      question: "What if I do not have a digital device?",
      answer: ["Physical academy learners use the computer labs at the NITA campus. For the virtual academy and Digital Entrepreneurship, tell us about your device and internet access in your application."],
    },
    {
      question: "Will I receive a certificate?",
      answer: ["Yes. Everyone who completes the course receives a certificate of completion. Where your course leads to an industry certification, we will prepare you for the exam and cover the exam fee."],
    },
    {
      question: "What support is available for my disability?",
      answer: ["Tell us what you need in your application. Support can include Kenyan Sign Language interpreters, screen readers and other assistive technology, accessible learning materials, learner-support assistants and accessible venues."],
    },
    {
      question: "What happens after I finish?",
      answer: ["During the training we offer employability skills training, mentorship, career fairs, industry exposure and linkage activities to help you find an internship, a job or self-employment. This includes links to employers in the Kenya Business and Disability Network, mentorship and, for entrepreneurs, business support and the chance to pitch for seed funding."],
    },
  ],
};

const NIGERIA = {
  journey: WEST_AFRICA_JOURNEY,
  pathways: {
    PHYSICAL_ACADEMY: {
      summary: "Nine months of full-time, in-person software development training at the Digital Bridge Institute (DBI) campuses in Lagos and Kano.",
      learning: [
        "In this first year, Software Development is the only physical academy course, with 50 places at each DBI campus. In later years the programme plans to add courses such as Cybersecurity, Cloud Computing and Data Analytics, guided by industry demand and employment trends.",
      ],
      courses: [
        {
          name: "Software Development",
          description: "Develop practical software engineering skills through hands-on training in programming, full-stack application development, databases, testing, cloud deployment and collaborative coding. You will learn to build and deploy real-world applications, use AI-assisted development responsibly, and build a portfolio to show employers and clients. The course also covers foundational digital skills for people new to technology, AI and automation, gig economy and freelancing skills, and product management fundamentals.",
          learn: [
            "Programming fundamentals, computational thinking, full-stack web development, database management, software testing, cloud deployment, version control using Git, and responsible use of AI coding tools. Training combines classroom instruction, hands-on coding projects, collaborative development and practical application deployment.",
          ],
          careers: "Junior Software Developer, Full-Stack Developer, Front-End Developer, Back-End Developer, Web Application Developer",
        },
      ],
      location: [
        "Training is delivered in person at the Digital Bridge Institute (DBI) campuses:",
        [
          "Lagos: No. 1 Nitel Road, Cappa-Oshodi, Lagos",
          "Kano: Plot 532 Katsina Road, by the airport roundabout, Kano",
        ],
        "The training centres are fully accessible and equipped for hands-on technical training. Free hostel accommodation, aid support and sign language interpreters are provided for successful candidates for the duration of the training.",
      ],
      dates: ["Training is expected to run for nine months, from March to November 2027, followed by internship and employment preparation activities."],
      provides: [
        "Technical training delivered by qualified instructors",
        "Access to learning materials and practical labs",
        "Building a portfolio on GitHub and similar platforms",
        "Career readiness and employability training",
        "Mentorship and coaching",
        "Support with referrals to internship and job placement opportunities where available",
      ],
      eligibility: [
        "Be aged 18–33 at the time of application",
        "Be a person with a disability",
        "Be available to attend training in person for the full nine months at either the Lagos or Kano academy",
        "Show an interest in a career in IT and technology",
        "Have basic IT skills, such as using a computer and basic software like Microsoft Word",
        "Hold at least a Higher National Diploma (HND) or a bachelor's degree in any field",
      ],
      note: "Training is free. Eligible and selected candidates are not expected to pay anything to anybody to be part of the programme.",
    },
    VIRTUAL_ACADEMY: {
      summary: "Four months of online IT training. Candidates from anywhere in Nigeria can apply if they meet the eligibility criteria.",
      learning: [
        "Learning is delivered online through Zoom or Microsoft Teams, together with self-paced study on the programme's learning management system (LMS).",
      ],
      courses: [
        {
          name: "Data Analytics",
          description: "Build practical data analysis skills through hands-on training in data management using Excel, SQL, Python, Power BI and business reporting. You will learn to turn data into actionable insights, create interactive dashboards, explain findings to non-technical audiences, and build a professional portfolio.",
          learn: [
            "Data cleaning and preparation, SQL for data analysis, descriptive statistics, Python (pandas), data visualisation with Microsoft Power BI, and data storytelling. Training combines hands-on analysis of real-world datasets, dashboard development, automating analytical tasks, responsible use of AI tools, and a professional portfolio of data products.",
          ],
          careers: "Data Analyst, Business Intelligence (BI) Analyst, Monitoring, Evaluation and Learning Data Officer, Data Visualisation Specialist, Reporting Analyst",
        },
        {
          name: "Web / Front-end Development",
          description: "Build practical web development skills through hands-on training in HTML, CSS, JavaScript, React and accessible user interface design. You will learn to create responsive, interactive and inclusive web applications that meet international accessibility standards, and build a professional portfolio.",
          learn: [
            "HTML5, CSS3, JavaScript, React, responsive web design, web accessibility (WCAG 2.2 AA), user interface development, testing techniques, and responsible use of AI-assisted development tools. Training combines hands-on coding projects, accessibility-focused development, portfolio creation and practical experience building modern web applications.",
          ],
          careers: "Front-End Developer, Web Developer, UI Developer, Accessibility Specialist",
        },
      ],
      location: ["Learning is delivered online. Candidates from all over Nigeria can apply if they meet the virtual academy eligibility criteria."],
      dates: ["Training is expected to run for four months: February to May 2027 for cohort 1, and August to November 2027 for cohort 2, followed by mentorship, internship and employment preparation activities."],
      provides: [
        "Technical training delivered by qualified instructors",
        "Access to learning materials and practical labs on the learning management system",
        "Certification preparation support",
        "Career readiness and employability training",
        "Mentorship and coaching",
        "Support with referrals to internship and job placement opportunities where available",
      ],
      eligibility: [
        "Be aged 18–33 at the time of application",
        "Be a person with a disability",
        "Be available for the full four months of online training",
        "Show an interest in a career in IT and technology",
        "Have basic IT skills, such as using a computer and basic software like Microsoft Word",
        "Hold at least an Ordinary National Diploma (OND) or NCE in any field",
      ],
      note: "Training is free. Eligible and selected candidates are not expected to pay anything to anybody to be part of the programme.",
    },
    DIGITAL_ENTREPRENEURSHIP: {
      summary: "A three-month hybrid programme for young micro and nano entrepreneurs with disabilities, with in-person classes prioritised. Candidates in Lagos and Kano are particularly encouraged to apply.",
      learning: [
        "The programme equips young micro and nano entrepreneurs, particularly persons with disabilities, with practical entrepreneurship, digital, financial, green and business management skills to launch, formalise, manage and grow viable digital or digitally enabled enterprises. It helps you move from idea to action and prepares you to present a credible business pitch and launch plan for post-training support or grant opportunities.",
        "Learning is hybrid, both in person and online through Zoom or Microsoft Teams, with in-person classes prioritised.",
      ],
      courses: [
        {
          name: "Curriculum overview",
          learn: [[
            "Entrepreneurial mindset and foundations",
            "Digital business models",
            "Market research and validation",
            "Business planning and formalisation",
            "Digital marketing and online presence",
            "Digital sales and e-commerce operations",
            "Financial management",
            "AI and automation for nano and micro entrepreneurs",
            "Digital tools, data protection and cybersecurity",
            "Customer relationship and reputation management",
            "Growth, networking and sustainability",
            "Green digital skills",
          ]],
          careers: "Starting a new business, or growing an existing one, that is digitally native (for example digital marketing, digital educational content, or mobile apps and solutions) or digitally transformed (for example using a digital payment platform such as Moniepoint, WhatsApp to engage customers, or digital invoicing)",
        },
      ],
      location: ["Hybrid: in person and online, with in-person classes prioritised. Candidates who live in Lagos and Kano are particularly encouraged to apply."],
      dates: ["Training is expected to run for three months per cohort: April to June 2027 (cohort 1), August to October 2027 (cohort 2) and December 2027 to February 2028 (cohort 3). Participants who complete the training can apply for grant funding, and grant recipients receive mentorship to start their business."],
      provides: STANDARD_PROVIDES,
      eligibility: [
        "Be aged 18–45 at the time of application",
        "Be a person with a disability",
        "Be available for the full three months of training, in person and online",
        "Show an interest in starting a business or growing an existing business using digital technology",
        "Have basic IT skills, such as using a smartphone or computer",
        "Have completed secondary school, with at least WAEC, NECO or GCE",
      ],
    },
  },
  faqs: [
    whoCanApply("Nigeria"),
    GENERAL_FAQS.multiplePathways,
    GENERAL_FAQS.onBehalf,
    familyMember("Nigeria"),
    GENERAL_FAQS.successful,
    GENERAL_FAQS.defer,
    tuitionFees("Nigeria", "faliu@sightsavers.org"),
    GENERAL_FAQS.provides,
    GENERAL_FAQS.device,
    GENERAL_FAQS.certificate,
    {
      question: "Where will the training take place?",
      answer: [[
        "Physical academy, Lagos: Digital Bridge Institute (DBI), No. 1 Nitel Road, Cappa-Oshodi, Lagos",
        "Physical academy, Kano: Digital Bridge Institute (DBI), Plot 532 Katsina Road, by the airport roundabout, Kano",
        "Virtual academy: online through Microsoft Teams, Zoom and the programme learning management system (LMS)",
        "Digital Entrepreneurship: a hybrid of online and in-person learning, with priority given to in-person participation where possible",
      ]],
    },
    {
      question: "How long does the training last?",
      answer: [
        [
          "Physical academy: nine months (March to November 2027)",
          "Virtual academy: four months per cohort (February to May 2027, and August to November 2027)",
          "Digital Entrepreneurship: three months per cohort (starting in April 2027)",
        ],
        "All pathways include mentorship, internship preparation, job-readiness activities or business support after the training.",
      ],
    },
  ],
};

export const COUNTRY_PATHWAY_CONTENT = {
  Ghana: GHANA,
  Kenya: KENYA,
  Nigeria: NIGERIA,
  Zambia: { comingSoon: true },
};
