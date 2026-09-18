/* ============================================================
   ETS Official GRE Computer-Delivered Test (PowerPrep) Controller
   ============================================================ */

(function() {
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const controller = {
    selectedReviewQIdx: null,
    isTimeHidden: false,

    init: function() {
      // Set body class
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('ets-exam-mode');
      }
      if (typeof state !== 'undefined' && !state.marked) state.marked = {};
    },

    formatTime: function(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    getDirectionsText: function(q) {
      if (q.directions) return q.directions;
      switch(q.type) {
        case 'TC':
          if (q.blanks && q.blanks.length > 1) {
            return "For each blank select one entry from the corresponding column of choices. Fill all blanks in the way that best completes the text.";
          }
          return "Select one entry for the blank from the column of choices. Fill the blank in the way that best completes the text.";
        case 'SE':
          return "Select the <strong>two answer choices</strong> that, when used to complete the sentence, fit the meaning of the sentence as a whole and produce completed sentences that are alike in meaning.";
        case 'RC_SINGLE':
          return "Select one answer choice.";
        case 'RC_MULTI':
          return "Consider each of the choices separately and <strong>select all that apply</strong>.";
        case 'RC_SELECT':
          return "Click on the sentence in the passage that fits the question description.";
        case 'CR':
          return "Select one answer choice that best answers the question based on the passage above.";
        default:
          return "Select the best answer choice.";
      }
    },

    renderStartScreen: function(app, examData, onStart) {
      document.title = `GRE® Verbal Reasoning Practice Test — ${examData.round || ''}`;
      app.innerHTML = `
        <div class="ets-top-header">
          <div class="ets-header-info-bar">
            <div class="ets-header-title">
              <span class="brand-gre">ETS GRE®</span>
              <span>Verbal Reasoning Practice Test</span>
            </div>
            <div>${examData.round || 'Official Format'}</div>
          </div>
        </div>

        <div class="ets-exam-viewport" style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 120px);">
          <div class="ets-question-paper" style="max-width: 680px; width: 100%; text-align: center; padding: 48px 40px;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px;">
              Computer-Delivered Testing Practice
            </div>
            <h1 style="font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.02em;">
              GRE® Verbal Reasoning Practice Test
            </h1>
            <p style="font-size: 16px; color: #475569; margin-bottom: 32px; line-height: 1.6;">
              실제 ETS 컴퓨터 시험(PowerPrep)과 100% 동일한 인터페이스 환경에서 2개 섹션 모의고사를 응시합니다.
            </p>

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px 24px; text-align: left; margin-bottom: 36px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14.5px;">
                <span style="color: #64748b; font-weight: 600;">구성</span>
                <span style="font-weight: 700; color: #0f172a;">Section 1 (12문항) + Section 2 (15문항)</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14.5px;">
                <span style="color: #64748b; font-weight: 600;">시험 시간</span>
                <span style="font-weight: 700; color: #0f172a;">총 41분 (섹션 1: 18분 · 섹션 2: 23분)</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14.5px;">
                <span style="color: #64748b; font-weight: 600;">지원 도구</span>
                <span style="font-weight: 700; color: #0f172a;">Review (문항 검토), Mark (표시), Hide Time</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14.5px;">
                <span style="color: #64748b; font-weight: 600;">시험 후 제공</span>
                <span style="font-weight: 700; color: #16a34a;">내가 고른 오답이 틀린 이유 & 논리적 정답 도출 해설</span>
              </div>
            </div>

            <button class="ets-btn ets-btn-primary" id="ets-btn-start" style="font-size: 16px; padding: 12px 36px; border-radius: 4px;">
              시험 시작 (Continue) →
            </button>
            <div style="margin-top: 16px;">
              <a href="index.html" style="font-size: 13px; color: #64748b; text-decoration: none;">← 모의고사 목록으로 돌아가기</a>
            </div>
          </div>
        </div>
      `;

      const startBtn = app.querySelector('#ets-btn-start');
      if (startBtn) {
        startBtn.addEventListener('click', onStart);
      }
    },

    renderSectionIntro: function(app, examData, section, onContinue) {
      app.innerHTML = `
        <div class="ets-top-header">
          <div class="ets-header-info-bar">
            <div class="ets-header-title">
              <span class="brand-gre">ETS GRE®</span>
              <span>Section ${section.number} of ${examData.sections.length}</span>
            </div>
            <div>Time Limit: ${section.timeLimit} Minutes</div>
          </div>
          <div class="ets-toolbar">
            <div class="ets-toolbar-group">
              <button class="ets-btn" id="ets-btn-quit">Quit Test</button>
            </div>
            <div class="ets-toolbar-group">
              <button class="ets-btn ets-btn-primary" id="ets-btn-sec-continue">Continue →</button>
            </div>
          </div>
        </div>

        <div class="ets-exam-viewport" style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 140px);">
          <div class="ets-question-paper" style="max-width: 640px; width: 100%; padding: 40px;">
            <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">
              Section ${section.number} — Verbal Reasoning
            </h2>
            <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 30px;">
              <p>이 섹션은 총 <strong>${section.questions.length}개 문항</strong>으로 구성되어 있으며, 제한 시간은 <strong>${section.timeLimit}분</strong>입니다.</p>
              <ul style="margin-top: 12px; padding-left: 20px;">
                <li>섹션 진행 중 <strong>[Review]</strong> 버튼을 눌러 언제든 풀었던 문항의 상태를 확인하고 원하는 문항으로 이동할 수 있습니다.</li>
                <li>나중에 다시 검토할 문항은 <strong>[Mark]</strong>를 체크해 두면 편리합니다.</li>
                <li>시간을 숨기려면 상단의 <strong>[Hide Time]</strong> 버튼을 클릭하세요.</li>
              </ul>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button class="ets-btn ets-btn-primary" id="ets-btn-sec-continue-2" style="font-size: 15px; padding: 10px 28px;">
                Continue →
              </button>
            </div>
          </div>
        </div>
      `;

      const btn1 = app.querySelector('#ets-btn-sec-continue');
      const btn2 = app.querySelector('#ets-btn-sec-continue-2');
      if (btn1) btn1.addEventListener('click', onContinue);
      if (btn2) btn2.addEventListener('click', onContinue);
      const btnQuit = app.querySelector('#ets-btn-quit');
      if (btnQuit) btnQuit.addEventListener('click', () => this.showQuitModal());
    },

    renderExamScreen: function(app, examData, state, handlers) {
      const self = this;
      const section = examData.sections[state.sectionIdx];
      const q = section.questions[state.questionIdx];
      const totalInSection = section.questions.length;
      const isFirst = state.questionIdx === 0;
      const isLast = state.questionIdx === totalInSection - 1;
      const isMarked = !!(state.marked && state.marked[q.id]);
      const isRC = q.type === 'RC_SINGLE' || q.type === 'RC_MULTI' || q.type === 'RC_SELECT';
      const userAns = state.answers[q.id] || [];

      // Choices HTML
      let choicesHtml = '';
      if (q.type === 'RC_SELECT') {
        choicesHtml = `<div style="font-size: 14px; color: #475569; padding: 12px; background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 4px;">
          좌측 지문 안에서 정답에 해당하는 문장을 직접 클릭하여 선택하세요.
        </div>`;
      } else if (q.type === 'TC' && q.blanks && q.blanks.length > 1) {
        // Multi-blank TC table
        choicesHtml = `
          <table class="ets-tc-table">
            <thead>
              <tr>
                ${q.blanks.map((b, i) => `<th>Blank (${['i','ii','iii'][i]})</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${[0, 1, 2].map(rowIdx => `
                <tr>
                  ${q.blanks.map((b, colIdx) => {
                    const choice = b.choices[rowIdx];
                    if (!choice) return '<td></td>';
                    const isSelected = userAns[colIdx] === choice.text;
                    return `
                      <td>
                        <div class="ets-tc-option-cell ${isSelected ? 'selected' : ''}" data-blank-idx="${colIdx}" data-val="${choice.text}">
                          <input type="radio" name="blank_${colIdx}" value="${choice.text}" ${isSelected ? 'checked' : ''}>
                          <span>${choice.text}</span>
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else if (q.type === 'SE' || q.type === 'RC_MULTI') {
        // Square checkboxes (Multi-select)
        const choices = q.choices || [];
        choicesHtml = `
          <ul class="ets-choices-list">
            ${choices.map(c => {
              const isChecked = userAns.includes(c.label);
              return `
                <li class="ets-choice-item ${isChecked ? 'selected' : ''}" data-val="${c.label}" data-mode="multi">
                  <input type="checkbox" class="ets-choice-input" value="${c.label}" ${isChecked ? 'checked' : ''}>
                  <div class="ets-choice-text"><strong>${c.label}.</strong> ${c.text}</div>
                </li>
              `;
            }).join('')}
          </ul>
        `;
      } else {
        // Single choice (Round radios)
        const choices = q.choices || (q.blanks && q.blanks[0] ? q.blanks[0].choices : []);
        choicesHtml = `
          <ul class="ets-choices-list">
            ${choices.map(c => {
              const label = c.label || c.text;
              const isChecked = userAns.includes(label) || userAns.includes(c.text);
              return `
                <li class="ets-choice-item ${isChecked ? 'selected' : ''}" data-val="${label}" data-mode="single">
                  <input type="radio" class="ets-choice-input" name="ets_choice" value="${label}" ${isChecked ? 'checked' : ''}>
                  <div class="ets-choice-text"><strong>${label}.</strong> ${c.text}</div>
                </li>
              `;
            }).join('')}
          </ul>
        `;
      }

      // Main layout HTML
      let questionAreaHtml = '';
      if (isRC) {
        questionAreaHtml = `
          <div class="ets-rc-split-layout">
            <div class="ets-passage-panel" id="ets-passage-panel">
              <div class="passage-header-note">Questions ${self.computePassageRange(q, section)} are based on this passage:</div>
              <div class="passage-body-content">${self.renderPassage(q, userAns)}</div>
            </div>
            <div class="ets-question-panel">
              <div class="ets-directions-banner">
                ${self.getDirectionsText(q)}
              </div>
              <div class="ets-q-text">${q.questionText}</div>
              ${choicesHtml}
            </div>
          </div>
        `;
      } else {
        questionAreaHtml = `
          <div>
            <div class="ets-directions-banner">
              ${self.getDirectionsText(q)}
            </div>
            ${q.stimulus ? `<div style="font-family: var(--ets-passage-font); font-size: 16px; line-height: 1.75; color: #1e293b; margin-bottom: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">${q.stimulus}</div>` : ''}
            <div class="ets-q-text" style="margin-bottom: 24px;">${q.questionText}</div>
            ${choicesHtml}
          </div>
        `;
      }

      app.innerHTML = `
        <div class="ets-top-header">
          <div class="ets-header-info-bar">
            <div class="ets-header-title">
              <span class="brand-gre">ETS GRE®</span>
              <span>GRE® Verbal Reasoning — Section ${section.number} of ${examData.sections.length}</span>
            </div>
            <div class="ets-header-qcount">
              Question ${state.questionIdx + 1} of ${totalInSection}
            </div>
            <div class="ets-header-timer-wrap">
              <div class="ets-timer-display ${self.isTimeHidden ? 'hidden-time' : ''}" id="ets-timer-text">
                ${self.formatTime(state.timeRemaining)}
              </div>
              <button class="ets-timer-btn" id="ets-btn-toggle-time">
                ${self.isTimeHidden ? 'Show Time' : 'Hide Time'}
              </button>
            </div>
          </div>

          <div class="ets-toolbar">
            <div class="ets-toolbar-group">
              <button class="ets-btn" id="ets-btn-quit">Quit Test</button>
              <button class="ets-btn" id="ets-btn-exit-sec">Exit Section</button>
            </div>
            <div class="ets-toolbar-group">
              <button class="ets-btn" id="ets-btn-review">Review</button>
              <label class="ets-mark-checkbox-label" title="Flag this question for review">
                <input type="checkbox" id="ets-mark-checkbox" ${isMarked ? 'checked' : ''}>
                <span>Mark</span>
              </label>
              <button class="ets-btn" id="ets-btn-help">Help</button>
              <button class="ets-btn" id="ets-btn-back" ${isFirst ? 'disabled' : ''}>← Back</button>
              <button class="ets-btn ets-btn-primary" id="ets-btn-next">
                ${isLast ? 'Exit Section →' : 'Next →'}
              </button>
            </div>
          </div>
        </div>

        <div class="ets-exam-viewport">
          <div class="ets-question-paper">
            ${questionAreaHtml}
          </div>
        </div>
      `;

      self.bindExamEvents(app, examData, state, handlers);
    },

    bindExamEvents: function(app, examData, state, handlers) {
      const self = this;
      const section = examData.sections[state.sectionIdx];
      const q = section.questions[state.questionIdx];

      // Time toggle
      const btnToggleTime = app.querySelector('#ets-btn-toggle-time');
      const timerDisplay = app.querySelector('#ets-timer-text');
      if (btnToggleTime && timerDisplay) {
        btnToggleTime.addEventListener('click', () => {
          self.isTimeHidden = !self.isTimeHidden;
          timerDisplay.classList.toggle('hidden-time', self.isTimeHidden);
          btnToggleTime.textContent = self.isTimeHidden ? 'Show Time' : 'Hide Time';
        });
      }

      // Mark checkbox
      const markCheckbox = app.querySelector('#ets-mark-checkbox');
      if (markCheckbox) {
        markCheckbox.addEventListener('change', (e) => {
          state.marked[q.id] = e.target.checked;
        });
      }

      // Review button
      const btnReview = app.querySelector('#ets-btn-review');
      if (btnReview) {
        btnReview.addEventListener('click', () => self.showReviewModal(examData, state, handlers));
      }

      // Help button
      const btnHelp = app.querySelector('#ets-btn-help');
      if (btnHelp) {
        btnHelp.addEventListener('click', () => self.showHelpModal());
      }

      // Quit Test button
      const btnQuit = app.querySelector('#ets-btn-quit');
      if (btnQuit) {
        btnQuit.addEventListener('click', () => self.showQuitModal(handlers));
      }

      // Exit Section button
      const btnExitSec = app.querySelector('#ets-btn-exit-sec');
      if (btnExitSec) {
        btnExitSec.addEventListener('click', () => self.showExitSectionModal(examData, state, handlers));
      }

      // Back button
      const btnBack = app.querySelector('#ets-btn-back');
      if (btnBack) {
        btnBack.addEventListener('click', handlers.onPrev);
      }

      // Next button
      const btnNext = app.querySelector('#ets-btn-next');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          const isLast = state.questionIdx === section.questions.length - 1;
          if (isLast) {
            self.showExitSectionModal(examData, state, handlers);
          } else {
            handlers.onNext();
          }
        });
      }

      // Attach Choice selection handlers
      self.attachChoiceHandlers(app, q, state);
    },

    attachChoiceHandlers: function(app, q, state) {
      const self = this;
      if (!state.answers[q.id]) state.answers[q.id] = [];

      // TC Multi-blank
      if (q.type === 'TC' && q.blanks && q.blanks.length > 1) {
        app.querySelectorAll('.ets-tc-option-cell').forEach(cell => {
          cell.addEventListener('click', () => {
            const blankIdx = parseInt(cell.dataset.blankIdx, 10);
            const val = cell.dataset.val;
            state.answers[q.id][blankIdx] = val;

            // Update UI
            app.querySelectorAll(`.ets-tc-option-cell[data-blank-idx="${blankIdx}"]`).forEach(c => {
              c.classList.remove('selected');
              c.querySelector('input').checked = false;
            });
            cell.classList.add('selected');
            cell.querySelector('input').checked = true;
          });
        });
        return;
      }

      // RC Select sentence
      if (q.type === 'RC_SELECT') {
        app.querySelectorAll('.sentence-selectable').forEach(el => {
          el.addEventListener('click', () => {
            const text = el.dataset.sentence;
            state.answers[q.id] = [text];
            app.querySelectorAll('.sentence-selectable').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
          });
        });
        return;
      }

      // Single choice
      app.querySelectorAll('.ets-choice-item[data-mode="single"]').forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.val;
          state.answers[q.id] = [val];
          app.querySelectorAll('.ets-choice-item[data-mode="single"]').forEach(i => {
            i.classList.remove('selected');
            i.querySelector('input').checked = false;
          });
          item.classList.add('selected');
          item.querySelector('input').checked = true;
        });
      });

      // Multi choice / SE
      app.querySelectorAll('.ets-choice-item[data-mode="multi"]').forEach(item => {
        item.addEventListener('click', (e) => {
          const input = item.querySelector('input');
          if (e.target !== input) {
            input.checked = !input.checked;
          }
          const val = item.dataset.val;
          let ans = state.answers[q.id] || [];
          if (input.checked) {
            if (!ans.includes(val)) ans.push(val);
            item.classList.add('selected');
          } else {
            ans = ans.filter(v => v !== val);
            item.classList.remove('selected');
          }
          state.answers[q.id] = ans;
        });
      });
    },

    computePassageRange: function(q, section) {
      if (!q.passageGroupId) return '1';
      const sameGroup = section.questions.filter(it => it.passageGroupId === q.passageGroupId);
      if (sameGroup.length <= 1) return `${section.questions.indexOf(q) + 1}`;
      const firstIdx = section.questions.indexOf(sameGroup[0]) + 1;
      const lastIdx = section.questions.indexOf(sameGroup[sameGroup.length - 1]) + 1;
      return `${firstIdx} to ${lastIdx}`;
    },

    renderPassage: function(q, userAns) {
      if (!q.passage) return '';
      if (q.type !== 'RC_SELECT') return q.passage;

      // Wrap sentences for RC_SELECT
      const sentences = this.splitSentences(q.passage);
      return sentences.map(s => {
        const isSelected = userAns && userAns.includes(s.trim());
        return `<span class="sentence-selectable ${isSelected ? 'selected' : ''}" data-sentence="${s.replace(/"/g, '&quot;')}">${s}</span> `;
      }).join('');
    },

    splitSentences: function(text) {
      const ABBR = ['Mr.','Mrs.','Ms.','Dr.','St.','Jr.','Sr.','vs.','etc.','e.g.','i.e.','U.S.','U.K.','No.','Prof.','Inc.','Ltd.','Co.','Capt.','Lt.','Cmdr.'];
      let t = text;
      const phs = ABBR.map((a, i) => ['__ABBR' + i + '__', a]);
      phs.forEach(([ph, a]) => { t = t.split(a).join(ph); });
      t = t.replace(/ ([A-Z])\.(?=\s[A-Z])/g, '$1__DOT__');
      const parts = t.split(/(?<=[.!?])\s+(?=[A-Z"“(])/);
      return parts.map(p => {
        let s = p.trim();
        phs.forEach(([ph, a]) => { s = s.split(ph).join(a); });
        s = s.replace(/__DOT__/g, '.');
        return s;
      }).filter(s => s.length > 0);
    },

    showReviewModal: function(examData, state, handlers) {
      const self = this;
      const section = examData.sections[state.sectionIdx];
      self.selectedReviewQIdx = state.questionIdx;

      const modalEl = document.createElement('div');
      modalEl.className = 'ets-modal-overlay';
      modalEl.id = 'ets-review-modal';

      const rowsHtml = section.questions.map((q, idx) => {
        const ans = state.answers[q.id];
        const isAnswered = Array.isArray(ans) && ans.length > 0 && !ans.some(v => v === undefined);
        const isMarked = !!(state.marked && state.marked[q.id]);
        const isCurrent = idx === state.questionIdx;
        const isSelected = idx === self.selectedReviewQIdx;

        return `
          <tr class="review-row ${isCurrent ? 'current-question-row' : ''} ${isSelected ? 'selected-row' : ''}" data-idx="${idx}">
            <td style="font-weight: 700; width: 80px;">${idx + 1}</td>
            <td>${isAnswered ? '<span style="color: #16a34a; font-weight: 600;">Answered</span>' : '<span style="color: #64748b;">Not Answered</span>'}</td>
            <td style="width: 80px; text-align: center;">${isMarked ? '<span style="color: #0284c7; font-weight: 700;">✓</span>' : ''}</td>
          </tr>
        `;
      }).join('');

      modalEl.innerHTML = `
        <div class="ets-review-dialog">
          <div class="ets-dialog-titlebar">
            <span>Review</span>
            <span>Section ${section.number} of ${examData.sections.length}</span>
          </div>
          <div class="ets-dialog-instructions">
            Below is the list of questions in the current section. The question you were on is outlined.
            To review a specific question, click on it and select <strong>Go to Question</strong>, or double-click.
          </div>
          <div class="ets-review-table-wrap">
            <table class="ets-review-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Status</th>
                  <th style="text-align: center;">Marked</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div class="ets-dialog-footer">
            <button class="ets-btn" id="ets-btn-review-return">Return</button>
            <button class="ets-btn ets-btn-primary" id="ets-btn-review-goto">Go to Question</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      // Row select
      modalEl.querySelectorAll('.review-row').forEach(row => {
        row.addEventListener('click', () => {
          modalEl.querySelectorAll('.review-row').forEach(r => r.classList.remove('selected-row'));
          row.classList.add('selected-row');
          self.selectedReviewQIdx = parseInt(row.dataset.idx, 10);
        });
        row.addEventListener('dblclick', () => {
          self.selectedReviewQIdx = parseInt(row.dataset.idx, 10);
          self.closeModal('ets-review-modal');
          handlers.onJump(self.selectedReviewQIdx);
        });
      });

      modalEl.querySelector('#ets-btn-review-return').addEventListener('click', () => {
        self.closeModal('ets-review-modal');
      });

      modalEl.querySelector('#ets-btn-review-goto').addEventListener('click', () => {
        if (self.selectedReviewQIdx !== null) {
          self.closeModal('ets-review-modal');
          handlers.onJump(self.selectedReviewQIdx);
        }
      });
    },

    showExitSectionModal: function(examData, state, handlers) {
      const self = this;
      const section = examData.sections[state.sectionIdx];
      const isLastSec = state.sectionIdx === examData.sections.length - 1;

      const modalEl = document.createElement('div');
      modalEl.className = 'ets-modal-overlay';
      modalEl.id = 'ets-exit-modal';

      modalEl.innerHTML = `
        <div class="ets-review-dialog" style="max-width: 520px;">
          <div class="ets-dialog-titlebar">
            <span>Section Exit Warning</span>
          </div>
          <div style="padding: 24px; font-size: 15px; line-height: 1.6; color: #1e293b;">
            <p><strong>Section ${section.number}을(를) 완료하시겠습니까?</strong></p>
            <p style="margin-top: 10px; color: #475569; font-size: 14px;">
              ${isLastSec
                ? "모든 섹션이 완료됩니다. 확인을 누르면 시험이 종료되고 채점 결과 및 심층 해설 페이지로 이동합니다."
                : "완료 후에는 Section " + section.number + "의 문제로 다시 돌아갈 수 없습니다. 검토가 더 필요하시다면 'Return to Section'을 누르세요."}
            </p>
          </div>
          <div class="ets-dialog-footer">
            <button class="ets-btn" id="ets-btn-exit-cancel">Return to Section</button>
            <button class="ets-btn ets-btn-primary" id="ets-btn-exit-confirm">
              ${isLastSec ? 'Finish Exam' : 'Exit Section'}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      modalEl.querySelector('#ets-btn-exit-cancel').addEventListener('click', () => {
        self.closeModal('ets-exit-modal');
      });

      modalEl.querySelector('#ets-btn-exit-confirm').addEventListener('click', () => {
        self.closeModal('ets-exit-modal');
        handlers.onFinishSection();
      });
    },

    showQuitModal: function(handlers) {
      const self = this;
      const modalEl = document.createElement('div');
      modalEl.className = 'ets-modal-overlay';
      modalEl.id = 'ets-quit-modal';

      modalEl.innerHTML = `
        <div class="ets-review-dialog" style="max-width: 500px;">
          <div class="ets-dialog-titlebar">
            <span>Quit Test</span>
          </div>
          <div style="padding: 24px; font-size: 15px; line-height: 1.6; color: #1e293b;">
            <p><strong>시험을 중단하시겠습니까?</strong></p>
            <p style="margin-top: 10px; color: #475569; font-size: 14px;">
              현재까지 작성한 답안을 기준으로 채점되며, 결과 보고서 및 문제 해설 페이지로 바로 이동합니다.
            </p>
          </div>
          <div class="ets-dialog-footer">
            <button class="ets-btn" id="ets-btn-quit-cancel">Cancel</button>
            <button class="ets-btn ets-btn-primary" style="background: #b91c1c; border-color: #991b1b;" id="ets-btn-quit-confirm">Quit Test</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      modalEl.querySelector('#ets-btn-quit-cancel').addEventListener('click', () => {
        self.closeModal('ets-quit-modal');
      });

      modalEl.querySelector('#ets-btn-quit-confirm').addEventListener('click', () => {
        self.closeModal('ets-quit-modal');
        if (handlers && handlers.onQuit) {
          handlers.onQuit();
        } else {
          location.href = 'index.html';
        }
      });
    },

    showHelpModal: function() {
      const self = this;
      const modalEl = document.createElement('div');
      modalEl.className = 'ets-modal-overlay';
      modalEl.id = 'ets-help-modal';

      modalEl.innerHTML = `
        <div class="ets-review-dialog" style="max-width: 600px;">
          <div class="ets-dialog-titlebar">
            <span>General Test Instructions (Help)</span>
          </div>
          <div class="ets-help-content">
            <h4>기본 시험 조작 안내</h4>
            <ul>
              <li><strong>Next:</strong> 다음 문항으로 이동합니다.</li>
              <li><strong>Back:</strong> 이전 문항으로 이동합니다.</li>
              <li><strong>Review:</strong> 현재 섹션의 모든 문항 상태를 확인하고 원하는 문항으로 바로 이동합니다.</li>
              <li><strong>Mark:</strong> 나중에 다시 검토할 문항을 체크표시(Flag)합니다.</li>
              <li><strong>Hide Time / Show Time:</strong> 상단 타이머 표시를 숨기거나 다시 표시합니다.</li>
            </ul>

            <h4>문제 유형별 응시 방법</h4>
            <ul>
              <li><strong>Text Completion (TC):</strong> 각 빈칸 열(Column)에서 정답 어휘를 1개씩 클릭합니다. 모든 빈칸을 채워야 정답으로 인정됩니다.</li>
              <li><strong>Sentence Equivalence (SE):</strong> 문맥상 동의어 관계를 이루는 단어 <strong>2개</strong>를 사각 체크박스에서 선택합니다.</li>
              <li><strong>Reading Comprehension:</strong> 단일선택은 라디오 버튼 1개, 다중선택은 해당하는 모든 체크박스를 선택합니다. 문장선택 문항은 지문 안의 문장을 직접 클릭합니다.</li>
            </ul>
          </div>
          <div class="ets-dialog-footer">
            <button class="ets-btn ets-btn-primary" id="ets-btn-help-close">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      modalEl.querySelector('#ets-btn-help-close').addEventListener('click', () => {
        self.closeModal('ets-help-modal');
      });
    },

    closeModal: function(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  };

  root.ETSExamController = controller;

  // Auto sync timer display in browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    setInterval(() => {
      const etsTimer = document.getElementById('ets-timer-text');
      if (etsTimer && typeof state !== 'undefined' && state.timeRemaining !== undefined) {
        etsTimer.textContent = controller.formatTime(state.timeRemaining);
      }
    }, 500);
  }
})();
