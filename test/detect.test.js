const test = require('node:test');
const assert = require('node:assert/strict');
const { detect } = require('..');

test('careers URLs map to the provider and slug getJobs takes', () => {
  const cases = {
    'https://jobs.ashbyhq.com/openai/abc-123': ['ashby', 'openai'],
    'https://jobs.lever.co/ro': ['lever', 'ro'],
    'https://job-boards.greenhouse.io/gitlab/jobs/1': ['greenhouse', 'gitlab'],
    'https://boards.greenhouse.io/embed/job_board?for=gitlab': ['greenhouse', 'gitlab'],
    'https://apply.workable.com/huggingface/': ['workable', 'huggingface'],
    'https://jobs.smartrecruiters.com/LinkedIn3': ['smartrecruiters', 'LinkedIn3'],
    'https://ats.rippling.com/en-GB/acme-co/jobs/abc': ['rippling', 'acme-co'],
    'https://bunq.recruitee.com/o/analyst': ['recruitee', 'bunq'],
    'https://acme.na.teamtailor.com/jobs': ['teamtailor', 'acme.na'],
    'https://thecoteam.pinpointhq.com/': ['pinpoint', 'thecoteam'],
    'https://disprz.keka.com/careers/': ['keka', 'disprz'],
    'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/x': ['workday', 'nvidia/wd5/NVIDIAExternalCareerSite'],
  };
  for (const [url, [provider, slug]] of Object.entries(cases)) assert.deepEqual(detect(url), { provider, slug }, url);
});

test('anything else is null', () => {
  for (const url of ['not a url', 'https://example.com/jobs', 'https://jobs.lever.co/', 'https://www.recruitee.com/']) {
    assert.equal(detect(url), null, url);
  }
});
