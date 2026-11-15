const { setTimeout: sleep } = require('node:timers/promises');

const BASE = {
  ashby: 'https://api.ashbyhq.com/posting-api/job-board',
  lever: 'https://api.lever.co/v0/postings',
  greenhouse: 'https://boards-api.greenhouse.io/v1/boards',
  workable: 'https://apply.workable.com/api/v1/widget/accounts',
  smartrecruiters: 'https://api.smartrecruiters.com/v1/companies',
};

const DEFAULTS = {
  userAgent: 'ats-jobs (+https://github.com/rishilahoti/ats-jobs)',
  timeoutMs: 30000,
  maxRetries: 3,
  retryBaseMs: 1000,
  maxResponseBytes: 10 * 1024 * 1024,
};

const SIMPLE_SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const WORKDAY_PART = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const HOST_RULES = {
  ashby: (host) => host === 'api.ashbyhq.com',
  lever: (host) => host === 'api.lever.co',
  greenhouse: (host) => host === 'boards-api.greenhouse.io',
  workable: (host) => host === 'apply.workable.com',
  smartrecruiters: (host) => host === 'api.smartrecruiters.com',
  recruitee: (host) => host.endsWith('.recruitee.com'),
  teamtailor: (host) => host.endsWith('.teamtailor.com'),
  pinpoint: (host) => host.endsWith('.pinpointhq.com'),
  workday: (host) => host.endsWith('.myworkdayjobs.com'),
  keka: (host) => host.endsWith('.keka.com'),
};

class FetchError extends Error {
  constructor(message, slug, statusCode, retryable) {
    super(message);
    this.name = 'FetchError';
    this.slug = slug;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// Each ATS has its own URL shape and response envelope; extract() reduces the
// response to a plain array of raw jobs.
const REQUESTS = {
  ashby: {
    url: (slug) => `${BASE.ashby}/${slug}?includeCompensation=true`,
    extract: (d) => (Array.isArray(d?.jobs) ? d.jobs : null),
  },
  lever: {
    url: (slug) => `${BASE.lever}/${slug}?mode=json`,
    extract: (d) => (Array.isArray(d) ? d : null),
  },
  greenhouse: {
    url: (slug) => `${BASE.greenhouse}/${slug}/jobs?content=true`,
    extract: (d) => (Array.isArray(d?.jobs) ? d.jobs : null),
  },
  workable: {
    url: (slug) => `${BASE.workable}/${slug}?details=true`,
    extract: (d) => (Array.isArray(d?.jobs) ? d.jobs : null),
  },
  recruitee: {
    url: (slug) => `https://${slug}.recruitee.com/api/offers/`,
    extract: (d) => (Array.isArray(d?.offers) ? d.offers : null),
  },
  teamtailor: {
    url: (slug) => `https://${slug}.teamtailor.com/jobs.json`,
    extract: (d) => (Array.isArray(d?.items) ? d.items : null),
  },
  pinpoint: {
    url: (slug) => `https://${slug}.pinpointhq.com/postings.json`,
    extract: (d) => (Array.isArray(d?.data) ? d.data : null),
  },
  // Capped at 100 postings (SmartRecruiters' max `limit`); no paging yet.
  smartrecruiters: {
    url: (slug) => `${BASE.smartrecruiters}/${slug}/postings?limit=100`,
    extract: (d) => (Array.isArray(d?.content) ? d.content : null),
  },
};

// A fetch's own abort signal doesn't always cover a stalled body read, so race it.
function timeLimit(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function validateOptions(options) {
  const checks = [
    ['timeoutMs', options.timeoutMs, 1, 300000],
    ['maxRetries', options.maxRetries, 1, 10],
    ['retryBaseMs', options.retryBaseMs, 0, 60000],
    ['maxResponseBytes', options.maxResponseBytes, 1024, 100 * 1024 * 1024],
  ];
  for (const [name, value, min, max] of checks) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new FetchError(`Invalid ${name}: expected an integer from ${min} to ${max}`, '', null, false);
    }
  }
  if (typeof options.userAgent !== 'string' || options.userAgent.length < 1 || options.userAgent.length > 256) {
    throw new FetchError('Invalid userAgent: expected 1 to 256 characters', '', null, false);
  }
}

function validateSlug(provider, slug) {
  if (typeof slug !== 'string') throw new FetchError('Invalid slug: expected a string', slug, null, false);
  if (provider === 'workday') {
    const parts = slug.split('/');
    if (parts.length !== 3 || parts.some(part => !WORKDAY_PART.test(part))) {
      throw new FetchError(`Malformed workday slug "${slug}" (expected tenant/wdHost/site)`, slug, null, false);
    }
    return;
  }
  if (!SIMPLE_SLUG.test(slug)) {
    throw new FetchError(`Malformed ${provider} slug "${slug}"`, slug, null, false);
  }
}

function validateUrl(url, source, slug) {
  const parsed = url instanceof URL ? url : new URL(url);
  if (parsed.protocol !== 'https:' || !HOST_RULES[source]?.(parsed.hostname)) {
    throw new FetchError(`Refused unsafe URL for ${slug} (${source})`, slug, null, false);
  }
  return parsed;
}

async function readBodyCapped(response, opts, parse) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > opts.maxResponseBytes) {
    throw new FetchError(`Response exceeds ${opts.maxResponseBytes} bytes`, '', response.status, false);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > opts.maxResponseBytes) {
      throw new FetchError(`Response exceeds ${opts.maxResponseBytes} bytes`, '', response.status, false);
    }
    chunks.push(bytes);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return parse === 'json' ? JSON.parse(text) : text;
}

