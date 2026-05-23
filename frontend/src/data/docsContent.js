export const DOC_CATEGORIES = ['All', 'Core', 'Dashboard', 'Jobs', 'Community', 'Profile', 'Settings'];

export const DOCS = [
  {
    slug: 'resume-analysis',
    title: 'Resume Analysis',
    category: 'Core',
    icon: 'analytics',
    featured: true,
    readTime: '12 min read',
    excerpt: 'A beginner-friendly guide to checking your resume against a job, understanding the match score, and improving weak areas before applying.',
    intro:
      'Resume Analysis helps you understand whether your resume clearly fits a job before you spend time applying. It explains what is strong, what is missing, and what you can improve in plain language.',
    overview: {
      bestFor: 'Users who want to apply smarter instead of sending the same resume everywhere.',
      plainSummary:
        'Upload your resume, paste a job description, and Aptico compares both. You get a match score, missing skills, improvement ideas, and guidance for rewriting weak resume points.',
      outcome:
        'By the end, you should know which jobs are worth applying to, which resume points need proof, and what to change before submitting.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'Resume Analysis reads two things: your resume and the job description. Then it checks how well both match. It looks for skills, tools, role responsibilities, seniority level, project proof, missing keywords, and weak explanations.',
          'For example, if a job asks for React, APIs, and teamwork, Aptico checks whether your resume only says "worked on frontend" or whether it clearly proves React work, API integration, and collaboration.',
          'The feature is designed for people who are not sure why they are not getting replies. It gives a practical explanation instead of leaving you guessing.',
        ],
        callout: {
          type: 'tip',
          title: 'Simple way to understand it',
          text: 'Think of Resume Analysis as a job-fit checker. It does not replace your judgment. It helps you see what a recruiter or hiring system may notice first.',
        },
      },
      {
        id: 'how-to-use',
        title: 'How to use it step by step',
        body: [
          'Use this flow when you find a job that looks interesting and you want to know whether your resume is ready for it.',
        ],
        steps: [
          'Open Analysis from the Aptico sidebar.',
          'Add your resume. If you upload a file, quickly check that the extracted text looks correct.',
          'Paste the full job description, including responsibilities, required skills, preferred skills, and company notes.',
          'Run the analysis and wait for the match score and recommendations.',
          'Read the gap section first. This tells you what the job wants that your resume does not clearly show.',
          'Update your resume only where the advice matches your real experience.',
          'Run the analysis again if you made major changes and want to compare the new result.',
        ],
      },
      {
        id: 'understanding-score',
        title: 'How to understand the match score',
        body: [
          'The match score is a signal, not a final decision. A high score means your resume already speaks the language of the job. A low score does not mean you are bad. It usually means your resume is not showing the right proof yet.',
          'Aptico may lower the score when important skills are missing, when achievements are too vague, when the job asks for experience you do not mention, or when your resume uses different wording from the job description.',
          'Always read the explanation behind the score. The number tells you how urgent the problem is. The explanation tells you what to fix.',
        ],
        code: {
          title: 'How to read the result',
          lines: [
            '80-100: Strong fit. Polish details and apply.',
            '60-79: Possible fit. Improve missing proof before applying.',
            '40-59: Risky fit. Apply only if you can clearly explain the gaps.',
            'Below 40: The role may be far from your current resume.',
          ],
        },
      },
      {
        id: 'how-to-improve',
        title: 'How to turn advice into better resume bullets',
        body: [
          'Good resume improvements are specific. Do not only add keywords. Add proof. If the job asks for performance, mention speed, scale, users, time saved, or measurable impact if you have it.',
          'If you do not have numbers, describe the outcome clearly. A simple truthful sentence is better than a fancy line that sounds empty.',
        ],
        code: {
          title: 'Before and after example',
          lines: [
            'Weak: Worked on a React project.',
            'Better: Built responsive React screens for a job dashboard and connected them to REST APIs for live search results.',
            'Strong: Built React job-search screens with API filters, saved-job actions, and loading states used across the application flow.',
          ],
        },
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not copy suggested text if it describes work you have not actually done.',
          'Do not chase a perfect score. A clear and honest resume matters more than a number.',
          'Do not analyze only one job and assume every role is the same.',
          'Do not ignore missing proof. If you have the skill, show where you used it.',
          'Do not apply immediately after analysis. Spend a few minutes fixing the biggest issues first.',
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
    readTime: '10 min read',
    excerpt: 'Learn how to search roles, filter noise, inspect job details, save good opportunities, and avoid wasting time on poor matches.',
    intro:
      'Job Search helps you move from random scrolling to focused opportunity discovery. It gives you a cleaner way to find roles, compare them, and save the ones worth real effort.',
    overview: {
      bestFor: 'Users who feel overwhelmed by too many job listings and want a more organized search.',
      plainSummary:
        'Search for jobs by role, skill, location, work mode, or company. Use filters to narrow results, open each job for details, and save the roles you want to revisit.',
      outcome:
        'By the end, you should have a smaller, stronger list of jobs instead of a messy browser full of tabs.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'Job Search collects opportunities and lets you filter them by the things that matter: role, location, remote or onsite preference, job type, compensation, source, and listing quality.',
          'The goal is not to show you the most jobs. The goal is to help you find jobs that are worth your attention.',
          'A good job search session should end with a short list of roles you can analyze, customize for, and apply to with confidence.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to search effectively',
        steps: [
          'Open Job Search from the sidebar.',
          'Start with a normal job title such as frontend developer, data analyst, backend engineer, or product designer.',
          'Add a location or choose remote if location matters to you.',
          'Use filters to remove listings that do not match your work mode, role type, or compensation needs.',
          'Open promising listings and read the responsibilities before saving them.',
          'Save jobs that look realistic and useful. Skip jobs that are clearly outside your goal.',
        ],
      },
      {
        id: 'search-examples',
        title: 'Search examples that work better',
        body: [
          'Use the words companies use in job posts. A creative title may sound nice, but common titles usually return better results.',
        ],
        code: {
          title: 'Try searches like these',
          lines: [
            'frontend developer remote',
            'react developer internship',
            'backend engineer node.js',
            'data analyst fresher',
            'full stack developer Bengaluru',
          ],
        },
      },
      {
        id: 'how-to-choose',
        title: 'How to decide if a job is worth saving',
        body: [
          'A job is worth saving when the responsibilities match work you can explain, the required skills are close to your current profile, and the role fits your location, availability, and career direction.',
          'If a job has many unknowns, save it only if you are willing to research the company and customize your resume for it.',
        ],
        steps: [
          'Check the required skills first.',
          'Check whether the role level matches you.',
          'Check if the company and source look trustworthy.',
          'Check if you can write a resume version for that role.',
          'Save it only if you would actually apply after improving your resume.',
        ],
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not save every job. A saved list should be useful, not crowded.',
          'Do not apply to a role before reading the responsibilities.',
          'Do not use only one keyword. Try related job titles.',
          'Do not ignore location, work mode, or experience level.',
          'Do not let searching become procrastination. Pick a few roles and move to analysis.',
        ],
      },
    ],
  },
  {
    slug: 'command-center-dashboard',
    title: 'Command Center Dashboard',
    category: 'Dashboard',
    icon: 'dashboard',
    featured: true,
    readTime: '12 min read',
    excerpt: 'Understand the main Aptico dashboard: match resonance, XP, streak-style activity, saved jobs, follow-up scripts, interview prep, and rejection logging.',
    intro:
      'The Command Center is your career dashboard. It brings together resume analysis, job activity, saved roles, XP, rejection logs, follow-up scripts, and progress signals in one place.',
    overview: {
      bestFor: 'Users who want to understand what each dashboard widget means and what action to take next.',
      plainSummary:
        'The dashboard is like a mission control screen for your job search. It shows your latest analysis signal, resilience XP, activity trend, saved jobs, interview prep, and next actions.',
      outcome:
        'By the end, you should know how to read every major dashboard card and how to decide what to do next.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What the dashboard does',
        body: [
          'The dashboard collects your most important career signals so you do not need to jump between pages. It is built to answer one question: what should I do next?',
          'If your match score is low, the next action may be improving your resume. If your saved jobs list is full, the next action may be choosing the best roles and applying. If you got rejected, the next action may be logging it and learning from the stage.',
          'The dashboard is not just for looking at stats. It is designed to push you toward a useful next step.',
        ],
      },
      {
        id: 'match-resonance',
        title: 'Match Resonance gauge',
        body: [
          'Match Resonance is the circular score widget. It usually reflects the strength of your recent or average job-match analysis. A higher score means your resume and target role are speaking similar language.',
          'If the gauge says calibration is required, it means Aptico does not have enough recent analysis data yet. Run a resume analysis to give the dashboard something meaningful to show.',
          'Use this gauge as a direction signal. If it is low, improve your resume for your target role before applying widely.',
        ],
      },
      {
        id: 'resilience-protocol',
        title: 'Resilience Protocol, XP, and levels',
        body: [
          'Resilience Protocol is the XP and level card. It shows how much Resilience XP you have earned and how close you are to the next level.',
          'You can earn XP through meaningful actions such as logging applications, recording rejections, completing profile actions, or helping squad progress. The level is a simple way to show accumulated effort.',
          'The XP bar is not a replacement for real outcomes. It helps you see that the job search includes many useful actions even before an offer arrives.',
        ],
      },
      {
        id: 'activity-pulse',
        title: 'Activity Pulse and GitHub-like streak meaning',
        body: [
          'Activity Pulse is similar in spirit to a GitHub activity graph. GitHub shows coding contributions. Aptico shows career actions. The bars or activity signals help you see whether you are taking consistent action.',
          'A day may become active when you complete meaningful job-search work such as logging applications or rejections. Public profile views may also show heatmap-style data based on applications and rejection logs.',
          'Use this to notice patterns. If all activity happens in one burst, you may burn out. If activity appears steadily across the week, you are building a healthier rhythm.',
        ],
        code: {
          title: 'Activity signal meaning',
          lines: [
            'Tall recent bars = more recent job-search activity',
            'Empty days = no tracked action for that day',
            'Streak = repeated active days',
            'Heatmap/trail = visual history of career actions',
          ],
        },
      },
      {
        id: 'intelligence-stream',
        title: 'Intelligence Stream',
        body: [
          'The Intelligence Stream is the center feed of the dashboard. It can show AI insights, recent activity, and analysis reports in timeline form.',
          'AI insights are recommendations or reminders based on your profile and analysis. Activity items show things you recently did. Analysis report items summarize recent resume/job analysis results.',
          'Read the stream from top to bottom. The latest items usually tell you what changed recently and what deserves attention now.',
        ],
      },
      {
        id: 'saved-jobs-scripts',
        title: 'Saved Jobs and follow-up scripts',
        body: [
          'Saved Jobs are roles you marked as worth returning to. They appear on the dashboard so your best opportunities stay visible.',
          'Follow-up scripts help you write polite follow-up messages after applying. They are useful when you want to check in without sounding desperate or vague.',
          'A saved job should eventually become one of three things: an application, a follow-up, or a deleted item. Do not let saved jobs become a place where decisions go to sleep.',
        ],
      },
      {
        id: 'interview-prep-widget',
        title: 'Interview Prep widget',
        body: [
          'The Interview Prep widget shows saved prep material from your analysis. It may include interview questions, salary notes, or role-specific practice content.',
          'Use it before calls, mock interviews, or recruiter conversations. The best prep comes from the exact job you analyzed, not random questions.',
        ],
      },
      {
        id: 'next-action',
        title: 'How to choose your next action',
        steps: [
          'If Match Resonance is low, open Analysis and improve your resume for a target job.',
          'If Saved Jobs has good roles, choose one and run analysis before applying.',
          'If you applied recently, log the application through Squad or your workflow.',
          'If you got rejected, use Log Rejection so the setback becomes tracked progress.',
          'If Interview Prep has content, practice the hardest questions out loud.',
          'If activity is low, pick one small action today instead of trying to fix everything.',
        ],
      },
    ],
  },
  {
    slug: 'anonymous-squads',
    title: 'Anonymous Squads',
    category: 'Community',
    icon: 'groups',
    featured: true,
    readTime: '11 min read',
    excerpt: 'Understand how squads create accountability, what members can see, how pings work, and how to use the weekly goal without pressure.',
    intro:
      'Anonymous Squads give you a small group for momentum during the job search. You can share progress and encouragement while keeping your personal identity protected.',
    overview: {
      bestFor: 'Users who lose motivation when searching alone or want light accountability without public exposure.',
      plainSummary:
        'A squad is a small group where members log applications, send pings, see shared progress, and celebrate movement. It is built around consistency, not comparison.',
      outcome:
        'By the end, you should know what to post, what stays private, and how to use squad activity to keep moving each week.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'A squad turns job search into a shared routine. Members can see progress signals such as applications logged, pings sent, and group momentum. This makes the process feel less isolated.',
          'Your squad is anonymous by design. The platform focuses on activity and encouragement instead of turning your job search into a public performance.',
          'The weekly goal gives the group a simple target. Even small actions count because consistency is the real skill being built.',
        ],
        callout: {
          type: 'important',
          title: 'Privacy first',
          text: 'Squad members see momentum signals. They do not automatically get your private resume, email, or personal profile details.',
        },
      },
      {
        id: 'how-to-use',
        title: 'How to use your squad',
        steps: [
          'Open Squad from the sidebar.',
          'Read the weekly goal and current squad activity.',
          'Log an application when you apply to a job.',
          'Send a ping when you want to encourage the group or restart momentum.',
          'Check the feed to see what others are doing.',
          'Celebrate progress without comparing your journey to someone else.',
        ],
      },
      {
        id: 'dashboard-meaning',
        title: 'What every Squad Dashboard part means',
        body: [
          'The Squad Dashboard has many signals, so here is the plain meaning of each one. The dashboard is not judging you. It is showing whether the group is moving toward the weekly target.',
          'Squad velocity is the big circular progress view. It shows how many applications the squad has logged compared with the weekly goal. If the circle is filling up, the team is moving.',
          'Pace tells you whether the squad is ahead or behind where it should be at this point in the week. For example, +3 means the squad is three applications ahead of the expected pace. -2 means the squad needs two more applications to catch up.',
          'Days left tells you how much time remains before the weekly squad cycle resets. Use it to decide whether you need a small push today or a bigger effort before the week ends.',
          'Members shows how many people are currently in the squad. Aptico squads are designed around a small group so progress feels personal but still anonymous.',
          'Expected by now is the number of applications the squad should have logged by the current day if it wants to finish the weekly goal smoothly.',
        ],
        code: {
          title: 'Squad dashboard glossary',
          lines: [
            'Squad velocity = total applications logged by the group',
            'Weekly goal = the target the squad is trying to reach together',
            'Pace = ahead or behind the expected progress for today',
            'Member share = each member percentage of total squad output',
            'Momentum trail = recent daily activity dots for each member',
            'Balance meter = how evenly the squad is contributing',
          ],
        },
      },
      {
        id: 'log-output',
        title: 'What Log Output means',
        body: [
          'Log Output is where you record an application you actually sent. You add the company name, role title, and optionally the job link. This increases your personal activity and the squad total.',
          'This is called output because Aptico wants to track real movement, not just planning. Searching for jobs is useful, but logging output means you took action.',
          'Application logs may appear on your public profile, so the information should be accurate. Do not log fake applications only to increase XP or squad progress.',
        ],
        steps: [
          'Enter the company name.',
          'Enter the exact or closest role title.',
          'Add the job link if you have it.',
          'Submit the output.',
          'Check that the squad total and your member row updated.',
        ],
      },
      {
        id: 'pings-balance-trails',
        title: 'Pings, balance, and momentum trails',
        body: [
          'A ping is an anonymous nudge. It is useful when teammates are behind the real weekly pace. It should feel like encouragement, not pressure.',
          'The balance meter shows whether one person is carrying most of the weekly output or whether the squad is contributing more evenly. A balanced squad is usually healthier because progress does not depend on only one person.',
          'The momentum trail is a row of small dots for recent days. Active dots show days when that member logged activity. It is similar to a GitHub contribution graph, but for job-search actions.',
        ],
        callout: {
          type: 'tip',
          title: 'Use pings with care',
          text: 'A good ping says “let us move” without making anyone feel ashamed. The feature exists to restart momentum, not to punish people.',
        },
      },
      {
        id: 'what-to-post',
        title: 'What to share in a squad',
        body: [
          'Good squad activity is simple and honest. You can log that you applied, say you improved a resume, share that you booked an interview, or send a short encouragement ping.',
          'You do not need to write long posts. The point is to create proof of movement.',
        ],
        code: {
          title: 'Useful ping examples',
          lines: [
            'Applied to two roles today. Keeping it moving.',
            'Updated my resume after analysis. Applying tomorrow.',
            'Interview booked. Nervous, but ready to prep.',
            'Small progress counts. Do one application today.',
          ],
        },
      },
      {
        id: 'healthy-use',
        title: 'Healthy squad habits',
        steps: [
          'Use the squad as accountability, not competition.',
          'Log real actions instead of trying to look busy.',
          'Encourage others when they are active.',
          'Come back after a bad week without guilt.',
          'Protect private information unless you intentionally choose to share it elsewhere.',
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
    readTime: '9 min read',
    excerpt: 'Create a GitHub README section, show an Aptico career badge, and guide recruiters from GitHub to your public career story.',
    intro:
      'Portfolio Generator helps you turn your Aptico profile into a GitHub-ready README section. It is useful when you want your coding profile and career story to support each other.',
    overview: {
      bestFor: 'Users who use GitHub and want recruiters to see more than repositories.',
      plainSummary:
        'Aptico generates markdown that can include a live badge and a link to your public profile or Shadow Resume.',
      outcome:
        'By the end, your GitHub profile can point visitors toward your skills, career level, and broader proof of progress.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'The generator creates a markdown snippet you can paste into your GitHub profile README. That snippet can show your Aptico badge and link people to your public career profile.',
          'This is helpful because recruiters may find your GitHub first. A badge gives them a clear path from your code to your career story.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Portfolio from the sidebar.',
          'Preview your generated README content.',
          'Preview the Aptico badge so you know what visitors will see.',
          'Copy the markdown.',
          'Open your GitHub profile README repository.',
          'Paste the markdown where you want the badge or profile section to appear.',
          'Save the README and test the link.',
        ],
        code: {
          title: 'Example markdown shape',
          lines: ['[![Aptico Career Badge](badge-url)](your-shadow-resume-url)'],
        },
      },
      {
        id: 'what-recruiters-see',
        title: 'What recruiters can understand from it',
        body: [
          'A good portfolio link answers simple questions quickly: who you are, what kind of roles you want, what skills you show, and how you are progressing.',
          'The badge should not replace your projects. It should connect your projects to your career direction.',
        ],
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not paste the badge without testing the link.',
          'Do not use a public profile that still looks empty.',
          'Do not make your README too crowded.',
          'Do not promise skills in your public profile that your projects cannot support.',
        ],
      },
    ],
  },
  {
    slug: 'shadow-resume',
    title: 'Shadow Resume and Public Profile',
    category: 'Profile',
    icon: 'shield_with_heart',
    featured: false,
    readTime: '10 min read',
    excerpt: 'Build a public career story that shows skills, resilience, wins, profile context, and recruiter-friendly proof beyond job titles.',
    intro:
      'Your Shadow Resume is a public career page that helps people understand your work, progress, and direction beyond a traditional PDF resume.',
    overview: {
      bestFor: 'Users who want a public profile that explains their journey more clearly than a normal resume.',
      plainSummary:
        'A Shadow Resume can show your headline, skills, wins, resilience signals, and profile details in a recruiter-friendly format.',
      outcome:
        'By the end, you should know what belongs on your public profile and how to make it useful before sharing it.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'A normal resume usually shows job titles and bullet points. A Shadow Resume can show the wider story: what you are learning, what you have built, how consistent you are, and what kind of work you want next.',
          'This is especially useful for students, career switchers, early-career users, and people whose effort is not fully visible in a traditional resume.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to set it up',
        steps: [
          'Open Profile and complete the basic information.',
          'Write a clear headline that says what you do or what role you are targeting.',
          'Add skills that you can actually discuss in an interview.',
          'Keep wins and progress signals updated.',
          'Open the public profile link and review it as if you were a recruiter.',
          'Share the link only after the page explains you clearly.',
        ],
      },
      {
        id: 'what-to-write',
        title: 'What to write on your profile',
        body: [
          'Write for a busy person. A recruiter should understand your direction within a few seconds. Avoid vague claims like "hard worker" unless you also show proof.',
          'Use short, direct language. Mention your target role, strongest skills, and the kind of projects or work you want to be known for.',
        ],
        code: {
          title: 'Headline examples',
          lines: [
            'React developer building job-search and dashboard interfaces',
            'Data analyst focused on dashboards, SQL, and business insights',
            'Backend developer learning Node.js, APIs, and scalable services',
          ],
        },
      },
      {
        id: 'before-sharing',
        title: 'Before you share it',
        steps: [
          'Check spelling and basic grammar.',
          'Remove private information you do not want public.',
          'Make sure links work.',
          'Make sure your headline matches your current goal.',
          'Open it on mobile and check that it still reads well.',
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
    readTime: '8 min read',
    excerpt: 'Use saved questions and salary-prep notes to practice for the specific role you analyzed, not random interview questions.',
    intro:
      'Interview Prep keeps role-specific practice material in one place so you can prepare with context and confidence.',
    overview: {
      bestFor: 'Users who have interviews coming up or want to prepare after analyzing a job.',
      plainSummary:
        'Aptico can save interview questions and salary notes generated from your analysis. You can revisit them later and practice with the role in mind.',
      outcome:
        'By the end, you should know what to practice, how to structure answers, and how to avoid vague interview responses.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'Interview Prep collects questions and notes that come from your resume and target job. That makes the practice more relevant than generic lists from the internet.',
          'If the job asks for teamwork, APIs, leadership, or problem solving, the prep can help you practice answers around those exact expectations.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Run a resume analysis for the job you care about.',
          'Save generated interview questions or salary notes when they appear.',
          'Open Interview Prep from the app.',
          'Pick one question and answer it out loud.',
          'Improve your answer by adding context, action, and result.',
          'Repeat for the questions that feel hardest.',
        ],
      },
      {
        id: 'answer-structure',
        title: 'How to answer questions clearly',
        body: [
          'A good answer usually explains the situation, what you did, and what changed because of your action. Keep it honest and specific.',
        ],
        code: {
          title: 'Simple answer structure',
          lines: [
            'Context: What was happening?',
            'Action: What did you personally do?',
            'Result: What improved, changed, shipped, or was learned?',
          ],
        },
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not memorize answers word-for-word.',
          'Do not give only theory. Add real examples.',
          'Do not ignore salary prep until the last minute.',
          'Do not practice only easy questions.',
          'Do not pretend to know something. Explain how you would learn or approach it.',
        ],
      },
    ],
  },
  {
    slug: 'rejection-logging',
    title: 'Rejection Logging',
    category: 'Dashboard',
    icon: 'military_tech',
    featured: false,
    readTime: '9 min read',
    excerpt: 'Learn how to log rejections, what each rejection stage means, how XP is awarded, and why rejection history appears in your resilience story.',
    intro:
      'Rejection Logging turns a painful part of job search into useful data. Instead of treating a rejection as the end of the story, Aptico records the stage, awards Resilience XP, and helps show that you kept moving.',
    overview: {
      bestFor: 'Users who want to track setbacks honestly and understand how rejection becomes part of their resilience profile.',
      plainSummary:
        'When a company says no, you can log the company, role, optional job link, and rejection stage. Aptico awards XP based on how far you reached.',
      outcome:
        'By the end, you should know what to log, what each stage means, and how rejection data affects XP, streaks, and your public profile.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What Rejection Logging does',
        body: [
          'Rejection Logging records job rejections in a structured way. You add the company, role, optional job link, and the stage where the process ended.',
          'This helps Aptico show your job-search journey more honestly. A rejection after a final round is different from a resume-screen rejection. Both matter, but they say different things about how far you got.',
          'The feature also awards Resilience XP. The deeper you reached in the process, the more XP the rejection can award.',
        ],
      },
      {
        id: 'stages',
        title: 'What each rejection stage means',
        body: [
          'Choose the stage that best matches where the company ended the process. You do not need to overthink it. Pick the closest option.',
        ],
        code: {
          title: 'Rejection stages and XP',
          lines: [
            'Resume screen = rejected before an interview (+50 XP)',
            'First round = rejected after first conversation or test (+100 XP)',
            'Hiring manager = rejected after manager or deeper team round (+175 XP)',
            'Final round = rejected near the end of the process (+250 XP)',
          ],
        },
      },
      {
        id: 'how-to-use',
        title: 'How to log a rejection',
        steps: [
          'Open the Command Center dashboard.',
          'Click Log Rejection.',
          'Enter the company name.',
          'Enter the role title.',
          'Add the job link if you still have it.',
          'Choose the stage where the rejection happened.',
          'Submit the log and confirm that XP was added.',
        ],
      },
      {
        id: 'why-log-rejections',
        title: 'Why logging rejections is useful',
        body: [
          'Most job seekers only track applications and offers. That hides a lot of learning. Rejections show where the process is breaking.',
          'If many rejections happen at resume screen, your resume or targeting may need work. If many happen after first round, your interview answers may need practice. If you reach final rounds often, you may be closer than it feels.',
          'This is why Aptico treats rejection as data, not shame.',
        ],
        callout: {
          type: 'tip',
          title: 'Rejection stage tells you where to improve',
          text: 'Resume-stage rejections often point to targeting or resume clarity. Interview-stage rejections often point to storytelling, communication, or role fit.',
        },
      },
      {
        id: 'public-profile',
        title: 'How rejection logs affect your public story',
        body: [
          'Rejection entries may be visible on your public profile or Shadow Resume. This is intentional: Aptico can show resilience, not just polished wins.',
          'Because these entries can be public, use accurate information. Do not log fake rejections, confidential details, or anything you would not want a recruiter to see.',
        ],
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not log a rejection before the company has actually ended the process.',
          'Do not choose a later stage just to earn more XP.',
          'Do not include private recruiter messages or sensitive company details.',
          'Do not treat rejection logs as failure. Treat them as a map of where the search needs work.',
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
    readTime: '7 min read',
    excerpt: 'Learn how to read, share, and use career wins so the community becomes a source of ideas and encouragement.',
    intro:
      'Community Wins is where users share progress stories, lessons, interviews, offers, and moments that prove the job search is moving.',
    overview: {
      bestFor: 'Users who want motivation and practical examples from other job seekers.',
      plainSummary:
        'Browse wins to learn what is working for others. Share your own win when it can encourage or teach the community.',
      outcome:
        'By the end, you should know what counts as a win and how to write one that is useful to others.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'A win can be an offer, but it can also be smaller: fixing a resume, booking an interview, finishing a portfolio, getting feedback, or applying consistently after a difficult week.',
          'The page helps users see real progress from real people. This makes the platform feel alive and gives you ideas for your own next move.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use it',
        steps: [
          'Open Community or Wins.',
          'Read recent posts and notice what actions led to progress.',
          'Save mental notes from posts that apply to your situation.',
          'Share your own win when you have a useful lesson or milestone.',
          'Keep your post honest, specific, and respectful.',
        ],
      },
      {
        id: 'what-to-share',
        title: 'What makes a good win post',
        body: [
          'The best posts are specific. Instead of only saying "I got an interview", explain what helped you get there. Mention the action, the lesson, or the change you made.',
        ],
        code: {
          title: 'Win post example',
          lines: [
            'I rewrote my resume after running analysis on three frontend roles.',
            'The biggest fix was adding proof for API work instead of only saying React.',
            'Got an interview invite today. Small change, big result.',
          ],
        },
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not share private company or personal details you should keep confidential.',
          'Do not make wins feel like bragging. Add what others can learn.',
          'Do not compare your timeline to someone else.',
          'Do not wait for a huge success. Small progress can help people too.',
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
    readTime: '7 min read',
    excerpt: 'Understand XP, levels, stickers, and how small progress signals help you build a consistent job-search habit.',
    intro:
      'Rewards and Stickers make your progress visible. They help you notice consistent effort, not just final outcomes.',
    overview: {
      bestFor: 'Users who want motivation and visible progress while applying, learning, and preparing.',
      plainSummary:
        'Aptico gives XP and stickers for meaningful actions such as analysis, profile completion, squad activity, and community wins.',
      outcome:
        'By the end, you should understand what rewards mean and how to use them without turning them into pressure.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'Job search has many invisible actions. You may improve your resume, practice interviews, apply to jobs, or support your squad, but it can still feel like nothing happened. Rewards make those actions visible.',
          'XP and stickers are small signals of effort. They are not the goal. They help you keep a steady rhythm while working toward the real goal: better opportunities.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to use rewards',
        steps: [
          'Open Rewards to see your current collection.',
          'Look at which actions helped you earn XP.',
          'Use stickers as reminders of progress you already made.',
          'Keep doing real career actions instead of chasing rewards only.',
          'Check your progress when motivation feels low.',
        ],
      },
      {
        id: 'what-rewards-mean',
        title: 'What rewards mean',
        body: [
          'A sticker is not proof that you are finished. It is proof that you showed up. Over time, those small actions become a stronger profile, better applications, and more confidence.',
        ],
        callout: {
          type: 'tip',
          title: 'Use rewards gently',
          text: 'Rewards should encourage you, not shame you. Missing a day does not erase your progress.',
        },
      },
      {
        id: 'what-stickers-are',
        title: 'What stickers are and what they mean',
        body: [
          'Stickers are visual achievements. They are like small badges that represent a type of progress you made on Aptico. Some stickers come from XP, some from application streaks, some from rejections, some from community activity, and some from special hidden actions.',
          'A sticker is not only decoration. It tells a story. For example, a streak sticker means you kept showing up across multiple days. An application sticker means you sent a meaningful number of applications. A rejection sticker means you kept going after hearing no.',
          'Unlocked stickers can be equipped to your showcase. Equipped stickers are the ones you choose to display on your profile. You can unlock many stickers, but only a limited number are shown at once so your showcase stays clean.',
        ],
      },
      {
        id: 'rarity-categories',
        title: 'Sticker rarity and categories',
        body: [
          'Rarity describes how difficult or special a sticker is. Common stickers are easier to unlock. Rare stickers usually need more consistency. Epic stickers represent stronger milestones. Legendary stickers are long-term or exceptional achievements.',
          'Categories explain what kind of progress the sticker belongs to. Milestone stickers usually track XP. Resilience stickers track streaks, applications, and rejections. Social stickers track followers or connections. Mastery stickers connect to skills. Engagement stickers connect to posts and sparks. Secret stickers are hidden until discovered. Event stickers are for special platform moments.',
        ],
        code: {
          title: 'Sticker system glossary',
          lines: [
            'Common = early or easier achievement',
            'Rare = stronger progress or consistency',
            'Epic = major milestone',
            'Legendary = exceptional long-term signal',
            'Equipped = visible on your profile showcase',
            'Locked = not earned yet',
            'Claimable = requirement reached, ready to unlock',
          ],
        },
      },
      {
        id: 'github-like-streaks',
        title: 'GitHub-like streaks and activity meaning',
        body: [
          'Aptico uses streak and activity ideas that feel similar to GitHub contribution graphs. Instead of code commits, the signals come from career actions like applications, rejection logs, profile progress, and other meaningful activity.',
          'The point is not to make job search feel like a game for no reason. The point is to help you see consistency. When you can see that you took action across many days, it becomes easier to keep going.',
          'A streak can unlock resilience stickers. A heatmap or trail can show which days had activity. These signals help you understand your pattern: are you applying steadily, waiting too long between actions, or doing big bursts and then stopping?',
        ],
        callout: {
          type: 'important',
          title: 'Streaks are signals, not your worth',
          text: 'A streak is useful feedback, but it should not become stress. Missing a day means you restart the rhythm, not that you failed.',
        },
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not treat XP as more important than applications, learning, or interviews.',
          'Do not compare your level to another user.',
          'Do not perform empty actions only to collect points.',
          'Do not forget to celebrate small but real progress.',
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
    readTime: '8 min read',
    excerpt: 'Set up your profile, career preferences, account details, public identity, and theme so Aptico understands you better.',
    intro:
      'Profile and Settings control how Aptico understands your career context and how comfortable the platform feels while you use it.',
    overview: {
      bestFor: 'New users setting up Aptico and existing users who want better recommendations and a cleaner public profile.',
      plainSummary:
        'Your profile explains who you are professionally. Settings control preferences such as account details, career direction, and visual theme.',
      outcome:
        'By the end, Aptico should have enough context to support your job search more accurately.',
    },
    sections: [
      {
        id: 'what-it-does',
        title: 'What this feature does',
        body: [
          'Your profile gives Aptico basic career context: your name or identity, headline, location, skills, interests, and public-facing details. Settings let you adjust the experience around your needs.',
          'A clear profile helps other features work better. For example, a good headline can improve your public profile, and accurate skills can make your career story easier to understand.',
        ],
      },
      {
        id: 'how-to-use',
        title: 'How to set it up',
        steps: [
          'Open Profile to edit public-facing career information.',
          'Write a headline that explains your current role or target role.',
          'Add skills you can support with projects, experience, or learning.',
          'Open Settings to review account and preference options.',
          'Choose the theme that is easiest for you to read.',
          'Review your public profile before sharing it with anyone.',
        ],
      },
      {
        id: 'writing-profile',
        title: 'How to write a helpful profile',
        body: [
          'A helpful profile is clear, not fancy. Say what you do, what you are learning, and what kind of opportunity you want. Avoid empty phrases that could describe anyone.',
        ],
        code: {
          title: 'Profile writing examples',
          lines: [
            'Weak: Passionate developer looking for opportunities.',
            'Better: Frontend developer focused on React dashboards, APIs, and job-search products.',
            'Strong: React developer building responsive dashboards with API filters, saved states, and user-friendly workflows.',
          ],
        },
      },
      {
        id: 'common-mistakes',
        title: 'Common mistakes to avoid',
        steps: [
          'Do not leave your headline blank if you plan to share your profile.',
          'Do not list skills you cannot explain.',
          'Do not forget to review what is public.',
          'Do not use a theme that makes long reading uncomfortable for you.',
          'Do not set preferences once and forget them if your goals change.',
        ],
      },
    ],
  },
];

export const FEATURED_DOCS = DOCS.filter((doc) => doc.featured);

export function getDocBySlug(slug) {
  return DOCS.find((doc) => doc.slug === slug);
}
