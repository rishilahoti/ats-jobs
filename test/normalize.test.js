const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, PROVIDERS, ADAPTERS } = require('..');

const FIELDS = ['jobId', 'title', 'location', 'team', 'department', 'employmentType', 'remote',
  'description', 'applyUrl', 'jobUrl', 'publishedAt', 'compensationSummary', 'contentHash'];

const FIXTURES = {
  ashby: [{ jobUrl: 'https://jobs.ashbyhq.com/acme/abc-123', title: 'Engineer', isListed: true }],
  lever: [{ id: 'lev-1', text: 'Designer' }],
  greenhouse: [{ id: 99, title: 'Support', location: { name: 'Remote' } }],
  workable: [{ shortcode: 'work-1', title: 'Writer', state: 'published' }],
  recruitee: [{ id: 12, title: 'Analyst', status: 'published' }],
  teamtailor: [{ id: 'tt-1', title: 'Operator', url: 'https://example.com/job' }],
  pinpoint: [{ id: 'pin-1', title: 'Manager', url: 'https://example.com/job' }],
  smartrecruiters: [{ id: 'sr-1', name: 'Recruiter', visibility: 'PUBLIC' }],
  workday: [{ externalPath: '/job/Engineer_JR1', title: 'Engineer', _boardUrl: 'https://acme.wd5.myworkdayjobs.com/site' }],
  keka: [{ id: 'keka-1', title: 'Developer', _boardUrl: 'https://acme.keka.com/careers/' }],
};

for (const [provider, raw] of Object.entries(FIXTURES)) {
  test(`${provider}: array and { jobs } input give the same full job shape`, () => {
    const a = normalize(provider, raw, 'Acme');
    const b = normalize(provider, { jobs: raw }, 'Acme');
    assert.equal(a.length, 1);
    for (const f of FIELDS) assert.ok(f in a[0], `missing "${f}"`);
    assert.deepEqual(a.map(j => j.jobId), b.map(j => j.jobId));
  });
}

test('lists all ten providers', () => assert.equal(PROVIDERS.length, 10));
test('exports the canonical adapter registry', () => assert.deepEqual(Object.keys(ADAPTERS), PROVIDERS));
test('unknown provider throws', () => assert.throws(() => normalize('bogus', []), /Unknown provider/));
test('non-array input throws', () => assert.throws(() => normalize('lever', {}), /Expected an array/));

test('javascript: URLs are stripped', () => {
  const [job] = normalize('lever', [{ id: '1', text: 'x', hostedUrl: 'javascript:alert(1)' }]);
  assert.equal(job.jobUrl, '');
});

test('location works without cities.json installed', () => {
  const [job] = normalize('lever', [{ id: '1', text: 'x', categories: { location: 'Bangalore, India' } }]);
  assert.equal(job.location, 'Bengaluru');
});

test('missing or invalid source dates remain null', () => {
  for (const [provider, raw] of Object.entries(FIXTURES)) {
    const [job] = normalize(provider, raw, 'Acme');
    assert.equal(job.publishedAt, null, provider);
  }
  const [job] = normalize('lever', [{ id: '1', text: 'x', createdAt: 'not-a-date' }]);
  assert.equal(job.publishedAt, null);
});

test('content hashes are deterministic SHA-256 values', () => {
  const raw = [{ id: '1', text: 'x' }];
  const [first] = normalize('lever', raw);
  const [second] = normalize('lever', raw);
  assert.match(first.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(first.contentHash, second.contentHash);
});
