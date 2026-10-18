import type { AvatarTone, TagTone } from '@/components/ui';

export interface MentorService {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
}

export interface MentorExperience {
  title: string;
  period: string;
  kind: 'work' | 'study';
}

export interface MentorPost {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  published: string;
}

export interface MentorAvailability {
  date: string;
  times: string[];
}

export interface MentorReview {
  id: string;
  authorInitials: string;
  authorName: string;
  date: string;
  rating: number;
  comment: string;
}

export interface MentorTag {
  label: string;
  tone: TagTone;
}

export interface Mentor {
  id: string;
  initials: string;
  avatarTone: AvatarTone;
  name: string;
  verified: boolean;
  headline: string;
  role: string;
  rating: number;
  reviewCount: number;
  sessionCount: number;
  location: string;
  languages: string;
  replyTime: string;
  nextAvailable: string;
  subjects: string[];
  tags: MentorTag[];
  bio: string;
  about: string;
  experience: MentorExperience[];
  services: MentorService[];
  posts: MentorPost[];
  availability: MentorAvailability[];
  reviews: MentorReview[];
}

const OCTOBER_AVAILABILITY: MentorAvailability[] = [
  { date: '2026-10-20', times: ['09:00', '10:30', '14:00', '15:30', '17:00', '18:30'] },
  { date: '2026-10-21', times: ['10:00', '11:30', '16:00'] },
  { date: '2026-10-23', times: ['09:30', '13:00', '15:00'] },
  { date: '2026-10-24', times: ['11:00', '14:30', '18:00'] },
];

