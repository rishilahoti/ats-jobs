const crypto = require('node:crypto');

function contentHash(...fields) {
  const payload = fields.map(f => (f ?? '')).join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { contentHash };
