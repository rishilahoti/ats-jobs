#!/usr/bin/env node
// npx ats-jobs lever ro          npx ats-jobs https://jobs.lever.co/ro
const { getJobs, detect, PROVIDERS } = require('.');

const args = process.argv.slice(2);
const target = args.length === 1 ? detect(args[0]) : { provider: args[0], slug: args[1] };
if (args.length < 1 || args.length > 2 || !target) {
  console.error(`Usage: ats-jobs <provider> <slug>  or  ats-jobs <careers-page-url>\nProviders: ${PROVIDERS.join(', ')}`);
  process.exit(1);
}
getJobs(target.provider, target.slug).then(
  (jobs) => console.log(JSON.stringify(jobs, null, 2)),
  (err) => { console.error(err.message); process.exitCode = 1; },
);
