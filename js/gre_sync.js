/* ============================================================
   GRE Verbal — Server Sync & Attempt Review
   - Syncs test history to the Vercel API (/api/attempts)
   - Opens a past attempt in the explanation UI via ?review=<id>
   Works without a server: local history keeps working offline.
   ============================================================ */
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;

  const CFG_KEY = 'gre_sync_config_v1';
  const PENDING_KEY = 'gre_sync_pending_v1';
  const LAST_SYNC_KEY = 'gre_sync_last_v1';
  const HTML_FILE_RE = /^Verbal_Mock_[A-Za-z0-9]{1,12}\.html$/;
  const TIMEOUT_MS = 12000;

  // Public default API host (not a secret — just where the backend lives), so the "API 주소"
  // field can stay blank even when this page is served from a different origin (e.g. GitHub Pages).
  const DEFAULT_BASE = 'https://gre-verbal-mock.vercel.app';
  const BOOTSTRAP_HASH_KEY = 'gresync';

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('GRESync: storage write failed', e);
    }
  }

  function stripMarkup(value) {
    return String(value == null ? '' : value).replace(/[<>&"'`]/g, '');
  }

  function normalizeRecord(rec) {
    const round = String(rec.round || '').replace(/[^0-9]/g, '');
    const htmlFile = HTML_FILE_RE.test(rec.htmlFile || '') ? rec.htmlFile : '';
    const out = {
      id: stripMarkup(rec.id),
      timestamp: Number(rec.timestamp) || 0,
      dateString: stripMarkup(rec.dateString),
      round: round,
      roundTitle: stripMarkup(rec.roundTitle),
      scoreScaled: Number(rec.scoreScaled) || 130,
      scoreRaw: Number(rec.scoreRaw) || 0,
      totalQuestions: Number(rec.totalQuestions) || 27,
      accuracy: Number(rec.accuracy) || 0,
      sections: Array.isArray(rec.sections)
        ? rec.sections.map((s) => ({ num: Number(s.num || s.sectionNum) || 0, correct: Number(s.correct) || 0, total: Number(s.total) || 0 }))
        : [],
      typeBreakdown: rec.typeBreakdown && typeof rec.typeBreakdown === 'object' ? rec.typeBreakdown : {},
      htmlFile: htmlFile,
      hasAnswers: !!rec.hasAnswers || !!(rec.answers && Object.keys(rec.answers).length)
    };
    if (rec.answers && typeof rec.answers === 'object') out.answers = rec.answers;
    return out;
  }

  const GRESync = {
    // ── Configuration ──
    // Nothing is ever baked into this file — it's public source served to anyone. The token lives
    // only in localStorage, set either by hand in the settings panel, or once via a personal
    // "#gresync=..." bootstrap link (see applyBootstrap below), which never touches the network
    // (URL fragments aren't sent to servers) and is scrubbed from the address bar immediately.
    isUsingDefault: function () {
      return readJson(CFG_KEY, null) === null;
    },

    getConfig: function () {
      const saved = readJson(CFG_KEY, null);
      if (saved === null || saved.disabled) return { base: '', token: '' };
      // An empty base is a valid, explicit choice meaning "same origin as this page" — it must
      // NOT be coerced to DEFAULT_BASE here. Bootstrap links always embed a concrete base, so this
      // only affects someone who deliberately left the settings-panel API address blank.
      const base = typeof saved.base === 'string' ? saved.base : '';
      return { base: base.replace(/\/+$/, ''), token: typeof saved.token === 'string' ? saved.token : '' };
    },

    setConfig: function (base, token) {
      writeJson(CFG_KEY, { base: String(base || '').trim().replace(/\/+$/, ''), token: String(token || '').trim() });
    },

    // Decodes a one-time "#gresync=<base64url({t,b})>" link into this browser's localStorage,
    // then removes it from the address bar so the token doesn't linger in history/bookmarks.
    applyBootstrap: function () {
      const hash = String(location.hash || '');
      const m = hash.match(new RegExp('#' + BOOTSTRAP_HASH_KEY + '=([^&]+)'));
      if (!m) return false;
      try {
        const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(b64)));
        const data = JSON.parse(json);
        if (!data || typeof data.t !== 'string' || !data.t) throw new Error('malformed bootstrap payload');
        this.setConfig(typeof data.b === 'string' && data.b ? data.b : DEFAULT_BASE, data.t);
      } catch (e) {
        console.error('GRESync: invalid bootstrap link', e);
      } finally {
        history.replaceState(null, '', location.pathname + location.search);
      }
      return true;
    },

    disableSync: function () {
      writeJson(CFG_KEY, { disabled: true });
      try {
        localStorage.removeItem(PENDING_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
      } catch (e) { /* ignore */ }
    },

    clearConfig: function () {
      try {
        localStorage.removeItem(CFG_KEY);
        localStorage.removeItem(PENDING_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
      } catch (e) { /* ignore */ }
    },

    isConfigured: function () {
      return !!this.getConfig().token;
    },

    getLastSync: function () {
      return readJson(LAST_SYNC_KEY, null);
    },

    getPendingCount: function () {
      return readJson(PENDING_KEY, []).length;
    },

    // ── HTTP ──
    request: async function (method, path, body) {
      const cfg = this.getConfig();
      if (!cfg.token) throw new Error('서버 액세스 토큰이 설정되지 않았습니다.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(cfg.base + path, {
          method: method,
          headers: Object.assign({ Authorization: 'Bearer ' + cfg.token }, body ? { 'Content-Type': 'application/json' } : {}),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* non-JSON error page */ }
        if (!res.ok) {
          throw new Error((data && data.error) || ('서버 응답 오류 (' + res.status + ')'));
        }
        return data;
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('서버 응답 시간이 초과되었습니다.');
        throw e;
      } finally {
        clearTimeout(timer);
      }
    },

    testConnection: async function () {
      const data = await this.request('GET', '/api/attempts');
      return Array.isArray(data.attempts) ? data.attempts.length : 0;
    },

    // ── Push ──
    addPending: function (id) {
      const list = readJson(PENDING_KEY, []);
      if (!list.includes(id)) list.push(id);
      writeJson(PENDING_KEY, list);
    },

    removePending: function (ids) {
      const drop = new Set(ids);
      writeJson(PENDING_KEY, readJson(PENDING_KEY, []).filter((id) => !drop.has(id)));
    },

    pushAttempt: async function (record) {
      if (!this.isConfigured() || !record) return false;
      try {
        await this.request('POST', '/api/attempts', { attempt: record });
        this.removePending([record.id]);
        writeJson(LAST_SYNC_KEY, Date.now());
        return true;
      } catch (e) {
        console.warn('GRESync: push failed, will retry later', e);
        this.addPending(record.id);
        return false;
      }
    },

    pushMany: async function (records) {
      let saved = 0;
      for (let i = 0; i < records.length; i += 50) {
        const chunk = records.slice(i, i + 50);
        const data = await this.request('POST', '/api/attempts', { attempts: chunk });
        saved += data.saved.length;
        this.removePending(chunk.map((r) => r.id));
      }
      writeJson(LAST_SYNC_KEY, Date.now());
      return saved;
    },

    uploadAllLocal: async function () {
      const local = root.GREHistoryManager.getAllAttempts();
      if (local.length === 0) return 0;
      return this.pushMany(local);
    },

    // ── Pull & merge ──
    pull: async function () {
      if (!this.isConfigured() || !root.GREHistoryManager) return null;
      const data = await this.request('GET', '/api/attempts');
      const remote = (data.attempts || []).map(normalizeRecord);
      const local = root.GREHistoryManager.getAllAttempts();
      const localById = new Map(local.map((r) => [r.id, r]));
      const remoteIds = new Set(remote.map((r) => r.id));

      const merged = remote.map((r) => {
        const l = localById.get(r.id);
        return l && l.answers ? Object.assign({}, r, { answers: l.answers, hasAnswers: true }) : r;
      });
      // Keep local-only attempts (not yet uploaded) so nothing is lost offline
      const localOnly = local.filter((r) => !remoteIds.has(r.id));
      const pending = readJson(PENDING_KEY, []);
      const all = merged.concat(localOnly).sort((a, b) => b.timestamp - a.timestamp);
      root.GREHistoryManager.replaceAll(all);

      const toRetry = localOnly.filter((r) => pending.includes(r.id));
      if (toRetry.length) {
        try { await this.pushMany(toRetry); } catch (e) { console.warn('GRESync: retry failed', e); }
      }
      writeJson(LAST_SYNC_KEY, Date.now());
      return all.length;
    },

    // ── Delete hooks (called by GREHistoryManager) ──
    onDelete: function (id) {
      if (!this.isConfigured()) return;
      this.removePending([id]);
      this.request('DELETE', '/api/attempts/' + encodeURIComponent(id)).catch((e) => {
        if (!/찾을 수 없습니다/.test(e.message)) console.warn('GRESync: remote delete failed', e);
      });
    },

    onClear: function () {
      if (!this.isConfigured()) return;
      writeJson(PENDING_KEY, []);
      this.request('DELETE', '/api/attempts?confirm=all').catch((e) => console.warn('GRESync: remote clear failed', e));
    },

    // ── Detail lookup (local first, then server) ──
    getAttemptDetail: async function (id) {
      const local = root.GREHistoryManager ? root.GREHistoryManager.getAllAttempts().find((r) => r.id === id) : null;
      if (local && local.answers) return local;
      if (!this.isConfigured()) return local && local.answers ? local : null;
      const data = await this.request('GET', '/api/attempts/' + encodeURIComponent(id));
      return data.attempt ? normalizeRecord(data.attempt) : null;
    },

    // ── Review mode (?review=<id>) ──
    gradeQuestion: function (q, ans) {
      if (!Array.isArray(ans) || ans.length === 0 || ans.some((v) => v === '' || v == null)) return false;
      const key = q.answer || [];
      if (ans.length !== key.length) return false;
      if (q.type === 'TC' && q.blanks && q.blanks.length > 1) return ans.every((v, i) => v === key[i]);
      const a = ans.slice().sort();
      const k = key.slice().sort();
      return a.every((v, i) => v === k[i]);
    },

    initReview: async function () {
      const params = new URLSearchParams(location.search);
      const id = params.get('review');
      if (!id || typeof examData === 'undefined' || !root.ExplanationEngine) return;

      const app = document.getElementById('app');
      if (!app) return;
      const self = this;

      // This DOMContentLoaded listener is registered before the exam page's own, so it runs
      // first — but the exam page also calls its own render() on DOMContentLoaded (and,
      // depending on the browser/extensions, possibly again later). That call is a plain
      // function reference on window, so disabling it here permanently stops the exam engine
      // from ever repainting #app back over the results view for the rest of this page's life.
      if (typeof root.render === 'function') root.render = function () {};
      if (typeof root.stopTimer === 'function') { try { root.stopTimer(); } catch (e) { /* ignore */ } }

      function showMessage(message) {
        app.innerHTML = '<main style="max-width:640px;margin:80px auto;padding:0 20px;text-align:center;font-family:-apple-system,sans-serif;">'
          + '<h2 style="margin-bottom:12px;">지난 응시 기록을 열 수 없습니다</h2>'
          + '<p style="color:#555;margin-bottom:24px;">' + stripMarkup(message) + '</p>'
          + '<a href="index.html#history-dashboard" style="color:#1f3a5f;font-weight:600;">← 성적 리포트로 돌아가기</a></main>';
      }

      showMessage('기록을 불러오는 중입니다…');
      let attempt = null;
      try {
        attempt = await self.getAttemptDetail(id);
      } catch (e) {
        showMessage('서버에서 기록을 가져오지 못했습니다: ' + e.message);
        return;
      }
      if (!attempt || !attempt.answers) {
        showMessage('이 응시 기록에는 문항별 답안이 저장되어 있지 않아 해설을 다시 볼 수 없습니다. (답안 저장 기능 추가 이전 기록)');
        return;
      }

      const answers = attempt.answers;
      const questionsById = {};
      examData.sections.forEach((s) => s.questions.forEach((q) => { questionsById[q.id] = q; }));
      const isAnsweredFn = (qid) => {
        const a = answers[qid];
        return Array.isArray(a) && a.length > 0 && !a.some((v) => v === '' || v == null);
      };
      const isCorrectFn = (q) => self.gradeQuestion(q, answers[q.id]);

      root.ExplanationEngine.hasSavedHistory = true;
      root.ExplanationEngine.lastHistoryResult = null;
      root.ExplanationEngine.activeViewerQId = null;
      root.ExplanationEngine.renderResultsUI(
        app, examData, { answers: answers }, isCorrectFn, isAnsweredFn,
        typeof TYPE_LABELS !== 'undefined' ? TYPE_LABELS : null
      );

      const banner = document.createElement('div');
      banner.style.cssText = 'position:sticky;top:0;z-index:50;background:#1f3a5f;color:#fff;padding:10px 20px;font:14px -apple-system,sans-serif;display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;';
      banner.innerHTML = '<span>📂 지난 응시 기록 열람 중 · ' + stripMarkup(attempt.dateString) + ' · ' + Number(attempt.scoreScaled) + '점 (' + Number(attempt.scoreRaw) + '/' + Number(attempt.totalQuestions) + ')</span>'
        + '<span><a href="index.html#history-dashboard" style="color:#fff;font-weight:600;margin-right:16px;">← 성적 리포트</a>'
        + '<a href="' + location.pathname.split('/').pop() + '" style="color:#fff;font-weight:600;">이 회차 다시 풀기</a></span>';
      document.body.insertBefore(banner, document.body.firstChild);
    }
  };

  root.GRESync = GRESync;

  if (typeof document !== 'undefined') {
    // Runs immediately (not on DOMContentLoaded) so a bootstrap link takes effect before
    // this page's own exam/history code checks whether sync is configured.
    if (typeof location !== 'undefined') GRESync.applyBootstrap();
    document.addEventListener('DOMContentLoaded', function () {
      GRESync.initReview();
    });
  }
})();
