export const DOC_CATEGORIES = ['All', 'Core', 'Jobs', 'Community', 'Profile', 'Settings'];

export const DOCS = [
  {
    slug: 'resume-analysis',
    title: 'Resume Analysis',
    category: 'Core',
    icon: 'analytics',
    featured: true,
    readTime: '7 min read',
    excerpt: 'Learn how Aptico reads your resume, compares it with a job, and turns the result into practical next steps.',
    intro:
      'Resume Analysis is the place where Aptico helps you understand how well your resume fits a role before you apply.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'You upload or paste your resume, add the job description, and Aptico compares both sides. It looks for matching skills, missing signals, weak bullets, role expectations, and places where your experience needs clearer wording.',
          'The goal is not to make you sound fake. The goal is to help your real experience become easier for recruiters and hiring systems to understand.',
        ],
        callout: {
          type: 'tip',
          title: 'Think of it like a translator',
          text: 'Aptico translates your experience into the language of the job you want, while keeping the truth of your background intact.',
        },
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Analysis from the app sidebar.',
          'Add your resume text or upload your resume file.',
          'Paste the job description for the role you want.',
          'Run the analysis and wait for the match score, gaps, and recommendations.',
          'Use the suggested improvements to update your resume before applying.',
        ],
      },
      {
        id: 'understanding-score',
        title: 'Understanding the score',
        body: [
          'The match score is a signal, not a final judgment. A high score means your resume already speaks clearly to the job. A lower score means Aptico found missing skills, unclear proof, or job requirements that your resume does not show strongly enough.',
          'Read the explanation behind the score before changing anything. The useful part is the reason, not the number by itself.',
        ],
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes',
        steps: [
          'Do not copy suggestions blindly if they describe work you have not done.',
          'Do not use one resume for every job without checking role fit.',
          'Do not ignore missing proof. If a job asks for React, show where you used React.',
        ],
      },
    ],
  },
  {
    slug: 'job-search',
    title: 'Job Search',
    category: 'Jobs',
    icon: 'work',
    featured: true,
    readTime: '6 min read',
    excerpt: 'Use Aptico job search to find roles, filter noise, inspect listings, and save opportunities worth applying to.',
    intro:
      'Job Search helps you move from random browsing to a focused list of roles that match your goals.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'Aptico gathers job listings and gives you filters for location, work mode, role type, compensation, source, and verification signals. This helps you spend less time scrolling and more time choosing the roles that deserve effort.',
          'When a job looks useful, you can save it and return later instead of losing it in a browser tab.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Job Search from the sidebar.',
          'Enter a role, skill, or company keyword.',
          'Use filters like remote, full-time, internship, or verified listings.',
          'Open a job to inspect the details.',
          'Save strong opportunities and apply when your resume is ready.',
        ],
      },
      {
        id: 'better-searches',
        title: 'Better searches',
        body: [
          'Search with the title companies actually use. For example, “frontend developer” may find more useful roles than “React wizard”. If results feel broad, add a seniority level or location.',
        ],
        code: {
          title: 'Search examples',
          lines: ['frontend developer remote', 'data analyst internship', 'backend engineer node.js'],
        },
      },
    ],
  },
  {
    slug: 'anonymous-squads',
    title: 'Anonymous Squads',
    category: 'Community',
    icon: 'groups',
    featured: true,
    readTime: '8 min read',
    excerpt: 'Understand squads, weekly goals, pings, application logs, privacy, and how accountability works in Aptico.',
    intro:
      'Anonymous Squads are small accountability groups for job seekers who want momentum without public pressure.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'A squad lets you share progress, send pings, log applications, and celebrate movement with other people. Your identity stays protected while your momentum is visible.',
          'This is useful because job search can feel lonely. Squads turn it into a shared rhythm.',
        ],
        callout: {
          type: 'important',
          title: 'Privacy first',
          text: 'Squad members see your activity signals, not your private resume or personal identity unless you choose to share elsewhere.',
        },
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Squad from the sidebar.',
          'Review the weekly squad goal.',
          'Log applications when you apply to jobs.',
          'Use pings to encourage the squad or ask for momentum.',
          'Check the activity feed to see how the group is moving.',
        ],
      },
      {
        id: 'good-squad-habits',
        title: 'Good squad habits',
        steps: [
          'Log real progress, even if it is small.',
          'Send useful pings instead of noise.',
          'Celebrate wins from other members.',
          'Use the squad as accountability, not comparison.',
        ],
      },
    ],
  },
  {
    slug: 'portfolio-generator',
    title: 'Portfolio Generator',
    category: 'Profile',
    icon: 'code_blocks',
    featured: false,
    readTime: '5 min read',
    excerpt: 'Create a GitHub README with your Aptico badge and send recruiters toward your public career profile.',
    intro:
      'Portfolio Generator turns your Aptico profile into a GitHub-ready README section that points people back to your career story.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'The generator creates markdown you can place on GitHub. It can include a live Aptico badge, your career level, and a link to your public shadow resume.',
          'This gives recruiters a simple way to move from your code profile to your broader career story.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Portfolio from the sidebar.',
          'Preview your badge and generated README content.',
          'Copy the markdown.',
          'Paste it into your GitHub profile README.',
          'Open the link once to confirm it routes to your Aptico profile.',
        ],
        code: {
          title: 'Markdown idea',
          lines: ['[![Aptico Career Badge](badge-url)](your-shadow-resume-url)'],
        },
      },
    ],
  },
  {
    slug: 'shadow-resume',
    title: 'Shadow Resume and Public Profile',
    category: 'Profile',
    icon: 'shield_with_heart',
    featured: false,
    readTime: '6 min read',
    excerpt: 'Show more than job titles with a public profile that explains your skills, resilience, wins, and career direction.',
    intro:
      'Your Shadow Resume is a public profile that helps people understand your career story beyond a standard resume.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'A normal resume often hides your effort, learning, recovery from rejection, and long-term consistency. The Shadow Resume gives those signals a home.',
          'Recruiters and collaborators can use it to understand your skills, interests, profile details, and visible career momentum.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Complete your profile details.',
          'Add a clear headline and location if you want them public.',
          'Keep your wins and profile signals updated.',
          'Share your public profile link when it helps your application.',
        ],
      },
    ],
  },
  {
    slug: 'interview-prep',
    title: 'Interview Prep',
    category: 'Core',
    icon: 'psychology',
    featured: false,
    readTime: '5 min read',
    excerpt: 'Review saved interview questions and salary-prep notes generated from your job and resume analysis.',
    intro:
      'Interview Prep keeps useful practice material in one place so you can prepare with context.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'When analysis creates interview questions or salary coaching notes, Aptico can save them for review. This helps you prepare for the exact role instead of practicing random questions.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Run a resume and job analysis.',
          'Save generated interview questions or salary notes when available.',
          'Open Interview Prep from your workspace.',
          'Practice answers out loud and refine weak areas before the interview.',
        ],
      },
    ],
  },
  {
    slug: 'community-wins',
    title: 'Community Wins',
    category: 'Community',
    icon: 'celebration',
    featured: false,
    readTime: '4 min read',
    excerpt: 'Browse and share career wins so the community can learn what is working for real people.',
    intro:
      'Community Wins is a public place for progress stories, useful lessons, and proof that the job search is moving.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'Wins help people see practical examples of progress: interviews booked, offers received, better resumes, portfolio launches, or a breakthrough after many tries.',
          'Reading wins can give you ideas. Sharing wins can encourage someone else.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Community from the public navigation or sidebar.',
          'Read recent wins and patterns.',
          'Share your own win when you have something useful to say.',
          'Keep posts honest, specific, and helpful.',
        ],
      },
    ],
  },
  {
    slug: 'rewards-stickers',
    title: 'Rewards and Stickers',
    category: 'Community',
    icon: 'token',
    featured: false,
    readTime: '4 min read',
    excerpt: 'Understand XP, levels, stickers, and why small rewards can help you keep showing up.',
    intro:
      'Rewards and Stickers make progress visible. They are small signals that help you notice consistency.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'Aptico awards XP and stickers for meaningful actions like completing your profile, running analysis, logging applications, posting wins, or engaging with your squad.',
          'The reward is not the main goal. The main goal is building a steady job-search habit.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Rewards to view your collection.',
          'Check which actions helped you earn XP.',
          'Use stickers as reminders of progress.',
          'Keep focusing on real career actions, not only the badge.',
        ],
      },
    ],
  },
  {
    slug: 'profile-settings',
    title: 'Profile and Settings',
    category: 'Settings',
    icon: 'settings',
    featured: false,
    readTime: '5 min read',
    excerpt: 'Set up your profile, career preferences, public identity, and theme so Aptico works the way you need.',
    intro:
      'Profile and Settings control how Aptico understands you and how the app feels while you use it.',
    sections: [
      {
        id: 'what-it-does',
        title: 'What it does',
        body: [
          'Your profile tells Aptico who you are professionally. Settings let you adjust account details, career preferences, and visual theme.',
          'Better profile information usually leads to better career context across the platform.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Profile to edit public-facing details.',
          'Open Settings to manage account and career preferences.',
          'Keep your headline short and clear.',
          'Choose the theme that is easiest for you to read.',
          'Review public profile details before sharing your link.',
        ],
      },
    ],
  },
];

export const FEATURED_DOCS = DOCS.filter((doc) => doc.featured);

export function getDocBySlug(slug) {
  return DOCS.find((doc) => doc.slug === slug);
}
