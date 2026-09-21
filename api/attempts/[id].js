const { wrap, send, httpError } = require('../_lib/http');
const { createStore } = require('../_lib/store');
const { ID_RE } = require('../_lib/validate');

module.exports = wrap(['GET', 'DELETE'], async (req, res) => {
  const id = req.query && req.query.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) throw httpError(400, 'id 형식이 올바르지 않습니다.');

  const store = createStore();

  if (req.method === 'GET') {
    const record = await store.get(id);
    if (!record) throw httpError(404, '기록을 찾을 수 없습니다.');
    return send(res, 200, { attempt: record });
  }

  const removed = await store.del(id);
  if (!removed) throw httpError(404, '기록을 찾을 수 없습니다.');
  return send(res, 200, { deleted: id });
});