async function request(url, init, slug, source, extract, opts, parse = 'json') {
  const safeUrl = validateUrl(url, source, slug);
  let lastError;
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await timeLimit(fetch(safeUrl, {
        ...init,
        headers: { 'User-Agent': opts.userAgent, Accept: 'application/json', ...init.headers },
        signal: AbortSignal.timeout(opts.timeoutMs),
        redirect: 'error',
      }), opts.timeoutMs);
      if (!res.ok) {
        throw new FetchError(`Fetch failed for ${slug} (${source}): HTTP ${res.status}`, slug, res.status, res.status >= 500 || res.status === 429);
      }
      const data = await timeLimit(readBodyCapped(res, opts, parse), opts.timeoutMs);
      const out = extract(data);
      if (out === null) throw new FetchError(`Invalid response structure for ${slug} (${source})`, slug, res.status, false);
      return out;
    } catch (err) {
      const e = err instanceof FetchError ? err : new FetchError(`Fetch failed for ${slug} (${source}): ${err.message}`, slug, null, true);
      if (!e.retryable) throw e;
      lastError = e;
      if (attempt < opts.maxRetries) {
        const backoff = opts.retryBaseMs * 2 ** (attempt - 1);
        await sleep(backoff + Math.random() * backoff * 0.5);
      }
    }
  }
  throw lastError;
}

const WORKDAY_PAGE_SIZE = 20; // API-enforced max per page
const WORKDAY_MAX_PAGES = 10; // caps a board at 200 jobs so one huge employer can't flood a run

// slug: "tenant/wdHost/site", e.g. "nvidia/wd5/NVIDIAExternalCareerSite"
async function fetchWorkday(slug, opts) {
  const [tenant, wdHost, site] = slug.split('/');
  if (!tenant || !wdHost || !site) throw new FetchError(`Malformed workday slug "${slug}" (expected tenant/wdHost/site)`, slug, null, false);
  const boardUrl = `https://${tenant}.${wdHost}.myworkdayjobs.com/${site}`;
  const apiUrl = `https://${tenant}.${wdHost}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
  const jobs = [];
  // `total` is unreliable across stateless requests; a short page is the only trustworthy end signal.
  for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
    const body = JSON.stringify({ appliedFacets: {}, limit: WORKDAY_PAGE_SIZE, offset: page * WORKDAY_PAGE_SIZE, searchText: '' });
    const pageJobs = await request(apiUrl, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }, slug, 'workday',
      (d) => (Array.isArray(d?.jobPostings) ? d.jobPostings : null), opts);
    // Postings only carry a relative path; the adapter needs the board URL to make absolute links.
    for (const job of pageJobs) jobs.push({ ...job, _boardUrl: boardUrl });
    if (pageJobs.length < WORKDAY_PAGE_SIZE) break;
  }
  return { jobs };
}

// Keka's careers page is an HTML shell; the org id for the jobs endpoint only appears in it.
async function fetchKeka(slug, opts) {
  const boardUrl = `https://${slug}.keka.com/careers/`;
  const html = await request(boardUrl, { headers: { Accept: 'text/html' } }, slug, 'keka', (t) => t, opts, 'text');
  const orgId = html.match(/\/ats\/documents\/([0-9a-f-]{36})\//i)?.[1];
  if (!orgId) throw new FetchError(`No Keka careers portal for ${slug}`, slug, null, false);
  const jobs = await request(`${boardUrl}api/embedjobs/default/active/${orgId}`, {}, slug, 'keka',
    (d) => (Array.isArray(d) ? d : null), opts);
  return { jobs: jobs.map((job) => ({ ...job, _boardUrl: boardUrl })) };
}

// Returns `{ jobs }` holding the board's raw (un-normalized) jobs.
async function fetchBoard(provider, slug, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (!Object.prototype.hasOwnProperty.call(HOST_RULES, provider)) {
    throw new FetchError(`Unknown provider "${provider}"`, slug, null, false);
  }
  validateOptions(opts);
  validateSlug(provider, slug);
  if (provider === 'workday') return fetchWorkday(slug, opts);
  if (provider === 'keka') return fetchKeka(slug, opts);
  const r = REQUESTS[provider];
  return { jobs: await request(r.url(slug), {}, slug, provider, r.extract, opts) };
}

module.exports = { fetchBoard, FetchError };