const MENTORS: Mentor[] = [
  {
    id: 'mariana-silva',
    initials: 'MS',
    avatarTone: 'primary',
    name: 'Mariana Silva',
    verified: true,
    role: 'Senior Software Engineer',
    headline: 'Senior Software Engineer at Critical TechWorks · MEng Informatics, FEUP ’18',
    rating: 4.9,
    reviewCount: 128,
    sessionCount: 340,
    location: 'Porto',
    languages: 'PT, EN',
    replyTime: 'Replies within 2h',
    nextAvailable: 'Today, 18:00',
    subjects: ['Software Engineering'],
    tags: [
      { label: 'Algorithms', tone: 'green' },
      { label: 'System design', tone: 'blue' },
      { label: 'Interview prep', tone: 'orange' },
      { label: 'Java', tone: 'green' },
      { label: 'Python', tone: 'yellow' },
    ],
    bio: 'MEng Informatics (FEUP ’18). I help students prepare for software engineering internships — from data structures to system design interviews.',
    about:
      'I’ve spent six years building backend systems for automotive and fintech systems. I remember how confusing the jump from FEUP to industry felt, so I focus on practical prep: solving interview problems out loud, reviewing your projects like a real code review, and planning your first internship applications.',
    experience: [
      {
        title: 'Senior Software Engineer — Critical TechWorks',
        period: '2021 – now · Porto',
        kind: 'work',
      },
      { title: 'Software Engineer — Feedzai', period: '2018 – 2021 · Porto', kind: 'work' },
      {
        title: 'MEng Informatics and Computing Engineering — FEUP',
        period: '2013 – 2018',
        kind: 'study',
      },
    ],
    services: [
      {
        id: 'mentoring-call',
        title: '1:1 Mentoring call',
        description: 'Career questions, project feedback or study planning — you set the agenda.',
        duration: '60 min',
        price: 35,
      },
      {
        id: 'mock-interview',
        title: 'Mock technical interview',
        description: 'A realistic 45-min coding interview plus 45 min of detailed feedback.',
        duration: '90 min',
        price: 50,
      },
      {
        id: 'cv-review',
        title: 'CV & LinkedIn review',
        description: 'Line-by-line review of your CV for software internships.',
        duration: '30 min',
        price: 20,
      },
    ],
    posts: [
      {
        id: 'interview-patterns',
        category: 'Interviews',
        title: '5 patterns that cover 80% of coding interviews',
        excerpt: 'Sliding window, two pointers and the rest — with the FEUP exercises they map to.',
        readTime: '6 min read',
        published: '2 days ago',
      },
      {
        id: 'summer-internship',
        category: 'Internships',
        title: 'How I’ll apply for a summer internship in 2027',
        excerpt: 'A month-by-month plan, plus the CV mistakes I see most often.',
        readTime: '4 min read',
        published: '1 week ago',
      },
      {
        id: 'url-shortener',
        category: 'System design',
        title: 'What interviewers mean by “design a URL shortener”',
        excerpt: 'The four boxes I sketch before writing any code.',
        readTime: '5 min read',
        published: '2 weeks ago',
      },
      {
        id: 'cv-line',
        category: 'CV',
        title: 'The one line on your CV that gets you the screen',
        excerpt: 'How I read a FEUP CV in thirty seconds.',
        readTime: '3 min read',
        published: '3 weeks ago',
      },
      {
        id: 'ltw-review',
        category: 'Projects',
        title: 'Review your LTW project like a senior engineer',
        excerpt: 'A checklist I use before a mock interview.',
        readTime: '7 min read',
        published: '1 month ago',
      },
      {
        id: 'first-session',
        category: 'Career',
        title: 'Questions to ask in your first 1:1',
        excerpt: 'So the hour is about your goals, not mine.',
        readTime: '4 min read',
        published: '1 month ago',
      },
    ],
    availability: OCTOBER_AVAILABILITY,
    reviews: [
      {
        id: 'tiago-p',
        authorInitials: 'TP',
        authorName: 'Tiago P. · MEIC student',
        date: 'Sep 2026',
        rating: 5,
        comment:
          'The mock interview was scarily close to the real thing. I got the internship at Blip two weeks later.',
      },
      {
        id: 'beatriz-c',
        authorInitials: 'BC',
        authorName: 'Beatriz C. · L.EIC student',
        date: 'Aug 2026',
        rating: 5,
        comment:
          'Super clear and patient. She reviewed my LTW project like a real PR and I learned more than in the whole semester.',
      },
    ],
  },
  {
    id: 'joao-ferreira',
    initials: 'JF',
    avatarTone: 'secondary',
    name: 'João Ferreira',
    verified: true,
    role: 'PhD Researcher, ML',
    headline: 'PhD Researcher · INESC TEC',
    rating: 4.8,
    reviewCount: 86,
    sessionCount: 150,
    location: 'Porto',
    languages: 'PT, EN',
    replyTime: 'Replies within 4h',
    nextAvailable: 'Mon 19 Oct, 10:00',
    subjects: ['Data Science & AI'],
    tags: [
      { label: 'Machine learning', tone: 'blue' },
      { label: 'Python', tone: 'green' },
      { label: 'Thesis help', tone: 'yellow' },
    ],
    bio: 'Machine learning researcher. I tutor ML and linear algebra, and help MSc students structure and write their dissertation.',
    about:
      'I work on machine learning at INESC TEC and I still remember being stuck on a training loop at 2am. Sessions are for debugging models, tightening a thesis chapter, or deciding what is actually worth putting in the dissertation.',
    experience: [
      { title: 'PhD Researcher — INESC TEC', period: '2022 – now · Porto', kind: 'work' },
      { title: 'Data Scientist — Talkdesk', period: '2019 – 2022 · Porto', kind: 'work' },
      { title: 'MSc Data Science — FEUP', period: '2017 – 2019', kind: 'study' },
    ],
    services: [
      {
        id: 'ml-mentoring',
        title: '1:1 ML mentoring call',
        description: 'Model choices, debugging training runs, or planning your next project.',
        duration: '60 min',
        price: 25,
      },
      {
        id: 'thesis-review',
        title: 'Thesis chapter review',
        description: 'Structural and technical feedback on one dissertation chapter.',
        duration: '45 min',
        price: 30,
      },
    ],
    posts: [
      {
        id: 'thesis-structure',
        category: 'Thesis',
        title: 'A chapter outline that survives your supervisor',
        excerpt: 'The structure I ask every MSc student to draft before we meet.',
        readTime: '5 min read',
        published: '4 days ago',
      },
      {
        id: 'training-bugs',
        category: 'Machine learning',
        title: 'Three bugs that look like a bad model',
        excerpt: 'Data leakage, a shuffled label, and a learning rate that never moved.',
        readTime: '6 min read',
        published: '2 weeks ago',
      },
    ],
    availability: OCTOBER_AVAILABILITY,
    reviews: [
      {
        id: 'sofia-r',
        authorInitials: 'SR',
        authorName: 'Sofia R. · MSc student',
        date: 'Jul 2026',
        rating: 5,
        comment:
          'João found the bug in my training loop in ten minutes that I’d been stuck on for a week.',
      },
    ],
  },
  {
    id: 'ines-costa',
    initials: 'IC',
    avatarTone: 'tertiary',
    name: 'Inês Costa',
    verified: true,
    role: 'Software Architect',
    headline: 'Software Architect · Farfetch',
    rating: 4.7,
    reviewCount: 54,
    sessionCount: 95,
    location: 'Lisbon',
    languages: 'PT, EN',
    replyTime: 'Replies within 6h',
    nextAvailable: 'Tue 20 Oct, 17:30',
    subjects: ['Software Engineering', 'Career & Internships'],
    tags: [
      { label: 'Architecture', tone: 'orange' },
      { label: 'Java', tone: 'green' },
      { label: 'Career advice', tone: 'yellow' },
    ],
    bio: 'FEUP alumna leading backend teams at scale. Code reviews, architecture walkthroughs and honest career advice for your first tech job.',
    about:
      'I lead architecture work at Farfetch and I hire FEUP graduates. Bring a system, a CV, or a question about your first role — I’ll tell you what a hiring manager actually notices.',
    experience: [
      { title: 'Software Architect — Farfetch', period: '2020 – now · Lisbon', kind: 'work' },
      { title: 'Backend Engineer — Farfetch', period: '2016 – 2020 · Lisbon', kind: 'work' },
      { title: 'MEng Informatics — FEUP', period: '2011 – 2016', kind: 'study' },
    ],
    services: [
      {
        id: 'career-advice',
        title: 'Career advice session',
        description: 'Honest, practical advice on landing and starting your first software role.',
        duration: '60 min',
        price: 40,
      },
    ],
    posts: [
      {
        id: 'first-role',
        category: 'Career',
        title: 'What I look for in a first backend role',
        excerpt: 'The projects that signal you can join a team, not just pass a course.',
        readTime: '4 min read',
        published: '5 days ago',
      },
    ],
    availability: OCTOBER_AVAILABILITY,
    reviews: [
      {
        id: 'pedro-m',
        authorInitials: 'PM',
        authorName: 'Pedro M. · L.EIC student',
        date: 'Jun 2026',
        rating: 4.5,
        comment: 'Blunt, useful feedback on my CV and interview answers. Exactly what I needed.',
      },
    ],
  },
  {
    id: 'rui-almeida',
    initials: 'RA',
    avatarTone: 'accent',
    name: 'Rui Almeida',
    verified: true,
    role: 'Teaching Assistant, FEUP',
    headline: 'Teaching Assistant · FEUP Informatics',
    rating: 5.0,
    reviewCount: 212,
    sessionCount: 480,
    location: 'Porto',
    languages: 'PT',
    replyTime: 'Replies within 1h',
    nextAvailable: 'Today, 20:00',
    subjects: ['Software Engineering', 'Mathematics'],
    tags: [
      { label: 'C / C++', tone: 'green' },
      { label: 'Data structures', tone: 'blue' },
      { label: 'Exam prep', tone: 'yellow' },
    ],
    bio: 'TA for Programming Fundamentals and Algorithms & Data Structures. Clear explanations, past exam walkthroughs, small weekly sessions.',
    about:
      'I teach Programming Fundamentals and Algorithms & Data Structures at FEUP. Sessions are past-paper walkthroughs: we pick the question that keeps coming back, and we solve it out loud until the pattern is obvious.',
    experience: [
      {
        title: 'Teaching Assistant — FEUP Informatics',
        period: '2024 – now · Porto',
        kind: 'work',
      },
      { title: 'Integrated Master’s in Informatics — FEUP', period: '2020 – now', kind: 'study' },
    ],
    services: [
      {
        id: 'exam-prep',
        title: 'Exam prep session',
        description: 'Past-paper walkthroughs for Programming Fundamentals or AED1/AED2.',
        duration: '60 min',
        price: 15,
      },
    ],
    posts: [
      {
        id: 'recursion',
        category: 'Exam prep',
        title: 'Recursion, drawn until it clicks',
        excerpt: 'The call-stack picture I use before every Programming exam.',
        readTime: '5 min read',
        published: '3 days ago',
      },
    ],
    availability: OCTOBER_AVAILABILITY,
    reviews: [
      {
        id: 'joana-p',
        authorInitials: 'JP',
        authorName: 'Joana P. · 1st year student',
        date: 'Oct 2026',
        rating: 5,
        comment:
          'Explained recursion in a way that finally clicked. Worth every cent before the exam.',
      },
    ],
  },
];

/**
 * Returns every mentor. Async to mirror the shape a real API call
 * will have once there's a backend — callers already await it.
 */
export async function getMentors(): Promise<Mentor[]> {
  return MENTORS;
}

/**
 * Returns one mentor by id, or null if no such mentor exists.
 */
export async function getMentorById(id: string): Promise<Mentor | null> {
  return MENTORS.find((mentor) => mentor.id === id) ?? null;
}
