const SUSPICIOUS_TITLE_PATTERNS = [
  'earn from home',
  'data entry simple',
  'work from mobile',
  'no experience unlimited earning',
  'part time earn',
  'investment required',
  'registration fee',
  'pay to join'
];

const SHORTENER_DOMAINS = new Set(['bit.ly', 'tinyurl.com', 't.co']);

function extractMonthlyAmount(value) {
  const parsedValue = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function hasSuspiciousDomain(applyUrl) {
  try {
    const hostname = new URL(applyUrl).hostname.replace(/^www\./, '').toLowerCase();
    return SHORTENER_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

export function flagScamJobs(jobs) {
  return (Array.isArray(jobs) ? jobs : []).map((job) => {
    const title = String(job.title || '').toLowerCase();
    const company = String(job.company || '').trim().toLowerCase();
    const description = String(job.description || '').toLowerCase();
    const stipendAmount = extractMonthlyAmount(job.stipend);

    const isScam = [
      job.jobType === 'internship' && stipendAmount > 100000,
      SUSPICIOUS_TITLE_PATTERNS.some((pattern) => title.includes(pattern)),
      /^https?:\/\/\d+\.\d+/i.test(String(job.applyUrl || '')),
      hasSuspiciousDomain(job.applyUrl),
      !company || company === 'unknown' || company === 'n/a',
      description.includes('telegram') && description.includes('deposit'),
      /\bmlm\b|multi level|pyramid/i.test(description)
    ].some(Boolean);

    return {
      ...job,
      isScam
    };
  });
}
