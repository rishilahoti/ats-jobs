const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, PROVIDERS } = require('..');

const FIELDS = ['jobId', 'title', 'location', 'team', 'department', 'employmentType', 'remote',
  'description', 'applyUrl', 'jobUrl', 'publishedAt', 'compensationSummary', 'contentHash'];

const FIXTURES = {
  ashby: [{ jobUrl: 'https://jobs.ashbyhq.com/acme/abc-123', title: 'Engineer', isListed: true }],
  lever: [{ id: 'lev-1', text: 'Designer' }],
  greenhouse: [{ id: 99, title: 'Support', location: { name: 'Remote' } }],
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

test('an unparseable source date falls back to scrape time instead of throwing', () => {
  const [job] = normalize('lever', [{ id: '1', text: 'x', createdAt: 'not-a-date' }]);
  assert.ok(!Number.isNaN(Date.parse(job.publishedAt)));
});
