const { contentHash } = require('../hash');
const { sanitizeUrl, normalizeLocation } = require('../shared');

// ponytail: Rippling's public board list has no description or posted date; those live on
// a per-job detail endpoint (one request per job). List-only, same tradeoff as Workday.
function normalizeJob(raw, company) {
  if (!raw.uuid) return null;
  const normalizedLocation = normalizeLocation(raw.workLocation?.label);
  const department = raw.department?.label || null;
  const url = sanitizeUrl(raw.url);

  return {
    jobId: String(raw.uuid),
    company,
    source: 'rippling',
    title: raw.name || 'Untitled',
    location: normalizedLocation.location,
    team: null,
    department,
    employmentType: null,
    remote: normalizedLocation.remote,
    description: '',
    applyUrl: url,
    jobUrl: url,
    publishedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    compensationSummary: null,
    compensationMin: null,
    compensationMax: null,
    compensationCurrency: null,
    compensationInterval: null,
    contentHash: contentHash(raw.name, normalizedLocation.location, String(normalizedLocation.remote), department),
  };
}

// The list repeats a job once per location. ponytail: keeps the first location only;
// join the labels if multi-location jobs need all of them.
function filterRaw(rawJobs) {
  const seen = new Set();
  return rawJobs.filter((j) => j?.uuid && !seen.has(j.uuid) && seen.add(j.uuid));
}

module.exports = { normalizeJob, filterRaw };
