const SAVED_JOBS_DETAILS_KEY = 'aptico-saved-jobs-details';

function readSavedJobsDetails() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SAVED_JOBS_DETAILS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeSavedJobsDetails(value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SAVED_JOBS_DETAILS_KEY, JSON.stringify(value));
  } catch (error) {
    // Ignore storage failures to avoid blocking the UI.
  }
}

export function getSavedJobsDetailsMap() {
  return readSavedJobsDetails();
}

export function getSavedJobDetails(savedJobId) {
  return readSavedJobsDetails()[savedJobId] || null;
}

export function saveSavedJobDetails(savedJobId, details) {
  if (!savedJobId || !details) {
    return;
  }

  const current = readSavedJobsDetails();

  current[savedJobId] = {
    ...current[savedJobId],
    ...details,
    savedAt: details.savedAt || current[savedJobId]?.savedAt || new Date().toISOString()
  };

  writeSavedJobsDetails(current);
}

export function removeSavedJobDetails(savedJobId) {
  if (!savedJobId) {
    return;
  }

  const current = readSavedJobsDetails();
  delete current[savedJobId];
  writeSavedJobsDetails(current);
}

export function clearSavedJobsDetails() {
  writeSavedJobsDetails({});
}

export function hydrateSavedJobsDetails(savedJobs, candidateJobs = []) {
  if (!Array.isArray(savedJobs) || !savedJobs.length || !Array.isArray(candidateJobs) || !candidateJobs.length) {
    return;
  }

  const current = readSavedJobsDetails();
  let hasChanges = false;

  for (const savedJob of savedJobs) {
    if (!savedJob?.id || current[savedJob.id]?.description) {
      continue;
    }

    const matchedCandidate = candidateJobs.find((job) => {
      const sameUrl = savedJob.url && (job.applyUrl === savedJob.url || job.url === savedJob.url);
      const sameTitle = String(job.title || '').trim().toLowerCase() === String(savedJob.title || '').trim().toLowerCase();
      const sameCompany = String(job.company || '').trim().toLowerCase() === String(savedJob.company || '').trim().toLowerCase();
      return sameUrl || (sameTitle && sameCompany);
    });

    if (!matchedCandidate) {
      continue;
    }

    current[savedJob.id] = {
      ...current[savedJob.id],
      description: matchedCandidate.description || current[savedJob.id]?.description || '',
      location: matchedCandidate.location || current[savedJob.id]?.location || '',
      jobType: matchedCandidate.jobType || current[savedJob.id]?.jobType || '',
      postedAt: matchedCandidate.postedAt || current[savedJob.id]?.postedAt || null,
      source: matchedCandidate.source || current[savedJob.id]?.source || savedJob.source || '',
      url: matchedCandidate.applyUrl || matchedCandidate.url || current[savedJob.id]?.url || savedJob.url || '',
      stipend: matchedCandidate.stipend || matchedCandidate.salary || current[savedJob.id]?.stipend || savedJob.stipend || '',
      matchPercent:
        matchedCandidate.match?.matchScore ??
        matchedCandidate.matchScore ??
        current[savedJob.id]?.matchPercent ??
        savedJob.matchPercent ??
        null,
      savedAt: savedJob.savedAt || current[savedJob.id]?.savedAt || new Date().toISOString()
    };
    hasChanges = true;
  }

  if (hasChanges) {
    writeSavedJobsDetails(current);
  }
}
