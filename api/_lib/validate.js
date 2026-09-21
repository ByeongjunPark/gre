const crypto = require('crypto');
const { httpError } = require('./http');

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const HTML_FILE_RE = /^Verbal_Mock_[A-Za-z0-9]{1,12}\.html$/;
const QID_RE = /^S\d{1,2}-Q\d{1,2}$/;
const TYPE_KEYS = ['TC', 'SE', 'RC', 'CR'];

function int(value, min, max, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw httpError(400, `${label} 값이 올바르지 않습니다.`);
  return Math.round(n);
}

function text(value, max, label) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw httpError(400, `${label} 값이 올바르지 않습니다.`);
  return value;
}

function sanitizeAnswers(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, 'answers 형식이 올바르지 않습니다.');
  const keys = Object.keys(raw);
  if (keys.length > 60) throw httpError(400, 'answers 항목이 너무 많습니다.');
  const out = {};
  for (const key of keys) {
    if (!QID_RE.test(key)) throw httpError(400, `answers 키가 올바르지 않습니다: ${key}`);
    const value = raw[key];
    if (!Array.isArray(value) || value.length > 10) throw httpError(400, `answers[${key}] 형식이 올바르지 않습니다.`);
    out[key] = value.map((v) => {
      if (v === null || v === undefined) return '';
      if (typeof v !== 'string' || v.length > 1000) throw httpError(400, `answers[${key}] 값이 올바르지 않습니다.`);
      return v;
    });
  }
  return out;
}

function sanitizeAttempt(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, '기록 형식이 올바르지 않습니다.');

  const id = raw.id === undefined || raw.id === null || raw.id === ''
    ? 'rec_' + crypto.randomBytes(8).toString('hex')
    : raw.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) throw httpError(400, 'id 형식이 올바르지 않습니다.');

  const htmlFile = text(raw.htmlFile, 60, 'htmlFile');
  if (htmlFile && !HTML_FILE_RE.test(htmlFile)) throw httpError(400, 'htmlFile 값이 올바르지 않습니다.');

  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  if (sections.length > 4) throw httpError(400, 'sections 항목이 너무 많습니다.');

  const typeBreakdown = {};
  const rawBreakdown = raw.typeBreakdown && typeof raw.typeBreakdown === 'object' ? raw.typeBreakdown : {};
  for (const key of TYPE_KEYS) {
    const item = rawBreakdown[key] || {};
    typeBreakdown[key] = { correct: int(item.correct || 0, 0, 60, 'typeBreakdown'), total: int(item.total || 0, 0, 60, 'typeBreakdown') };
  }

  const record = {
    id,
    timestamp: int(raw.timestamp === undefined ? Date.now() : raw.timestamp, 0, 8.64e15, 'timestamp'),
    dateString: text(raw.dateString, 40, 'dateString'),
    round: text(String(raw.round === undefined ? '' : raw.round).replace(/[^0-9]/g, ''), 4, 'round'),
    roundTitle: text(raw.roundTitle, 80, 'roundTitle'),
    scoreScaled: int(raw.scoreScaled, 130, 170, 'scoreScaled'),
    scoreRaw: int(raw.scoreRaw, 0, 60, 'scoreRaw'),
    totalQuestions: int(raw.totalQuestions, 1, 60, 'totalQuestions'),
    accuracy: int(raw.accuracy, 0, 100, 'accuracy'),
    sections: sections.map((s) => ({
      num: int(s && (s.num !== undefined ? s.num : s.sectionNum), 1, 4, 'sections.num'),
      correct: int(s && s.correct, 0, 60, 'sections.correct'),
      total: int(s && s.total, 0, 60, 'sections.total'),
    })),
    typeBreakdown,
    htmlFile,
  };

  const answers = sanitizeAnswers(raw.answers);
  if (answers) record.answers = answers;
  return record;
}

function toSummary(record) {
  const { answers, ...rest } = record;
  return { ...rest, hasAnswers: !!answers && Object.keys(answers).length > 0 };
}

module.exports = { sanitizeAttempt, toSummary, ID_RE };
