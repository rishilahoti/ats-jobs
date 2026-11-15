const { fetchBoard, FetchError } = require('./lib/fetch');
const { normalize, PROVIDERS, ADAPTERS } = require('./lib/normalize');

// Fetch a company's public job board and return normalized jobs.
async function getJobs(provider, slug, { company = slug, ...fetchOptions } = {}) {
  return normalize(provider, await fetchBoard(provider, slug, fetchOptions), company);
}

module.exports = { getJobs, normalize, fetchBoard, FetchError, PROVIDERS, ADAPTERS };
