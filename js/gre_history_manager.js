/* ============================================================
   GRE Verbal Test — History & Score Trends Manager
   Stores test attempts in localStorage, computes statistics,
   and renders interactive SVG score trajectory charts.
   ============================================================ */

(function() {
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  const STORAGE_KEY = 'gre_test_history_v1';

  const GREHistoryManager = {
    // ── LocalStorage I/O ──
    getAllAttempts: function() {
      if (typeof localStorage === 'undefined') return [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse GRE test history:', e);
        return [];
      }
    },

    saveAttempt: function(record) {
      if (typeof localStorage === 'undefined') return null;
      try {
        const list = this.getAllAttempts();
        
        // Find previous attempt on same round to compute delta
        const prevOnSameRound = list.find(item => String(item.round) === String(record.round));
        const prevScore = prevOnSameRound ? prevOnSameRound.scoreScaled : null;
        const delta = prevScore !== null ? (record.scoreScaled - prevScore) : null;

        // Check if this is the all-time best score
        const allTimeBest = list.reduce((max, r) => Math.max(max, r.scoreScaled || 0), 0);
        const isBestScore = record.scoreScaled > allTimeBest;

        const newRecord = {
          id: record.id || ('rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          timestamp: record.timestamp || Date.now(),
          dateString: record.dateString || new Date().toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
          }),
          round: String(record.round || '').replace(/[^0-9]/g, ''),
          roundTitle: record.roundTitle || (record.round ? (record.round + '회 모의고사') : 'GRE Verbal Mock'),
          scoreScaled: Number(record.scoreScaled) || 130,
          scoreRaw: Number(record.scoreRaw) || 0,
          totalQuestions: Number(record.totalQuestions) || 27,
          accuracy: Number(record.accuracy) || Math.round(((record.scoreRaw || 0) / (record.totalQuestions || 27)) * 100),
          sections: record.sections || [],
          typeBreakdown: record.typeBreakdown || {},
          htmlFile: record.htmlFile || (typeof location !== 'undefined' ? location.pathname.split('/').pop() : '')
        };

        // Add to beginning of array (newest first)
        list.unshift(newRecord);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

        return {
          record: newRecord,
          prevScore: prevScore,
          delta: delta,
          isBestScore: isBestScore
        };
      } catch (e) {
        console.error('Failed to save GRE attempt:', e);
        return null;
      }
    },

    deleteAttempt: function(id) {
      if (typeof localStorage === 'undefined') return;
      try {
        let list = this.getAllAttempts();
        list = list.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to delete attempt:', e);
      }
    },

    clearAll: function() {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear history:', e);
      }
    },

    exportData: function() {
      const data = this.getAllAttempts();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gre_verbal_test_history_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    importData: function(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) throw new Error('Data must be an array');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return true;
      } catch (e) {
        alert('데이터 형식이 올바르지 않습니다: ' + e.message);
        return false;
      }
    },

    // ── Summary & Statistics ──
    getSummaryStats: function() {
      const list = this.getAllAttempts();
      if (list.length === 0) {
        return {
          totalAttempts: 0,
          latestScore: null,
          highestScore: null,
          averageScore: null,
          avgAccuracy: null,
          typeStats: {
            TC: { correct: 0, total: 0, pct: 0 },
            SE: { correct: 0, total: 0, pct: 0 },
            RC: { correct: 0, total: 0, pct: 0 },
            CR: { correct: 0, total: 0, pct: 0 }
          }
        };
      }

      const totalAttempts = list.length;
      const latestScore = list[0].scoreScaled;
      let highestScore = 130;
      let sumScore = 0;
      let sumAccuracy = 0;

      const typeAgg = {
        TC: { correct: 0, total: 0 },
        SE: { correct: 0, total: 0 },
        RC: { correct: 0, total: 0 },
        CR: { correct: 0, total: 0 }
      };

      list.forEach(item => {
        if (item.scoreScaled > highestScore) highestScore = item.scoreScaled;
        sumScore += item.scoreScaled;
        sumAccuracy += (item.accuracy || 0);

        if (item.typeBreakdown) {
          ['TC', 'SE', 'RC', 'CR'].forEach(t => {
            if (item.typeBreakdown[t]) {
              typeAgg[t].correct += (item.typeBreakdown[t].correct || 0);
              typeAgg[t].total += (item.typeBreakdown[t].total || 0);
            }
          });
        }
      });

      const typeStats = {};
      ['TC', 'SE', 'RC', 'CR'].forEach(t => {
        const tot = typeAgg[t].total;
        const corr = typeAgg[t].correct;
        typeStats[t] = {
          correct: corr,
          total: tot,
          pct: tot > 0 ? Math.round((corr / tot) * 100) : 0
        };
      });

      return {
        totalAttempts: totalAttempts,
        latestScore: latestScore,
        highestScore: highestScore,
        averageScore: (sumScore / totalAttempts).toFixed(1),
        avgAccuracy: Math.round(sumAccuracy / totalAttempts),
        typeStats: typeStats
      };
    },

    getRoundStats: function(roundNum) {
      const cleanRound = String(roundNum).replace(/[^0-9]/g, '');
      const list = this.getAllAttempts().filter(item => String(item.round) === cleanRound);
      if (list.length === 0) return null;

      let best = 130;
      list.forEach(r => { if (r.scoreScaled > best) best = r.scoreScaled; });
      return {
        count: list.length,
        bestScore: best,
        latestScore: list[0].scoreScaled,
        latestDate: list[0].dateString
      };
    },

    // ── Pure SVG Score Trend Chart Renderer ──
    renderScoreTrendChart: function(containerEl) {
      if (!containerEl) return;
      const list = this.getAllAttempts().slice().reverse(); // Chronological: oldest to newest

      if (list.length === 0) {
        containerEl.innerHTML = `
          <div class="chart-empty-state">
            <div class="empty-icon">📈</div>
            <div class="empty-title">아직 응시 기록이 없습니다</div>
            <div class="empty-desc">모의고사를 풀고 제출하면 나의 GRE 성적 변화 추이가 여기에 실시간으로 기록됩니다.</div>
          </div>
        `;
        return;
      }

      const W = 800;
      const H = 240;
      const padL = 50;
      const padR = 40;
      const padT = 30;
      const padB = 40;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      const minScore = 130;
      const maxScore = 170;

      const getX = (idx, total) => {
        if (total <= 1) return padL + chartW / 2;
        return padL + (idx / (total - 1)) * chartW;
      };

      const getY = (score) => {
        const clamped = Math.max(minScore, Math.min(maxScore, score));
        return padT + chartH - ((clamped - minScore) / (maxScore - minScore)) * chartH;
      };

      // Reference line Ys
      const y160 = getY(160);
      const y150 = getY(150);

      // Points
      const points = list.map((item, idx) => ({
        x: getX(idx, list.length),
        y: getY(item.scoreScaled),
        item: item
      }));

      // Path data
      let pathD = '';
      if (points.length === 1) {
        pathD = '';
      } else {
        pathD = 'M ' + points.map(p => `${p.x} ${p.y}`).join(' L ');
      }

      // Area fill path
      let areaD = '';
      if (points.length > 1) {
        const firstX = points[0].x;
        const lastX = points[points.length - 1].x;
        const bottomY = padT + chartH;
        areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
      }

      const svg = `
        <svg viewBox="0 0 ${W} ${H}" class="gre-trend-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="scoreAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0284c7" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
            </linearGradient>
            <filter id="pointShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.2"/>
            </filter>
          </defs>

          <!-- Y Gridlines & Labels -->
          <g class="grid-lines" stroke="#e2e8f0" stroke-width="1">
            <line x1="${padL}" y1="${getY(170)}" x2="${W - padR}" y2="${getY(170)}"/>
            <line x1="${padL}" y1="${getY(160)}" x2="${W - padR}" y2="${getY(160)}" stroke="#10b981" stroke-dasharray="4 4" stroke-opacity="0.7"/>
            <line x1="${padL}" y1="${getY(150)}" x2="${W - padR}" y2="${getY(150)}" stroke="#0284c7" stroke-dasharray="4 4" stroke-opacity="0.7"/>
            <line x1="${padL}" y1="${getY(140)}" x2="${W - padR}" y2="${getY(140)}"/>
            <line x1="${padL}" y1="${getY(130)}" x2="${W - padR}" y2="${getY(130)}" stroke="#94a3b8"/>
          </g>

          <!-- Y Axis Labels -->
          <g class="axis-labels" fill="#64748b" font-size="11" font-weight="600" text-anchor="end">
            <text x="${padL - 10}" y="${getY(170) + 4}">170</text>
            <text x="${padL - 10}" y="${getY(160) + 4}" fill="#10b981">160</text>
            <text x="${padL - 10}" y="${getY(150) + 4}" fill="#0284c7">150</text>
            <text x="${padL - 10}" y="${getY(140) + 4}">140</text>
            <text x="${padL - 10}" y="${getY(130) + 4}">130</text>
          </g>

          <!-- Reference Benchmark Labels -->
          <g font-size="10.5" font-weight="600">
            <text x="${W - padR - 5}" y="${y160 - 6}" fill="#10b981" text-anchor="end">🎯 목표 160점</text>
            <text x="${W - padR - 5}" y="${y150 - 6}" fill="#0284c7" text-anchor="end">📊 평균 150점</text>
          </g>

          <!-- Area Gradient -->
          ${areaD ? `<path d="${areaD}" fill="url(#scoreAreaGrad)"/>` : ''}

          <!-- Trend Line -->
          ${pathD ? `<path d="${pathD}" fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}

          <!-- Points and Tooltips -->
          ${points.map((p, i) => `
            <g class="chart-point-group" data-idx="${i}" style="cursor: pointer;">
              <!-- Score label above point -->
              <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">
                ${p.item.scoreScaled}점
              </text>
              <!-- Outer circle -->
              <circle cx="${p.x}" cy="${p.y}" r="6" fill="#ffffff" stroke="#0284c7" stroke-width="3" filter="url(#pointShadow)"/>
              <!-- X label below -->
              <text x="${p.x}" y="${padT + chartH + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#475569">
                ${p.item.round ? (p.item.round + '회') : ('#' + (i + 1))}
              </text>
              <text x="${p.x}" y="${padT + chartH + 32}" text-anchor="middle" font-size="9.5" fill="#94a3b8">
                ${(p.item.dateString || '').slice(5, 10)}
              </text>
            </g>
          `).join('')}
        </svg>
      `;

      containerEl.innerHTML = svg;
    }
  };

  root.GREHistoryManager = GREHistoryManager;
})();
