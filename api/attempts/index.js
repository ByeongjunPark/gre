const { wrap, send, httpError } = require('../_lib/http');
const { createStore } = require('../_lib/store');
const { sanitizeAttempt, toSummary } = require('../_lib/validate');

const MAX_BULK = 200;

module.exports = wrap(['GET', 'POST', 'DELETE'], async (req, res) => {
  const store = createStore();

  if (req.method === 'GET') {
    const list = await store.list();
    return send(res, 200, { attempts: list.map(toSummary) });
  }

  if (req.method === 'POST') {
    const body = req.body;
    const incoming = body && Array.isArray(body.attempts) ? body.attempts : [body && body.attempt ? body.attempt : body];
    if (incoming.length === 0 || incoming.length > MAX_BULK) throw httpError(400, `한 번에 1~${MAX_BULK}건까지 저장할 수 있습니다.`);
    const records = incoming.map(sanitizeAttempt);
    for (const record of records) await store.put(record);
    return send(res, 200, { saved: records.map((r) => r.id) });
  }

  if (req.query && req.query.confirm === 'all') {
    const deleted = await store.clear();
    return send(res, 200, { deleted });
  }
  throw httpError(400, '전체 삭제는 ?confirm=all 이 필요합니다.');
});
