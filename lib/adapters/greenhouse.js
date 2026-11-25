const { contentHash } = require('../hash');
const { sanitizeDescription, decodeHtmlEntities, sanitizeUrl, normalizeLocation, toIsoDate } = require('../shared');

function normalizeJob(raw, company) {
  const jobId = raw.id != null ? String(raw.id) : null;
  if (!jobId) return null;

  const normalizedLocation = normalizeLocation(raw.location?.name);
  const description = sanitizeDescription(decodeHtmlEntities(raw.content));

  return {
    jobId,
    company,
    source: 'greenhouse',
    title: raw.title || 'Untitled',
    location: normalizedLocation.location,
    team: null,
    department: null,
    // Greenhouse's public job board API doesn't expose employment type or department.
    employmentType: null,
    remote: normalizedLocation.remote,
    description,
    applyUrl: sanitizeUrl(raw.absolute_url),
    jobUrl: sanitizeUrl(raw.absolute_url),
    publishedAt: toIsoDate(raw.first_published || raw.updated_at),
    scrapedAt: new Date().toISOString(),
    compensationSummary: null,
    compensationMin: null,
    compensationMax: null,
    compensationCurrency: null,
    compensationInterval: null,
    contentHash: contentHash(raw.title, normalizedLocation.location, description, String(normalizedLocation.remote)),
  };
}

// No filterRaw: Greenhouse's board endpoint only lists open, published jobs already.
module.exports = { normalizeJob };
