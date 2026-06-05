import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildClearedCsrfCookie,
  buildCsrfCookie,
  createCsrfToken,
  CSRF_COOKIE_NAME
} from '../src/shared/security/csrf.js';
import { defaultJwtSecret, validateProductionEnv } from '../src/config/env.js';
import {
  buildRecruiterShadowResumePrompt,
  compactPublicProfileForRecruiter,
  createShadowResumeChatController
} from '../src/modules/shadow-resume/shadow-resume.controller.js';

describe('CSRF cookies', () => {
  it('creates non-empty tokens and scoped cookies', () => {
    const token = createCsrfToken();
    const cookie = buildCsrfCookie(token, {
      nodeEnv: 'development',
      cookieDomain: null
    });

    assert.ok(token.length >= 32);
    assert.match(cookie, new RegExp(`${CSRF_COOKIE_NAME}=`));
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /SameSite=Lax/);
  });

  it('clears the CSRF cookie', () => {
    const cookie = buildClearedCsrfCookie({
      nodeEnv: 'development',
      cookieDomain: null
    });

    assert.match(cookie, /Max-Age=0/);
  });
});

describe('production env validation', () => {
  it('rejects the default JWT secret in production', () => {
    assert.throws(
      () =>
        validateProductionEnv(
          {
            NODE_ENV: 'production',
            FRONTEND_URL: 'https://example.com',
            DATABASE_URL: 'https://example.com/db',
            JWT_SECRET: defaultJwtSecret
          },
          'production'
        ),
      /JWT_SECRET must be changed/
    );
  });
});

describe('Recruiter Shadow Resume prompt', () => {
  it('compacts visibility-filtered public profile data for recruiters', () => {
    const payload = compactPublicProfileForRecruiter({
      username: 'anya-dev',
      name: 'Anya Dev',
      headline: 'Frontend Engineer',
      location: 'Bengaluru',
      avatar_url: 'https://example.com/avatar.png',
      skills: ['React', 'TypeScript'],
      follower_count: 12,
      connection_count: 4,
      email: 'private@example.com',
      phone: '+91-00000-00000',
      enriched_settings: {
        bio: 'Builds accessible hiring products.',
        currentTitle: 'Frontend Engineer',
        currentCompany: 'Aptico',
        openToWork: true,
        github: 'https://github.com/anya',
        phone: '+91-11111-11111',
        topSkills: ['React', 'Accessibility'],
        tools: ['Vite'],
        languages: ['English'],
        experiences: [
          {
            title: 'Frontend Engineer',
            company: 'Aptico',
            startDate: '2025-01-01',
            isCurrent: true,
            description: 'Built recruiter-facing profile workflows.'
          }
        ],
        educationEntries: [
          {
            school: 'State University',
            degree: 'B.Tech',
            field: 'Computer Science',
            endYear: '2024'
          }
        ],
        topProjects: [
          {
            title: 'Shadow Resume',
            description: 'Public AI profile assistant.',
            techStack: ['React', 'Node'],
            liveUrl: 'https://example.com'
          }
        ],
        licenses: [{ name: 'AWS Cloud Practitioner', issuingOrg: 'AWS' }],
        honorsAwards: [{ title: 'Hackathon Winner', description: 'Won product track.' }]
      },
      latest_analysis: {
        target_role: 'Frontend roles',
        confidence_score: 86,
        top_skill_gaps: ['Testing', 'GraphQL', 'Design Systems', 'AWS']
      }
    });

    assert.equal(payload.profile.name, 'Anya Dev');
    assert.equal(payload.profile.about.bio, 'Builds accessible hiring products.');
    assert.equal(payload.experience[0].company, 'Aptico');
    assert.equal(payload.education[0].school, 'State University');
    assert.equal(payload.projects[0].title, 'Shadow Resume');
    assert.deepEqual(payload.latestAnalysis.topSkillGaps, ['Testing', 'GraphQL', 'Design Systems']);

    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /private@example\.com/);
    assert.doesNotMatch(serialized, /\+91-00000-00000/);
    assert.doesNotMatch(serialized, /\+91-11111-11111/);
  });

  it('omits profile sections not returned by public visibility filtering', () => {
    const payload = compactPublicProfileForRecruiter({
      username: 'private-sections',
      name: 'Private Sections',
      headline: 'Backend Engineer',
      skills: ['Node.js'],
      enriched_settings: {
        sectionVisibility: {
          experience: 'only_me',
          education: 'connections'
        },
        bio: 'Visible about text.'
      }
    });

    assert.equal(payload.profile.about.bio, 'Visible about text.');
    assert.equal(payload.experience, undefined);
    assert.equal(payload.education, undefined);
    assert.equal(payload.profile.sectionVisibility, undefined);
  });

  it('instructs the model to avoid hallucination when data is missing', () => {
    const prompt = buildRecruiterShadowResumePrompt(
      {
        profile: {
          username: 'minimal',
          name: 'Minimal Profile'
        }
      },
      'What is their salary expectation?'
    );

    assert.match(prompt, /That information is not available in the public profile data\./);
    assert.match(prompt, /Answer using ONLY the public candidate data supplied below\./);
    assert.match(prompt, /Do not invent experience, education, projects, companies, dates, achievements, links, certifications, metrics, or skills\./);
    assert.match(prompt, /Write like an experienced recruiter briefing a hiring manager/);
    assert.match(prompt, /\*\*Summary:\*\*/);
    assert.match(prompt, /\*\*Recruiter takeaways:\*\*/);
    assert.match(prompt, /Recruiter question: What is their salary expectation\?/);
  });

  it('passes enriched public payload to Gemini through the controller', async () => {
    let capturedPrompt = '';
    let capturedModel = '';
    let capturedKeys = [];

    const controller = createShadowResumeChatController({
      getPublicProfileFn: async () => ({
        username: 'maya',
        name: 'Maya Patel',
        headline: 'Product Engineer',
        avatar_url: 'https://example.com/maya.png',
        skills: ['React'],
        enriched_settings: {
          bio: 'Builds recruiter tools.',
          topProjects: [{ title: 'Hiring OS', description: 'Candidate matching dashboard.' }]
        }
      }),
      callGeminiFn: async ({ prompt, model, keys }) => {
        capturedPrompt = prompt;
        capturedModel = model;
        capturedKeys = keys;
        return 'Maya has public experience building recruiter tools.';
      },
      envConfig: {
        geminiShadowResumeKey: 'shadow-key',
        geminiShadowResumeModel: 'shadow-model',
        geminiModel1: 'fallback-model',
        geminiKeys: []
      }
    });

    const reply = {
      statusCode: 200,
      payload: null,
      code(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      send(payload) {
        this.payload = payload;
        return payload;
      }
    };

    await controller(
      {
        params: { username: 'maya' },
        body: { message: 'What projects has Maya built?' },
        server: { db: {} },
        log: { warn() {} }
      },
      reply
    );

    assert.equal(reply.statusCode, 200);
    assert.equal(reply.payload.success, true);
    assert.equal(reply.payload.profile.username, 'maya');
    assert.equal(capturedModel, 'shadow-model');
    assert.deepEqual(capturedKeys, ['shadow-key']);
    assert.match(capturedPrompt, /Hiring OS/);
    assert.match(capturedPrompt, /Builds recruiter tools\./);
    assert.match(capturedPrompt, /Recruiter question: What projects has Maya built\?/);
    assert.doesNotMatch(capturedPrompt, /private@example\.com/);
  });
});
