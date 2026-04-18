import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createGeminiClient, isRateLimitError, sleep } from '../utils/geminiClient.js';

const CACHE_TTL_SECONDS = 2 * 60 * 60;
const STAGE_TIMEOUT_MS = 20_000;

const portfolioReadmeSchema = z.object({
  readmeMarkdown: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  suggestedTitle: z.string().trim().min(1)
});

const portfolioReadmeJsonSchema = {
  type: 'object',
  required: ['readmeMarkdown', 'headline', 'suggestedTitle'],
  properties: {
    readmeMarkdown: { type: 'string' },
    headline: { type: 'string' },
    suggestedTitle: { type: 'string' }
  }
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const sharedContextSchema = z.object({
  skillsPresent: z.array(z.string()),
  skillsMissing: z.array(z.string()),
  toneAssessment: z.string(),
  seniorityLevel: z.string(),
  jobDomain: z.string(),
  companyName: z.string(),
  strongestMatch: z.string(),
  estimatedYoe: z.number()
});

const stage1Schema = z.object({
  sharedContext: sharedContextSchema,
  confidenceScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  keywordMismatches: z.array(
    z.object({
      keyword: z.string().trim().min(1),
      jobRequirement: z.string().trim().min(1),
      resumeEvidence: z.string().trim().min(1),
      importance: z.string().trim().min(1)
    })
  ),
  seniorityMismatches: z.array(
    z.object({
      topic: z.string().trim().min(1),
      resumeLevel: z.string().trim().min(1),
      targetLevel: z.string().trim().min(1),
      explanation: z.string().trim().min(1)
    })
  ),
  rewriteSuggestions: z.array(
    z.object({
      original: z.string().trim().min(1),
      rewritten: z.string().trim().min(1),
      reason: z.string().trim().min(1)
    })
  )
});

const stage2Schema = z.object({
  interviewQuestions: z.array(z.string().trim().min(1)).min(5).max(5),
  rejectionReasons: z.string().trim().min(1),
  salaryCoach: z.string().trim().min(1)
});

const stage3Schema = z.object({
  learningPath: z.array(
    z.object({
      skill: z.string().trim().min(1),
      total_honest_hours: z.number().int().positive(),
      why_learn_first: z.string().trim().min(1).optional(),
      difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
      sources: z.array(
        z.object({
          type: z.enum(['youtube', 'course', 'docs', 'site', 'bootcamp', 'github']),
          title: z.string().trim().min(1),
          url: z.string().trim().min(1),
          free: z.boolean(),
          why: z.string().trim().min(1).optional()
        })
      ).min(1),
      resources: z.array(
        z.object({
          type: z.enum(['youtube', 'course', 'docs', 'site', 'bootcamp', 'github']),
          title: z.string().trim().min(1),
          url: z.string().trim().min(1),
          free: z.boolean(),
          why: z.string().trim().min(1).optional()
        })
      ).optional(),
      day_plan: z.array(
        z.object({
          day: z.number().int().positive(),
          goal: z.string().trim().min(1),
          duration_minutes: z.number().int().positive()
        })
      ).min(1),
      day_bootcamp: z.array(
        z.object({
          day: z.number().int().positive(),
          focus: z.string().trim().min(1),
          tasks: z.array(z.string().trim().min(1)),
          practice_question: z.string().trim().min(1).optional()
        })
      ).optional(),
      self_study_prompt: z.string().trim().min(1),
      ai_tutor_prompt: z.string().trim().min(1).optional(),
      projects: z.array(
        z.object({
          title: z.string().trim().min(1),
          description: z.string().trim().min(1),
          github_search: z.string().trim().min(1)
        })
      ).optional()
    })
  ),
  coldEmail: z.string().trim().min(1)
});

// ─── JSON schemas for Gemini structured output ────────────────────────────────

const stage1JsonSchema = {
  type: 'object',
  required: ['sharedContext', 'confidenceScore', 'summary', 'keywordMismatches', 'seniorityMismatches', 'rewriteSuggestions'],
  properties: {
    sharedContext: {
      type: 'object',
      required: ['skillsPresent', 'skillsMissing', 'toneAssessment', 'seniorityLevel', 'jobDomain', 'companyName', 'strongestMatch', 'estimatedYoe'],
      properties: {
        skillsPresent: { type: 'array', items: { type: 'string' } },
        skillsMissing: { type: 'array', items: { type: 'string' } },
        toneAssessment: { type: 'string' },
        seniorityLevel: { type: 'string' },
        jobDomain: { type: 'string' },
        companyName: { type: 'string' },
        strongestMatch: { type: 'string' },
        estimatedYoe: { type: 'number' }
      }
    },
    confidenceScore: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
    keywordMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['keyword', 'jobRequirement', 'resumeEvidence', 'importance'],
        properties: {
          keyword: { type: 'string' },
          jobRequirement: { type: 'string' },
          resumeEvidence: { type: 'string' },
          importance: { type: 'string' }
        }
      }
    },
    seniorityMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['topic', 'resumeLevel', 'targetLevel', 'explanation'],
        properties: {
          topic: { type: 'string' },
          resumeLevel: { type: 'string' },
          targetLevel: { type: 'string' },
          explanation: { type: 'string' }
        }
      }
    },
    rewriteSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['original', 'rewritten', 'reason'],
        properties: {
          original: { type: 'string' },
          rewritten: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
};

