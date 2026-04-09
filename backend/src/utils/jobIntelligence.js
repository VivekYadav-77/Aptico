const TITLE_GHOST_TERMS = ['various', 'multiple positions', 'hiring now', 'urgent requirement', 'immediate joiner'];
const DESCRIPTION_BUZZWORDS = [
  'dynamic',
  'synergy',
  'leverage',
  'passionate',
  'rockstar',
  'ninja',
  'guru',
  'disruptive',
  'thought leader',
  'ecosystem'
];
const TIER_1_CITIES = ['bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'gurgaon', 'noida', 'gurugram'];
const TIER_2_CITIES = ['kolkata', 'ahmedabad', 'jaipur', 'indore', 'bhopal', 'lucknow', 'chandigarh', 'nagpur', 'kochi', 'surat'];
const ROLE_CATEGORY_RULES = [
  { category: 'tech', terms: ['software', 'developer', 'engineer', 'coding', 'frontend', 'backend', 'fullstack', 'data', 'ml', 'ai'] },
  { category: 'design', terms: ['design', 'ui', 'ux', 'graphic', 'figma'] },
  { category: 'marketing', terms: ['marketing', 'content', 'seo', 'social media'] },
  { category: 'finance', terms: ['finance', 'accounting', 'ca', 'audit'] }
];
const FAIRNESS_TABLE = {
  tech: {
    tier1: { min: 10000, fair: 15000 },
    tier2: { min: 6000, fair: 10000 },
    remote: { min: 8000, fair: 12000 }
  },
  design: {
    tier1: { min: 8000, fair: 12000 },
    tier2: { min: 5000, fair: 8000 },
    remote: { min: 6000, fair: 10000 }
  },
  marketing: {
    tier1: { min: 5000, fair: 8000 },
    tier2: { min: 3000, fair: 5000 },
    remote: { min: 4000, fair: 6000 }
  },
  finance: {
    tier1: { min: 8000, fair: 12000 },
    tier2: { min: 5000, fair: 8000 },
    remote: { min: 6000, fair: 10000 }
  },
  general: {
    tier1: { min: 4000, fair: 6000 },
    tier2: { min: 3000, fair: 5000 },
    remote: { min: 3000, fair: 5000 }
  }
};
const DIRECT_COMPANY_EXCLUSIONS = ['linkedin.com', 'indeed.com', 'naukri.com', 'internshala.com'];

function toLowerText(value) {
  return String(value || '').toLowerCase();
}

function getDescriptionLength(job) {
  return String(job?.description || '').trim().length;
}

function getDaysSincePosting(postedAt) {
  if (!postedAt) {
    return null;
  }

  const postedDate = new Date(postedAt);

  if (Number.isNaN(postedDate.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function getGhostLabel(ghostScore) {
  if (ghostScore <= 25) {
    return 'Low Risk';
  }

  if (ghostScore <= 50) {
    return 'Moderate Risk';
  }

  if (ghostScore <= 75) {
    return 'High Risk';
  }

  return 'Ghost Alert';
}

function getColorByGhostLabel(ghostLabel) {
  if (ghostLabel === 'Low Risk') {
    return 'green';
  }

  if (ghostLabel === 'Moderate Risk') {
    return 'amber';
  }

  return 'red';
}

function isDirectCompanyApplyUrl(applyUrl) {
  if (!applyUrl) {
    return false;
  }

  try {
    const hostname = new URL(applyUrl).hostname.toLowerCase();
    return !DIRECT_COMPANY_EXCLUSIONS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
}

function detectCityTier(location) {
  const normalizedLocation = toLowerText(location);

  if (!normalizedLocation || normalizedLocation.includes('remote')) {
    return 'remote';
  }

  if (TIER_1_CITIES.some((city) => normalizedLocation.includes(city))) {
    return 'tier1';
  }

  if (TIER_2_CITIES.some((city) => normalizedLocation.includes(city))) {
    return 'tier2';
  }

  return 'remote';
}

function detectRoleCategory(title) {
  const normalizedTitle = toLowerText(title);

  const matchedRule = ROLE_CATEGORY_RULES.find((rule) => rule.terms.some((term) => normalizedTitle.includes(term)));
  return matchedRule?.category || 'general';
}

export function computeGhostScore(job) {
  let ghostScore = 0;
  const daysSincePosting = getDaysSincePosting(job?.postedAt);
  const descriptionLength = getDescriptionLength(job);
  const title = toLowerText(job?.title);
  const description = toLowerText(job?.description);
  const company = String(job?.company || '').trim().toLowerCase();

  if (job?.postedAt == null || daysSincePosting == null) {
    ghostScore += 30;
  } else if (daysSincePosting > 30) {
    ghostScore += 25;
  } else if (daysSincePosting > 14) {
    ghostScore += 15;
  }

  if (descriptionLength < 200) {
    ghostScore += 20;
  }

  if (job?.salary == null && job?.stipend == null) {
    ghostScore += 15;
  }

  if (TITLE_GHOST_TERMS.some((term) => title.includes(term))) {
    ghostScore += 10;
  }

  const buzzwordCount = DESCRIPTION_BUZZWORDS.filter((term) => description.includes(term)).length;
  if (buzzwordCount >= 3) {
    ghostScore += 15;
  }

  if (!company || company === 'unknown' || company === 'n/a') {
    ghostScore += 10;
  }

  ghostScore = Math.min(100, Math.max(0, ghostScore));
  const ghostLabel = getGhostLabel(ghostScore);

  return {
    ghostScore,
    ghostLabel,
    ghostColor: getColorByGhostLabel(ghostLabel)
  };
}

export function computeApplyWindow(job) {
  const daysLive = getDaysSincePosting(job?.postedAt);

  if (daysLive == null) {
    return {
      windowLabel: 'Unknown Age',
      windowColor: 'gray',
      daysLive: null,
      windowMessage: 'Posting date unknown. Verify before applying.'
    };
  }

  if (daysLive <= 7) {
    return {
      windowLabel: 'Apply Now',
      windowColor: 'green',
      daysLive,
      windowMessage: `Posted ${daysLive} day(s) ago. Fresh listing - highest response rate.`
    };
  }

  if (daysLive <= 21) {
    return {
      windowLabel: 'Apply Soon',
      windowColor: 'amber',
      daysLive,
      windowMessage: `Posted ${daysLive} days ago. Response rate dropping. Apply today.`
    };
  }

  if (daysLive <= 45) {
    return {
      windowLabel: 'Apply With Caution',
      windowColor: 'red',
      daysLive,
      windowMessage: `Posted ${daysLive} days ago. Applications after 3 weeks have 80% lower response rate. Personalize your application heavily.`
    };
  }

  return {
    windowLabel: 'Likely Filled',
    windowColor: 'red',
    daysLive,
    windowMessage: `Posted ${daysLive} days ago. This role may already be filled. Only apply if you can reach out directly to a hiring manager.`
  };
}

export function computeResponseLikelihood(job) {
  if (job?.isScam) {
    return {
      likelihoodScore: 10,
      likelihoodLabel: 'Low Response Chance',
      likelihoodColor: 'red',
      likelihoodTip: 'Most applicants hear nothing from listings like this. Apply only if you can also reach out directly to someone at the company.'
    };
  }

  let score = 50;
  const description = toLowerText(job?.description);
  const descriptionLength = getDescriptionLength(job);
  const { daysLive } = computeApplyWindow(job);

  if (description.includes('startup') || description.includes('early stage')) {
    score -= 15;
  }

  if (description.includes('series a') || description.includes('series b')) {
    score -= 10;
  }

  if (description.includes('mnc') || description.includes('multinational') || description.includes('fortune 500')) {
    score += 20;
  }

  if (description.includes('government') || description.includes('psu')) {
    score += 25;
  }

  if (job?.salary != null || job?.stipend != null) {
    score += 15;
  }

  if (descriptionLength > 500) {
    score += 10;
  }

  if (descriptionLength < 150) {
    score -= 15;
  }

  if (isDirectCompanyApplyUrl(job?.applyUrl)) {
    score += 10;
  }

  if (daysLive != null) {
    if (daysLive <= 7) {
      score += 10;
    } else if (daysLive >= 22) {
      score -= 20;
    }
  }

  const likelihoodScore = Math.min(95, Math.max(5, score));
  const likelihoodLabel =
    likelihoodScore >= 65 ? 'Good Response Chance' : likelihoodScore >= 40 ? 'Moderate Response Chance' : 'Low Response Chance';
  const likelihoodColor = likelihoodLabel === 'Good Response Chance' ? 'green' : likelihoodLabel === 'Moderate Response Chance' ? 'amber' : 'red';
  const likelihoodTip =
    likelihoodLabel === 'Good Response Chance'
      ? 'This listing shows signals of active hiring. Apply promptly with a tailored application.'
      : likelihoodLabel === 'Moderate Response Chance'
        ? 'Response is possible but not guaranteed. A personalized cover letter improves your odds.'
        : 'Most applicants hear nothing from listings like this. Apply only if you can also reach out directly to someone at the company.';

  return {
    likelihoodScore,
    likelihoodLabel,
    likelihoodColor,
    likelihoodTip
  };
}

export function computeStipendFairness(job) {
  if (!toLowerText(job?.jobType).includes('internship')) {
    return null;
  }

  if (!job?.stipend) {
    return null;
  }

  const stipendAmount = parseInt(String(job.stipend).replace(/[^0-9]/g, ''), 10);

  if (Number.isNaN(stipendAmount)) {
    return null;
  }

  const cityTier = detectCityTier(job?.location);
  const roleCategory = detectRoleCategory(job?.title);
  const range = FAIRNESS_TABLE[roleCategory]?.[cityTier] || FAIRNESS_TABLE.general.remote;

  if (stipendAmount >= range.fair) {
    return {
      fairnessLabel: 'Above Average',
      fairnessColor: 'green',
      fairnessMessage: 'This stipend is fair or above average for this role and city.',
      stipendAmount,
      cityTier,
      roleCategory
    };
  }

  if (stipendAmount >= range.min) {
    return {
      fairnessLabel: 'Below Average',
      fairnessColor: 'amber',
      fairnessMessage: `This stipend is below average for ${roleCategory} roles in ${cityTier} cities. Fair range is ₹${range.min}-₹${range.fair}/mo. You can negotiate.`,
      stipendAmount,
      cityTier,
      roleCategory
    };
  }

  return {
    fairnessLabel: 'Exploitation Risk',
    fairnessColor: 'red',
    fairnessMessage: `This stipend (₹${stipendAmount}) is significantly below the minimum fair pay for this role. The fair minimum is ₹${range.min}/mo. Consider negotiating or skipping.`,
    stipendAmount,
    cityTier,
    roleCategory
  };
}

export function computeMatchScore(job, analysisData) {
  if (!analysisData) {
    return null;
  }

  const missingSkills = Array.isArray(analysisData.keywordMismatches)
    ? analysisData.keywordMismatches
        .map((item) => toLowerText(item?.keyword))
        .filter(Boolean)
    : [];
  const jobSkillSignals = `${job?.title || ''} ${job?.description || ''}`.toLowerCase();
  const matchedCount = missingSkills.filter((skill) => jobSkillSignals.includes(skill)).length;
  const overlapCount = missingSkills.length - matchedCount;
  const base = Number.isFinite(analysisData.confidenceScore) ? analysisData.confidenceScore : 0;
  let matchScore = base;

  if (overlapCount === 0) {
    matchScore = base + 10;
  } else if (overlapCount <= 2) {
    matchScore = base;
  } else if (overlapCount <= 5) {
    matchScore = base - 10;
  } else {
    matchScore = base - 20;
  }

  matchScore = Math.min(99, Math.max(1, Math.round(matchScore)));

  return {
    matchScore,
    missingFromThisJob: missingSkills.filter((skill) => jobSkillSignals.includes(skill)).slice(0, 3),
    matchLabel: matchScore >= 70 ? 'Strong Match' : matchScore >= 50 ? 'Partial Match' : 'Weak Match',
    matchColor: matchScore >= 70 ? 'green' : matchScore >= 50 ? 'amber' : 'red'
  };
}

export function enrichJob(job, analysisData) {
  return {
    ...job,
    ghost: computeGhostScore(job),
    applyWindow: computeApplyWindow(job),
    responseLikelihood: computeResponseLikelihood(job),
    stipendFairness: computeStipendFairness(job),
    match: computeMatchScore(job, analysisData)
  };
}

export function computeDashboardStats(enrichedJobs) {
  return {
    totalJobs: enrichedJobs.length,
    freshJobs: enrichedJobs.filter((job) => job.applyWindow.daysLive !== null && job.applyWindow.daysLive <= 7).length,
    ghostAlertCount: enrichedJobs.filter((job) => job.ghost.ghostScore > 50).length,
    averageGhostRisk: Math.round(enrichedJobs.reduce((sum, job) => sum + job.ghost.ghostScore, 0) / (enrichedJobs.length || 1)),
    strongMatchCount: enrichedJobs.filter((job) => job.match && job.match.matchScore >= 70).length,
    exploitationCount: enrichedJobs.filter(
      (job) => job.stipendFairness && job.stipendFairness.fairnessLabel === 'Exploitation Risk'
    ).length
  };
}
