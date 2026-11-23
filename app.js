/* ============================================================
   견적서 스튜디오 · app.js
   에디터 ↔ A4 미리보기 실시간 렌더링, localStorage 자동 저장/보관함,
   프리셋 적용, 인쇄, JSON 내보내기/불러오기.
   외부 요청 0건.
   ============================================================ */
(function () {
  'use strict';

  const C = window.AgencyCore;
  const D = window.AgencyData;
  const AD = window.AgencyDesign || null;   // design.js (테마·추천·팔레트)
  const CP = window.CopyPsych || null;      // engines/copy-psych-engine.js
  const B = window.AiBridge || null;        // engines/ai-bridge.js
  const FA = window.FreeAI || null;         // engines/free-ai-client.js
  if (FA) FA.configure({ endpoint: 'https://free-ai-taste.onetap-ai.workers.dev', app: 'agency-proposal-maker' });
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const KEY = {
    theme: 'agency.v1.theme',
    doc: 'agency.v1.doc',
    lib: 'agency.v1.library',
    brand: 'agency.v1.brand',
    settings: 'agency.v1.settings',
    copy: 'agency.v1.copy',
  };

  const PAPER_PX = 210 * 96 / 25.4;

  const MARK_SVG =
    '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<path d="M13 10.5h10.2l4.3 4.3v14.7H13z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M23 10.6v4.4h4.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M16.6 20h7.2M16.6 24.2h5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' +
    '</svg>';

  /* ---------- storage ---------- */
  const store = {
    get(k, fallback) {
      try {
        const raw = localStorage.getItem(k);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  const state = {
    doc: null,
    library: [],
    theme: 'light',
    tab: 'builder',
    view: 'edit',
    zoom: { mode: 'fit', value: 1 },
    overflow: false,
    undo: null,
    saveTimer: null,
    renderQueued: false,
    currentPageCount: 2,
    brand: null,
    settings: { geminiKey: '', geminiModel: '', includePrice: false, brandLock: false },
    design: { rec: null, ref: null, current: null, pendingBrand: null },
    copy: { target: 'summary', framework: 'PAS', inputs: null, text: '', diag: null, det: null },
    geminiBusy: false,
    bridgeTimer: null,
  };

  window.__agency = { state: state, C: C, D: D, AD: AD, CP: CP, B: B, render: function () { renderAll(); } };

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clone(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function savedAgo(ms) {
    if (!ms) return '—';
    const diff = Date.now() - ms;
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    const d = new Date(ms);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return '오늘 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function shortDate(iso) {
    return C.formatDateShort(iso);
  }

  function toast(msg, opts) {
    const root = $('#toastRoot');
    while (root.children.length >= 3) root.removeChild(root.firstChild);
    const el = document.createElement('div');
    el.className = 'toast' + (opts && opts.warn ? ' warn' : '');
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    let ttl = 2600;
    if (opts && opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-action';
      b.textContent = opts.action;
      b.addEventListener('click', function () {
        if (opts.onAction) opts.onAction();
        el.remove();
      });
      el.appendChild(b);
      ttl = 6500;
    }
    root.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; }, ttl);
    setTimeout(function () { el.remove(); }, ttl + 400);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('no clipboard');
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return !!ok;
      } catch (e2) { return false; }
    }
  }

  function download(filename, text, type) {
    try {
      const blob = new Blob([text], { type: type || 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- path binding ---------- */
  function setPath(root, path, value) {
    const p = path.split('.');
    if (p.length === 3) {
      const arr = root[p[0]];
      const idx = Number(p[1]);
      if (Array.isArray(arr) && arr[idx]) arr[idx][p[2]] = value;
      return;
    }
    if (p.length === 2 && root[p[0]] && typeof root[p[0]] === 'object') {
      root[p[0]][p[1]] = value;
      return;
    }
    root[path] = value;
  }

  function readField(el) {
    const path = el.dataset.path;
    if (el.dataset.list === 'lines') {
      return el.value.split('\n');
    }
    if (el.type === 'number' || (el.tagName === 'INPUT' && el.inputMode === 'numeric' && el.dataset.money === 'on')) {
      const raw = String(el.value).replace(/[,\s원]/g, '');
      return raw === '' ? 0 : Number(raw);
    }
    if (path === 'discount.value') {
      const raw = String(el.value).replace(/[,\s원%]/g, '');
      return raw === '' ? 0 : Number(raw);
    }
    return el.value;
  }

  function writeField(el, path) {
    const v = path.split('.').reduce(function (o, k) { return (o === null || o === undefined) ? undefined : o[k]; }, state.doc);
    if (el.dataset.list === 'lines') { el.value = Array.isArray(v) ? v.join('\n') : ''; return; }
    if ((el.dataset.money === 'on') || path === 'discount.value') {
      const n = C.toNum(v, 0);
      el.value = path === 'discount.value' && state.doc.discount.mode === 'percent'
        ? String(n)
        : C.formatNumber(n);
      return;
    }
    el.value = v === undefined || v === null ? '' : v;
  }

  function fillForm() {
    $$('[data-path]').forEach(function (el) { writeField(el, el.dataset.path); });
    syncConditionalUI();
  }

  function syncConditionalUI() {
    const mode = state.doc.discount.mode;
    const wrap = $('#discountValueWrap');
    if (wrap) wrap.hidden = mode === 'none';
    const label = $('#discountValueLabel');
    if (label) label.textContent = mode === 'percent' ? '할인율 (%)' : '할인액 (원)';
    const dv = $('[data-path="discount.value"]');
    if (dv) {
      dv.inputMode = mode === 'percent' ? 'decimal' : 'numeric';
      dv.dataset.money = mode === 'amount' ? 'on' : 'off';
    }
    $$('#docTypeSeg .seg-btn').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.doctype === state.doc.meta.docType);
    });
    $$('#vatSeg .seg-btn').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.vat === state.doc.vat.mode);
    });
  }

  /* ---------- items / milestones ---------- */
  function netOf(item) {
    const gross = Math.round(C.toNum(item.qty, 0) * C.toNum(item.unitPrice, 0));
    return gross - Math.round(gross * C.toNum(item.discountPct, 0) / 100);
  }

  function unitOptions(unit) {
    return C.UNITS.map(function (u) {
      return '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
  }

  function itemRowHtml(item, i) {
    return '' +
      '<div class="item-row" data-index="' + i + '">' +
        '<div class="it-name">' +
          '<span class="il">항목명</span>' +
          '<input data-path="items.' + i + '.name" value="' + esc(item.name) + '" placeholder="예: 기획 · 요구사항 정의" maxlength="80" aria-label="항목명 ' + (i + 1) + '" autocomplete="off">' +
        '</div>' +
        '<div class="it-net"><span class="il">금액</span><b>' + C.formatWon(netOf(item)) + '</b></div>' +
        '<div class="it-del"><button type="button" class="del" data-action="remove-item" data-index="' + i + '" aria-label="항목 ' + (i + 1) + ' 삭제" title="삭제">✕</button></div>' +
        '<div class="it-detail">' +
          '<input data-path="items.' + i + '.detail" value="' + esc(item.detail) + '" placeholder="상세 설명 (선택)" maxlength="120" aria-label="상세 ' + (i + 1) + '" autocomplete="off">' +
        '</div>' +
        '<div class="it-nums">' +
          '<label class="nf nf-qty"><span>수량</span><input type="number" data-path="items.' + i + '.qty" value="' + item.qty + '" min="0" max="9999" step="1" aria-label="수량 ' + (i + 1) + '"></label>' +
          '<label class="nf nf-unit"><span>단위</span><select data-path="items.' + i + '.unit" aria-label="단위 ' + (i + 1) + '">' + unitOptions(item.unit) + '</select></label>' +
          '<label class="nf nf-price"><span>단가</span><input data-path="items.' + i + '.unitPrice" data-money="on" value="' + C.formatNumber(item.unitPrice) + '" inputmode="numeric" aria-label="단가 ' + (i + 1) + '"></label>' +
          '<label class="nf nf-disc"><span>할인</span><input type="number" data-path="items.' + i + '.discountPct" value="' + item.discountPct + '" min="0" max="100" step="1" aria-label="할인율 ' + (i + 1) + '"><em>%</em></label>' +
        '</div>' +
      '</div>';
  }

  function renderItems() {
    const box = $('#itemRows');
    const items = state.doc.items;
    if (!items.length) {
      box.innerHTML = '<p class="items-empty">항목이 없습니다. 서비스 패키지를 고르거나 <b>+ 항목 추가</b>를 누르세요.</p>';
    } else {
      box.innerHTML = items.map(itemRowHtml).join('');
    }
    $('#itemCountLabel').textContent = items.length + '개 항목';
  }

  function refreshItemNets() {
    $$('.item-row').forEach(function (row) {
      const i = Number(row.dataset.index);
      const item = state.doc.items[i];
      if (!item) return;
      const b = row.querySelector('.it-net b');
      if (b) b.textContent = C.formatWon(netOf(item));
    });
  }

  function milestoneRowHtml(m, i) {
    return '' +
      '<div class="ms-row" data-index="' + i + '">' +
        '<span class="ms-no">' + (i + 1) + '</span>' +
        '<input data-path="milestones.' + i + '.name" value="' + esc(m.name) + '" placeholder="단계명" maxlength="40" aria-label="단계 ' + (i + 1) + ' 이름" autocomplete="off">' +
        '<input data-path="milestones.' + i + '.period" value="' + esc(m.period) + '" placeholder="기간 (예: 2주차)" maxlength="30" aria-label="단계 ' + (i + 1) + ' 기간" autocomplete="off">' +
        '<input type="number" data-path="milestones.' + i + '.ratio" value="' + m.ratio + '" min="0" max="100" step="1" aria-label="단계 ' + (i + 1) + ' 비중" class="ms-ratio">' +
        '<span class="ms-amount">' + C.formatWon(0) + '</span>' +
      '</div>';
  }

  function renderMilestones() {
    const box = $('#milestoneRows');
    const ms = state.doc.milestones;
    const head = '<div class="ms-head"><span></span><span>단계</span><span>기간</span><span>비중%</span><span>금액</span></div>';
    box.innerHTML = head + ms.map(milestoneRowHtml).join('');
    refreshMilestoneAmounts();
  }

  function refreshMilestoneAmounts() {
    const t = C.computeTotals(state.doc);
    const ms = C.computeMilestones(state.doc, t.total);
    $$('.ms-row').forEach(function (row) {
      const i = Number(row.dataset.index);
      const cell = row.querySelector('.ms-amount');
      if (cell && ms.rows[i]) cell.textContent = C.formatWon(ms.rows[i].amount);
    });
    const valid = ms.valid;
    const label = $('#ratioLabel');
    label.textContent = '비중 합계 ' + ms.ratioTotal + '%' + (valid ? '' : ' · 100%로 맞춰주세요');
    label.classList.toggle('is-over', !valid);
    const bar = $('#ratioFill');
    const total = Math.max(1, ms.ratioTotal);
    bar.style.width = Math.min(100, total) + '%';
    bar.parentElement.classList.toggle('is-over', ms.ratioTotal > 100 || ms.ratioTotal < 100);
  }

  /* ---------- totals / readiness ---------- */
  function updateTotals() {
    const t = C.computeTotals(state.doc);
    $('#sumSupply').textContent = C.formatWon(t.netSupply);
    $('#sumVatLabel').textContent = t.vatMode === 'included' ? '부가세 10% (포함)' : '부가세 10%';
    $('#sumVat').textContent = C.formatWon(t.vat);
    $('#sumTotal').textContent = C.formatWon(t.total);
    const tp = $('#totalPill');
    if (tp) tp.textContent = C.formatWon(t.total);

    const c = C.completeness(state.doc);
    const pill = $('#readyPill');
    pill.textContent = '준비 ' + c.done + '/' + c.total;
    pill.dataset.ready = c.ready ? '1' : '0';
    const score = $('#checkScore');
    score.textContent = c.score + '%';
    score.classList.toggle('is-ready', c.ready);
    $('#checkHint').textContent = c.ready
      ? '필수 항목이 모두 채워졌습니다. 인쇄해서 바로 보낼 수 있습니다.'
      : '비어 있거나 플레이스홀더(○○, 010-0000-0000)인 항목을 실제 정보로 바꾸면 바로 보낼 수 있습니다.';
  }

  function renderChecklist() {
    const c = C.completeness(state.doc);
    $('#checkList').innerHTML = c.checks.map(function (k) {
      return '<li class="' + (k.done ? 'is-done' : '') + '" data-check="' + k.id + '">' +
        '<span class="ck" aria-hidden="true">' + (k.done ? '✓' : '') + '</span>' +
        '<span><span class="ck-label">' + esc(k.label) + '</span>' +
        '<span class="ck-hint">' + esc(k.hint) + '</span></span></li>';
    }).join('');
  }

  /* ---------- papers ---------- */
  function brandHead(doc, kind) {
    const sup = doc.supplier;
    const meta = doc.meta;
    return '' +
      '<header class="p-head">' +
        '<div class="p-brand">' +
          '<span class="p-mark">' + MARK_SVG + '</span>' +
          '<div class="p-brand-txt">' +
            '<b>' + esc(sup.name || '공급자명') + '</b>' +
            '<span>' + esc([sup.owner, sup.phone].filter(Boolean).join(' · ') || '담당자 · 연락처') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="p-doc-meta">' +
          '<b>' + kind + '</b>' +
          '<span>' + esc(meta.number || '—') + '</span>' +
          '<span>' + esc(C.formatDate(meta.issueDate)) + '</span>' +
        '</div>' +
      '</header>';
  }

  function proposalHtml(doc, t, pageNo, pages) {
    const pr = doc.project;
    const cli = doc.client;
    const range = C.rangeText(doc);
    const ms = C.computeMilestones(doc, t.total);
    const scope = (pr.scope || []).filter(function (s) { return String(s).trim(); });

    const scopeHtml = scope.length
      ? '<ol class="p-scope">' + scope.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>'
      : '<p class="p-empty">작업 범위를 입력하면 이 자리에 단계별로 정리됩니다.</p>';

    const chips = (pr.deliverables || []).filter(Boolean);
    const chipsHtml = chips.length
      ? '<div class="p-chips"><b>산출물</b>' + chips.map(function (d) { return '<span>' + esc(d) + '</span>'; }).join('') + '</div>'
      : '';
    const excl = (pr.notIncluded || []).filter(Boolean);
    const exclHtml = excl.length
      ? '<div class="p-exclude"><b>제외 범위</b> · ' + esc(excl.join(' · ')) + '</div>'
      : '';

    const schedRows = ms.rows.map(function (r) {
      return '<tr><td><b>' + esc(r.name || '단계') + '</b></td><td>' + esc(r.period || '—') + '</td>' +
        '<td class="num">' + r.ratio + '%</td><td class="num">' + C.formatWon(r.amount) + '</td></tr>';
    }).join('');

    const terms = doc.terms;
    const termRows = [
      ['결제', terms.payment],
      ['유지보수', terms.maintenance],
      ['저작권', terms.copyright],
      ['비고', terms.note],
    ].filter(function (r) { return String(r[1] || '').trim(); })
      .map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');

    return '' +
      '<article class="paper paper-proposal" data-page="proposal" aria-label="제안서 미리보기">' +
        brandHead(doc, 'PROPOSAL') +
        '<div class="p-flow">' +
          '<div class="p-title-block">' +
            '<span class="p-kicker">프로젝트 제안서</span>' +
            '<h1>' + esc(doc.meta.title || '프로젝트 제목') + '</h1>' +
            '<p class="p-to">' + esc([cli.company || '고객사', cli.contact, cli.role].filter(Boolean).join(' ')) + ' 님 귀하</p>' +
          '</div>' +
          (pr.summary ? '<p class="p-lead">' + esc(pr.summary) + '</p>' : '') +
          (String(pr.pitch || '').trim() ? '<p class="p-pitch">' + esc(pr.pitch) + '</p>' : '') +
          '<section class="p-sec"><h2><i>01</i> 제안 배경</h2>' +
            (String(pr.background || '').trim()
              ? '<p class="p-text">' + esc(pr.background) + '</p>'
              : '<p class="p-empty">제안 배경을 적으면 여기에 표시됩니다.</p>') +
          '</section>' +
          '<section class="p-sec"><h2><i>02</i> 작업 범위</h2>' + scopeHtml + chipsHtml + exclHtml + '</section>' +
          '<section class="p-sec"><h2><i>03</i> 추진 일정</h2>' +
            '<div class="p-range">' + esc(range.text) + '</div>' +
            '<table class="p-sched"><thead><tr><th>단계</th><th>기간</th><th class="num">비중</th><th class="num">금액</th></tr></thead>' +
            '<tbody>' + schedRows + '</tbody>' +
            '<tfoot><tr><td colspan="2">합계</td><td class="num">' + ms.ratioTotal + '%</td><td class="num">' + C.formatWon(t.total) + '</td></tr></tfoot>' +
            '</table>' +
          '</section>' +
          (termRows ? '<section class="p-sec"><h2><i>04</i> 조건</h2><dl class="p-terms">' + termRows + '</dl></section>' : '') +
          '<div class="p-close">' +
            '<span>' + esc(String(pr.closing || '').trim() || '위와 같이 제안드립니다. 검토 후 회신 주시면 일정과 착수일을 확정하겠습니다.') + '</span>' +
            '<b>' + esc(C.formatDate(doc.meta.issueDate)) + ' · ' + esc(doc.supplier.name || '공급자') + '</b>' +
          '</div>' +
        '</div>' +
        '<footer class="p-foot"><span>' + esc([doc.supplier.name, doc.supplier.email].filter(Boolean).join(' · ') || '공급자 정보') + '</span>' +
          '<span>' + pageNo + ' / ' + pages + '</span></footer>' +
      '</article>';
  }

  function quoteHtml(doc, t, pageNo, pages) {
    const sup = doc.supplier;
    const cli = doc.client;
    const meta = doc.meta;
    const range = C.rangeText(doc);
    const valid = C.validUntil(doc);
    const ms = C.computeMilestones(doc, t.total);

    const itemRows = t.count
      ? t.lines.map(function (l, i) {
        return '<tr>' +
          '<td class="c">' + (i + 1) + '</td>' +
          '<td><b>' + esc(l.name || '항목') + '</b>' +
            (l.detail ? '<span class="q-detail">' + esc(l.detail) + '</span>' : '') + '</td>' +
          '<td class="num">' + l.qty + ' ' + esc(l.unit) + '</td>' +
          '<td class="num">' + C.formatNumber(l.unitPrice) + '</td>' +
          '<td class="num">' + (l.discount ? '−' + C.formatNumber(l.discount) : '–') + '</td>' +
          '<td class="num strong">' + C.formatNumber(l.net) + '</td>' +
        '</tr>';
      }).join('')
      : '<tr><td class="q-none" colspan="6">항목이 없습니다. 빌더에서 패키지를 고르거나 항목을 추가하세요.</td></tr>';

    const totals = C.totalRows(doc, t).map(function (r) {
      const v = r.value < 0 ? '−' + C.formatNumber(Math.abs(r.value)) : C.formatNumber(r.value);
      return '<tr class="' + (r.kind || '') + '"><th>' + esc(r.label) + '</th><td>' + v + '원</td></tr>';
    }).join('');

    const payRows = ms.rows.map(function (r) {
      return '<tr><th>' + esc(r.name || '단계') + ' · ' + r.ratio + '%</th>' +
        '<td>' + C.formatWon(r.amount) + '</td><td>' + esc(r.period || '—') + '</td></tr>';
    }).join('');

    const partyDl = function (rows) {
      return '<dl>' + rows.filter(function (r) { return r[1]; }).map(function (r) {
        return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>';
      }).join('') + '</dl>';
    };

    const note = doc.terms.note ? '<p>' + esc(doc.terms.note) + '</p>' : '';

    return '' +
      '<article class="paper paper-quote" data-page="quote" aria-label="견적서 미리보기">' +
        '<header class="q-head">' +
          '<div class="q-title"><span>QUOTATION</span><h1>견 적 서</h1></div>' +
          '<div class="q-meta"><table>' +
            '<tr><th>견적번호</th><td>' + esc(meta.number || '—') + '</td></tr>' +
            '<tr><th>작성일</th><td>' + esc(C.formatDate(meta.issueDate)) + '</td></tr>' +
            '<tr><th>유효기간</th><td>' + meta.validDays + '일 (' + esc(shortDate(valid)) + '까지)</td></tr>' +
          '</table></div>' +
        '</header>' +
        '<div class="p-flow">' +
          '<div class="q-parties">' +
            '<div class="q-party"><h3>공급자</h3>' + partyDl([
              ['상호', sup.name], ['대표', sup.owner], ['연락처', sup.phone],
              ['이메일', sup.email], ['사업자', sup.bizNo], ['주소', sup.address],
            ]) + '</div>' +
            '<div class="q-party"><h3>수신자</h3>' + partyDl([
              ['회사', cli.company], ['담당자', [cli.contact, cli.role].filter(Boolean).join(' ')],
              ['이메일', cli.email],
            ]) + '</div>' +
          '</div>' +
          '<div class="q-project"><span>프로젝트</span><b>' + esc(meta.title || '프로젝트 제목') + '</b>' +
            '<span class="q-period">' + esc(range.text) + '</span></div>' +
          '<table class="q-table">' +
            '<colgroup><col class="c-no"><col><col class="c-qty"><col class="c-price"><col class="c-disc"><col class="c-amt"></colgroup>' +
            '<thead><tr><th>No</th><th>품목 / 상세</th><th class="num">수량</th><th class="num">단가</th><th class="num">할인</th><th class="num">금액</th></tr></thead>' +
            '<tbody>' + itemRows + '</tbody>' +
          '</table>' +
          '<div class="q-bottom">' +
            '<div class="q-note"><b>결제 조건</b><p>' + esc(doc.terms.payment || '결제 조건을 입력하세요.') + '</p>' + note + '</div>' +
            '<div class="q-totals"><table>' + totals + '</table></div>' +
          '</div>' +
          '<div class="q-words"><b>' + esc(C.wonInWords(t.total)) + '</b>' +
            '<span>(' + (t.vatMode === 'included' ? 'VAT 포함' : 'VAT 별도') + ')</span></div>' +
          '<div class="q-pay"><h3>결제 일정</h3><table><tbody>' + payRows + '</tbody></table></div>' +
          '<div class="q-sign">' +
            '<p>위 견적은 작성일로부터 ' + meta.validDays + '일간 유효합니다.<br>' +
              (doc.terms.maintenance ? esc(doc.terms.maintenance) : '') + '</p>' +
            '<div class="q-sign-box"><span>' + esc(C.formatDate(meta.issueDate)) + '</span>' +
              '<b>' + esc(sup.name || '공급자') + '</b>' +
              '<div class="q-sign-line"><span class="q-stamp">(인)</span></div></div>' +
          '</div>' +
        '</div>' +
        '<footer class="p-foot"><span>' + esc([sup.name, sup.phone, sup.email].filter(Boolean).join(' · ') || '공급자 정보') + '</span>' +
          '<span>' + pageNo + ' / ' + pages + '</span></footer>' +
      '</article>';
  }

  function renderPapers() {
    const doc = state.doc;
    const t = C.computeTotals(doc);
    const pages = C.pageList(doc);
    state.currentPageCount = pages.length;
    $('#paperStack').innerHTML = pages.map(function (id, i) {
      return id === 'proposal' ? proposalHtml(doc, t, i + 1, pages.length) : quoteHtml(doc, t, i + 1, pages.length);
    }).join('');

    applyPaperDesign();

    $('#pageChip').textContent = 'A4 · ' + pages.length + '쪽';
    $('#docTypeHint').textContent = 'A4 ' + pages.length + '쪽';
    $('#mobilePageTag').textContent = pages.length + '쪽';

    fitPaperContent();
    if (state.zoom.mode === 'fit') applyZoom(false);
  }

  function fitPaperContent() {
    let overflow = false;
    $$('.paper').forEach(function (p) {
      p.classList.remove('fit-1', 'fit-2', 'is-over');
      const flow = p.querySelector('.p-flow');
      if (!flow) return;
      const fits = function () { return flow.scrollHeight <= flow.clientHeight + 2; };
      if (!fits()) p.classList.add('fit-1');
      if (!fits()) p.classList.add('fit-2');
      if (!fits()) { p.classList.add('is-over'); overflow = true; }
    });
    state.overflow = overflow;
    const pill = $('#overflowPill');
    if (pill) pill.hidden = !overflow;
  }

  /* ---------- zoom ---------- */
  function applyZoom(remeasure) {
    const stack = $('#paperStack');
    const scroll = $('#previewScroll');
    if (!stack || !scroll) return;
    let z;
    if (state.zoom.mode === 'fit') {
      const cs = getComputedStyle(scroll);
      const avail = scroll.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      z = avail > 40 ? Math.min(1, (avail - 2) / PAPER_PX) : 1;
      z = Math.max(0.3, Math.round(z * 1000) / 1000);
      state.zoom.value = z;
    } else {
      z = state.zoom.value;
    }
    if (stack.style.zoom !== String(z)) stack.style.zoom = String(z);
    $('#zoomLabel').textContent = Math.round(z * 100) + '%';
    if (remeasure !== false) fitPaperContent();
  }

  function setZoom(delta) {
    const base = state.zoom.mode === 'fit' ? state.zoom.value : state.zoom.value;
    state.zoom.mode = 'manual';
    state.zoom.value = Math.min(1.5, Math.max(0.3, Math.round((base + delta) * 100) / 100));
    applyZoom();
  }

  function fitZoom() {
    state.zoom.mode = 'fit';
    applyZoom();
  }

  /* ---------- document lifecycle ---------- */
  function scheduleRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(function () {
      state.renderQueued = false;
      renderPapers();
      updateTotals();
      refreshMilestoneAmounts();
      renderChecklist();
      scheduleBridge();
    });
  }

  function scheduleSave(label) {
    const el = $('#saveState');
    el.classList.add('is-saving');
    el.textContent = '저장 중…';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      state.doc.updatedAt = Date.now();
      const ok = store.set(KEY.doc, state.doc);
      el.classList.remove('is-saving');
      el.textContent = ok ? '저장됨' : '저장 실패';
    }, 380);
  }

  function saveNow() {
    clearTimeout(state.saveTimer);
    state.doc.updatedAt = Date.now();
    store.set(KEY.doc, state.doc);
    $('#saveState').classList.remove('is-saving');
    $('#saveState').textContent = '저장됨';
  }

  function pushUndo(label) {
    state.undo = { doc: clone(state.doc), label: label || '변경' };
  }

  function undoLast() {
    if (!state.undo) { toast('되돌릴 내용이 없습니다', { warn: true }); return; }
    state.doc = C.sanitizeDoc(state.undo.doc, Date.now());
    state.undo = null;
    afterDocReplace();
    toast('이전 내용으로 되돌렸습니다');
  }

  function afterDocReplace(opts) {
    const keepTab = opts && opts.keepTab;
    fillForm();
    renderItems();
    renderMilestones();
    renderPresetChips();
    syncConditionalUI();
    renderPapers();
    updateTotals();
    renderChecklist();
    saveNow();
    syncFeaturePanels({ resetCopy: true, resetFw: true });
    if (!keepTab) setTab('builder');
    if (state.tab === 'library') renderLibrary();
  }

  function applyPresetId(id) {
    const preset = D.PRESETS.filter(function (p) { return p.id === id; })[0];
    if (!preset) return;
    pushUndo('프리셋');
    state.doc = C.applyPreset(state.doc, preset);
    afterDocReplace();
    toast('‘' + preset.short + '’ 패키지를 불러왔습니다', { action: '되돌리기', onAction: undoLast });
  }

  /* ---------- presets / pricing ---------- */
  function renderPresetChips() {
    $('#presetChips').innerHTML = D.PRESETS.map(function (p) {
      return '<button type="button" class="preset-chip' + (state.doc.presetId === p.id ? ' is-on' : '') + '"' +
        ' data-action="use-preset" data-preset="' + p.id + '" title="' + esc(p.range) + ' · ' + esc(p.durationLabel) + '">' +
        '<span class="pc-no">' + p.no + '</span><span class="pc-name">' + esc(p.short) + '</span></button>';
    }).join('');
  }

  function renderPricing() {
    $('#presetGrid').innerHTML = D.PRESETS.map(function (p) {
      const rows = p.items.map(function (it) {
        return '<div class="pc-item"><span>' + esc(it.name) + '</span>' +
          '<em>' + it.qty + esc(it.unit) + ' × ' + C.formatNumber(it.unitPrice) + '</em>' +
          '<b>' + C.formatNumber(it.qty * it.unitPrice) + '</b></div>';
      }).join('');
      return '<article class="preset-card" data-preset-card="' + p.id + '">' +
        '<div class="pc-head">' +
          '<span class="pc-num">' + p.no + '</span>' +
          '<div class="pc-title"><span class="pc-tag">' + esc(p.tag) + '</span><h3>' + esc(p.name) + '</h3></div>' +
          '<div class="pc-range"><b>' + esc(p.range) + '</b><span>VAT 별도</span></div>' +
        '</div>' +
        '<p class="pc-desc">' + esc(p.summary) + '</p>' +
        '<div class="pc-items">' + rows + '</div>' +
        '<div class="pc-upgrade">확장: ' + esc(p.upgrade) + '</div>' +
        '<div class="pc-foot">' +
          '<span class="pc-meta">' + esc(p.durationLabel) + '<br>범위 ' + p.scope.length + '개 · 일정 ' + p.milestones.length + '단계</span>' +
          '<button type="button" class="btn btn-primary" data-action="use-preset" data-preset="' + p.id + '">이 패키지로 견적</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ---------- library ---------- */
  function loadLibrary() {
    const raw = store.get(KEY.lib, []);
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 40).map(function (e, i) {
      if (!e || typeof e !== 'object') return null;
      return {
        id: String(e.id || 'lib-' + i),
        name: C.oneLine(e.name, 80) || '이름 없는 문서',
        savedAt: C.toNum(e.savedAt, Date.now()),
        doc: C.sanitizeDoc(e.doc, Date.now()),
      };
    }).filter(Boolean);
  }

  function persistLibrary() { store.set(KEY.lib, state.library); }

  function renderLibrary() {
    const lib = state.library;
    const tabCount = $('#tabLibCount');
    tabCount.hidden = lib.length === 0;
    tabCount.textContent = lib.length;
    $('#libraryEmpty').hidden = lib.length > 0;
    $('#libraryList').innerHTML = lib.map(function (e) {
      const t = C.computeTotals(e.doc);
      const pages = C.pageList(e.doc).length;
      return '<article class="lib-item" data-lib="' + esc(e.id) + '">' +
        '<header><h3>' + esc(e.name) + '</h3><span class="lib-badge">' + (pages === 2 ? '제안+견적' : pages === 1 && e.doc.meta.docType === 'quote' ? '견적서' : '제안서') + '</span></header>' +
        '<div class="lib-meta"><span>' + esc(e.doc.client.company || '고객 미입력') + '</span><span>·</span>' +
          '<span><b>' + C.formatWon(t.total) + '</b> (' + (t.vatMode === 'included' ? 'VAT 포함' : 'VAT 별도') + ')</span>' +
          '<span>·</span><span>' + savedAgo(e.savedAt) + '</span></div>' +
        '<div class="lib-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="open-entry" data-id="' + esc(e.id) + '">열기</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="template-entry" data-id="' + esc(e.id) + '">템플릿으로</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="export-entry" data-id="' + esc(e.id) + '">JSON</button>' +
          '<button type="button" class="btn btn-ghost btn-sm danger" data-action="delete-entry" data-id="' + esc(e.id) + '">삭제</button>' +
        '</div>' +
      '</article>';
    }).join('');

    const t = C.computeTotals(state.doc);
    $('#autosaveCard').innerHTML =
      '<span class="la-dot"></span><b>자동 저장 중인 문서</b>' +
      '<span>' + esc(state.doc.meta.title) + ' · ' + C.formatWon(t.total) + ' · ' + savedAgo(state.doc.updatedAt) + '</span>' +
      '<span class="la-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="save-doc">이름 붙여 저장</button></span>';
  }

  function findEntry(id) {
    return state.library.filter(function (e) { return e.id === id; })[0] || null;
  }

  function saveCurrentDoc() {
    const t = C.computeTotals(state.doc);
    const fallbackName = (state.doc.meta.title || '견적서') + ' · ' + (state.doc.client.company || '고객사');
    openModal('' +
      '<div class="modal-head"><h2>현재 문서 저장</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body">' +
        '<p>' + C.formatWon(t.total) + ' · ' + esc(state.doc.meta.number) + '</p>' +
        '<label class="field"><span class="flabel">보관 이름</span><input id="saveName" maxlength="80" value="' + esc(fallbackName) + '"></label>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="confirm-save">저장</button></div>');
    const input = $('#saveName');
    if (input) { input.focus(); input.select(); }
  }

  function confirmSave() {
    const input = $('#saveName');
    const name = C.oneLine(input ? input.value : '', 80) || state.doc.meta.title;
    state.library.unshift({
      id: 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      name: name,
      savedAt: Date.now(),
      doc: clone(state.doc),
    });
    state.library = state.library.slice(0, 40);
    persistLibrary();
    closeModal();
    renderLibrary();
    toast('‘' + name + '’ 문서를 보관했습니다');
  }

  function openEntry(id) {
    const e = findEntry(id);
    if (!e) return;
    pushUndo('문서 열기');
    state.doc = C.sanitizeDoc(e.doc, Date.now());
    afterDocReplace();
    toast('‘' + e.name + '’ 문서를 불러왔습니다', { action: '되돌리기', onAction: undoLast });
  }

  function applyTemplateEntry(id) {
    const e = findEntry(id);
    if (!e) return;
    pushUndo('템플릿 적용');
    const base = C.sanitizeDoc(state.doc, Date.now());
    const src = C.sanitizeDoc(e.doc, Date.now());
    state.doc = C.sanitizeDoc({
      version: 1,
      presetId: src.presetId,
      meta: Object.assign({}, base.meta, {
        title: src.meta.title,
        durationDays: src.meta.durationDays,
        validDays: base.meta.validDays,
      }),
      supplier: base.supplier,
      client: base.client,
      project: src.project,
      items: src.items,
      discount: src.discount,
      vat: { mode: base.vat.mode, rate: C.VAT_RATE },
      milestones: src.milestones,
      terms: src.terms,
      design: base.design,
      updatedAt: Date.now(),
    }, Date.now());
    afterDocReplace();
    toast('수신자·번호는 그대로 두고 서비스 내용만 불러왔습니다', { action: '되돌리기', onAction: undoLast });
  }

  function deleteEntry(id) {
    const e = findEntry(id);
    if (!e) return;
    openModal('' +
      '<div class="modal-head"><h2>보관 문서 삭제</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body"><p><b>' + esc(e.name) + '</b> 문서를 보관함에서 지웁니다. 작성 중인 문서와는 별개입니다.</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="confirm-delete" data-id="' + esc(id) + '">삭제</button></div>');
  }

  function confirmDelete(id) {
    state.library = state.library.filter(function (e) { return e.id !== id; });
    persistLibrary();
    closeModal();
    renderLibrary();
    toast('보관 문서를 삭제했습니다');
  }

  function exportJson() {
    const payload = { app: 'agency-proposal-maker', version: 1, exportedAt: new Date().toISOString(), doc: state.doc };
    const ok = download('견적서-' + (state.doc.meta.number || 'draft') + '.json', JSON.stringify(payload, null, 2));
    toast(ok ? 'JSON 파일을 내려받았습니다' : '다운로드에 실패했습니다', ok ? null : { warn: true });
  }

  function exportEntry(id) {
    const e = findEntry(id);
    if (!e) return;
    const payload = { app: 'agency-proposal-maker', version: 1, exportedAt: new Date().toISOString(), doc: e.doc };
    download('견적서-' + (e.doc.meta.number || 'doc') + '.json', JSON.stringify(payload, null, 2));
    toast('JSON 파일을 내려받았습니다');
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawDoc = parsed && parsed.doc ? parsed.doc : parsed;
        if (!rawDoc || typeof rawDoc !== 'object' || !rawDoc.meta) throw new Error('doc 없음');
        pushUndo('JSON 불러오기');
        state.doc = C.sanitizeDoc(rawDoc, Date.now());
        state.doc.meta.issueDate = state.doc.meta.issueDate || C.isoFromDate(new Date());
        afterDocReplace();
        toast('JSON 문서를 불러왔습니다', { action: '되돌리기', onAction: undoLast });
      } catch (err) {
        toast('이 파일은 견적서 JSON이 아닙니다', { warn: true });
      }
    };
    reader.readAsText(file);
  }

  function newDoc() {
    openModal('' +
      '<div class="modal-head"><h2>새 문서</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body"><p>작성 중인 내용을 지우고 빈 견적서로 시작합니다. 보관함에 저장한 문서는 그대로 남습니다.</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="confirm-new">새로 시작</button></div>');
  }

  function confirmNew() {
    pushUndo('새 문서');
    const b = C.blankDoc(Date.now());
    b.supplier = Object.assign({}, D.PLACEHOLDER.supplier);
    b.client = Object.assign({}, D.PLACEHOLDER.client);
    b.meta.title = '프로젝트 제안 및 견적';
    b.terms.payment = '계약금 30% 입금 후 착수, 잔금 70%는 납품 후 7일 이내.';
    b.terms.maintenance = '납품 후 30일 이내 오류 수정 무상.';
    if (state.settings.brandLock && state.brand) b.design = { id: 'brand', custom: null };
    state.doc = C.sanitizeDoc(b, Date.now());
    closeModal();
    afterDocReplace();
    toast('새 문서로 시작합니다');
  }

  /* ============================================================
     업그레이드 · 디자인 (핀터레스트 스타일 · 브랜드 · 팔레트)
     ============================================================ */

  function presetName() {
    const p = D.PRESETS.filter(function (x) { return x.id === state.doc.presetId; })[0];
    return p ? p.short : '';
  }

  function currentDesign() {
    if (!AD) return null;
    try { return AD.themeFor(state.doc.design, { brand: state.brand }); } catch (e) { return null; }
  }

  function paletteDots(pal) {
    if (!pal) return '';
    const keys = ['bg', 'surface', 'accent', 'ink', 'line'];
    return '<span class="dc-swatches">' + keys.map(function (k) {
      return '<i style="background:' + esc(pal[k] || '#ffffff') + '"></i>';
    }).join('') + '</span>';
  }

  function applyPaperDesign() {
    const stack = $('#paperStack');
    if (!stack || !AD) return;
    const res = currentDesign();
    if (!res) return;
    let pt;
    try { pt = AD.paperTheme(res.theme); } catch (e) { return; }
    Object.keys(pt.vars).forEach(function (k) { stack.style.setProperty(k, pt.vars[k]); });
    stack.dataset.structure = pt.structure;
    stack.dataset.design = res.specId;
    $$('.paper').forEach(function (p) {
      p.dataset.structure = pt.structure;
      p.dataset.design = res.specId;
    });
    state.design.current = { res: res, pt: pt };
    const pill = $('#designPill');
    if (pill) pill.textContent = '디자인 · ' + (res.isBrand ? '🔒 ' : '') + res.name;
    renderBuilderDesign();
  }

  function structureClass(structure) {
    if (structure === 'minimal-poster') return 'dt-minimal';
    if (structure === 'split-editorial') return 'dt-editorial';
    if (structure === 'bento-modular') return 'dt-bento';
    if (structure === 'product-stack') return 'dt-commerce';
    if (structure === 'brutal-block') return 'dt-brutal';
    if (structure === 'pop-stack') return 'dt-pop';
    if (structure === 'full-bleed-photo') return 'dt-dark';
    return 'dt-swiss';
  }

  function miniThumb(id) {
    let res, pt;
    try {
      res = AD.themeFor(id, { brand: state.brand });
      pt = AD.paperTheme(res.theme);
    } catch (e) { return ''; }
    const v = pt.vars;
    const cls = structureClass(pt.structure);
    const style = [
      '--t-bg:' + v['--p-paper'],
      '--t-surface:' + v['--p-surface'],
      '--t-ink:' + v['--p-ink'],
      '--t-line:' + v['--p-line'],
      '--t-accent:' + v['--p-brand'],
      '--t-accent-ink:' + v['--p-accent-ink'],
      '--t-radius:' + v['--p-radius'],
      '--t-font:' + v['--p-font-display'],
      '--t-weight:' + v['--p-display-weight'],
      '--t-track:' + v['--p-display-tracking'],
    ].join(';');
    const title = pt.structure === 'minimal-poster' ? '제안서' : (pt.structure === 'brutal-block' ? 'PROPOSAL' : '프로젝트 제안');
    const chip = pt.structure === 'minimal-poster' ? '검토 요청' : (pt.structure === 'pop-stack' ? '9.79만' : '2026.12.14');
    const mass = pt.structure === 'minimal-poster' ? 'QUOTATION' : '₩979,000';
    return '<div class="dc-thumb ' + cls + '" style="' + esc(style) + '" aria-hidden="true">' +
      '<div class="dc-thumb-inner">' +
        '<span class="dc-kicker">PROPOSAL</span>' +
        '<div class="dc-title">' + esc(title) + '</div>' +
        '<div class="dc-lines"><i></i><i></i></div>' +
        '<div class="dc-rows"><i></i><i></i><i></i></div>' +
        '<div class="dc-block"><i></i><i></i><i></i><i></i></div>' +
        '<div class="dc-mass"><span class="dc-chip">' + esc(chip) + '</span><span class="dc-price">' + esc(mass) + '</span></div>' +
      '</div>' +
    '</div>';
  }

  function renderDesignCurrent() {
    const box = $('#designCurrent');
    if (!box) return;
    const res = currentDesign();
    if (!res) {
      box.innerHTML = '<p class="muted">디자인 엔진을 불러오지 못했습니다. engines/design-ref-engine.js를 확인하세요.</p>';
      return;
    }
    const pt = AD.paperTheme(res.theme);
    box.innerHTML =
      '<div class="dc-info">' + paletteDots(res.palette) +
        '<div><b>' + esc(res.name) + '</b><span>' + esc(res.tagline || '') + '</span></div>' +
        (res.isBrand ? '<span class="dc-badge on">🔒 브랜드 고정</span>' : '') +
      '</div>' +
      '<div class="dc-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="design-default">스튜디오 기본</button>' +
        (res.specId !== 'brand' ? '<button type="button" class="btn btn-ghost btn-sm" data-action="design-brand">브랜드로 고정</button>' : '') +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="go-builder">빌더로</button>' +
      '</div>' +
      '<p class="hint" style="flex-basis:100%;margin:4px 0 0">' +
        esc(pt.structure) + ' · 대비 ' + (pt.allPass ? 'WCAG AA 통과' : '일부 미달') +
        (pt.warnings.length ? ' · ' + esc(pt.warnings[0]) : '') +
      '</p>';
  }

  function renderDesignRecs() {
    const box = $('#designRecs');
    if (!box) return;
    const note = $('#designRecNote');
    const ctxEl = $('#designContext');
    const rec = state.design.rec;
    if (!rec) {
      if (ctxEl) ctxEl.textContent = '';
      box.innerHTML = '<p class="muted">[맥락으로 추천]을 누르면 고객사·업종·문구 밀도를 읽고 3~4안을 고릅니다.</p>';
      if (note) note.textContent = '';
      return;
    }
    if (!rec.ok) {
      box.innerHTML = '<p class="muted">추천을 만들지 못했습니다. ' + esc(rec.error || '') + '</p>';
      return;
    }
    if (ctxEl) {
      ctxEl.textContent = rec.context.industry + ' · ' + rec.context.purposeLabel + ' · ' + rec.context.mood + ' · 밀도 ' + rec.context.density.level;
    }
    box.innerHTML = rec.refs.map(function (r) {
      return '<article class="rec-card">' +
        '<div class="rc-head"><b><span class="rec-rank">' + r.rank + '순위</span> ' + esc(r.name) + '</b>' +
          '<span class="rec-score">' + r.percent + '%</span></div>' +
        '<ul>' + r.reasons.slice(0, 3).map(function (x) { return '<li>' + esc(x.text) + '</li>'; }).join('') + '</ul>' +
        '<div class="rec-foot"><button type="button" class="btn btn-ghost btn-sm" data-action="apply-design" data-design="' + esc(r.id) + '">적용</button></div>' +
      '</article>';
    }).join('');
    if (note) note.textContent = rec.note || '';
  }

  function renderDesignGrid() {
    const box = $('#designGrid');
    if (!box || !AD) return;
    const cur = C.normalizeDesign(state.doc.design).id;
    const rec = state.design.rec;
    const list = AD.listThemes();
    box.innerHTML = list.map(function (t) {
      let res, pt;
      try { res = AD.themeFor(t.id, { brand: state.brand }); pt = AD.paperTheme(res.theme); } catch (e) { return ''; }
      const isOn = cur === t.id;
      const rank = rec && rec.ok ? (rec.refs.filter(function (r) { return r.id === t.id; })[0] || {}).rank : null;
      const badges = [];
      if (isOn) badges.push('<span class="dc-badge on">사용 중</span>');
      if (rank) badges.push('<span class="dc-badge ok">추천 ' + rank + '순위</span>');
      if (t.id !== 'studio' && t.proposalScore) badges.push('<span class="dc-badge">제안서 ' + Math.round(t.proposalScore * 100) + '</span>');
      if (t.defaultRisk && t.defaultRisk.risk >= 0.6) badges.push('<span class="dc-badge warn">AI 기본값 위험</span>');
      if (pt.warnings.length) badges.push('<span class="dc-badge warn">인쇄 주의</span>');
      return '<article class="design-card' + (isOn ? ' is-on' : '') + '" data-design-card="' + esc(t.id) + '" data-action="apply-design" data-design="' + esc(t.id) + '">' +
        miniThumb(t.id) +
        '<div class="dc-body">' +
          '<div class="dc-head"><b>' + esc(t.name) + '</b></div>' +
          '<p>' + esc(t.tagline || '') + '</p>' +
          '<div class="dc-badges">' + badges.join('') + '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm dc-apply" data-action="apply-design" data-design="' + esc(t.id) + '">' +
            (isOn ? '적용됨' : '이 디자인 적용') + '</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderBuilderDesign() {
    const row = $('#builderDesignRow');
    if (!row || !AD) return;
    const res = currentDesign();
    if (!res) return;
    const rec = state.design.rec;
    const chips = [];
    chips.push('<span class="dq-chip is-on">' + paletteDots(res.palette) + esc(res.name) + '</span>');
    if (rec && rec.ok) {
      rec.refs.slice(0, 3).forEach(function (r, i) {
        if (r.id === C.normalizeDesign(state.doc.design).id) return;
        chips.push('<button type="button" class="dq-chip" data-action="apply-design" data-design="' + esc(r.id) + '">' +
          esc(r.name) + '<span class="muted">추천 ' + (i + 1) + '</span></button>');
      });
    }
    chips.push('<button type="button" class="dq-chip" data-action="design-default">기본</button>');
    row.innerHTML = chips.join('');
  }

  function renderRefResult() {
    const box = $('#refResult');
    if (!box) return;
    const ref = state.design.ref;
    if (!ref) {
      box.innerHTML = '<span class="muted">로고·상세페이지·브랜드 컷을 넣으면 배경·포인트 색을 뽑아 테마로 만듭니다.</span>';
      return;
    }
    const ex = ref.ex;
    const sw = (ex.raw || []).slice(0, 8).map(function (c) {
      return '<i style="background:' + esc(c.hex) + '" title="' + esc(c.hex) + '"></i>';
    }).join('');
    box.innerHTML =
      '<b>' + esc(ref.source) + ' 레퍼런스</b> · ' + esc(ref.name) +
      '<div class="ref-swatches">' + sw + '</div>' +
      '대비 ' + (ex.allPass ? 'WCAG AA 통과' : '자동 보정됨') +
      ' · 신뢰도 ' + Math.round((ex.confidence || 0) * 100) + '%' +
      (ex.isDefaultLook && ex.isDefaultLook.flagged ? ' · 주의: ' + esc(ex.isDefaultLook.label) : '') +
      '<br>배경 ' + esc(ex.palette.bg) + ' · 포인트 ' + esc(ex.palette.accent) + ' · 글자 ' + esc(ex.palette.ink);
  }

  function renderBrandPanel() {
    const body = $('#brandBody');
    if (!body) return;
    const savedAt = $('#brandSavedAt');
    if (!state.brand || !AD) {
      if (savedAt) savedAt.textContent = '';
      body.innerHTML = '<p class="brand-empty">아직 저장한 브랜드 스타일이 없습니다. 지금 디자인을 저장하면 다음 견적서도 같은 톤으로 시작합니다.</p>' +
        '<div class="brand-actions" style="margin-top:10px">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="brand-save">현재 디자인을 브랜드로 저장</button>' +
        '</div>';
      return;
    }
    const res = AD.themeFor(state.brand.design, {});
    if (savedAt) savedAt.textContent = savedAgo(state.brand.savedAt);
    body.innerHTML =
      '<div class="brand-card">' +
        paletteDots(res.palette) +
        '<div><b>' + esc(state.brand.name) + '</b><span>' + esc(res.name + ' · ' + (res.kind === 'custom' ? '레퍼런스 색' : '프리셋')) + '</span></div>' +
        '<div class="brand-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="brand-apply">이 문서에 적용</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="brand-save">현재 디자인으로 갱신</button>' +
          '<button type="button" class="btn btn-ghost btn-sm danger" data-action="brand-remove">삭제</button>' +
        '</div>' +
      '</div>' +
      '<label class="brand-lock"><input type="checkbox" id="brandLock"' + (state.settings.brandLock ? ' checked' : '') + ' /> 새 문서를 이 브랜드로 시작</label>';
  }

  function renderDesignPage() {
    renderDesignCurrent();
    renderDesignRecs();
    renderDesignGrid();
    renderRefResult();
    renderBrandPanel();
    renderBuilderDesign();
  }

  function designRecommend(silent) {
    if (!AD) return null;
    const rec = AD.recommend(state.doc, { presetName: presetName() });
    state.design.rec = rec;
    renderDesignRecs();
    renderDesignGrid();
    renderBuilderDesign();
    if (!silent) {
      toast(rec.ok ? '제안서 맥락으로 ' + rec.refs.length + '안을 골랐습니다 · 1순위 ' + rec.refs[0].name : '추천을 만들지 못했습니다', rec.ok ? null : { warn: true });
    }
    return rec;
  }

  function applyDesignId(id) {
    if (!AD) { toast('디자인 엔진을 불러오지 못했습니다', { warn: true }); return; }
    pushUndo('디자인');
    state.doc.design = C.normalizeDesign({ id: id });
    afterDocReplace({ keepTab: true });
    renderDesignPage();
    const res = currentDesign();
    const warn = res && res.warnings && res.warnings[0];
    toast('‘' + (res ? res.name : id) + '’ 디자인을 적용했습니다' + (warn ? ' · ' + warn : ''), { action: '되돌리기', onAction: undoLast });
  }

  function designSpecOfCurrent() {
    const d = C.normalizeDesign(state.doc.design);
    if (d.id === 'brand') return state.brand ? state.brand.design : { id: 'studio', custom: null };
    return d;
  }

  /* ---------- 브랜드 스타일 ---------- */

  function loadBrand() {
    const raw = store.get(KEY.brand, null);
    if (!raw || typeof raw !== 'object' || !raw.design) return null;
    const d = C.normalizeDesign(raw.design);
    if (d.id === 'brand') return null;
    return {
      name: C.oneLine(raw.name, 40) || '브랜드 스타일',
      design: d,
      savedAt: C.toNum(raw.savedAt, Date.now()),
    };
  }

  function persistBrand() {
    if (state.brand) store.set(KEY.brand, state.brand);
    else store.del(KEY.brand);
  }

  function saveBrandPrompt(spec) {
    if (!AD) return;
    const s = spec ? C.normalizeDesign(spec) : designSpecOfCurrent();
    if (s.id === 'brand') { toast('이미 브랜드가 적용된 문서입니다', { warn: true }); return; }
    const res = AD.themeFor(s, {});
    state.design.pendingBrand = s;
    openModal('' +
      '<div class="modal-head"><h2>브랜드 스타일로 저장</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body">' +
        '<p>' + esc(res.name) + ' 디자인을 이 브라우저의 브랜드로 저장합니다. 새 견적서에도 같은 톤이 기본으로 적용됩니다.</p>' +
        '<label class="field"><span class="flabel">브랜드 이름</span><input id="brandName" maxlength="40" value="' + esc(res.name) + '" autocomplete="off"></label>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="confirm-brand">저장</button></div>');
    const input = $('#brandName');
    if (input) { input.focus(); input.select(); }
  }

  function confirmBrand() {
    if (!state.design.pendingBrand) { closeModal(); return; }
    const nameEl = $('#brandName');
    const name = C.oneLine(nameEl ? nameEl.value : '', 40) || '브랜드 스타일';
    state.brand = { name: name, design: state.design.pendingBrand, savedAt: Date.now() };
    state.design.pendingBrand = null;
    persistBrand();
    closeModal();
    renderDesignPage();
    toast('‘' + name + '’ 브랜드를 저장했습니다 · 새 문서 기본값' + (state.settings.brandLock ? ' (고정 켬)' : ''), {
      action: '이 문서에 적용',
      onAction: applyBrand,
    });
  }

  function applyBrand() {
    if (!state.brand) { toast('먼저 브랜드를 저장하세요', { warn: true }); return; }
    pushUndo('브랜드 적용');
    state.doc.design = { id: 'brand', custom: null };
    afterDocReplace({ keepTab: true });
    renderDesignPage();
    toast('‘' + state.brand.name + '’ 브랜드를 적용했습니다', { action: '되돌리기', onAction: undoLast });
  }

  function removeBrandPrompt() {
    if (!state.brand) return;
    openModal('' +
      '<div class="modal-head"><h2>브랜드 삭제</h2><button type="button" class="modal-close" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body"><p><b>' + esc(state.brand.name) + '</b> 브랜드 스타일을 지웁니다. 문서에 적용된 디자인은 그대로 남고, 브랜드를 쓰던 문서는 기본 디자인으로 돌아갑니다.</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
        '<button type="button" class="btn btn-primary danger" data-action="confirm-brand-remove">삭제</button></div>');
  }

  function removeBrand() {
    state.brand = null;
    persistBrand();
    if (C.normalizeDesign(state.doc.design).id === 'brand') {
      state.doc.design = { id: 'studio', custom: null };
      afterDocReplace({ keepTab: true });
    }
    closeModal();
    renderDesignPage();
    toast('브랜드 스타일을 삭제했습니다');
  }

  /* ---------- 레퍼런스 이미지 → 팔레트 ---------- */

  function paletteFromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!AD) { reject(new Error('no-engine')); return; }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('read')); };
      reader.onload = function () {
        const img = new Image();
        img.onload = function () {
          const max = 420;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const cx = canvas.getContext('2d', { willReadFrequently: true });
          cx.drawImage(img, 0, 0, w, h);
          resolve(AD.paletteFromImageData(cx.getImageData(0, 0, w, h)));
        };
        img.onerror = function () { reject(new Error('decode')); };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function useReference(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const source = input.id === 'refClient' ? '고객사' : '자사';
    try {
      const ex = await paletteFromFile(file);
      if (!ex || !ex.ok) { toast('팔레트를 뽑지 못했습니다. 다른 이미지로 시도하세요', { warn: true }); return; }
      state.design.ref = { ex: ex, name: String(file.name || 'image').slice(0, 40), source: source };
      renderRefResult();
      const risk = ex.isDefaultLook && ex.isDefaultLook.flagged ? ' · ' + ex.isDefaultLook.label : '';
      toast(source + ' 레퍼런스 색 ' + (ex.raw || []).length + '개 추출' + (ex.allPass ? ' · 대비 통과' : ' · 대비 자동 보정') + risk);
    } catch (e) {
      toast('이미지를 읽지 못했습니다. JPG·PNG로 다시 시도하세요', { warn: true });
    } finally {
      input.value = '';
    }
  }

  function refThemeSpec() {
    const ref = state.design.ref;
    if (!ref || !AD) return null;
    const res = currentDesign();
    let base = 'swiss-magazine';
    if (res) {
      const d = C.normalizeDesign(res.specId === 'brand' ? (state.brand ? state.brand.design : res.specId) : res.specId);
      if (d.id === 'custom' && d.custom) base = d.custom.base;
      else if (AD.isPresetId(d.id)) base = d.id;
    }
    return AD.themeSpecFromPalette(ref.ex, { name: ref.source + ' 레퍼런스 색', base: base });
  }

  function applyRefTheme() {
    const spec = refThemeSpec();
    if (!spec) { toast('먼저 레퍼런스 이미지를 넣어 주세요', { warn: true }); return; }
    pushUndo('레퍼런스 색');
    state.doc.design = C.normalizeDesign(spec);
    afterDocReplace({ keepTab: true });
    renderDesignPage();
    toast('추출한 색을 테마로 적용했습니다', { action: '되돌리기', onAction: undoLast });
  }

  function refToBrand() {
    const spec = refThemeSpec();
    if (!spec) { toast('먼저 레퍼런스 이미지를 넣어 주세요', { warn: true }); return; }
    saveBrandPrompt(spec);
  }

  /* ============================================================
     업그레이드 · 문구 진단 (카피 심리학 엔진)
     ============================================================ */

  function loadCopyState() {
    const raw = store.get(KEY.copy, null);
    if (!raw || typeof raw !== 'object') return;
    if (raw.target) state.copy.target = String(raw.target);
    if (raw.framework) state.copy.framework = String(raw.framework);
    if (raw.inputs && typeof raw.inputs === 'object') state.copy.inputs = raw.inputs;
  }

  function persistCopy() {
    store.set(KEY.copy, { target: state.copy.target, framework: state.copy.framework, inputs: state.copy.inputs });
  }

  function renderCopySeg() {
    const seg = $('#copyTargetSeg');
    if (!seg) return;
    const targets = C.copyTargets(state.doc);
    seg.innerHTML = targets.map(function (t) {
      return '<button type="button" class="seg-btn' + (state.copy.target === t.id ? ' is-on' : '') + '" data-action="copy-target" data-target="' + t.id + '">' + esc(t.label) + '</button>';
    }).join('');
  }

  function loadCopyText(force) {
    const ta = $('#copyTargetText');
    if (!ta) return;
    if (!force && ta.value.trim()) return;
    const t = C.copyTargets(state.doc).filter(function (x) { return x.id === state.copy.target; })[0];
    ta.value = t ? t.text : '';
    diagnoseCopy();
  }

  function diagnoseCopy() {
    const ta = $('#copyTargetText');
    const text = ta ? ta.value : '';
    const chars = $('#copyTargetChars');
    if (chars) chars.textContent = text.trim() ? text.replace(/\s/g, '').length.toLocaleString('ko-KR') + '자' : '';
    if (!CP) {
      const bars = $('#psychBars');
      if (bars) bars.innerHTML = '<p class="muted">카피 엔진을 불러오지 못했습니다. engines/copy-psych-engine.js를 확인하세요.</p>';
      return;
    }
    if (!text.trim()) {
      state.copy.diag = null;
      $('#psychScore').textContent = '0';
      $('#psychGrade').textContent = '';
      $('#psychGradeLabel').textContent = '진단 전';
      $('#psychGradeDesc').textContent = '문구를 넣으면 제안서 기준으로 다시 점수를 매깁니다.';
      $('#psychBars').innerHTML = '';
      $('#psychGaps').innerHTML = '';
      $('#frictionLabel').textContent = '';
      $('#frictionList').innerHTML = '<li class="issue-empty">아직 진단한 문구가 없습니다.</li>';
      return;
    }

    const diag = CP.diagnose(text);
    const det = CP.detect(text);
    const prof = C.proposalPsych(diag);
    state.copy.diag = diag;
    state.copy.det = det;

    $('#psychScore').textContent = String(prof.total);
    $('#psychGrade').textContent = diag.grade.id + ' 등급 · ' + text.replace(/\s/g, '').length + '자';
    $('#psychGradeLabel').textContent = prof.grade.id + ' · ' + prof.grade.label;
    $('#psychGradeDesc').textContent = prof.grade.desc + ' (원 점수 ' + diag.total + ' / 제안서 가중)';

    $('#psychBars').innerHTML = diag.triggers.map(function (t) {
      const cls = t.score >= 60 ? ' is-ok' : (t.score < 25 ? ' is-weak' : '');
      return '<div class="trig' + cls + '">' +
        '<span class="trig-name" title="' + esc(t.name) + '">' + esc(t.name) + '</span>' +
        '<span class="trig-bar"><i style="width:' + Math.max(2, Math.min(100, t.score)) + '%"></i></span>' +
        '<span class="trig-score">' + t.score + '</span>' +
      '</div>';
    }).join('');

    const recs = (diag.recommendations || []).slice(0, 3);
    $('#psychGaps').innerHTML = recs.map(function (r) {
      return '<div class="gap"><b>' + esc(r.name) + '</b><span>' + esc(r.action) + '</span></div>';
    }).join('') || '<div class="gap"><b>빈틈 없음</b><span>8개 트리거가 모두 살아 있습니다. 그대로 보내도 됩니다.</span></div>';

    $('#frictionLabel').textContent = '감점 ' + det.friction + '점 · ' + det.count + '곳';
    const issues = (det.issues || []).slice(0, 8);
    $('#frictionList').innerHTML = issues.length
      ? issues.map(function (i) {
        return '<li class="issue"><span class="issue-type">' + esc(i.typeLabel || i.type) + '</span>' +
          '<span class="issue-ph">' + esc(i.phrase) + '</span> → ' +
          '<span class="issue-alt">' + esc(i.alternative || i.reason || '') + '</span></li>';
      }).join('')
      : '<li class="issue-empty">감점 표현이 없습니다. 바로 보내도 됩니다.</li>';
  }

  function setCopyTarget(id) {
    state.copy.target = id;
    persistCopy();
    renderCopySeg();
    loadCopyText(true);
  }

  function correctCopy() {
    if (!CP) return;
    const ta = $('#copyTargetText');
    if (!ta || !ta.value.trim()) { toast('먼저 문구를 넣어 주세요', { warn: true }); return; }
    const before = ta.value;
    const res = CP.correct(before);
    if (!res.applied.length) { toast('자동으로 바꿀 표현이 없습니다. 감점 목록의 대안을 직접 반영하세요'); return; }
    ta.value = res.text;
    diagnoseCopy();
    toast('감점 표현 ' + res.applied.length + '곳을 안전 교정했습니다 · 사실은 바꾸지 않았습니다', {
      action: '되돌리기',
      onAction: function () { ta.value = before; diagnoseCopy(); },
    });
  }

  function copyToDoc() {
    const ta = $('#copyTargetText');
    if (!ta || !ta.value.trim()) { toast('먼저 문구를 넣어 주세요', { warn: true }); return; }
    if (state.copy.target === 'all') { toast('요약 · 도입 · 배경 중 하나를 골라 주세요', { warn: true }); return; }
    pushUndo('문구 반영');
    const ins = C.insertIntoDoc(state.doc, state.copy.target, ta.value);
    if (!ins.changed) { toast('반영할 수 없는 대상입니다', { warn: true }); return; }
    state.doc = ins.doc;
    afterDocReplace({ keepTab: true });
    toast('문구를 문서에 넣었습니다 · ' + ta.value.replace(/\s/g, '').length + '자', { action: '되돌리기', onAction: undoLast });
  }

  /* ---------- 설득 문구 생성 ---------- */

  function renderFwSeg() {
    const seg = $('#fwSeg');
    if (!seg) return;
    const list = (CP && CP.FRAMEWORKS) || [
      { id: 'PAS', name: '문제-자극-해결' }, { id: 'BAB', name: '이전-이후-다리' },
      { id: 'AIDA', name: '주의-흥미-욕구-행동' }, { id: '4U', name: '유용·긴급·독특·구체' },
    ];
    seg.innerHTML = list.map(function (f) {
      return '<button type="button" class="seg-btn' + (state.copy.framework === f.id ? ' is-on' : '') + '" data-action="set-framework" data-framework="' + esc(f.id) + '" title="' + esc(f.name) + '">' + esc(f.id) + '</button>';
    }).join('');
  }

  function fwValues() {
    return C.frameworkInput(state.doc, Object.assign({ presetName: presetName() }, state.copy.inputs || {}));
  }

  function fillFwForm() {
    const v = fwValues();
    const map = { fwTarget: 'target', fwProduct: 'product', fwProblem: 'problem', fwSolution: 'solution', fwProof: 'proof', fwCta: 'cta' };
    Object.keys(map).forEach(function (id) {
      const el = $('#' + id);
      if (el) el.value = v[map[id]] || '';
    });
    renderFwSeg();
    renderFwOut();
  }

  function readFwInputs() {
    const map = { fwTarget: 'target', fwProduct: 'product', fwProblem: 'problem', fwSolution: 'solution', fwProof: 'proof', fwCta: 'cta' };
    const out = Object.assign({}, state.copy.inputs || {});
    Object.keys(map).forEach(function (id) {
      const el = $('#' + id);
      if (el) out[map[id]] = el.value;
    });
    state.copy.inputs = out;
    persistCopy();
    return out;
  }

  function currentFw() {
    if (!CP) return null;
    try { return CP.build(state.copy.framework, readFwInputsSilent()); } catch (e) { return null; }
  }

  function readFwInputsSilent() {
    const map = { fwTarget: 'target', fwProduct: 'product', fwProblem: 'problem', fwSolution: 'solution', fwProof: 'proof', fwCta: 'cta' };
    const out = Object.assign({}, state.copy.inputs || {});
    Object.keys(map).forEach(function (id) {
      const el = $('#' + id);
      if (el) out[map[id]] = el.value;
    });
    return out;
  }

  function renderFwOut() {
    const box = $('#fwOut');
    if (!box) return;
    if (!CP) { box.innerHTML = '<p class="fw-empty">카피 엔진을 불러오지 못했습니다.</p>'; return; }
    const fw = currentFw();
    if (!fw) { box.innerHTML = '<p class="fw-empty">문구를 만들지 못했습니다.</p>'; return; }
    $('#fwScore').textContent = fw.id + ' · 설득 점수 ' + fw.psych.total;
    box.innerHTML =
      '<div class="fw-psych">' + esc(fw.id) + ' · ' + fw.body.replace(/\s/g, '').length + '자</div>' +
      '<div class="fw-title">' + esc(fw.title) + '</div>' +
      fw.sections.map(function (s) {
        return '<div class="fw-sec"><b>' + esc(s.label) + '</b><span>' + esc(s.text) + '</span></div>';
      }).join('');
  }

  function copyFw(field) {
    const fw = currentFw();
    if (!fw) { toast('문구를 만들지 못했습니다', { warn: true }); return; }
    if (!field) {
      copyText(fw.title + '\n\n' + fw.body).then(function (ok) {
        toast(ok ? '설득 문구를 복사했습니다' : '복사에 실패했습니다', ok ? null : { warn: true });
      });
      return;
    }
    const text = field === 'summary' ? fw.title : fw.body;
    pushUndo('설득 문구');
    const ins = C.insertIntoDoc(state.doc, field, text);
    if (!ins.changed) { toast('반영하지 못했습니다', { warn: true }); return; }
    state.doc = ins.doc;
    afterDocReplace({ keepTab: true });
    toast(field === 'summary' ? '요약에 넣었습니다' : '도입 문구로 넣었습니다', { action: '되돌리기', onAction: undoLast });
  }

  /* ============================================================
     업그레이드 · 내 구독 AI 원클릭 브리지
     ============================================================ */

  function loadSettings() {
    const raw = store.get(KEY.settings, null);
    const base = {
      geminiKey: '',
      geminiModel: B ? B.GEMINI_DEFAULT_MODEL : 'gemini-3.5-flash-lite',
      includePrice: false,
      brandLock: false,
    };
    if (!raw || typeof raw !== 'object') return base;
    return Object.assign(base, {
      geminiKey: String(raw.geminiKey || ''),
      geminiModel: String(raw.geminiModel || base.geminiModel),
      includePrice: !!raw.includePrice,
      brandLock: !!raw.brandLock,
    });
  }

  function persistSettings() { store.set(KEY.settings, state.settings); }

  function promptNow() {
    return C.buildProposalPrompt(state.doc, {
      presetName: presetName(),
      tone: 'plain',
      includePrice: !!state.settings.includePrice,
    });
  }

  /* ── 무료 AI 맛보기 (Cloudflare Worker) ───────────────── */
  let freeBusy = false;
  function renderFreeLimit(res) {
    const card = $('#freeLimitCard');
    const st = $('#freeStatus');
    if (st) st.textContent = '오늘 무료 횟수를 다 썼어요';
    if (!card) return;
    const cta = (res && res.cta) || {};
    const href = cta.keyUrl || 'https://aistudio.google.com/apikey';
    card.hidden = false;
    card.innerHTML =
      '<b>무료 체험을 다 쓰셨습니다</b>' +
      '<div>' + String((res && res.message) || '내 무료 키나 구독 AI로 이어서 쓰세요.').replace(/</g, '&lt;') + '</div>' +
      '<div class="free-limit-actions">' +
        '<a class="btn btn-primary btn-sm" href="' + href + '" target="_blank" rel="noopener noreferrer">내 무료 Gemini 키 연결</a>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="ai-copy-prompt">프롬프트 복사</button>' +
      '</div>';
  }

  /* 무료 체험은 짧은 초안만(Worker 12초 제한 실측). Pro/브리지는 전체 제안서 프롬프트. */
  function freeDraftPrompt() {
    const d = state.doc || {};
    const c = d.client || {};
    const pj = d.project || {};
    const topic = String(pj.summary || d.meta && d.meta.title || '').trim();
    if (!topic) return '';
    return '너는 대행사 제안서 작성자다. 고객사: ' + (c.company || '고객사') + '. 프로젝트: ' + topic + '. ' +
      '[요약] 한 줄, [배경] 2문장, [범위] 3개, [산출물] 3개 형식으로 짧게 써라. 600자 이내. 없는 수치 금지.';
  }

  function freeGenerate() {
    if (!FA) { toast('무료 체험 엔진을 불러오지 못했습니다.', { warn: true }); return; }
    if (freeBusy) return;
    const prompt = freeDraftPrompt();
    if (!prompt) { toast('제안서 정보를 먼저 입력하세요.', { warn: true }); return; }
    freeBusy = true;
    const btn = $('[data-action="free-generate"]');
    if (btn) { btn.disabled = true; btn.textContent = '무료 AI가 쓰는 중…'; }
    const st = $('#freeStatus');
    if (st) st.textContent = '무료로 생성 중… (5~20초)';
    if ($('#freeLimitCard')) $('#freeLimitCard').hidden = true;
    const done = function () { freeBusy = false; if (btn) { btn.disabled = false; btn.textContent = '무료 AI로 초안 받기'; } };

    FA.generate({ task: 'text', prompt: prompt, options: { temperature: 0.7, maxTokens: 600 } }, { timeoutMs: 45000 })
      .then(function (res) {
        done();
        if (res && res.ok) {
          const input = $('#aiDraftInput');
          if (input) {
            input.value = res.text;
            if ($('#aiPaste')) $('#aiPaste').open = true;
            renderAiDraft();
            input.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
          if (st) st.textContent = '무료로 받았습니다' + (res.provider ? ' · ' + res.provider : '');
          const rem = $('#freeRemain');
          if (rem && res.remaining !== undefined && res.remaining !== null) rem.textContent = '남은 무료 ' + res.remaining + '/' + (res.limit || 5) + '회';
          toast('초안을 받았습니다 · [제안서에 적용]을 누르세요');
          return;
        }
        if (FA.isQuota(res)) { renderFreeLimit(res); return; }
        if (st) st.textContent = (res && res.message) || '무료 생성에 실패했습니다.';
        toast((res && res.message) || '무료 생성에 실패했습니다.', { warn: true });
      }, function () {
        done();
        toast('무료 체험에 연결하지 못했습니다.', { warn: true });
      });
  }

  function renderBridge() {
    const box = $('#bridgeBtns');
    if (!box) return;
    const prompt = promptNow();
    const pre = $('#aiPromptBox');
    if (pre) pre.textContent = prompt;
    const len = $('#aiPromptLen');
    if (len) len.textContent = prompt.length.toLocaleString('ko-KR') + '자';
    const chk = $('#aiIncludePrice');
    if (chk) chk.checked = !!state.settings.includePrice;
    if (!B) {
      box.innerHTML = '<span class="muted">AI 브리지를 불러오지 못했습니다. engines/ai-bridge.js를 확인하세요.</span>';
      return;
    }
    let anyPrefill = false;
    const html = B.listProviders().map(function (p) {
      const link = B.linkFor(p.id, prompt);
      if (link.prefilled) anyPrefill = true;
      return '<a class="btn btn-ghost btn-sm bridge-btn" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer" ' +
        'data-action="bridge-open" data-provider="' + esc(p.id) + '" title="' + esc(link.note) + '">' +
        esc(p.label) + ' 열기<span class="b-tag' + (link.prefilled ? '' : ' paste') + '">' +
        (link.prefilled ? '자동 입력' : '붙여넣기') + '</span></a>';
    });
    box.innerHTML = html.join('');
    const note = $('#bridgeNote');
    if (note) {
      note.textContent = anyPrefill
        ? '버튼을 누르면 프롬프트가 클립보드에 복사되고 새 창이 열립니다. ChatGPT·Claude는 입력창에 채워지고, Gemini는 붙여넣기(Ctrl+V)만 하면 돼요.'
        : '제안서 프롬프트는 길어서 세 AI 모두 입력창에 자동으로 들어가지 않습니다. 버튼을 누르면 클립보드에 복사되고 새 창이 열리니, 그 창에서 Ctrl+V로 붙여넣으세요.';
    }
  }

  function scheduleBridge() {
    clearTimeout(state.bridgeTimer);
    state.bridgeTimer = setTimeout(renderBridge, 260);
  }

  function bridgeOpen(id) {
    if (!B) return;
    const prompt = promptNow();
    const link = B.linkFor(id, prompt);
    const win = window.open(link.url, '_blank', 'noopener');
    copyText(prompt, link.prefilled
      ? link.label + ' 창에 프롬프트를 채웠어요. 그대로 보내면 됩니다.'
      : link.label + ' 창을 열었어요. 프롬프트를 붙여넣으세요(Ctrl+V).');
    if (!win) toast('새 창이 차단됐습니다. 프롬프트는 복사했으니 직접 열어 붙여넣으세요', { warn: true });
  }

  function renderAiDraft() {
    const meta = $('#aiDraftMeta');
    const input = $('#aiDraftInput');
    if (!meta || !input) return;
    const raw = input.value;
    if (!raw.trim()) {
      meta.className = 'ai-draft-meta';
      meta.textContent = '붙여넣으면 요약·배경·범위·산출물을 나눠서 미리 점수를 계산해요.';
      return;
    }
    if (!B) { meta.textContent = 'AI 브리지를 불러오지 못했습니다.'; return; }
    const parsed = B.parseProposal(raw);
    let score = null;
    const text = [parsed.summary, parsed.pitch, parsed.background].filter(Boolean).join('\n\n');
    if (CP && text.trim()) score = C.proposalPsych(CP.diagnose(text)).total;

    const chips = [
      '<span class="ai-chip' + (parsed.summary ? ' ok' : ' warn') + '">' + (parsed.summary ? '요약 ' + parsed.stats.summaryChars + '자' : '요약 없음') + '</span>',
      '<span class="ai-chip' + (parsed.stats.backgroundNoSpace >= 160 ? ' ok' : ' warn') + '">배경 ' + parsed.stats.backgroundNoSpace + '자</span>',
      '<span class="ai-chip' + (parsed.scope.length ? ' ok' : '') + '">범위 ' + parsed.scope.length + '</span>',
      '<span class="ai-chip' + (parsed.deliverables.length ? ' ok' : '') + '">산출물 ' + parsed.deliverables.length + '</span>',
      score === null ? '' : '<span class="ai-chip score ' + (score >= 62 ? 'ok' : score >= 45 ? '' : 'warn') + '">설득 ' + score + '점</span>',
    ].filter(Boolean).join('');

    meta.className = 'ai-draft-meta';
    meta.innerHTML = '<div class="ai-chips">' + chips + '</div>' +
      (parsed.warnings.length ? '<ul class="ai-warn">' + parsed.warnings.slice(0, 3).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '');
  }

  function aiApply() {
    if (!B) return;
    const input = $('#aiDraftInput');
    if (!input) return;
    const parsed = B.parseProposal(input.value);
    if (B.isEmptyDraft(parsed)) { toast('AI 초안을 먼저 붙여넣으세요', { warn: true }); return; }
    pushUndo('AI 초안');
    const res = C.applyDraftToDoc(state.doc, parsed);
    if (!res.applied.length) { toast('반영할 내용을 찾지 못했습니다', { warn: true }); return; }
    state.doc = res.doc;
    afterDocReplace({ keepTab: true });
    toast('AI 초안을 제안서에 반영했습니다 · ' + res.applied.join(', '), { action: '되돌리기', onAction: undoLast });
  }

  function saveGemini() {
    const keyEl = $('#geminiKey');
    const modelEl = $('#geminiModel');
    if (keyEl) state.settings.geminiKey = keyEl.value.trim();
    if (modelEl) state.settings.geminiModel = modelEl.value.trim() || (B ? B.GEMINI_DEFAULT_MODEL : 'gemini-3.5-flash-lite');
    persistSettings();
  }

  async function geminiGenerate() {
    const status = $('#geminiStatus');
    if (!B || !CP) { if (status) status.textContent = '엔진을 불러오지 못했어요.'; return; }
    if (state.geminiBusy) return;
    const key = ($('#geminiKey').value || '').trim();
    const model = ($('#geminiModel').value || '').trim() || B.GEMINI_DEFAULT_MODEL;
    if (!key) {
      if (status) { status.className = 'form-error'; status.textContent = '키를 넣거나, 위의 ChatGPT·Claude 버튼을 쓰세요.'; }
      return;
    }
    saveGemini();

    const prompt = promptNow();
    let req;
    try { req = B.buildGeminiRequest({ apiKey: key, model: model, prompt: prompt }); }
    catch (e) { if (status) { status.className = 'form-error'; status.textContent = e.message; } return; }

    state.geminiBusy = true;
    if (status) { status.className = 'form-ok'; status.textContent = '생성 중… (10~30초)'; }
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 45000);
    try {
      const res = await fetch(req.url, Object.assign({}, req.init, { signal: controller.signal }));
      clearTimeout(timer);
      const rawText = await res.text();
      let json = null;
      try { json = JSON.parse(rawText); } catch (e) { json = null; }
      if (!res.ok) {
        const detail = json && json.error && json.error.message ? json.error.message : rawText;
        if (status) { status.className = 'form-error'; status.textContent = B.explainStatus(res.status, detail); }
        return;
      }
      const out = B.parseGeminiResponse(json);
      if (!out.ok) { if (status) { status.className = 'form-error'; status.textContent = out.error; } return; }
      const draft = $('#aiDraftInput');
      if (draft) {
        draft.value = out.text;
        const details = $('#aiPaste');
        if (details) details.open = true;
        renderAiDraft();
      }
      if (status) {
        status.className = 'form-ok';
        status.textContent = '초안을 받았어요. [제안서에 적용]을 누르세요.' + (out.warnings.length ? ' ' + out.warnings[0] : '');
      }
      toast('Gemini가 초안을 보냈어요');
    } catch (e) {
      clearTimeout(timer);
      if (status) {
        status.className = 'form-error';
        status.textContent = e && e.name === 'AbortError'
          ? '응답이 늦어 취소했어요. 다시 시도하거나 다른 모델을 골라 보세요.'
          : '연결하지 못했어요. 키·네트워크·브라우저 차단을 확인하세요.';
      }
    } finally {
      state.geminiBusy = false;
    }
  }

  /* ---------- 업그레이드 패널 동기화 ---------- */

  function syncFeaturePanels(opts) {
    const o = opts || {};
    renderBridge();
    renderDesignCurrent();
    renderDesignGrid();
    renderDesignRecs();
    renderBrandPanel();
    renderRefResult();
    renderBuilderDesign();
    renderCopySeg();
    if (o.resetCopy) loadCopyText(true);
    if (o.resetFw) fillFwForm();
  }

  function renderAll() {
    fillForm();
    renderItems();
    renderMilestones();
    renderPresetChips();
    renderPapers();
    updateTotals();
    renderChecklist();
    syncFeaturePanels({ resetFw: true });
  }

  function renderCopyPage() {
    renderCopySeg();
    loadCopyText(false);
    fillFwForm();
  }

  /* ---------- modal ---------- */
  function openModal(html) {
    const root = $('#modalRoot');
    root.innerHTML = '<div class="modal-backdrop" data-action="close-modal"></div><div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    root.hidden = false;
    const focusable = root.querySelector('input') || root.querySelector('.modal-foot .btn-primary') || root.querySelector('button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 30);
  }

  function closeModal() {
    const root = $('#modalRoot');
    root.hidden = true;
    root.innerHTML = '';
  }

  /* ---------- tabs / views ---------- */
  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(function (b) {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + tab);
    });
    if (tab === 'builder') {
      requestAnimationFrame(function () { applyZoom(false); });
    }
    if (tab === 'library') renderLibrary();
    if (tab === 'pricing') renderPricing();
    if (tab === 'design') renderDesignPage();
    if (tab === 'copy') renderCopyPage();
  }

  function setMobileView(view) {
    state.view = view;
    $('#workspace').dataset.view = view;
    $$('#mobileSwitch button').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.view === view);
    });
    if (view === 'preview') {
      requestAnimationFrame(function () {
        if (state.zoom.mode === 'fit') applyZoom();
        else applyZoom(false);
      });
    }
  }

  function setTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    store.set(KEY.theme, state.theme);
    const btn = $('[data-action="toggle-theme"]');
    if (btn) btn.setAttribute('aria-label', state.theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#0C0D0F' : '#FAFAFA');
  }

  /* ---------- events ---------- */
  function onInput(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.path) return;
    const path = el.dataset.path;
    setPath(state.doc, path, readField(el));

    if (path === 'discount.mode') { syncConditionalUI(); }
    if (/^items\./.test(path)) refreshItemNets();
    if (/^milestones\./.test(path)) refreshMilestoneAmounts();

    scheduleRender();
    scheduleSave();
  }

  function onChange(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.path) return;
    const path = el.dataset.path;
    if (el.dataset.list === 'lines') {
      setPath(state.doc, path, el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean));
    }
    state.doc = C.sanitizeDoc(state.doc, Date.now());
    writeField(el, path);
    syncConditionalUI();
    if (/^items\./.test(path)) { refreshItemNets(); }
    if (/^milestones\./.test(path)) { refreshMilestoneAmounts(); }
    scheduleRender();
    scheduleSave();
  }

  function addItem() {
    if (state.doc.items.length >= C.LIMITS.items) { toast('항목은 ' + C.LIMITS.items + '개까지 넣을 수 있습니다', { warn: true }); return; }
    state.doc.items.push({ id: 'it-' + Date.now().toString(36), name: '', detail: '', qty: 1, unit: '식', unitPrice: 0, discountPct: 0 });
    renderItems();
    scheduleRender();
    scheduleSave();
    const last = $$('.item-row').pop();
    if (last) { const input = last.querySelector('[data-path$=".name"]'); if (input) input.focus(); }
  }

  function removeItem(index) {
    if (!state.doc.items[index]) return;
    pushUndo('항목 삭제');
    state.doc.items.splice(index, 1);
    renderItems();
    scheduleRender();
    scheduleSave();
    toast('항목을 삭제했습니다', { action: '되돌리기', onAction: undoLast });
  }

  /* ── PDF 파일 내보내기 (jsPDF · 좌표 고정 A4) ─────────────── */
  let pdfBusy = false;
  function runPdfExport() {
    if (pdfBusy) return;
    if (!window.ProposalPDF) {
      toast('PDF 엔진을 불러오지 못했습니다. 새로고침 뒤 다시 시도해 주세요.', { warn: true });
      return;
    }
    pdfBusy = true;
    const btns = $$('[data-action="pdf-export"]');
    const labels = btns.map(function (b) { return b.textContent; });
    btns.forEach(function (b) { b.setAttribute('aria-busy', 'true'); b.disabled = true; b.textContent = 'PDF 만드는 중…'; });
    const done = function () {
      pdfBusy = false;
      btns.forEach(function (b, i) { b.removeAttribute('aria-busy'); b.disabled = false; b.textContent = labels[i]; });
    };
    window.ProposalPDF.export(state.doc, {}).then(function (res) {
      done();
      if (res && res.ok) {
        toast('PDF를 내려받았습니다 · ' + res.pages + '쪽 · 여백과 페이지 나눔이 고정된 파일입니다');
        return;
      }
      toast((res && res.message) || 'PDF를 만들지 못했습니다. 인쇄로 저장해 주세요.', { warn: true });
    }, function () {
      done();
      toast('PDF를 만들지 못했습니다. 인쇄로 저장해 주세요.', { warn: true });
    });
  }

  function handleAction(action, el) {
    switch (action) {
      case 'print': window.print(); break;
      case 'pdf-export': runPdfExport(); break;
      case 'copy-summary':
        copyText(C.summaryText(state.doc)).then(function (ok) {
          toast(ok ? '메일·카톡에 붙여넣을 요약을 복사했습니다' : '복사에 실패했습니다', ok ? null : { warn: true });
        });
        break;
      case 'toggle-theme': setTheme(state.theme === 'dark' ? 'light' : 'dark'); break;
      case 'use-preset': applyPresetId(el.dataset.preset); break;
      case 'add-item': addItem(); break;
      case 'remove-item': removeItem(Number(el.dataset.index)); break;
      case 'save-doc': saveCurrentDoc(); break;
      case 'confirm-save': confirmSave(); break;
      case 'close-modal': closeModal(); break;
      case 'open-entry': openEntry(el.dataset.id); break;
      case 'template-entry': applyTemplateEntry(el.dataset.id); break;
      case 'delete-entry': deleteEntry(el.dataset.id); break;
      case 'confirm-delete': confirmDelete(el.dataset.id); break;
      case 'export-json': exportJson(); break;
      case 'export-entry': exportEntry(el.dataset.id); break;
      case 'import-json': { const f = $('#importFile'); if (f) f.click(); break; }
      case 'new-doc': newDoc(); break;
      case 'confirm-new': confirmNew(); break;
      case 'go-builder': setTab('builder'); break;

      /* 디자인 */
      case 'design-recommend': designRecommend(false); break;
      case 'apply-design': applyDesignId(el.dataset.design); break;
      case 'design-default': applyDesignId('studio'); break;
      case 'design-brand': saveBrandPrompt(); break;
      case 'brand-save': saveBrandPrompt(); break;
      case 'confirm-brand': confirmBrand(); break;
      case 'brand-apply': applyBrand(); break;
      case 'brand-remove': removeBrandPrompt(); break;
      case 'confirm-brand-remove': removeBrand(); break;
      case 'ref-apply': applyRefTheme(); break;
      case 'ref-brand': refToBrand(); break;
      case 'ref-clear': state.design.ref = null; renderRefResult(); break;

      /* 문구 진단 */
      case 'copy-refresh': diagnoseCopy(); break;
      case 'copy-target': setCopyTarget(el.dataset.target); break;
      case 'copy-from-doc': loadCopyText(true); break;
      case 'copy-to-doc': copyToDoc(); break;
      case 'copy-correct': correctCopy(); break;
      case 'set-framework':
        state.copy.framework = el.dataset.framework;
        persistCopy();
        renderFwSeg();
        renderFwOut();
        break;
      case 'fw-to-summary': copyFw('summary'); break;
      case 'fw-to-pitch': copyFw('pitch'); break;
      case 'fw-copy': copyFw(null); break;

      /* AI 브리지 */
      case 'ai-copy-prompt':
        copyText(promptNow()).then(function (ok) {
          toast(ok ? '프롬프트를 복사했습니다 · AI 창에 붙여넣으세요' : '복사에 실패했습니다', ok ? null : { warn: true });
        });
        break;
      case 'bridge-open': bridgeOpen(el.dataset.provider); break;
      case 'ai-apply': aiApply(); break;
      case 'ai-clear':
        if ($('#aiDraftInput')) $('#aiDraftInput').value = '';
        renderAiDraft();
        break;
      case 'save-gemini':
        saveGemini();
        if ($('#geminiStatus')) { $('#geminiStatus').className = 'form-ok'; $('#geminiStatus').textContent = '키를 이 브라우저에만 저장했습니다.'; }
        break;
      case 'gemini-generate': geminiGenerate(); break;
      case 'free-generate': freeGenerate(); break;
      default: break;
    }
  }

  function bind() {
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { e.preventDefault(); setTab(tabBtn.dataset.tab); return; }
      const dt = e.target.closest('[data-doctype]');
      if (dt) {
        state.doc.meta.docType = dt.dataset.doctype;
        syncConditionalUI();
        renderPapers();
        updateTotals();
        scheduleSave();
        return;
      }
      const vt = e.target.closest('[data-vat]');
      if (vt) {
        state.doc.vat.mode = vt.dataset.vat;
        syncConditionalUI();
        renderPapers();
        updateTotals();
        scheduleSave();
        return;
      }
      const zoomBtn = e.target.closest('[data-zoom]');
      if (zoomBtn) {
        const z = zoomBtn.dataset.zoom;
        if (z === 'fit') fitZoom();
        else setZoom(z === 'in' ? 0.1 : -0.1);
        return;
      }
      const viewBtn = e.target.closest('[data-view]');
      if (viewBtn && viewBtn.closest('#mobileSwitch')) { setMobileView(viewBtn.dataset.view); return; }
      const act = e.target.closest('[data-action]');
      if (act) {
        if (act.tagName === 'A') e.preventDefault();
        handleAction(act.dataset.action, act);
      }
    });

    document.addEventListener('input', onInput);

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'copyTargetText') { diagnoseCopy(); return; }
      if (/^fw(Target|Product|Problem|Solution|Proof|Cta)$/.test(t.id)) { readFwInputs(); renderFwOut(); return; }
      if (t.id === 'aiDraftInput') { renderAiDraft(); }
    });

    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'refClient' || t.id === 'refOwn') { useReference(t); return; }
      if (t.id === 'aiIncludePrice') {
        state.settings.includePrice = !!t.checked;
        persistSettings();
        renderBridge();
        return;
      }
      if (t.id === 'brandLock') {
        state.settings.brandLock = !!t.checked;
        persistSettings();
        toast(state.settings.brandLock ? '새 문서를 이 브랜드로 시작합니다' : '새 문서는 기본 디자인으로 시작합니다');
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'importFile') { importJsonFile(e.target.files && e.target.files[0]); e.target.value = ''; return; }
      onChange(e);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#modalRoot').hidden) { closeModal(); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveCurrentDoc(); }
    });

    window.addEventListener('resize', function () {
      if (state.zoom.mode === 'fit' && state.tab === 'builder') applyZoom(false);
    });

    if (window.matchMedia) {
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', function () { /* 사용자가 고른 테마를 덮지 않음 */ });
      } catch (err) { /* noop */ }
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    setTheme(store.get(KEY.theme, 'light') === 'dark' ? 'dark' : 'light');
    state.brand = loadBrand();
    state.settings = loadSettings();
    loadCopyState();

    const saved = store.get(KEY.doc, null);
    state.doc = saved ? C.sanitizeDoc(saved, Date.now()) : D.buildStarterDoc(Date.now());
    if (!saved && state.settings.brandLock && state.brand) state.doc.design = { id: 'brand', custom: null };
    state.library = loadLibrary();

    fillForm();
    renderPresetChips();
    renderPricing();
    renderItems();
    renderMilestones();
    renderLibrary();
    renderPapers();
    updateTotals();
    renderChecklist();
    syncFeaturePanels({ resetFw: true });
    designRecommend(true);
    if ($('#geminiKey')) $('#geminiKey').value = state.settings.geminiKey || '';
    if ($('#geminiModel')) $('#geminiModel').value = state.settings.geminiModel || (B ? B.GEMINI_DEFAULT_MODEL : '');
    if ($('#geminiModels') && B) {
      $('#geminiModels').innerHTML = B.GEMINI_MODELS.map(function (m) { return '<option value="' + esc(m) + '"></option>'; }).join('');
    }
    bind();
    setTab('builder');
    applyZoom();
    setTimeout(function () { applyZoom(); }, 60);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        fitPaperContent();
        if (state.zoom.mode === 'fit') applyZoom(false);
      });
    }
    $('#saveState').textContent = saved ? '저장됨' : '자동 저장 시작';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
