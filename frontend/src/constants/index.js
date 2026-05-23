// ─────────────────────────────────────────────────────────────
// Aptico — Centralized Constants
// Single source of truth for all app-wide labels, config, and
// navigation. No hardcoded strings should exist outside this file.
// ─────────────────────────────────────────────────────────────

// ── Brand ────────────────────────────────────────────────────
export const APP_NAME = 'Aptico';
export const APP_TAGLINE = 'Career Intelligence';
export const APP_DESCRIPTION =
  'Aptico transforms your resume, target role, and job search into a structured intelligence system built for action.';
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} Aptico. All rights reserved.`;

// ── API ──────────────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);

// ── Navigation ───────────────────────────────────────────────
export const NAV_ITEMS = [
  { to: '/squads', label: 'Squad', icon: 'groups', description: 'Anonymous squad progress and weekly goal' },
  { to: '/people', label: 'People', icon: 'diversity_3', description: 'Find people to connect with' },
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Your career overview and activity' },
  { to: '/analysis', label: 'Analysis', icon: 'analytics', description: 'Resume and job match analysis' },
  { to: '/portfolio-generator', label: 'Portfolio', icon: 'code_blocks', description: 'Generate a GitHub README and live Aptico badge' },
  { to: '/jobs', label: 'Job Search', icon: 'work', description: 'Discover and filter roles' },
  { to: '/wins', label: 'Community', icon: 'groups', description: 'Community wins and career stories' },
  { to: '/profile', label: 'Profile', icon: 'person', description: 'Edit your professional profile' },
  { to: '/settings', label: 'Settings', icon: 'settings', description: 'Account, career, and theme settings' },
];

export const ADMIN_NAV_ITEM = {
  to: '/admin', label: 'Admin', icon: 'admin_panel_settings', description: 'Admin control center',
};

// Searchable insight shortcuts (command-palette style)
export const SEARCHABLE_INSIGHTS = [
  { label: 'View squad progress', icon: 'groups', to: '/squads', category: 'Squad' },
  { label: 'Log job applications', icon: 'send', to: '/squads', category: 'Squad' },
  { label: 'Ping squadmates', icon: 'campaign', to: '/squads', category: 'Squad' },
  { label: 'Upload resume for analysis', icon: 'upload_file', to: '/analysis', category: 'Analysis' },
  { label: 'Check resume match score', icon: 'analytics', to: '/analysis', category: 'Analysis' },
  { label: 'Generate GitHub README', icon: 'code_blocks', to: '/portfolio-generator', category: 'Portfolio' },
  { label: 'Create Aptico badge', icon: 'military_tech', to: '/portfolio-generator', category: 'Portfolio' },
  { label: 'Find remote jobs', icon: 'wifi', to: '/jobs', category: 'Job Search' },
  { label: 'Browse full-time roles', icon: 'work', to: '/jobs', category: 'Job Search' },
  { label: 'Browse internship roles', icon: 'school', to: '/jobs', category: 'Job Search' },
  { label: 'Update career settings', icon: 'settings', to: '/settings', category: 'Settings' },
  { label: 'Edit profile headline', icon: 'person', to: '/settings', category: 'Settings' },
  { label: 'Set work mode preference', icon: 'home_work', to: '/settings', category: 'Settings' },
  { label: 'Toggle dark mode', icon: 'dark_mode', to: '/settings', category: 'Theme' },
  { label: 'View dashboard overview', icon: 'dashboard', to: '/dashboard', category: 'Dashboard' },
  { label: 'Matched skills from resume', icon: 'star', to: '/analysis', category: 'Analysis' },
  { label: 'High pay job search', icon: 'payments', to: '/jobs', category: 'Job Search' },
  { label: 'Verified listings only', icon: 'verified', to: '/jobs', category: 'Job Search' },
];

// ── Landing page content ─────────────────────────────────────
export const LANDING_FEATURES = [
  {
    title: 'AI Resume Audit',
    copy: 'Get a brutalist gap analysis of your profile against any job description in seconds.',
    icon: 'analytics',
  },
  {
    title: 'Interview Intelligence',
    copy: 'Practice with AI-driven coaching sessions tailored to the specific role you matched with.',
    icon: 'psychology',
  },
  {
    title: 'The Shadow Resume',
    copy: 'A public profile that tracks your career resilience, wins, and grit—not just your job titles.',
    icon: 'shield_with_heart',
  },
  {
    title: 'GitHub README Badges',
    copy: 'Export your Aptico intelligence to your GitHub profile with a live-updating career badge.',
    icon: 'code_blocks',
  },
  {
    title: 'Anonymous Squads',
    copy: 'Collaborate and stay accountable in squads where your progress is public, but your identity is private.',
    icon: 'groups',
  },
  {
    title: 'Sticker Registry',
    copy: 'Earn and showcase rare digital stickers for hitting application milestones and community wins.',
    icon: 'token',
  },
];

export const LANDING_CORE_PILLARS = [
  {
    id: 'analysis',
    title: 'Intelligence',
    subtitle: 'Beyond standard matching.',
    description: 'We don\'t just scan for keywords. We map your actual experience to the underlying architectural needs of the role.',
    features: ['Match Scoring', 'Gap Analysis', 'Bullet Rewrites', 'Salary Coaching'],
    image: 'analysis_mockup',
  },
  {
    id: 'squads',
    title: 'Resilience',
    subtitle: 'Never search alone.',
    description: 'Job searching is a mental game. Join 10-person squads to share wins, pings, and momentum without the friction of networking.',
    features: ['Daily Squad Pings', 'Anonymized Progress', 'Collective Wins', 'Tactical Comms'],
    image: 'squads_mockup',
  },
  {
    id: 'portfolio',
    title: 'Presence',
    subtitle: 'Prove your value.',
    description: 'Turn your application data into a professional public presence. From GitHub badges to shadow resumes that prove your grit.',
    features: ['GitHub Integration', 'Public Profiles', 'Live Badges', 'XP Showcase'],
    image: 'portfolio_mockup',
  },
];

export const LANDING_METHODOLOGY = [
  { number: '01', title: 'Upload', copy: 'Ingest your resume, target role, and supporting experience in one guided workspace.' },
  { number: '02', title: 'Analyze', copy: 'Aptico scores fit, exposes gaps, and turns your profile into eight focused AI insights.' },
  { number: '03', title: 'Match', copy: 'Carry that intelligence directly into job search so every role is filtered with context.' },
  { number: '04', title: 'Improve', copy: 'Use the feedback to strengthen your resume, interview story, and next application cycle.' },
];

export const LANDING_STATS_LABELS = ['job seekers', 'analyses run', 'people hired', 'live job listings'];

// ── Footer links ─────────────────────────────────────────────
export const FOOTER_LINKS = {
  product: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Analysis', to: '/analysis' },
    { label: 'Job Search', to: '/jobs' },
    { label: 'Squads', to: '/squads' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
  ],
};

export const LANDING_COMPARISON = {
  bad: {
    title: 'The Amateur Way',
    items: [
      'Blindly applying to 50+ roles a day',
      'Generic PDF resume with no match data',
      'Searching alone and burning out',
      'Guessing why you were rejected',
    ],
  },
  good: {
    title: 'The Aptico Way',
    items: [
      'Applying to 5 high-match roles',
      'AI-audited resume for every role',
      'Daily momentum with an elite squad',
      'Gap analysis for every "No"',
    ],
  },
};

export const LANDING_FAQ = [
  {
    question: 'Is my data private in a Squad?',
    answer: 'Yes. Your squad sees your momentum (XP, app logs, wins), but your name and specific profile are never linked. You are identified by a unique alias or avatar.',
  },
  {
    question: 'How do the GitHub Badges work?',
    answer: 'Once you reach Level 5, you can generate a public URL for your Career Badge. Paste it into your GitHub README to show off your resilience score and match rating live.',
  },
  {
    question: 'Do I need to pay for AI Analysis?',
    answer: 'Every user gets 3 deep-match analyses for free per month. Pro members unlock unlimited matching, interview prep, and learning roadmap generation.',
  },
  {
    question: 'Can I change squads?',
    answer: 'Squads are formed weekly based on your activity and goals. If your goals change, you can request a new squad assignment every Sunday.',
  },
];

// ── Social links ─────────────────────────────────────────────
export const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/VivekYadav-77/Aptico', icon: 'code' },
];

// ── XP / Gamification ────────────────────────────────────────
export const XP_ACTIONS = {
  APPLICATION_LOG: 10,
  ANALYSIS_RUN: 25,
  SQUAD_PING: 5,
  WIN_POST: 50,
  PROFILE_COMPLETE: 100,
};

export const LEVEL_NAMES = [
  'Rookie',
  'Explorer',
  'Strategist',
  'Operator',
  'Commander',
  'Legend',
];

// ── TanStack Query cache times (ms) ─────────────────────────
export const CACHE_TIMES = {
  USER_PROFILE: 5 * 60 * 1000,      // 5 minutes
  XP_LEVEL: 60 * 1000,              // 1 minute
  SQUAD: 30 * 1000,                 // 30 seconds
  APPLICATIONS: 2 * 60 * 1000,      // 2 minutes
  STATIC: Infinity,                  // never refetch
  DEFAULT: 60 * 1000,               // 1 minute fallback
};

// ── Misc ─────────────────────────────────────────────────────
export const MIN_TOUCH_TARGET = 44; // px — accessibility minimum
export const SIDEBAR_WIDTH = 240;   // px — expanded sidebar
export const SIDEBAR_COLLAPSED = 64; // px — icon-only sidebar
export const NAVBAR_HEIGHT = 64;    // px
