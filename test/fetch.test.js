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
