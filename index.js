const { fetchBoard, FetchError } = require('./lib/fetch');
const { normalize, PROVIDERS } = require('./lib/normalize');
const { detect } = require('./lib/detect');

// Fetch a company's public job board and return normalized jobs.
async function getJobs(provider, slug, { company = slug, ...fetchOptions } = {}) {
  return normalize(provider, await fetchBoard(provider, slug, fetchOptions), company);
}

module.exports = { getJobs, normalize, fetchBoard, FetchError, PROVIDERS, detect };
