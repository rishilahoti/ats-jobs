// A careers-page URL -> { provider, slug } ready for getJobs, or null if it isn't a supported board.
// Boards that live on a shared host carry the slug in the path:
const PATH_HOSTS = {
  'jobs.ashbyhq.com': 'ashby',
  'jobs.lever.co': 'lever',
  'boards.greenhouse.io': 'greenhouse',
  'job-boards.greenhouse.io': 'greenhouse',
  'apply.workable.com': 'workable',
  'jobs.smartrecruiters.com': 'smartrecruiters',
  'careers.smartrecruiters.com': 'smartrecruiters',
  'ats.rippling.com': 'rippling',
};
// ...the rest give each company its own subdomain (Teamtailor NA boards keep ".na").
const SUBDOMAIN = /^([a-z0-9-]+(?:\.na)?)\.(recruitee|teamtailor|pinpointhq|keka)\.com$/;
const WORKDAY = /^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/;
const LOCALE = /^[a-z]{2}(-[a-z]{2})?$/i;

function detect(input) {
  let url;
  try { url = new URL(input); } catch { return null; }
  const host = url.hostname;
  const path = url.pathname.split('/').filter(Boolean);

  const provider = PATH_HOSTS[host];
  if (provider) {
    // boards.greenhouse.io/embed/job_board?for=acme
    if (provider === 'greenhouse' && path[0] === 'embed') return slugged(provider, url.searchParams.get('for'));
    // ats.rippling.com/en-GB/acme/jobs, ats.rippling.com/embed/acme/jobs
    if (provider === 'rippling' && (LOCALE.test(path[0] ?? '') || path[0] === 'embed')) path.shift();
    return slugged(provider, path[0]);
  }

  const wd = host.match(WORKDAY);
  if (wd) {
    if (LOCALE.test(path[0] ?? '')) path.shift();
    return path[0] ? { provider: 'workday', slug: `${wd[1]}/${wd[2]}/${path[0]}` } : null;
  }

  const sub = host.match(SUBDOMAIN);
  if (!sub || sub[1] === 'www') return null;
  return { provider: sub[2] === 'pinpointhq' ? 'pinpoint' : sub[2], slug: sub[1] };
}

function slugged(provider, slug) {
  return slug ? { provider, slug } : null;
}

module.exports = { detect };
