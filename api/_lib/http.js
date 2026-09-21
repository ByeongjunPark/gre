const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function tokenMatches(provided) {
  const expected = process.env.ACCESS_TOKEN;
  if (!expected) return null;
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}

function setCors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && allowed.split(',').map((s) => s.trim()).includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function wrap(methods, handler) {
  return async function (req, res) {
    try {
      setCors(req, res);
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
      }
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        return send(res, 405, { error: '허용되지 않는 메서드입니다.' });
      }

      const match = tokenMatches(bearer(req));
      if (match === null) {
        return send(res, 500, { error: '서버에 ACCESS_TOKEN 환경변수가 설정되지 않았습니다.' });
      }
      if (!match) return send(res, 401, { error: '액세스 토큰이 올바르지 않습니다.' });

      await handler(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      send(res, status, { error: status >= 500 && !err.expose ? '서버 오류가 발생했습니다.' : err.message });
    }
  };
}

function bearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

module.exports = { wrap, send, httpError };
