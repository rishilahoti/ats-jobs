const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchBoard } = require('..');

test('slugs that become hostnames cannot redirect the request to another host', async () => {
  const original = global.fetch;
  global.fetch = () => assert.fail('fetch must not be called');
  try {
    await assert.rejects(fetchBoard('recruitee', 'evil.com/x?'), /Malformed recruitee slug/);
    await assert.rejects(fetchBoard('keka', 'evil.com#'), /Malformed keka slug/);
    await assert.rejects(fetchBoard('workday', 'evil.com#/wd5/site'), /Malformed workday slug/);
  } finally {
    global.fetch = original;
  }
});

test('dotted hostname slugs like Teamtailor NA boards are still allowed', async () => {
  const original = global.fetch;
  let url;
  global.fetch = async (u) => { url = u; return new Response('{"items":[]}'); };
  try {
    assert.deepEqual(await fetchBoard('teamtailor', 'acme.na'), { jobs: [] });
    assert.equal(url, 'https://acme.na.teamtailor.com/jobs.json');
  } finally {
    global.fetch = original;
  }
});
