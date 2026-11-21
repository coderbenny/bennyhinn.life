// Skills shown on the classic page and, later, on the bookshelf in the house.

export const TECH_STACK = {
  Frontend: ['React.js', 'Next.js 14+', 'TypeScript', 'TailwindCSS'],
  Backend: ['Python', 'Flask', 'Django', 'Node.js'],
  Mobile: ['Flutter', 'Dart'],
  Database: ['PostgreSQL', 'MySQL', 'MongoDB'],
  DevOps: ['Docker', 'GCP', 'Firebase', 'CI/CD'],
  Telecom: ['SMS Gateway', 'MMS', 'IVR', 'USSD'],
};

export const COMPETENCIES = [
  {
    icon: '💻',
    title: 'Software Engineering',
    desc: 'Building scalable, production-grade applications with modern architectures.',
    tags: ['System Design', 'Clean Code', 'Scalability'],
  },
  {
    icon: '🤖',
    title: 'Artificial Intelligence',
    desc: 'Integrating AI/ML solutions to solve complex business problems.',
    tags: ['LLMs', 'Computer Vision', 'Predictive Analytics'],
  },
  {
    icon: '🚀',
    title: 'Entrepreneurship',
    desc: 'Transforming innovative ideas into viable, market-ready products.',
    tags: ['Product Strategy', 'Growth', 'MVP Dev'],
  },
];

// For the bookshelf in the house: what each technology is, and the words that
// identify it in a project's `tech` list or a role's description in
// constants/experience.js. A term matches at the start of a word, so
// "postgres" finds "PostgreSQL" and "react" finds "React Native".
export const SKILL_DETAILS = {
  'React.js': { note: 'A JavaScript library for building user interfaces out of components.', match: ['react', 'next.js'] },
  'Next.js 14+': { note: 'A React framework for server-rendered and static websites, with routing built in.', match: ['next.js'] },
  TypeScript: { note: 'JavaScript with static types, so mistakes surface before the code runs.', match: ['typescript'] },
  TailwindCSS: { note: 'A CSS framework of small utility classes, used straight in the markup.', match: ['tailwind'] },
  Python: { note: 'A general-purpose language, used here for APIs, background jobs and machine learning.', match: ['python', 'flask', 'fastapi', 'django', 'pytorch'] },
  Flask: { note: 'A small Python web framework for building APIs.', match: ['flask'] },
  Django: { note: 'A full-featured Python web framework with a database layer and an admin built in.', match: ['django'] },
  'Node.js': { note: 'JavaScript on the server.', match: ['node'] },
  Flutter: { note: "Google's toolkit for building mobile, desktop and web apps from one codebase.", match: ['flutter'] },
  Dart: { note: 'The programming language Flutter apps are written in.', match: ['dart', 'flutter'] },
  PostgreSQL: { note: 'An open-source relational database known for correctness and rich SQL.', match: ['postgres'] },
  MySQL: { note: 'An open-source relational database.', match: ['mysql'] },
  MongoDB: { note: 'A database that stores records as JSON-like documents.', match: ['mongo'] },
  Docker: { note: 'Packages an app and everything it needs into a container that runs the same everywhere.', match: ['docker'] },
  GCP: { note: 'Google Cloud Platform: hosting, databases and managed services.', match: ['gcp', 'google cloud'] },
  Firebase: { note: "Google's app platform: push notifications, sign-in, hosting and realtime data.", match: ['firebase'] },
  'CI/CD': { note: 'Automated testing and deployment on every change.', match: ['ci/cd'] },
  'SMS Gateway': { note: 'Sending and receiving text messages through mobile networks.', match: ['sms'] },
  MMS: { note: 'Picture and media messages over mobile networks.', match: ['mms'] },
  IVR: { note: 'Interactive voice response: automated phone menus.', match: ['ivr'] },
  USSD: { note: 'Session-based menus on feature phones, like *144#, that work without internet.', match: ['ussd'] },
};
