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
    title: 'Resume-to-Role Match Scoring',
    copy: 'See how your profile performs against a real job description before you apply.',
    icon: 'analytics',
  },
  {
    title: '8 Focused AI Insights',
    copy: 'Gap analysis, rewrites, interview prep, salary coaching, learning paths, and outreach in one flow.',
    icon: 'psychology',
  },
  {
    title: 'Cross-Platform Job Search',
    copy: 'Search multiple job sources with filters tuned to remote, hybrid, full-time, and internship roles.',
    icon: 'travel_explore',
  },
  {
    title: 'Anonymous Squad System',
    copy: 'Join accountability squads that track collective momentum without revealing personal details.',
    icon: 'groups',
  },
  {
    title: 'Gamified XP & Rewards',
    copy: 'Earn experience points, unlock stickers, and level up your career journey with tangible milestones.',
    icon: 'emoji_events',
  },
  {
    title: 'Dark & Light Clarity',
    copy: 'Aptico keeps the same information hierarchy and comfort across desktop and mobile in both themes.',
    icon: 'contrast',
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
    { label: 'Careers', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

// ── Social links ─────────────────────────────────────────────
export const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/VivekYadav-77/Aptico', icon: 'code' },
  { label: 'Twitter', href: '#', icon: 'tag' },
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