const stage2JsonSchema = {
  type: 'object',
  required: ['interviewQuestions', 'rejectionReasons', 'salaryCoach'],
  properties: {
    interviewQuestions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: { type: 'string' }
    },
    rejectionReasons: { type: 'string' },
    salaryCoach: { type: 'string' }
  }
};

const stage3JsonSchema = {
  type: 'object',
  required: ['learningPath', 'coldEmail'],
  properties: {
    learningPath: {
      type: 'array',
      items: {
        type: 'object',
        required: ['skill', 'total_honest_hours', 'sources', 'day_plan', 'self_study_prompt'],
        properties: {
          skill: { type: 'string' },
          total_honest_hours: { type: 'integer' },
          why_learn_first: { type: 'string' },
          difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'title', 'url', 'free'],
              properties: {
                type: { type: 'string', enum: ['youtube', 'course', 'docs', 'site', 'bootcamp', 'github'] },
                title: { type: 'string' },
                url: { type: 'string' },
                free: { type: 'boolean' },
                why: { type: 'string' }
              }
            }
          },
          resources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'title', 'url', 'free'],
              properties: {
                type: { type: 'string', enum: ['youtube', 'course', 'docs', 'site', 'bootcamp', 'github'] },
                title: { type: 'string' },
                url: { type: 'string' },
                free: { type: 'boolean' },
                why: { type: 'string' }
              }
            }
          },
          day_plan: {
            type: 'array',
            items: {
              type: 'object',
              required: ['day', 'goal', 'duration_minutes'],
              properties: {
                day: { type: 'integer' },
                goal: { type: 'string' },
                duration_minutes: { type: 'integer' }
              }
            }
          },
          day_bootcamp: {
            type: 'array',
            items: {
              type: 'object',
              required: ['day', 'focus', 'tasks'],
              properties: {
                day: { type: 'integer' },
                focus: { type: 'string' },
                tasks: { type: 'array', items: { type: 'string' } },
                practice_question: { type: 'string' }
              }
            }
          },
          self_study_prompt: { type: 'string' },
          ai_tutor_prompt: { type: 'string' },
          projects: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'description', 'github_search'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                github_search: { type: 'string' }
              }
            }
          }
        }
      }
    },
    coldEmail: { type: 'string' }
  }
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildStage1Prompt(resumeText, jobDescription) {
  return [
    'You are Aptico, a senior technical career analyst.You have reviewed thousands of resumes and hiring decisions. You think like a hiring manager at a top tech company and a career coach simultaneously.',
    'Analyze this resume against this job description with brutal honesty and surgical precision. You are not here to encourage. You are here to give the candidate the exact truth they need to either fix their resume or understand where they truly stand.',
    '',
    'Return only valid JSON matching the provided schema. Every field is mandatory. Do not leave any array empty if evidence exists.',
    '',
    'SHARED CONTEXT — extract with precision:',
    '',
    'skillsPresent: List every technical skill, tool, framework, language, methodology, and domain explicitly demonstrated or clearly implied by work experience in the resume. Be specific. Not "programming" — write "Python", "React", "REST APIs".',
    'skillsMissing: List every skill, tool, framework, or domain the JD requires or strongly implies that is completely absent from the resume. Be specific and exhaustive.',
    'toneAssessment: Assess the resume writing quality in 4 sentences. Is it passive or active voice? Vague or quantified? Generic or tailored? Example: "Resume uses passive constructions and lacks quantified impact. Bullet points read as task lists rather than achievement statements."',
    'seniorityLevel: One of — Intern, Fresher, Junior, Mid-Level, Senior, Lead, Principal. Base this on years of experience, scope of work, and technologies used.',
    'jobDomain: Specific domain and role type. Example: "Full-Stack Web Development — React + Node.js" or "Data Engineering — Python + Spark".',
    'companyName: Extract from JD if present. Return "Unknown" if not found.',
    'strongestMatch: The single skill or experience that most strongly connects this resume to this JD.',
    'estimatedYoe: Estimate years of experience as an integer. Count from first relevant role or graduation if fresher.',
    '',
    'CONFIDENCE SCORE — integer 0 to 100 are here: ',
    'This is the honest probability that this resume passes an initial screening for this exact role.',
    '90-100: Near-perfect match. Minor gaps only.',
    '70-89: Strong match with 1-2 meaningful gaps.',
    '50-69: Moderate match. Several important gaps but core is present.',
    '30-49: Weak match. Major skill or experience gaps.',
    '0-29: Very poor match. Fundamental misalignment.',
    '',
    'SUMMARY — one paragraph:',
    'Write as if you are a senior hiring manager explaining your decision to a recruiter. Be direct. Name the biggest strengths and the most critical gaps. Do not use bullet points here.',
    '',
    'KEYWORD MISMATCHES — for each important skill or term in the JD that is absent or weak in the resume:',
    'keyword: the exact skill or term from the JD',
    'jobRequirement: why this matters for the role, one sentence',
    'resumeEvidence: what the resume does or does not show about this skill — be specific, quote resume language if relevant',
    'importance: one of — Critical, High, Medium, Low',
    '',
    'SENIORITY MISMATCHES — for each area where the candidate demonstrated level does not match what the JD expects:',
    'topic: the specific area of mismatch (example: "System Design", "Team Leadership", "Production Deployment")',
    'resumeLevel: what the resume demonstrates, one phrase',
    'targetLevel: what the JD expects, one phrase',
    'explanation: why this gap matters for this role, one sentence',
    '',
    'REWRITE SUGGESTIONS — identify the 3 to 5 weakest bullet points in the resume and rewrite them:',
    'original: copy the exact original bullet point from the resume',
    'rewritten: rewrite it using strong action verbs, quantified impact, and JD-relevant language',
    'reason: one sentence explaining what was wrong and what the rewrite fixes',
    '',
    'Resume:',
    resumeText,
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
}

function buildStage2Prompt(sharedContext) {
  const ctx = JSON.stringify(sharedContext);
  return [
    'You are Aptico, a senior technical career analyst and interview coach.',
    'You are given a structured analysis context from a resume and job description comparison. Use only this context. Do not ask for the raw resume or JD.',
    '',
    'Return only valid JSON matching the provided schema. All three fields are mandatory.',
    '',
    'INTERVIEW QUESTIONS — produce exactly 5 questions:',
    'Each question must be directly derived from the skill gaps and role requirements in this context. Do not produce generic questions. Every question must be something a real interviewer would ask someone with exactly these gaps applying for exactly this role.',
    'Pattern for each question: mix of technical depth questions on required skills, behavioral questions tied to the seniority level, and at least one question that directly probes the weakest skill gap.',
    'Format: plain question string, no numbering, no preamble.',
    '',
    'REJECTION REASONS — plain text, no markdown, no JSON. Follow EXACTLY this format with no preamble or introduction. Start the response immediately with the header ATS SCAN:',
    '',
    'ATS SCAN',
    '- [specific reason tied to missing keywords or formatting issues from the context]',
    '- [specific reason]',
    '- [specific reason]',
    '',
    'RECRUITER SCAN (first 10 seconds)',
    '- [specific reason a human would notice immediately — visual, structural, or content issue]',
    '- [specific reason]',
    '- [specific reason]',
    '',
    'VERDICT',
    '[Maximum 3 sentences. Name ONLY the single most damaging issue from the above and the one specific thing that must change before reapplying. Be blunt and surgical. Do not list multiple issues.]',
    '',
    'Every bullet MUST start with a hyphen (-). Do not use asterisks, numbers, or other bullet characters.',
    '',
    'SALARY COACH — plain text, no markdown, no JSON. Follow EXACTLY this format. Every section header below is MANDATORY and must appear exactly as written:',
    '',
    'ESTIMATED RANGE',
    '₹[min]–₹[max] per month (or [X]–[Y] LPA if full-time role)',
    'If the JD contains no salary signals, use current Indian market rates for the role domain and seniority level from the context. Never return an empty range.',
    '',
    'WHY THIS RANGE',
    '[2 to 3 sentences. Reference the role domain, seniority level, and skills from the context. Tie the range to signals in this specific context, not generic industry averages.]',
    '',
    'YOUR NEGOTIATION POSITION',
    '[STRONG | NEUTRAL | WEAK]: [One sentence explaining why, referencing the candidate strongest matching skill or their skill gaps]',
    '',
    'EXACT PHRASES TO USE',
    '1. [A specific email sentence to open salary discussion]',
    '2. [A specific spoken sentence for a call or interview]',
    '3. [A specific counter-offer sentence if they offer below range]',
    '',
    'WHAT NOT TO SAY',
    '1. [A phrase that signals desperation or inexperience]',
    '2. [A phrase that undermines negotiating position]',
    '',
    'Shared Context:',
    ctx
  ].join('\n');
}

function buildStage3Prompt(sharedContext) {
  const ctx = JSON.stringify(sharedContext);
  return [
    'You are Aptico, a senior learning architect and career strategist. You are given a structured analysis context. Use only this context. Do not ask for the raw resume or JD.',
    '',
    'Return only valid JSON matching the provided schema. Both fields are mandatory.',
    '',
    'LEARNING PATH — for every skill in skillsMissing from the context: Produce a realistic, actionable learning plan. Do not produce vague or motivational content. Every item must be immediately usable by the candidate.',
    '',
    'Order skills by urgency — the skill that most blocks this candidate from getting this job comes first.',
    '',
    'skill: exact skill name from the missing skills list',
    '',
    'why_learn_first: one sentence explaining why this skill is at this position in the priority list relative to the others',
    '',
    'difficulty: one of "Beginner", "Intermediate", "Advanced" — based on how hard it is for someone at this candidate seniority level',
    '',
    'total_honest_hours: Be genuinely honest. Do not underestimate to encourage the user.',
    '- A new programming language or framework: 40 to 80 hours',
    '- A deep concept like system design or ML: 80 to 150 hours',
    '- A tool or platform with docs: 10 to 30 hours',
    '- A soft or process skill: 5 to 20 hours',
    '',
    'sources: Provide real, specific resources. Only provide URLs that actually exist today.',
    '- At least 1 YouTube resource: link to a specific playlist or video, not a channel homepage',
    '- At least 1 official documentation link: the actual technology docs page (e.g. https://react.dev/learn not https://react.dev)',
    '- At least 1 free course: from freeCodeCamp, The Odin Project, Coursera audit, CS50, or equivalent',
    '- At least 1 bootcamp-style resource: a structured multi-week resource',
    '- At least 1 GitHub repository: a popular open-source repo for learning or reference. Use type "github".',
    '- Set free: true only if the resource requires no payment',
    '- For each resource add a "why" string explaining why this specific resource is the best choice for this skill',
    '',
    'day_plan: Provide as backward-compatible fallback. Concrete daily tasks not topics. Each day entry must describe what the person will build, watch, or practice.',
    'duration_minutes must be between 30 and 90',
    '',
    'day_bootcamp: Array of exactly 7 objects for a 7-day intensive bootcamp on this skill.',
    'Each object has:',
    '  day: integer 1 through 7',
    '  focus: string, max 4 words summarizing the day theme (e.g. "Core hooks deep dive")',
    '  tasks: array of short, concrete action strings. Write as actions not topics. GOOD: "build a weather app using useState and useEffect", "watch Codevolution useEffect tutorial (45 min)". BAD: "learn React hooks", "study useState".',
    '  practice_question: a single interview-style or conceptual question for that day topic that tests understanding',
    '',
    'projects: Array of exactly 2 project objects for this skill.',
    'Each project has:',
    '  title: short project name',
    '  description: 1 to 2 sentences describing what to build and why it demonstrates the skill',
    '  github_search: a GitHub search query string that would find reference implementations (e.g. "react todo app typescript")',
    '',
    'self_study_prompt: Write a prompt the user can paste directly into any AI tutor. Include the skill name, the candidate current level, the target level, and instructions for step-by-step teaching.',
    '',
    'ai_tutor_prompt: Write a complete, paste-ready prompt for an AI agent to run the 7-day bootcamp interactively. The prompt must instruct the AI to:',
    '  - Teach one day at a time',
    '  - Assign the practice question for that day',
    '  - Wait for the user answer before proceeding',
    '  - Evaluate the answer, explain if wrong, and only move to the next day when the answer is correct',
    '  - At the end of all 7 days, give a final assessment and recommend next steps',
    '  - Reference the specific projects as capstone assignments',
    '',
    'COLD EMAIL — plain text, no markdown, no JSON:',
    'Write one complete, ready-to-send personalized cold email to the hiring manager. Use the company name, job domain, and strongest matching skill from the context.',
    'Do not use placeholders like [Your Name] or [Company]. Use "I" for the sender and the actual company name and role domain from the context.',
    'Structure: opening hook that shows you know the company or role specifically, one sentence on your strongest relevant skill with a concrete example, one sentence acknowledging you are still building one key skill and what you are doing about it, a direct ask for a call or interview, professional sign-off.',
    'Tone: confident, direct, not desperate. Under 150 words.',
    '',
    'Shared Context:',
    ctx
  ].join('\n');
}

// ─── Call helper with fallback and timeout ────────────────────────────────────

async function callGeminiStage({ apiKey, fallbackKey, model, prompt, config, logger }) {
  const keys = [apiKey, fallbackKey].filter(Boolean);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const client = createGeminiClient(key);

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini call timed out after 20 seconds.')), STAGE_TIMEOUT_MS);
      });

      const callPromise = client.models.generateContent({ model, contents: prompt, config });
      const response = await Promise.race([callPromise, timeoutPromise]);
      return typeof response.text === 'function' ? response.text() : response.text;
    } catch (error) {
      if (i === 0 && fallbackKey && (isRateLimitError(error) || error.message?.includes('timed out'))) {
        logger?.warn?.(`Stage key failed (${error.message}). Retrying with fallback key.`);
        await sleep(200);
        continue;
      }
      throw error;
    }
  }

  throw new Error('All Gemini keys exhausted for this stage.');
}

