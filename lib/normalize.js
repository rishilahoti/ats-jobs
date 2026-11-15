const adapters = Object.freeze({
  ashby: require('./adapters/ashby'),
  lever: require('./adapters/lever'),
  greenhouse: require('./adapters/greenhouse'),
  workable: require('./adapters/workable'),
  recruitee: require('./adapters/recruitee'),
  teamtailor: require('./adapters/teamtailor'),
  pinpoint: require('./adapters/pinpoint'),
  smartrecruiters: require('./adapters/smartrecruiters'),
  workday: require('./adapters/workday'),
  keka: require('./adapters/keka'),
});

const PROVIDERS = Object.keys(adapters);

// `raw` is the board's job array, or the `{ jobs: [...] }` object getJobs fetches.
function normalize(provider, raw, company = '') {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown provider "${provider}" (expected one of ${PROVIDERS.join(', ')})`);
  const list = Array.isArray(raw) ? raw : raw?.jobs;
  if (!Array.isArray(list)) throw new Error('Expected an array of jobs or { jobs: [...] }');
  return (adapter.filterRaw?.(list) ?? list)
    .map(j => adapter.normalizeJob(j, company))
    .filter(Boolean);
}

module.exports = { normalize, PROVIDERS, ADAPTERS: adapters };
