# ats-jobs

[![test](https://github.com/rishilahoti/ats-jobs/actions/workflows/test.yml/badge.svg)](https://github.com/rishilahoti/ats-jobs/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/ats-jobs)](https://www.npmjs.com/package/ats-jobs) [![downloads](https://img.shields.io/npm/dw/ats-jobs)](https://www.npmjs.com/package/ats-jobs) [![license](https://img.shields.io/npm/l/ats-jobs)](LICENSE)

**ats-jobs is a Node.js library that fetches public job listings from ten applicant-tracking systems (ATS) and returns them in one consistent JSON shape.** No API keys, no config. Use it to build job boards, aggregators, alerts, or research datasets.

Ashby · Lever · Greenhouse · Workable · Recruitee · Teamtailor · Pinpoint · SmartRecruiters · Workday · Keka

```sh
npm install ats-jobs
```

```js
const { getJobs, normalize } = require('ats-jobs');

// fetch + normalize
const jobs = await getJobs('lever', 'ro');

// or normalize data you fetched yourself (an array, or { jobs: [...] })
const same = normalize('lever', rawLeverArray, 'Ro');
```

Each job looks like:

```js
{ jobId, company, source, title, location, team, department, employmentType, remote,
  description, applyUrl, jobUrl, publishedAt, scrapedAt, compensationSummary,
  compensationMin, compensationMax, compensationCurrency, compensationInterval, contentHash }
```

## Supported providers

| Provider | Slug example | Notes |
|---|---|---|
| Ashby | `openai` | includes compensation |
| Lever | `ro` | |
| Greenhouse | `gitlab` | |
| Workable | `huggingface` | |
| Recruitee | `bunq` | |
| Teamtailor | `bankgirotab` | |
| Pinpoint | `avaaz` | |
| SmartRecruiters | `linkedin3` | max 100 per board |
| Workday | `nvidia/wd5/NVIDIAExternalCareerSite` | max 200 per board |
| Keka | `disprz` | |

## FAQ

**How do I get jobs from a Greenhouse, Lever or Ashby board in Node.js?** `await getJobs('greenhouse', 'gitlab')`.

**Do I need an API key?** No. It reads the public job-board endpoints these vendors expose.

**Can I use it with data I already fetched?** Yes: `normalize(provider, raw, company)`.

**Is it a scraper for LinkedIn or Indeed?** No. It covers company career boards hosted on the ATS vendors above.

## Slugs

The slug is the company's id on that vendor, e.g. `ro` in `jobs.lever.co/ro`.
Workday takes `tenant/wdHost/site` (`nvidia/wd5/NVIDIAExternalCareerSite`). Teamtailor boards in North America keep the region (`acme.na`).

## Options

`getJobs(provider, slug, { company, userAgent, timeoutMs, maxRetries, retryBaseMs })`. Failures throw `FetchError` (`.statusCode`, `.retryable`). 5xx, 429 and network errors are retried with backoff.

## Notes

- Descriptions are stripped to plain text and only `http(s)` URLs are kept.
- Optional: install `cities.json` (19 MB) to correct city typos; without it, cleaned city names are used as-is.
- SmartRecruiters returns at most 100 postings per board; Workday at most 200.
- Workday, Keka, Teamtailor and Pinpoint use unofficial endpoints that can change without notice.
- `npm run live` checks every provider against the real APIs.

## Releasing

```sh
npm version patch        # or minor / major: bumps package.json, commits, tags
git push --follow-tags   # the release workflow tests, stages the release on npm and creates the GitHub release
```

The npm version goes live once the maintainer approves it (npmjs.com > ats-jobs > Staged Packages, or `npm stage approve <id>`).

Built for [jobs.whatrunsindia.com](https://jobs.whatrunsindia.com), a job board that tracks thousands of companies.

MIT