// ─── Public staged analysis functions ────────────────────────────────────────

export async function runStage1({ resumeText, jobDescription, logger = console }) {
  const prompt = buildStage1Prompt(resumeText, jobDescription);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey1,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel1,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage1JsonSchema },
    logger
  });

  try {
    return stage1Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

export async function runStage2({ sharedContext, logger = console }) {
  const prompt = buildStage2Prompt(sharedContext);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey2,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel2,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage2JsonSchema },
    logger
  });

  try {
    return stage2Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

export async function runStage3({ sharedContext, logger = console }) {
  const prompt = buildStage3Prompt(sharedContext);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey3,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel3,
    prompt,
    config: { responseMimeType: 'application/json', responseJsonSchema: stage3JsonSchema },
    logger
  });

  try {
    return stage3Schema.parse(JSON.parse(rawText));
  } catch (error) {
    const parseError = new Error('This section could not be generated. Please try again.');
    parseError.statusCode = 500;
    throw parseError;
  }
}

// ─── Legacy single-shot analysis (kept for applyKitService compatibility) ────

const analysisSchema = z.object({
  companyName: z.string().trim(),
  confidenceScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  keywordMismatches: z.array(
    z.object({
      keyword: z.string().trim().min(1),
      jobRequirement: z.string().trim().min(1),
      resumeEvidence: z.string().trim().min(1),
      importance: z.string().trim().min(1)
    })
  ),
  seniorityMismatches: z.array(
    z.object({
      topic: z.string().trim().min(1),
      resumeLevel: z.string().trim().min(1),
      targetLevel: z.string().trim().min(1),
      explanation: z.string().trim().min(1)
    })
  ),
  rewriteSuggestions: z.array(
    z.object({
      original: z.string().trim().min(1),
      rewritten: z.string().trim().min(1),
      reason: z.string().trim().min(1)
    })
  )
});

