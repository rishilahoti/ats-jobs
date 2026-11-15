const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchBoard, FetchError, ADAPTERS } = require('..');

test('exposes a shallow-frozen adapter registry', () => {
  assert.equal(Object.isFrozen(ADAPTERS), true);
});

test('rejects unknown providers and malformed slugs before network access', async () => {
  let called = false;
  const original = global.fetch;
  global.fetch = async () => { called = true; throw new Error('unexpected'); };
  try {
    await assert.rejects(fetchBoard('bogus', 'acme'), FetchError);
    await assert.rejects(fetchBoard('recruitee', 'acme/path'), /Malformed recruitee slug/);
    await assert.rejects(fetchBoard('workday', 'tenant\/wd5'), /Malformed workday slug/);
    assert.equal(called, false);
  } finally {
    global.fetch = original;
  }
});

test('rejects invalid fetch limits before network access', async () => {
  await assert.rejects(fetchBoard('ashby', 'acme', { maxRetries: 0 }), /Invalid maxRetries/);
  await assert.rejects(fetchBoard('ashby', 'acme', { maxResponseBytes: 10 }), /Invalid maxResponseBytes/);
});

test('uses HTTPS allowlisted endpoints and refuses oversized bodies', async () => {
  const original = global.fetch;
  let requestUrl;
  let requestInit;
  let cancelled = false;
  global.fetch = async (url, init) => {
    requestUrl = url;
    requestInit = init;
    return {
      ok: true,
      status: 200,
      headers: { get: () => '100000' },
      body: {
        cancel: async () => {
          cancelled = true;
          throw new Error('cancel failed');
        },
      },
    };
  };
  try {
    await assert.rejects(
      fetchBoard('ashby', 'acme', { maxRetries: 1, maxResponseBytes: 1024 }),
      /Response exceeds 1024 bytes/
    );
    assert.equal(requestUrl.protocol, 'https:');
    assert.equal(requestUrl.hostname, 'api.ashbyhq.com');
    assert.equal(requestInit.redirect, 'error');
    assert.equal(cancelled, true);
  } finally {
    global.fetch = original;
  }
});

test('returns a validated response within the byte ceiling', async () => {
  const original = global.fetch;
  global.fetch = async () => new Response('{"jobs":[{"id":"1"}]}', { status: 200 });
  try {
    const result = await fetchBoard('ashby', 'acme', { maxRetries: 1, maxResponseBytes: 1024 });
    assert.deepEqual(result, { jobs: [{ id: '1' }] });
  } finally {
    global.fetch = original;
  }
});

test('rejects redirect responses without following them', async () => {
  const original = global.fetch;
  let calls = 0;
  let redirectMode;
  global.fetch = async (_url, init) => {
    calls += 1;
    redirectMode = init.redirect;
    return new Response(null, {
      status: 302,
      headers: { location: 'https://example.com/escaped' },
    });
  };
  try {
    await assert.rejects(
      fetchBoard('ashby', 'acme', { maxRetries: 1 }),
      /HTTP 302/
    );
    assert.equal(redirectMode, 'error');
    assert.equal(calls, 1);
  } finally {
    global.fetch = original;
  }
});

test('times out a stalled request', async () => {
  const original = global.fetch;
  global.fetch = async () => new Promise(() => {});
  try {
    await assert.rejects(
      fetchBoard('ashby', 'acme', { timeoutMs: 5, maxRetries: 1 }),
      /timed out after 5ms/
    );
  } finally {
    global.fetch = original;
  }
});

test('rejects a chunked response over the byte ceiling without Content-Length', async () => {
  const original = global.fetch;
  global.fetch = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(600));
      controller.enqueue(new Uint8Array(600));
      controller.close();
    },
  }), { status: 200 });
  try {
    await assert.rejects(
      fetchBoard('ashby', 'acme', { maxRetries: 1, maxResponseBytes: 1024 }),
      /Response exceeds 1024 bytes/
    );
  } finally {
    global.fetch = original;
  }
});
