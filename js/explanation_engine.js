/* ============================================================
   GRE Verbal Mock Test — Enhanced Explanation Engine
   Provides:
   - Dynamic Results Page with Scorecard
   - Wrong Answer Review Filter (오답노트)
   - Inline Accordion Detailed Solutions
   - 1-Question Step-by-Step Focused Review Viewer
   - Targeted User Mistake Analysis (내가 고른 답이 틀린 이유)
   - Logical Step-by-Step Deduction (정답 도출 논리)
   - Choice-by-Choice Analysis & Vocabulary
   ============================================================ */

(function() {
  window.ExplanationEngine = {
    currentFilter: 'all', // 'all' | 'wrong' | 'correct'
    currentTypeFilter: 'all',
    currentViewMode: 'table', // 'table' | 'viewer'
    activeViewerQId: null,
    expandedQIds: new Set(),

    getExplanationData: function(qId, round) {
      // 1. Check the round-specific explanations object (e.g. "17회" -> window.EXPLANATIONS_17)
      const roundMatch = (round || '').match(/\d+/);
      if (roundMatch) {
        const key = 'EXPLANATIONS_' + roundMatch[0];
        if (window[key] && window[key][qId]) {
          return window[key][qId];
        }
      }
      // 2. Generic fallback generator for mock tests without curated explanations
      return null;
    },

    formatUserAns: function(userAns, q) {
      if (!userAns || userAns.length === 0) return '미응답';
      if (q && q.type === 'RC_SELECT') {
        const text = userAns[0] || '';
        return text.length > 50 ? text.slice(0, 50) + '…' : text;
      }
      return userAns.join(', ');
    },

    formatCorrectAns: function(q) {
      if (!q || !q.answer) return '';
      if (q.type === 'RC_SELECT') {
        const text = q.answer[0] || '';
        return text.length > 50 ? text.slice(0, 50) + '…' : text;
      }
      return q.answer.join(', ');
    },

    generateFallbackExplanation: function(q, userAns, isCorr) {
      const correctStr = this.formatCorrectAns(q);
      const userStr = this.formatUserAns(userAns, q);
      const typeDesc = {
        'TC': '문맥의 논리적 연결어와 수식 관계를 분석하여 빈칸에 들어갈 가장 적절한 어휘를 도출해야 하는 Text Completion 문항입니다.',
        'SE': '문장의 의미를 완성하면서 서로 동의어 관계를 이루어 문장 전체를 동등하게 만드는 두 단어를 골라야 하는 Sentence Equivalence 문항입니다.',
        'RC_SINGLE': '지문의 중심 논점과 세부 논증 전개를 파악하여 단 하나의 정답을 선별하는 Reading Comprehension 문항입니다.',
        'RC_MULTI': '지문에 명시된 근거를 바탕으로 제시된 진술 중 부합하는 모든 보기를 골라내는 다중 선택형 Reading Comprehension 문항입니다.',
        'RC_SELECT': '지문 내에서 질문의 조건을 만족하는 정확한 문장을 클릭하여 선택하는 문항입니다.',
        'CR': '논증의 전제(Premise)와 결론(Conclusion) 사이의 논리적 비약이나 가정을 검증하는 Critical Reasoning 문항입니다.'
      };

      const steps = [
        { step: "Step 1: 문제 유형 및 출제 의도 파악", desc: typeDesc[q.type] || "제시된 지문과 질문의 핵심 조건을 면밀히 분석합니다." },
        { step: "Step 2: 지문 단서(Clue) 및 논리 방향 추론", desc: `지문에서 정답의 직접적 근거가 되는 키워드를 확인하고, 정답 <strong>[${correctStr}]</strong>이(가) 문맥을 어떻게 완성하는지 검증합니다.` },
        { step: "Step 3: 정답 확정 및 소거법 검증", desc: `정답 <strong>[${correctStr}]</strong> 이외의 다른 보기들은 지문의 범위를 벗어나거나 인과관계를 왜곡하므로 소거됩니다.` }
      ];

      const whyWrong = {};
      if (q.choices && Array.isArray(q.choices)) {
        q.choices.forEach(c => {
          const isAns = q.answer && (q.answer.includes(c.label) || q.answer.includes(c.text));
          if (!isAns) {
            let reason = `선택지 [${c.label || c.text}]는 지문의 핵심 단서와 논리적으로 일치하지 않으며, 출제자가 유도한 매력적인 오답 함정입니다.`;
            if (q.type === 'TC') {
              reason = `선택지 [${c.label || c.text}]는 문맥의 시그널 워드 및 수식 관계와 논리적으로 부합하지 않는 어휘입니다.`;
            } else if (q.type === 'SE') {
              reason = `선택지 [${c.label || c.text}]는 정답 단어와 동의어 쌍을 형성하지 못하거나 문맥 전체의 의미를 온전히 완성하지 못합니다.`;
            } else if (q.type && q.type.startsWith('RC')) {
              reason = `선택지 [${c.label || c.text}]는 지문의 핵심 진술을 과도하게 일반화하거나 왜곡한 대표적인 Distractor 함정입니다.`;
            } else if (q.type === 'CR') {
              reason = `선택지 [${c.label || c.text}]는 논증의 전제와 결론 사이의 인과적 결함을 메우지 못하는 논점 일탈 보기입니다.`;
            }
            whyWrong[c.label || c.text] = reason;
          }
        });
      }

      return {
        topic: `${q.type} 핵심 논리 분석`,
        clue: `정답의 결정적 단서는 지문 내의 논리 전개 및 [${correctStr}]의 의미 정합성에 근거합니다.`,
        stepByStep: steps,
        whySelectedWrong: whyWrong,
        choicesAnalysis: q.choices ? q.choices.map(c => {
          const isCorrectChoice = q.answer && (q.answer.includes(c.label) || q.answer.includes(c.text));
          return {
            label: c.label || c.text,
            isCorrect: isCorrectChoice,
            text: c.text,
            analysis: isCorrectChoice
              ? `정답! 질문의 요구조건과 지문의 논리적 흐름에 완벽히 부합합니다.`
              : (whyWrong[c.label || c.text] || `오답. 지문의 결정적 근거와 일치하지 않거나 불필요한 비약이 포함되어 있습니다.`)
          };
        }) : null,
        vocab: [],
        translation: q.stimulus || q.passage || ""
      };
    },

    renderExplanationCard: function(q, sectionNum, qNum, userAns, isCorr, round) {
      let exp = this.getExplanationData(q.id, round);
      if (!exp) {
        exp = this.generateFallbackExplanation(q, userAns, isCorr);
      }

      const answered = userAns && userAns.length > 0;
      const userDisplay = this.formatUserAns(userAns, q);
      const correctDisplay = this.formatCorrectAns(q);

      // Targeted Feedback Box
      let feedbackHtml = '';
      if (!answered) {
        feedbackHtml = `
          <div class="user-wrong-feedback-box skipped-box">
            <div class="feedback-title skipped-title">⚠️ 미응답 문항입니다</div>
            <div class="feedback-body">
              실전 GRE Verbal에서는 오답에 대한 감점(Negative Marking)이 없습니다. 시간이 부족하더라도 지문의 시그널 워드를 바탕으로 소거법을 적용하여 반드시 답안을 마킹해야 합니다.
            </div>
          </div>
        `;
      } else if (isCorr) {
        feedbackHtml = `
          <div class="user-wrong-feedback-box correct-box">
            <div class="feedback-title correct-title">🎉 정답입니다! (선택 답안: ${userDisplay})</div>
            <div class="feedback-body">
              지문의 핵심 논리 단서(Clue)를 정확하게 파악하고 정답 <strong>[${correctDisplay}]</strong>을(를) 완벽히 도출하셨습니다.
            </div>
          </div>
        `;
      } else {
        // Targeted wrong feedback
        let specificWhy = null;
        if (exp.whySelectedWrong) {
          for (let u of userAns) {
            let reason = exp.whySelectedWrong[u];
            if (reason && reason.trim() !== '오답' && reason.trim().length >= 6) {
              specificWhy = `<strong>[${u}]</strong>: ` + reason;
              break;
            }
          }
        }
        // Fallback: search in choicesAnalysis
        if (!specificWhy && exp.choicesAnalysis) {
          for (let u of userAns) {
            const foundChoice = exp.choicesAnalysis.find(c => c.label === u || c.text === u);
            if (foundChoice && foundChoice.analysis && foundChoice.analysis.trim() !== '오답' && foundChoice.analysis.trim().length >= 6) {
              specificWhy = `<strong>[${u}]</strong>: ` + foundChoice.analysis;
              break;
            }
          }
        }
        if (!specificWhy) {
          specificWhy = `회원님이 선택하신 <strong>[${userDisplay}]</strong>는 지문의 핵심 인과관계와 어긋나거나, 출제자가 유도한 매력적인 함정(Distractor Trap)에 빠진 경우입니다. 정답인 <strong>[${correctDisplay}]</strong>와의 논리적 차이를 아래의 [선택지별 심층 분석]에서 상세히 확인하세요.`;
        }

        feedbackHtml = `
          <div class="user-wrong-feedback-box">
            <div class="feedback-title wrong-title">
              <span class="feedback-trap-tag">오답 분석</span>
              회원님이 선택하신 [${userDisplay}]가 틀린 이유
            </div>
            <div class="feedback-body">
              ${specificWhy}
            </div>
          </div>
        `;
      }

      // Passage / Stimulus display
      let contextHtml = '';
      const passageContent = q.stimulus || q.passage;
      if (passageContent) {
        contextHtml += `
          <div class="exp-context-label">지문 원문 (Passage / Stimulus)</div>
          <div class="exp-passage-text">${passageContent}</div>
        `;
      }
      contextHtml += `
        <div class="exp-context-label">질문 (Question)</div>
        <div class="exp-q-text">${q.questionText}</div>
      `;

      // Logic steps display
      let logicStepsHtml = '';
      if (exp.stepByStep && exp.stepByStep.length > 0) {
        logicStepsHtml = `
          <div class="exp-logic-box">
            <div class="exp-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              정답 도출의 논리적 과정 (Step-by-Step Deduction)
            </div>
            <div class="logic-steps-list">
              ${exp.stepByStep.map(s => `
                <div class="logic-step-item">
                  <span class="logic-step-badge">${s.step}</span>
                  <div class="logic-step-desc">${s.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Choices Analysis List
      let choicesListHtml = '';
      if (exp.choicesAnalysis && exp.choicesAnalysis.length > 0) {
        choicesListHtml = `
          <div class="exp-choices-box">
            <div class="exp-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              선택지별 심층 분석 (Choices Analysis)
            </div>
            <div class="choices-analysis-list">
              ${exp.choicesAnalysis.map(c => {
                const isSelectedByUser = userAns && (userAns.includes(c.label) || userAns.includes(c.text));
                const itemClass = c.isCorrect ? 'is-correct-choice' : (isSelectedByUser ? 'is-user-wrong-choice' : '');
                return `
                  <div class="choice-analysis-item ${itemClass}">
                    <div class="choice-item-header">
                      <div class="choice-item-label">(${c.label}) ${c.text || ''}</div>
                      <div class="choice-tags">
                        ${c.isCorrect ? '<span class="choice-tag tag-correct">정답 ✓</span>' : ''}
                        ${isSelectedByUser ? '<span class="choice-tag tag-user">내 선택</span>' : ''}
                      </div>
                    </div>
                    <div class="choice-item-analysis">${c.analysis}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else if (q.choices && q.choices.length > 0) {
        // Simple choices fallback
        choicesListHtml = `
          <div class="exp-choices-box">
            <div class="exp-section-title">선택지 목록</div>
            <div class="choices-analysis-list">
              ${q.choices.map(c => {
                const isCorrect = q.answer.includes(c.label) || q.answer.includes(c.text);
                const isUser = userAns && (userAns.includes(c.label) || userAns.includes(c.text));
                return `
                  <div class="choice-analysis-item ${isCorrect ? 'is-correct-choice' : (isUser ? 'is-user-wrong-choice' : '')}">
                    <div class="choice-item-header">
                      <div class="choice-item-label">(${c.label}) ${c.text}</div>
                      <div class="choice-tags">
                        ${isCorrect ? '<span class="choice-tag tag-correct">정답 ✓</span>' : ''}
                        ${isUser ? '<span class="choice-tag tag-user">내 선택</span>' : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      // Vocab & Translation
      let extrasHtml = '';
      const hasVocab = exp.vocab && exp.vocab.length > 0;
      const hasTrans = exp.translation && exp.translation.trim().length > 0;

      if (hasVocab || hasTrans) {
        extrasHtml = `
          <div class="exp-extras-grid">
            ${hasVocab ? `
              <div class="exp-vocab-box">
                <div class="exp-section-title">📖 핵심 GRE 어휘 (Vocabulary)</div>
                <div class="vocab-list">
                  ${exp.vocab.map(v => `
                    <div class="vocab-item">
                      <span class="vocab-word">${v.word}</span>
                      <span class="vocab-meaning">: ${v.meaning}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : '<div></div>'}
            ${hasTrans ? `
              <div class="exp-trans-box">
                <div class="exp-section-title">🌐 지문 / 문맥 해석 (Translation)</div>
                <div class="trans-content">${exp.translation}</div>
              </div>
            ` : '<div></div>'}
          </div>
        `;
      }

      return `
        <div class="exp-card" data-qid="${q.id}">
          <div class="exp-header">
            <div class="exp-header-left">
              <span class="exp-q-id">S${sectionNum}-Q${qNum}</span>
              <span class="exp-q-type">${q.type}</span>
              ${exp.topic ? `<span style="font-size: 13px; color: var(--ink-soft); font-weight: 500;">${exp.topic}</span>` : ''}
            </div>
            <div>
              ${!answered
                ? '<span class="exp-status-pill skipped">미응답 ⊘</span>'
                : (isCorr
                  ? '<span class="exp-status-pill correct">정답 ✓</span>'
                  : '<span class="exp-status-pill wrong">오답 ✗</span>')}
            </div>
          </div>

          ${feedbackHtml}

          <div class="exp-context-box">
            ${contextHtml}
          </div>

          ${logicStepsHtml}

          ${choicesListHtml}

          ${extrasHtml}
        </div>
      `;
    },

    renderResultsUI: function(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels) {
      typeLabels = typeLabels || {
        TC: 'Text Completion',
        SE: 'Sentence Equivalence',
        RC_SINGLE: 'Reading Comprehension',
        RC_MULTI: 'RC (다중선택)',
        RC_SELECT: 'RC (문장선택)',
        CR: 'Critical Reasoning'
      };
      const self = this;
      let totalCorrect = 0;
      const sectionStats = examData.sections.map(s => {
        let c = 0;
        s.questions.forEach(q => { if (isCorrectFn(q)) c++; });
        totalCorrect += c;
        return { num: s.number, correct: c, total: s.questions.length };
      });

      let totalQ = 0;
      examData.sections.forEach(s => totalQ += s.questions.length);
      const score = Math.round(examData.scoringFormula.multiplier * totalCorrect) + examData.scoringFormula.base;
      const wrongCount = totalQ - totalCorrect;

      // Flatten questions list
      const flatQuestions = [];
      examData.sections.forEach(s => {
        s.questions.forEach((q, idx) => {
          flatQuestions.push({
            q: q,
            sectionNum: s.number,
            qNum: idx + 1,
            userAns: state.answers[q.id] || [],
            isAnswered: isAnsweredFn(q.id),
            isCorrect: isCorrectFn(q)
          });
        });
      });

      // Compute Type Breakdown and Auto-save Attempt to History
      const typeBreakdown = {
        TC: { correct: 0, total: 0 },
        SE: { correct: 0, total: 0 },
        RC: { correct: 0, total: 0 },
        CR: { correct: 0, total: 0 }
      };
      flatQuestions.forEach(item => {
        let t = item.q.type;
        if (t && t.startsWith('RC')) t = 'RC';
        if (!typeBreakdown[t]) typeBreakdown[t] = { correct: 0, total: 0 };
        typeBreakdown[t].total++;
        if (item.isCorrect) typeBreakdown[t].correct++;
      });

      if (!self.hasSavedHistory && typeof window !== 'undefined' && window.GREHistoryManager) {
        self.hasSavedHistory = true;
        self.lastHistoryResult = window.GREHistoryManager.saveAttempt({
          round: examData.round,
          roundTitle: `${examData.round || ''} 실전 모의고사`,
          scoreScaled: score,
          scoreRaw: totalCorrect,
          totalQuestions: totalQ,
          accuracy: Math.round((totalCorrect / totalQ) * 100),
          sections: sectionStats,
          typeBreakdown: typeBreakdown,
          htmlFile: (typeof location !== 'undefined' ? location.pathname.split('/').pop() : ''),
          answers: (function() {
            const out = {};
            flatQuestions.forEach(item => {
              const a = state.answers[item.q.id];
              if (Array.isArray(a) && a.length > 0) out[item.q.id] = a.map(v => (v == null ? '' : String(v)));
            });
            return out;
          })()
        });
        if (self.lastHistoryResult && window.GRESync) {
          window.GRESync.pushAttempt(self.lastHistoryResult.record);
        }
      }

      // Default active question for viewer mode
      if (!self.activeViewerQId && flatQuestions.length > 0) {
        const firstWrong = flatQuestions.find(item => !item.isCorrect);
        self.activeViewerQId = firstWrong ? firstWrong.q.id : flatQuestions[0].q.id;
      }

      // On initial render, auto-expand wrong answers by default so user immediately sees their feedback
      if (!self.hasInitializedExp) {
        self.hasInitializedExp = true;
        flatQuestions.forEach(item => {
          if (!item.isCorrect) self.expandedQIds.add(item.q.id);
        });
        if (self.expandedQIds.size === 0 && flatQuestions.length > 0) {
          self.expandedQIds.add(flatQuestions[0].q.id);
        }
      }

      // Filtered questions based on state
      const filteredQuestions = flatQuestions.filter(item => {
        // Correctness filter
        if (self.currentFilter === 'wrong' && item.isCorrect) return false;
        if (self.currentFilter === 'correct' && !item.isCorrect) return false;
        // Type filter
        if (self.currentTypeFilter !== 'all' && item.q.type !== self.currentTypeFilter) return false;
        return true;
      });

      // Render Table Rows
      let tableRowsHtml = '';
      let lastSection = null;

      filteredQuestions.forEach(item => {
        if (item.sectionNum !== lastSection) {
          lastSection = item.sectionNum;
          tableRowsHtml += `<tr class="section-divider"><td colspan="6">Section ${item.sectionNum}</td></tr>`;
        }

        const isExpanded = self.expandedQIds.has(item.q.id);
        const userDisplay = self.formatUserAns(item.userAns, item.q);
        const correctDisplay = self.formatCorrectAns(item.q);

        let userBadge = '';
        if (!item.isAnswered) {
          userBadge = `<span class="user-ans-tag skipped">미응답</span>`;
        } else if (item.isCorrect) {
          userBadge = `<span class="user-ans-tag correct">${userDisplay}</span>`;
        } else {
          userBadge = `<span class="user-ans-tag wrong">${userDisplay}</span>`;
        }

        const mark = item.isCorrect
          ? '<span class="mark-correct" style="font-size: 18px;">✓</span>'
          : '<span class="mark-wrong" style="font-size: 18px;">✗</span>';

        tableRowsHtml += `
          <tr class="question-row ${isExpanded ? 'expanded' : ''}" data-qid="${item.q.id}">
            <td><strong>S${item.sectionNum}-Q${item.qNum}</strong></td>
            <td style="color: var(--ink-mute); font-size: 12px; font-weight: 600;">${typeLabels[item.q.type] || item.q.type}</td>
            <td>${userBadge}</td>
            <td><span class="correct-ans-tag">${correctDisplay}</span></td>
            <td style="text-align: center;">${mark}</td>
            <td style="text-align: right;">
              <button class="btn-expand-exp ${isExpanded ? 'active' : ''}" data-qid="${item.q.id}">
                ${isExpanded ? '풀이 접기 ▲' : '풀이 보기 ▼'}
              </button>
            </td>
          </tr>
        `;

        if (isExpanded) {
          tableRowsHtml += `
            <tr class="explanation-row" id="exp-row-${item.q.id}">
              <td colspan="6">
                <div class="inline-exp-wrapper">
                  ${self.renderExplanationCard(item.q, item.sectionNum, item.qNum, item.userAns, item.isCorrect, examData.round)}
                </div>
              </td>
            </tr>
          `;
        }
      });

      // Render Viewer Mode
      let viewerHtml = '';
      if (self.currentViewMode === 'viewer') {
        const activeItem = flatQuestions.find(item => item.q.id === self.activeViewerQId) || flatQuestions[0];
        const activeIdx = flatQuestions.findIndex(item => item.q.id === activeItem.q.id);
        const prevItem = activeIdx > 0 ? flatQuestions[activeIdx - 1] : null;
        const nextItem = activeIdx < flatQuestions.length - 1 ? flatQuestions[activeIdx + 1] : null;
        const nextWrongItem = flatQuestions.slice(activeIdx + 1).find(item => !item.isCorrect) || flatQuestions.find(item => !item.isCorrect);

        viewerHtml = `
          <div class="review-mode-container">
            <aside class="review-sidebar">
              <div class="sidebar-title">
                <span>문항 바로가기</span>
                <span style="font-size: 12px; color: var(--ink-soft);">${activeIdx + 1} / ${flatQuestions.length}</span>
              </div>
              <div class="sidebar-grid">
                ${flatQuestions.map((item, idx) => {
                  const statusClass = !item.isAnswered ? 'is-skipped' : (item.isCorrect ? 'is-correct' : 'is-wrong');
                  const isActive = item.q.id === activeItem.q.id ? 'active' : '';
                  return `
                    <button class="q-nav-btn ${statusClass} ${isActive}" data-qid="${item.q.id}">
                      ${idx + 1}
                    </button>
                  `;
                }).join('')}
              </div>
              <div style="margin-top: 16px; font-size: 11px; color: var(--ink-mute); display: flex; gap: 12px; justify-content: center;">
                <span><span style="color: #2d6a4f; font-weight: bold;">●</span> 정답</span>
                <span><span style="color: #b03a2e; font-weight: bold;">●</span> 오답</span>
                <span><span style="color: #888; font-weight: bold;">●</span> 미응답</span>
              </div>
            </aside>

            <main class="review-main-panel">
              ${self.renderExplanationCard(activeItem.q, activeItem.sectionNum, activeItem.qNum, activeItem.userAns, activeItem.isCorrect, examData.round)}

              <div class="review-nav-bar">
                <div>
                  <button class="btn btn-secondary" id="btn-prev-q" ${!prevItem ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-qid="${prevItem ? prevItem.q.id : ''}">
                    ← 이전 문항
                  </button>
                </div>
                <div>
                  ${nextWrongItem && !activeItem.isCorrect ? `
                    <button class="btn" style="border-color: #f5c6cb; color: #b03a2e; background: #fff5f5; font-weight: 600;" id="btn-next-wrong-q" data-qid="${nextWrongItem.q.id}">
                      다음 오답 문항으로 이동 ⚡
                    </button>
                  ` : ''}
                </div>
                <div>
                  <button class="btn btn-primary" id="btn-next-q" ${!nextItem ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-qid="${nextItem ? nextItem.q.id : ''}">
                    다음 문항 →
                  </button>
                </div>
              </div>
            </main>
          </div>
        `;
      }

      // Assemble Full Results UI
      app.innerHTML = `
        <main class="results" style="max-width: 1160px; margin: 0 auto;">
          <div class="results-header">
            <div class="eyebrow">GRE Verbal Practice Report</div>
            <h2>시험 채점 결과 및 문항별 심층 해설</h2>
          </div>

          <!-- History Save & Delta Banner -->
          ${self.lastHistoryResult ? `
            <div class="history-delta-banner ${self.lastHistoryResult.isBestScore ? 'is-best' : ''}">
              <div class="banner-left">
                <span class="banner-icon">${self.lastHistoryResult.isBestScore ? '🏆' : (self.lastHistoryResult.delta > 0 ? '📈' : '📊')}</span>
                <span class="banner-text">
                  ${self.lastHistoryResult.isBestScore
                    ? `축하합니다! 역대 최고 점수를 달성했습니다: <strong>${score}점</strong> (이전 최고 대비 갱신)`
                    : (self.lastHistoryResult.delta !== null && self.lastHistoryResult.delta > 0
                      ? `동일 회차 이전 응시 대비 <strong>+${self.lastHistoryResult.delta}점</strong> 상승했습니다! (${self.lastHistoryResult.prevScore}점 → ${score}점)`
                      : `응시 기록이 성공적으로 저장되었습니다 (환산 <strong>${score}점</strong> / ${totalCorrect}문항 정답).`)}
                </span>
              </div>
              <a href="index.html#history-dashboard" class="btn-banner-link">성적 추이 그래프 보기 →</a>
            </div>
          ` : ''}

          <!-- Score Card -->
          <div class="score-card">
            <div class="score-cell">
              <div class="label">총 정답</div>
              <div class="value">${totalCorrect}<span class="total"> / ${totalQ}</span></div>
              <div class="sub">${sectionStats.map(s => `S${s.num}: ${s.correct}/${s.total}`).join(' · ')}</div>
            </div>
            <div class="score-cell">
              <div class="label">정답률</div>
              <div class="value">${Math.round(totalCorrect / totalQ * 100)}<span class="total">%</span></div>
              <div class="sub">${totalCorrect} 맞힘 · ${wrongCount} 틀림</div>
            </div>
            <div class="score-cell">
              <div class="label">환산 점수</div>
              <div class="value">${score}</div>
              <div class="sub">130 ~ 170 표준 환산 스케일</div>
            </div>
          </div>

          <!-- Review Controls Bar -->
          <div class="review-controls-bar">
            <div class="filter-group">
              <span class="filter-label">결과 필터:</span>
              <button class="filter-btn ${self.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                전체 문항 <span class="count-badge">${totalQ}</span>
              </button>
              <button class="filter-btn wrong-only ${self.currentFilter === 'wrong' ? 'active' : ''}" data-filter="wrong">
                오답노트만 보기 <span class="count-badge">${wrongCount}</span>
              </button>
              <button class="filter-btn ${self.currentFilter === 'correct' ? 'active' : ''}" data-filter="correct">
                맞힌 문항 <span class="count-badge">${totalCorrect}</span>
              </button>
            </div>

            <div class="filter-group">
              <span class="filter-label">유형:</span>
              <select id="type-filter-select" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--line); font-size: 13px; background: #fff; cursor: pointer;">
                <option value="all" ${self.currentTypeFilter === 'all' ? 'selected' : ''}>전체 유형</option>
                <option value="TC" ${self.currentTypeFilter === 'TC' ? 'selected' : ''}>Text Completion (TC)</option>
                <option value="SE" ${self.currentTypeFilter === 'SE' ? 'selected' : ''}>Sentence Equivalence (SE)</option>
                <option value="RC_SINGLE" ${self.currentTypeFilter === 'RC_SINGLE' ? 'selected' : ''}>RC (단일선택)</option>
                <option value="RC_MULTI" ${self.currentTypeFilter === 'RC_MULTI' ? 'selected' : ''}>RC (다중선택)</option>
                <option value="CR" ${self.currentTypeFilter === 'CR' ? 'selected' : ''}>Critical Reasoning (CR)</option>
              </select>
            </div>

            <div class="view-mode-toggle">
              <button class="view-btn ${self.currentViewMode === 'table' ? 'active' : ''}" data-view="table">
                표 & 아코디언 뷰
              </button>
              <button class="view-btn ${self.currentViewMode === 'viewer' ? 'active' : ''}" data-view="viewer">
                1문항 집중 복습 뷰어
              </button>
            </div>
          </div>

          <!-- Main View Rendering -->
          ${self.currentViewMode === 'table' ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 13px; color: var(--ink-soft);">
                행을 클릭하거나 [풀이 보기] 버튼을 누르면 상세 해설이 펼쳐집니다.
              </span>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btn-expand-all" style="padding: 5px 12px; font-size: 12px;">전체 해설 펼치기</button>
                <button class="btn btn-secondary" id="btn-collapse-all" style="padding: 5px 12px; font-size: 12px;">전체 해설 접기</button>
              </div>
            </div>

            <div class="results-table">
              <table>
                <thead>
                  <tr>
                    <th style="width: 100px;">번호</th>
                    <th>유형</th>
                    <th>내 답안</th>
                    <th>정답</th>
                    <th style="width: 60px; text-align: center;">결과</th>
                    <th style="width: 110px; text-align: right;">상세 해설</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml.length > 0 ? tableRowsHtml : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--ink-soft);">조건에 해당하는 문항이 없습니다.</td></tr>'}
                </tbody>
              </table>
            </div>
          ` : viewerHtml}

          <!-- Bottom Actions -->
          <div class="results-actions" style="margin-top: 40px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn" onclick="window.print()">결과 인쇄 / PDF 저장</button>
            <button class="btn btn-primary" onclick="location.reload()">다시 풀기</button>
            <a class="btn" href="index.html#history-dashboard" style="background: #f1f5f9; border-color: #cbd5e1; font-weight: 600;">📈 나의 성적 추이 & 응시 이력</a>
            <a class="btn" href="index.html">모의고사 목록으로</a>
          </div>

          <!-- Diagnostic Review Tips -->
          <div style="margin-top: 40px; padding: 20px 24px; background: #fff; border: 1px solid var(--line); border-radius: 8px; font-size: 13.5px; color: var(--ink-soft); line-height: 1.6;">
            <strong style="color: var(--ink);">💡 GRE Verbal 오답 복습 팁</strong><br>
            틀린 문항은 단순히 정답을 암기하기보다, 지문 내 시그널 워드(Signal words)와 단서(Clue)를 바탕으로 본인의 선택지가 어떤 함정(과도한 일반화, 인과 왜곡, 지문 밖의 전제 등)에 걸렸는지 <strong>논리적 인과관계</strong>를 분석하는 것이 실전 점수 향상의 핵심입니다.
          </div>
        </main>
      `;

      // Bind Event Listeners
      self.bindEvents(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
    },

    bindEvents: function(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels) {
      const self = this;

      // Filter buttons
      app.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          self.currentFilter = e.currentTarget.dataset.filter;
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      });

      // Type filter
      const typeSelect = app.querySelector('#type-filter-select');
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          self.currentTypeFilter = e.target.value;
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      }

      // View mode buttons
      app.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          self.currentViewMode = e.currentTarget.dataset.view;
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      });

      // Expand / Collapse Single Question Row
      app.querySelectorAll('.btn-expand-exp, .question-row').forEach(el => {
        el.addEventListener('click', (e) => {
          // If clicked on button or row
          const qId = el.dataset.qid;
          if (!qId) return;
          if (self.expandedQIds.has(qId)) {
            self.expandedQIds.delete(qId);
          } else {
            self.expandedQIds.add(qId);
          }
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      });

      // Expand All / Collapse All
      const btnExpandAll = app.querySelector('#btn-expand-all');
      if (btnExpandAll) {
        btnExpandAll.addEventListener('click', () => {
          examData.sections.forEach(s => s.questions.forEach(q => self.expandedQIds.add(q.id)));
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      }

      const btnCollapseAll = app.querySelector('#btn-collapse-all');
      if (btnCollapseAll) {
        btnCollapseAll.addEventListener('click', () => {
          self.expandedQIds.clear();
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      }

      // Viewer Mode Navigation
      app.querySelectorAll('.q-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          self.activeViewerQId = e.currentTarget.dataset.qid;
          self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
        });
      });

      const btnPrev = app.querySelector('#btn-prev-q');
      if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
          const targetQId = e.currentTarget.dataset.qid;
          if (targetQId) {
            self.activeViewerQId = targetQId;
            self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
          }
        });
      }

      const btnNext = app.querySelector('#btn-next-q');
      if (btnNext) {
        btnNext.addEventListener('click', (e) => {
          const targetQId = e.currentTarget.dataset.qid;
          if (targetQId) {
            self.activeViewerQId = targetQId;
            self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
          }
        });
      }

      const btnNextWrong = app.querySelector('#btn-next-wrong-q');
      if (btnNextWrong) {
        btnNextWrong.addEventListener('click', (e) => {
          const targetQId = e.currentTarget.dataset.qid;
          if (targetQId) {
            self.activeViewerQId = targetQId;
            self.renderResultsUI(app, examData, state, isCorrectFn, isAnsweredFn, typeLabels);
          }
        });
      }
    }
  };
})();