const responseJsonSchema = {
  type: 'object',
  required: ['companyName', 'confidenceScore', 'summary', 'keywordMismatches', 'seniorityMismatches', 'rewriteSuggestions'],
  properties: {
    companyName: { type: 'string' },
    confidenceScore: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
    keywordMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['keyword', 'jobRequirement', 'resumeEvidence', 'importance'],
        properties: {
          keyword: { type: 'string' },
          jobRequirement: { type: 'string' },
          resumeEvidence: { type: 'string' },
          importance: { type: 'string' }
        }
      }
    },
    seniorityMismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['topic', 'resumeLevel', 'targetLevel', 'explanation'],
        properties: {
          topic: { type: 'string' },
          resumeLevel: { type: 'string' },
          targetLevel: { type: 'string' },
          explanation: { type: 'string' }
        }
      }
    },
    rewriteSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['original', 'rewritten', 'reason'],
        properties: {
          original: { type: 'string' },
          rewritten: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
};

function buildPrompt({ resumeText, jobDescription }) {
  return [
    'You are Aptico, an AI career analysis engine.',
    'Analyze the resume against the job description and return only valid JSON matching the provided schema.',
    'Focus on keyword mismatches, seniority mismatches, and bullet rewrite improvements.',
    'Confidence score must be an integer between 0 and 100.',
    '',
    'Resume:',
    resumeText,
    '',
    'Job Description:',
    jobDescription
  ].join('\n');
}

