// Hits the real vendor APIs: one board per provider, first candidate slug with jobs wins.
// Run with `npm run live`. Not part of `npm test` (needs the network; boards come and go).
const { getJobs, PROVIDERS } = require('..');

const CANDIDATES = {
  ashby: ['openai', 'ramp'],
  lever: ['ro', 'wealthfront'],
  greenhouse: ['gitlab', 'coinbase'],
  workable: ['workable', 'huggingface'],
  recruitee: ['recruitee', 'bunq'],
  teamtailor: ['bankgirotab', 'hotelamigo'],
  pinpoint: ['avaaz', 'thecoteam'],
  smartrecruiters: ['linkedin3', 'accorcorpo'],
  workday: ['nvidia/wd5/NVIDIAExternalCareerSite'],
  keka: ['disprz', 'wbg'],
  rippling: ['rippling'],
};

(async () => {
  let failed = 0;
  for (const provider of PROVIDERS) {
    let result = '';
    for (const slug of CANDIDATES[provider]) {
      try {
        const jobs = await getJobs(provider, slug);
        if (jobs.length) { result = `OK   ${slug}: ${jobs.length} jobs, e.g. "${jobs[0].title}" @ ${jobs[0].location}`; break; }
        result = `none ${slug}: 0 jobs`;
      } catch (err) { result = `FAIL ${slug}: ${err.message}`; }
    }
    if (!result.startsWith('OK')) failed++;
    console.log(provider.padEnd(16), result);
  }
  process.exitCode = failed ? 1 : 0;
})();