function buildPortfolioReadmePrompt(profilePayload) {
  return [
    'You are Aptico, an elite developer brand strategist.',
    'Turn the following candidate profile data into a stellar GitHub profile README.',
    'Return only valid JSON matching the provided schema.',
    'The markdown must be polished, specific, recruiter-friendly, and credible.',
    'Do not invent employers, dates, metrics, open-source work, technologies, or achievements that are not present in the data.',
    'Do not include any badge markdown at the beginning because the caller will prepend that separately.',
    'Use standard GitHub-flavored Markdown only.',
    'The markdown should include:',
    '- a strong headline section',
    '- a concise professional summary',
    '- a focused skills/tooling section',
    '- a highlighted experience section',
    '- a featured work or achievement section when supported by the data',
    '- a brief contact/collaboration close',
    'Keep the result under 1200 words.',
    '',
    'Candidate data:',
    JSON.stringify(profilePayload, null, 2)
  ].join('\n');
}

function createPromptHash(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

export async function analyzeResumeWithGemini({
  resumeText,
  jobDescription,
  redisService,
  geminiKeys,
  clientFactory,
  logger = console
}) {
  const { getGeminiKeys, callGeminiWithRotation } = await import('../utils/geminiClient.js');

  const prompt = buildPrompt({ resumeText, jobDescription });
  const promptHash = createPromptHash(prompt);
  const cacheKey = `gemini_analysis:${promptHash}`;

  if (redisService) {
    const cachedResult = await redisService.get(cacheKey);

    if (cachedResult) {
      try {
        const parsedCachedResult = analysisSchema.safeParse(JSON.parse(cachedResult));

        if (parsedCachedResult.success) {
          return {
            analysis: {
              ...parsedCachedResult.data,
              companyName: parsedCachedResult.data.companyName || null
            },
            cached: true,
            promptHash
          };
        }
      } catch (error) {
        logger?.warn?.('Cached Gemini response could not be parsed. Falling back to a live call.');
      }
    }
  }

  const geminiResponseText = await callGeminiWithRotation({
    prompt,
    model: env.geminiModel1,
    keys: getGeminiKeys(geminiKeys),
    clientFactory,
    logger,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema
    }
  });

  let parsedAnalysis;

  try {
    parsedAnalysis = analysisSchema.parse(JSON.parse(geminiResponseText));
  } catch (error) {
    const parseError = new Error('Gemini returned invalid structured JSON.');
    parseError.statusCode = 500;
    throw parseError;
  }

  if (redisService) {
    await redisService.set(cacheKey, JSON.stringify(parsedAnalysis), CACHE_TTL_SECONDS);
  }

  return {
    analysis: {
      ...parsedAnalysis,
      companyName: parsedAnalysis.companyName || null
    },
    cached: false,
    promptHash
  };
}

export async function generatePortfolioReadme({ profilePayload, logger = console }) {
  const prompt = buildPortfolioReadmePrompt(profilePayload);

  const rawText = await callGeminiStage({
    apiKey: env.geminiKey2 || env.geminiKey1,
    fallbackKey: env.geminiKeyFallback,
    model: env.geminiModel2 || env.geminiModel1,
    prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: portfolioReadmeJsonSchema,
      temperature: 0.6,
      topP: 0.95
    },
    logger
  });

  try {
    return portfolioReadmeSchema.parse(JSON.parse(rawText));
  } catch {
    const parseError = new Error('README generation returned invalid structured JSON.');
    parseError.statusCode = 500;
    throw parseError;
  }
}
