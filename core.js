/* ============================================================
   견적서 스튜디오 · core.js
   Pure, DOM-free logic: 금액 계산(VAT·할인), 한글 금액, 일정 배분,
   문서 정규화/검증, 프리셋 적용, 요약 텍스트.
   Shared by the browser app (window.AgencyCore) and node test.js.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AgencyCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- constants ---------- */
  const VAT_RATE = 10;

  const DOC_TYPES = [
    { id: 'both', label: '제안서 + 견적서', pages: 2 },
    { id: 'quote', label: '견적서만', pages: 1 },
    { id: 'proposal', label: '제안서만', pages: 1 },
  ];

  const VAT_MODES = [
    { id: 'excluded', label: 'VAT 별도' },
    { id: 'included', label: 'VAT 포함' },
  ];

  const DISCOUNT_MODES = [
    { id: 'none', label: '할인 없음' },
    { id: 'percent', label: '정률 (%)' },
    { id: 'amount', label: '정액 (원)' },
  ];

  const UNITS = ['식', '건', '편', '개', '종', '회', '컷', '월', '일'];

  const LIMITS = {
    items: 20,
    scope: 10,
    deliverables: 8,
    notIncluded: 6,
    milestones: 3,
    lines: 12,
    pitch: 400,
    closing: 300,
  };

  /* ---------- design (engines/design-ref-engine.js 프리셋 id) ---------- */
  const DESIGN_PRESET_IDS = [
    'swiss-magazine', 'bento-saas', 'cream-editorial', 'dark-neon',
    'commerce-clean', 'neo-brutalism', 'minimal-luxury', 'vivid-pop',
  ];

  const PALETTE_KEYS = ['bg', 'surface', 'ink', 'sub', 'line', 'accent', 'accentInk', 'accentSoft'];

  /* ---------- 제안서 문구 톤 ---------- */
  const PROMPT_TONES = [
    { id: 'plain', label: '단정한 실무형', desc: '과장 없이 사실과 일정 중심' },
    { id: 'warm', label: '따끈한 제안형', desc: '고객의 상황에 공감하며 부드럽게' },
    { id: 'proof', label: '숫자·근거형', desc: '수치와 범위, 검증 가능한 문장 중심' },
  ];

  /* ---------- tiny helpers ---------- */
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function toNum(v, fallback) {
    const fb = fallback === undefined ? 0 : fallback;
    if (typeof v === 'number') return isFinite(v) ? v : fb;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[,\s원₩%]/g, '');
      if (!cleaned) return fb;
      const n = Number(cleaned);
      return isFinite(n) ? n : fb;
    }
    return fb;
  }

  function roundWon(n) {
    return Math.round(toNum(n, 0));
  }

  function safeStr(v, max) {
    let s = v === null || v === undefined ? '' : String(v);
    s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\r\n?/g, '\n');
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }

  function oneLine(v, max) {
    return safeStr(v, max).replace(/\s+/g, ' ').trim();
  }

  /** '1234567' / '1,234,567원' / '89만' / '1.2억' → 정수 원 */
  function isHexColor(v) {
    return /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
  }

  function paletteOk(p) {
    if (!p || typeof p !== 'object') return false;
    return PALETTE_KEYS.every((k) => isHexColor(p[k]));
  }

  function pickPalette(p) {
    const out = {};
    PALETTE_KEYS.forEach((k) => { out[k] = String(p[k]).toUpperCase(); });
    return out;
  }

  /**
   * 저장된 디자인 스펙 → 화이트리스트.
   * { id:'studio'|'brand'|프리셋 id|'custom', custom:{name,base,palette} }
   */
  function normalizeDesign(raw) {
    let r = raw;
    if (typeof r === 'string') r = { id: r };
    if (!r || typeof r !== 'object') return { id: 'studio', custom: null };
    const id = String(r.id || 'studio');
    if (id === 'custom') {
      const c = r.custom;
      if (c && paletteOk(c.palette)) {
        return {
          id: 'custom',
          custom: {
            name: oneLine(c.name, 40) || '레퍼런스 색',
            base: DESIGN_PRESET_IDS.indexOf(c.base) >= 0 ? c.base : 'swiss-magazine',
            palette: pickPalette(c.palette),
          },
        };
      }
      return { id: 'studio', custom: null };
    }
    if (id === 'brand') return { id: 'brand', custom: null };
    if (id === 'studio' || DESIGN_PRESET_IDS.indexOf(id) >= 0) return { id: id, custom: null };
    return { id: 'studio', custom: null };
  }

  function parseWon(v) {
    if (typeof v === 'number') return isFinite(v) ? Math.round(v) : 0;
    if (v === null || v === undefined) return 0;
    let s = String(v).replace(/[,\s원₩]/g, '').trim();
    if (!s) return 0;
    const man = /^(-?\d+(?:\.\d+)?)만$/.exec(s);
    if (man) return Math.round(parseFloat(man[1]) * 10000);
    const eok = /^(-?\d+(?:\.\d+)?)억$/.exec(s);
    if (eok) return Math.round(parseFloat(eok[1]) * 100000000);
    const n = Number(s);
    return isFinite(n) ? Math.round(n) : 0;
  }

  /* ---------- formatting ---------- */
  function formatNumber(n) {
    const v = toNum(n, 0);
    const neg = v < 0 ? '-' : '';
    const s = String(Math.round(Math.abs(v)));
    return neg + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatWon(n) {
    return formatNumber(n) + '원';
  }

  /** 890000 → '89만 원', 1500000 → '150만 원', 120000000 → '1.2억 원' */
  function formatManWon(n) {
    const v = Math.abs(toNum(n, 0));
    const trim = (x) => {
      const r = Math.round(x * 10) / 10;
      return String(r);
    };
    const sign = toNum(n, 0) < 0 ? '-' : '';
    if (v >= 100000000) return sign + trim(v / 100000000) + '억 원';
    if (v >= 10000) return sign + trim(v / 10000) + '만 원';
    return sign + formatNumber(v) + '원';
  }

  /** 1234567 → '일백이십삼만사천오백육십칠' (금액 한글 표기) */
  function koreanAmount(value) {
    const abs = Math.abs(Math.round(toNum(value, 0)));
    if (!isFinite(abs) || abs === 0) return '영';
    if (abs >= 1e16) return formatNumber(abs);
    const digit = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const small = ['', '십', '백', '천'];
    const big = ['', '만', '억', '조'];
    const groups = [];
    let x = abs;
    while (x > 0) {
      groups.push(x % 10000);
      x = Math.floor(x / 10000);
    }
    let out = '';
    for (let g = groups.length - 1; g >= 0; g--) {
      const v = groups[g];
      if (!v) continue;
      let part = '';
      for (let p = 3; p >= 0; p--) {
        const d = Math.floor(v / Math.pow(10, p)) % 10;
        if (d) part += digit[d] + small[p];
      }
      out += part + (big[g] || '');
    }
    return out || '영';
  }

  function wonInWords(n) {
    return '일금 ' + koreanAmount(n) + '원정';
  }

  /* ---------- dates ---------- */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function isoFromDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    const y = +m[1], mo = +m[2], da = +m[3];
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    const d = new Date(Date.UTC(y, mo - 1, da));
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) return null;
    return d;
  }

  function addDays(iso, days) {
    const d = parseIso(iso);
    if (!d) return '';
    d.setUTCDate(d.getUTCDate() + Math.round(toNum(days, 0)));
    return d.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    const d = parseIso(iso);
    if (!d) return '—';
    return d.getUTCFullYear() + '. ' + pad2(d.getUTCMonth() + 1) + '. ' + pad2(d.getUTCDate()) + '.';
  }

  function formatDateShort(iso) {
    const d = parseIso(iso);
    if (!d) return '—';
    return d.getUTCFullYear() + '.' + pad2(d.getUTCMonth() + 1) + '.' + pad2(d.getUTCDate());
  }

  function docNumber(iso, seq) {
    const d = parseIso(iso) || parseIso(isoFromDate(new Date()));
    const base = d ? d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) : '00000000';
    return 'Q-' + base + '-' + pad2(clamp(toNum(seq, 1), 1, 99));
  }

  function rangeText(doc) {
    const meta = (doc && doc.meta) || {};
    const days = clamp(toNum(meta.durationDays, 21), 1, 365);
    const start = parseIso(meta.startDate) ? meta.startDate : (parseIso(meta.issueDate) ? meta.issueDate : isoFromDate(new Date()));
    const end = addDays(start, days - 1);
    return {
      start: start,
      end: end,
      days: days,
      text: formatDateShort(start) + ' ~ ' + formatDateShort(end) + ' (' + days + '일)',
    };
  }

  function validUntil(doc) {
    const meta = (doc && doc.meta) || {};
    const days = clamp(toNum(meta.validDays, 14), 1, 365);
    const issue = parseIso(meta.issueDate);
    return issue ? addDays(meta.issueDate, days) : '';
  }

  /* ---------- document shape ---------- */
  function blankDoc(nowMs) {
    const now = new Date(typeof nowMs === 'number' ? nowMs : Date.now());
    const issue = isoFromDate(now);
    return {
      version: 1,
      presetId: '',
      meta: {
        docType: 'both',
        number: docNumber(issue, 1),
        issueDate: issue,
        validDays: 14,
        startDate: addDays(issue, 3),
        durationDays: 21,
        title: '프로젝트 제안 및 견적',
      },
      supplier: { name: '', owner: '', phone: '', email: '', bizNo: '', address: '' },
      client: { company: '', contact: '', role: '', email: '' },
      project: { summary: '', pitch: '', background: '', scope: [], deliverables: [], notIncluded: [], closing: '' },
      design: { id: 'studio', custom: null },
      items: [],
      discount: { mode: 'none', value: 0 },
      vat: { mode: 'excluded', rate: VAT_RATE },
      milestones: [
        { name: '킥오프', period: '1주차', ratio: 30 },
        { name: '제작', period: '2주차', ratio: 50 },
        { name: '검수·납품', period: '3주차', ratio: 20 },
      ],
      terms: { payment: '', maintenance: '', copyright: '', note: '' },
      updatedAt: now.getTime(),
    };
  }

  function splitLines(v, maxItems, maxLen) {
    if (Array.isArray(v)) {
      return v.map((x) => oneLine(x, maxLen)).filter(Boolean).slice(0, maxItems);
    }
    if (typeof v === 'string') {
      return v.split(/\n+/).map((x) => oneLine(x, maxLen)).filter(Boolean).slice(0, maxItems);
    }
    return [];
  }

  function sanitizeDoc(raw, nowMs) {
    const base = blankDoc(nowMs);
    const r = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const metaIn = (r.meta && typeof r.meta === 'object') ? r.meta : {};
    const supIn = (r.supplier && typeof r.supplier === 'object') ? r.supplier : {};
    const cliIn = (r.client && typeof r.client === 'object') ? r.client : {};
    const prIn = (r.project && typeof r.project === 'object') ? r.project : {};
    const dIn = (r.discount && typeof r.discount === 'object') ? r.discount : {};
    const vIn = (r.vat && typeof r.vat === 'object') ? r.vat : {};
    const tIn = (r.terms && typeof r.terms === 'object') ? r.terms : {};
    const designIn = (r.design && typeof r.design === 'object') ? r.design : null;

    const docType = DOC_TYPES.some((d) => d.id === metaIn.docType) ? metaIn.docType : 'both';
    const issue = parseIso(metaIn.issueDate) ? metaIn.issueDate : base.meta.issueDate;
    const start = parseIso(metaIn.startDate) ? metaIn.startDate : addDays(issue, 3);

    const items = (Array.isArray(r.items) ? r.items : []).slice(0, LIMITS.items).map((it, i) => {
      const o = (it && typeof it === 'object') ? it : {};
      return {
        name: oneLine(o.name, 80),
        detail: oneLine(o.detail, 120),
        qty: clamp(Math.round(toNum(o.qty, 1)), 0, 9999),
        unit: UNITS.indexOf(o.unit) >= 0 ? o.unit : '식',
        unitPrice: clamp(Math.round(toNum(o.unitPrice, 0)), 0, 1000000000),
        discountPct: clamp(Math.round(toNum(o.discountPct, 0) * 100) / 100, 0, 100),
        id: oneLine(o.id, 24) || 'it-' + (i + 1),
      };
    });

    const msIn = Array.isArray(r.milestones) ? r.milestones.slice(0, LIMITS.milestones) : [];
    const milestones = msIn.map((m, i) => {
      const o = (m && typeof m === 'object') ? m : {};
      const fallback = base.milestones[i] || { name: '', period: '', ratio: 0 };
      return {
        name: oneLine(o.name, 40) || fallback.name,
        period: oneLine(o.period, 30) || fallback.period,
        ratio: clamp(Math.round(toNum(o.ratio, fallback.ratio) * 10) / 10, 0, 100),
      };
    });
    while (milestones.length < LIMITS.milestones) {
      const fb = base.milestones[milestones.length] || { name: '', period: '', ratio: 0 };
      milestones.push({ name: fb.name, period: fb.period, ratio: 0 });
    }

    const mode = DISCOUNT_MODES.some((d) => d.id === dIn.mode) ? dIn.mode : 'none';
    const vatMode = VAT_MODES.some((v) => v.id === vIn.mode) ? vIn.mode : 'excluded';

    return {
      version: 1,
      presetId: oneLine(r.presetId, 40),
      meta: {
        docType: docType,
        number: oneLine(metaIn.number, 30) || base.meta.number,
        issueDate: issue,
        validDays: clamp(Math.round(toNum(metaIn.validDays, 14)), 1, 365),
        startDate: start,
        durationDays: clamp(Math.round(toNum(metaIn.durationDays, 21)), 1, 365),
        title: oneLine(metaIn.title, 80) || base.meta.title,
      },
      supplier: {
        name: oneLine(supIn.name, 60),
        owner: oneLine(supIn.owner, 40),
        phone: oneLine(supIn.phone, 30),
        email: oneLine(supIn.email, 80),
        bizNo: oneLine(supIn.bizNo, 30),
        address: oneLine(supIn.address, 120),
      },
      client: {
        company: oneLine(cliIn.company, 60),
        contact: oneLine(cliIn.contact, 40),
        role: oneLine(cliIn.role, 30),
        email: oneLine(cliIn.email, 80),
      },
      project: {
        summary: safeStr(prIn.summary, 200),
        pitch: safeStr(prIn.pitch, LIMITS.pitch),
        background: safeStr(prIn.background, 1200),
        scope: splitLines(prIn.scope, LIMITS.scope, 140),
        deliverables: splitLines(prIn.deliverables, LIMITS.deliverables, 40),
        notIncluded: splitLines(prIn.notIncluded, LIMITS.notIncluded, 80),
        closing: safeStr(prIn.closing, LIMITS.closing),
      },
      design: normalizeDesign(designIn || r.design),
      items: items,
      discount: {
        mode: mode,
        value: mode === 'percent'
          ? clamp(Math.round(toNum(dIn.value, 0) * 100) / 100, 0, 100)
          : clamp(Math.round(toNum(dIn.value, 0)), 0, 1000000000),
      },
      vat: { mode: vatMode, rate: VAT_RATE },
      milestones: milestones,
      terms: {
        payment: safeStr(tIn.payment, 400),
        maintenance: safeStr(tIn.maintenance, 400),
        copyright: safeStr(tIn.copyright, 400),
        note: safeStr(tIn.note, 300),
      },
      updatedAt: toNum(r.updatedAt, Date.now()) || Date.now(),
    };
  }

  /* ---------- money ---------- */
  function computeTotals(doc) {
    const d = doc || {};
    const items = Array.isArray(d.items) ? d.items : [];
    const lines = items.map((it, i) => {
      const qty = clamp(Math.round(toNum(it.qty, 0)), 0, 9999);
      const unitPrice = clamp(Math.round(toNum(it.unitPrice, 0)), 0, 1000000000);
      const discountPct = clamp(toNum(it.discountPct, 0), 0, 100);
      const gross = Math.round(qty * unitPrice);
      const discount = Math.round(gross * discountPct / 100);
      return {
        index: i,
        name: safeStr(it.name, 80),
        detail: safeStr(it.detail, 120),
        unit: UNITS.indexOf(it.unit) >= 0 ? it.unit : '식',
        qty: qty,
        unitPrice: unitPrice,
        discountPct: discountPct,
        gross: gross,
        discount: discount,
        net: gross - discount,
      };
    });

    const grossSupply = lines.reduce((a, l) => a + l.gross, 0);
    const lineDiscount = lines.reduce((a, l) => a + l.discount, 0);
    const supply = lines.reduce((a, l) => a + l.net, 0);

    const dmode = (d.discount && d.discount.mode) || 'none';
    const dvalue = toNum(d.discount && d.discount.value, 0);
    let docDiscount = 0;
    if (dmode === 'percent') docDiscount = Math.round(supply * clamp(dvalue, 0, 100) / 100);
    else if (dmode === 'amount') docDiscount = clamp(Math.round(dvalue), 0, supply);
    const supplyAfter = Math.max(0, supply - docDiscount);

    const rate = clamp(toNum((d.vat && d.vat.rate), VAT_RATE), 0, 50);
    const vatMode = (d.vat && d.vat.mode) === 'included' ? 'included' : 'excluded';
    let vat, total, netSupply;
    if (vatMode === 'included') {
      total = supplyAfter;
      vat = Math.round(total * rate / (100 + rate));
      netSupply = total - vat;
    } else {
      netSupply = supplyAfter;
      vat = Math.round(supplyAfter * rate / 100);
      total = supplyAfter + vat;
    }

    return {
      lines: lines,
      count: lines.length,
      grossSupply: grossSupply,
      lineDiscount: lineDiscount,
      supply: supply,
      docDiscount: docDiscount,
      supplyAfter: supplyAfter,
      vatMode: vatMode,
      vatRate: rate,
      vat: vat,
      netSupply: netSupply,
      total: total,
    };
  }

  function totalRows(doc, totals) {
    const t = totals || computeTotals(doc);
    const rows = [];
    const hasItemDiscount = t.lineDiscount > 0;
    const hasDocDiscount = t.docDiscount > 0;
    const inc = t.vatMode === 'included';

    if (hasItemDiscount || hasDocDiscount) {
      rows.push({ label: inc ? '항목 합계 (VAT 포함)' : '항목 합계', value: t.grossSupply, kind: 'sub' });
      if (hasItemDiscount) rows.push({ label: '항목 할인', value: -t.lineDiscount, kind: 'minus' });
      if (hasDocDiscount) rows.push({ label: '추가 할인', value: -t.docDiscount, kind: 'minus' });
      if (inc) {
        rows.push({ label: '합계 금액 (VAT 포함)', value: t.total, kind: 'grand' });
        rows.push({ label: '└ 부가세 10% 포함분', value: t.vat, kind: 'hint' });
        rows.push({ label: '└ 공급가액 (VAT 제외)', value: t.netSupply, kind: 'hint' });
        return rows;
      }
      rows.push({ label: '공급가액', value: t.supplyAfter, kind: 'normal' });
    } else {
      rows.push({ label: inc ? '공급가액 (VAT 제외)' : '공급가액', value: inc ? t.netSupply : t.supplyAfter, kind: 'normal' });
    }
    rows.push({ label: inc ? '부가세 10% (포함)' : '부가세 10%', value: t.vat, kind: 'normal' });
    rows.push({ label: '합계 금액', value: t.total, kind: 'grand' });
    return rows;
  }

  /* ---------- schedule ---------- */
  function computeMilestones(doc, total) {
    const ms = Array.isArray(doc && doc.milestones) ? doc.milestones : [];
    const amountTotal = Math.max(0, Math.round(toNum(total, 0)));
    const ratios = ms.map((m) => clamp(toNum(m.ratio, 0), 0, 100));
    const sum = ratios.reduce((a, b) => a + b, 0);
    const rows = ms.map((m, i) => {
      const ratio = ratios[i];
      const amount = sum > 0 ? Math.round(amountTotal * ratio / sum) : 0;
      return {
        name: safeStr(m.name, 40),
        period: safeStr(m.period, 30),
        ratio: ratio,
        share: sum > 0 ? Math.round(ratio / sum * 1000) / 10 : 0,
        amount: amount,
      };
    });
    const summed = rows.reduce((a, r) => a + r.amount, 0);
    if (rows.length && sum > 0 && summed !== amountTotal) {
      const last = rows.length - 1;
      rows[last].amount += amountTotal - summed;
    }
    return {
      rows: rows,
      ratioTotal: Math.round(sum * 10) / 10,
      valid: Math.abs(sum - 100) < 0.05,
      amountTotal: rows.reduce((a, r) => a + r.amount, 0),
    };
  }

  /* ---------- readiness ---------- */
  const PLACEHOLDER_RE = /(○○|ㅇㅇ|example\.com|000-0000|000-00-00000|홍길동)/;

  function isPlaceholder(s) {
    return PLACEHOLDER_RE.test(safeStr(s, 200));
  }

  function completeness(doc) {
    const d = doc || {};
    const sup = d.supplier || {};
    const cli = d.client || {};
    const pr = d.project || {};
    const t = computeTotals(d);
    const ms = computeMilestones(d, t.total);
    const phoneOk = /0\d{1,2}-?\d{3,4}-?\d{4}/.test(String(sup.phone || '')) && !isPlaceholder(sup.phone);

    const checks = [
      {
        id: 'supplier',
        label: '공급자 정보',
        hint: '상호·담당자·연락처를 실제 정보로',
        done: !!sup.name && !!sup.owner && phoneOk && !isPlaceholder(sup.name) && !isPlaceholder(sup.owner),
      },
      {
        id: 'client',
        label: '수신자 정보',
        hint: '고객사명과 담당자',
        done: !!cli.company && !!cli.contact && !isPlaceholder(cli.company) && !isPlaceholder(cli.contact),
      },
      {
        id: 'items',
        label: '견적 항목·금액',
        hint: '항목 1개 이상, 금액 0원 초과',
        done: t.count > 0 && t.total > 0,
      },
      {
        id: 'scope',
        label: '작업 범위',
        hint: '범위 2줄 이상',
        done: Array.isArray(pr.scope) && pr.scope.length >= 2,
      },
      {
        id: 'schedule',
        label: '일정·비중',
        hint: '마일스톤 3단계, 비중 합계 100%',
        done: ms.rows.length === 3 && ms.valid && !!d.meta && !!d.meta.startDate && toNum(d.meta.durationDays, 0) > 0,
      },
      {
        id: 'terms',
        label: '결제·유지보수 조건',
        hint: '결제 조건과 유지보수 조건',
        done: safeStr((d.terms || {}).payment, 400).trim().length > 0 && safeStr((d.terms || {}).maintenance, 400).trim().length > 0,
      },
    ];

    const done = checks.filter((c) => c.done).length;
    return {
      checks: checks,
      done: done,
      total: checks.length,
      score: Math.round(done / checks.length * 100),
      ready: done === checks.length,
      missing: checks.filter((c) => !c.done).map((c) => c.id),
    };
  }

  /* ---------- presets ---------- */
  function applyPreset(doc, preset) {
    const base = sanitizeDoc(doc, Date.now());
    if (!preset) return base;
    const items = (preset.items || []).map((it, i) => ({
      id: 'it-' + (i + 1),
      name: it.name,
      detail: it.detail || '',
      qty: toNum(it.qty, 1),
      unit: it.unit || '식',
      unitPrice: toNum(it.unitPrice, 0),
      discountPct: toNum(it.discountPct, 0),
    }));
    const next = {
      version: 1,
      presetId: preset.id,
      meta: Object.assign({}, base.meta, {
        title: preset.name,
        durationDays: clamp(toNum(preset.durationDays, base.meta.durationDays), 1, 365),
      }),
      supplier: base.supplier,
      client: base.client,
      project: {
        summary: preset.summary || '',
        pitch: '',
        background: preset.background || '',
        scope: (preset.scope || []).slice(0, LIMITS.scope),
        deliverables: (preset.deliverables || []).slice(0, LIMITS.deliverables),
        notIncluded: (preset.notIncluded || []).slice(0, LIMITS.notIncluded),
        closing: '',
      },
      design: base.design,
      items: items,
      discount: { mode: 'none', value: 0 },
      vat: { mode: base.vat.mode, rate: VAT_RATE },
      milestones: (preset.milestones || []).slice(0, LIMITS.milestones).map((m) => ({
        name: m.name,
        period: m.period,
        ratio: toNum(m.ratio, 0),
      })),
      terms: {
        payment: (preset.terms && preset.terms.payment) || '',
        maintenance: (preset.terms && preset.terms.maintenance) || '',
        copyright: (preset.terms && preset.terms.copyright) || '',
        note: (preset.terms && preset.terms.note) || '',
      },
      updatedAt: Date.now(),
    };
    return sanitizeDoc(next, Date.now());
  }

  /* ---------- exports ---------- */
  function pageList(doc) {
    const type = (doc && doc.meta && doc.meta.docType) || 'both';
    if (type === 'quote') return ['quote'];
    if (type === 'proposal') return ['proposal'];
    return ['proposal', 'quote'];
  }

  function documentTitle(doc) {
    const t = (doc && doc.meta && doc.meta.title) || '';
    return t || '프로젝트 제안 및 견적';
  }

  function summaryText(doc) {
    const d = sanitizeDoc(doc, Date.now());
    const t = computeTotals(d);
    const c = d.client;
    const s = d.supplier;
    const range = rangeText(d);
    const vatLabel = t.vatMode === 'included' ? 'VAT 포함' : 'VAT 별도';
    const lines = [];
    lines.push('[' + (pageList(d).length === 2 ? '제안·견적' : pageList(d)[0] === 'quote' ? '견적' : '제안') + '] ' + documentTitle(d));
    lines.push('· 수신: ' + ([c.company, c.contact, c.role].filter(Boolean).join(' ') || '—'));
    lines.push('· 공급: ' + ([s.name, s.owner, s.phone].filter(Boolean).join(' · ') || '—'));
    lines.push('· 기간: ' + range.text);
    lines.push('· 금액: ' + formatWon(t.total) + ' (' + vatLabel + ')');
    if (t.count) {
      lines.push('· 항목: ' + t.lines.map((l) => l.name + ' ' + formatWon(l.net)).join(', '));
    }
    const ms = computeMilestones(d, t.total);
    if (ms.rows.length) {
      lines.push('· 일정: ' + ms.rows.map((m) => m.name + ' ' + m.ratio + '%(' + formatWon(m.amount) + ')').join(' / '));
    }
    if ((d.terms.payment || '').trim()) lines.push('· 결제: ' + d.terms.payment.trim());
    lines.push('· 견적번호: ' + d.meta.number + ' · ' + formatDate(d.meta.issueDate) + ' · 유효 ' + d.meta.validDays + '일');
    return lines.join('\n');
  }

  /* ---------- 제안 문구: 진단·생성·AI 프롬프트 ---------- */

  function firstSentence(text, max) {
    const t = safeStr(text, 1200).replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const m = t.match(/^[^.!?。！？]{2,}[.!?。！？]/);
    const out = (m ? m[0] : t).trim();
    return oneLine(out, max || 120);
  }

  /** 카피 탭에서 진단할 문구 목록 */
  function copyTargets(doc) {
    const d = sanitizeDoc(doc, Date.now());
    const pr = d.project;
    const all = [pr.summary, pr.pitch, pr.background].filter((s) => String(s).trim()).join('\n\n');
    return [
      { id: 'summary', label: '한 줄 요약', text: pr.summary, field: 'summary' },
      { id: 'pitch', label: '도입 문구', text: pr.pitch, field: 'pitch' },
      { id: 'background', label: '제안 배경', text: pr.background, field: 'background' },
      { id: 'all', label: '셋 다', text: all, field: null },
    ];
  }

  /**
   * 8대 트리거를 제안서 맥락 가중치로 다시 묶는다.
   * 제안서는 구매 페이지가 아니라서 희소성·CTA 비중이 낮은 것이 정상이다.
   */
  const PROPOSAL_WEIGHTS = { anchor: 20, authority: 18, loss: 15, cta: 11, curiosity: 10, social: 10, interrupt: 8, scarcity: 8 };

  function proposalPsych(diag) {
    const triggers = (diag && Array.isArray(diag.triggers)) ? diag.triggers : [];
    let total = 0;
    const by = triggers.map((t) => {
      const weight = PROPOSAL_WEIGHTS[t.id] || 0;
      const score = clamp(toNum(t.score, 0), 0, 100);
      const contribution = Math.round(score / 100 * weight * 10) / 10;
      total += contribution;
      return { id: t.id, name: t.name, score: score, weight: weight, contribution: contribution, level: t.level };
    });
    const rounded = Math.round(total);
    let grade;
    if (rounded >= 78) grade = { id: 'A', label: '설득 구조가 갖춰짐', desc: '근거와 이득이 문장에 드러납니다.' };
    else if (rounded >= 62) grade = { id: 'B', label: '거의 다 됨', desc: '빈틈 1~2개만 채우면 됩니다.' };
    else if (rounded >= 45) grade = { id: 'C', label: '설명문에 가까움', desc: '이득·근거를 문장으로 바꾸세요.' };
    else grade = { id: 'D', label: '다시 세우기', desc: 'PAS·BAB으로 문장을 새로 잡는 편이 빠릅니다.' };
    const weakest = by.slice().sort((a, b) => (a.contribution - b.contribution) || (b.weight - a.weight))[0] || null;
    return { total: rounded, grade: grade, by: by, weakest: weakest, raw: diag ? diag.total : 0 };
  }

  /** PAS · BAB · AIDA · 4U 생성기에 넣을 기본값 */
  function frameworkInput(doc, opts) {
    const d = sanitizeDoc(doc, Date.now());
    const o = opts || {};
    const pr = d.project;
    const valid = validUntil(d);
    const proofBits = (pr.deliverables || []).filter(Boolean).slice(0, 3).join(', ');
    return {
      product: o.product || d.meta.title || o.presetName || '이 프로젝트',
      target: o.target || ([d.client.company, d.client.role].filter(Boolean).join(' ') || '검토 담당자'),
      problem: o.problem || firstSentence(pr.background, 120) || '지금 방식 그대로 시간과 사람이 계속 쓰이고 있습니다',
      solution: o.solution || oneLine(pr.summary, 160) || '정해진 범위와 일정 안에서 바꿉니다',
      proof: o.proof || proofBits || '',
      cta: o.cta || '회신 주시면 일정을 확정하겠습니다',
      urgency: o.urgency || (valid ? formatDate(valid) + '까지 유효' : ''),
      tone: o.tone || 'plain',
    };
  }

  /** 생성한 문구를 문서 필드에 넣는다 */
  function insertIntoDoc(doc, field, text, opts) {
    const base = sanitizeDoc(doc, Date.now());
    const o = opts || {};
    const value = safeStr(text, 1200).trim();
    if (!value) return { doc: base, changed: false };
    const pr = Object.assign({}, base.project);
    if (field === 'summary') pr.summary = safeStr(value, 200);
    else if (field === 'pitch') pr.pitch = safeStr(value, LIMITS.pitch);
    else if (field === 'closing') pr.closing = safeStr(value, LIMITS.closing);
    else if (field === 'background') {
      pr.background = o.prepend && String(base.project.background || '').trim()
        ? safeStr(value + '\n\n' + base.project.background, 1200)
        : safeStr(value, 1200);
    } else return { doc: base, changed: false };
    return {
      doc: sanitizeDoc(Object.assign({}, base, { project: pr, updatedAt: Date.now() }), Date.now()),
      changed: true,
    };
  }

  /** AI 초안(ai-bridge.parseProposal 결과)을 문서에 반영 */
  function applyDraftToDoc(doc, parsed, opts) {
    const base = sanitizeDoc(doc, Date.now());
    const p = parsed || {};
    const o = opts || {};
    const pr = Object.assign({}, base.project);
    const applied = [];

    if (oneLine(p.summary, 200)) { pr.summary = safeStr(oneLine(p.summary, 200), 200); applied.push('요약'); }
    if (oneLine(p.pitch, LIMITS.pitch)) { pr.pitch = safeStr(safeStr(p.pitch, LIMITS.pitch).trim(), LIMITS.pitch); applied.push('도입 문구'); }
    if (safeStr(p.background, 1200).trim()) { pr.background = safeStr(p.background, 1200); applied.push('제안 배경'); }
    if (Array.isArray(p.scope) && p.scope.length) { pr.scope = splitLines(p.scope, LIMITS.scope, 140); applied.push('작업 범위'); }
    if (Array.isArray(p.deliverables) && p.deliverables.length) { pr.deliverables = splitLines(p.deliverables, LIMITS.deliverables, 40); applied.push('산출물'); }
    if (Array.isArray(p.notIncluded) && p.notIncluded.length) { pr.notIncluded = splitLines(p.notIncluded, LIMITS.notIncluded, 80); applied.push('제외 범위'); }
    if (oneLine(p.closing, LIMITS.closing)) { pr.closing = safeStr(safeStr(p.closing, LIMITS.closing).trim(), LIMITS.closing); applied.push('클로징'); }

    const next = sanitizeDoc(Object.assign({}, base, { project: pr, updatedAt: Date.now() }), Date.now());
    return { doc: next, applied: applied, overwrite: o.overwrite !== false };
  }

  /**
   * 내 구독 AI(ChatGPT·Claude·Gemini)로 보낼 제안서 초안 프롬프트.
   * 사실을 만들지 않도록, 문서에 있는 값만 재료로 넣는다.
   */
  function buildProposalPrompt(doc, opts) {
    const d = sanitizeDoc(doc, Date.now());
    const o = opts || {};
    const tone = PROMPT_TONES.filter((t) => t.id === o.tone)[0] || PROMPT_TONES[0];
    const t = computeTotals(d);
    const range = rangeText(d);
    const pr = d.project;
    const L = [];

    L.push('마케팅 대행사·프리랜서의 프로젝트 제안서를 대신 써 주세요.');
    L.push('아래 정보만 근거로, 고객사에 바로 보낼 한국어 제안서 본문을 씁니다.');
    L.push('');
    L.push('## 받는 사람');
    L.push('- 회사: ' + (d.client.company || '고객사'));
    if (d.client.contact) L.push('- 담당자: ' + [d.client.contact, d.client.role].filter(Boolean).join(' '));
    L.push('- 프로젝트: ' + (d.meta.title || '프로젝트 제안'));
    if (o.presetName) L.push('- 서비스: ' + oneLine(o.presetName, 80));
    L.push('- 기간: ' + range.text + ', 작업 시작 ' + formatDate(d.meta.startDate));
    if (o.includePrice && t.total > 0) {
      L.push('- 금액: ' + formatWon(t.total) + ' (' + (t.vatMode === 'included' ? 'VAT 포함' : 'VAT 별도') + ')');
    }

    const facts = [];
    if (pr.summary) facts.push(['요약(기존)', pr.summary]);
    if (pr.pitch) facts.push(['도입(기존)', pr.pitch]);
    if (pr.background) facts.push(['배경(기존)', pr.background]);
    if (pr.scope.length) facts.push(['작업 범위(기존)', pr.scope.join(' / ')]);
    if (pr.deliverables.length) facts.push(['산출물(기존)', pr.deliverables.join(', ')]);
    if (pr.notIncluded.length) facts.push(['제외 범위(기존)', pr.notIncluded.join(', ')]);
    if (pr.closing) facts.push(['클로징(기존)', pr.closing]);
    if (d.terms.payment) facts.push(['결제 조건', oneLine(d.terms.payment, 200)]);
    if (d.terms.maintenance) facts.push(['유지보수', oneLine(d.terms.maintenance, 200)]);

    L.push('');
    L.push('## 지금까지 정리된 내용');
    if (facts.length) {
      facts.forEach((f) => L.push('- ' + f[0] + ': ' + f[1]));
    } else {
      L.push('- (아직 비어 있음. 위 정보만으로 새로 씁니다.)');
    }

    L.push('');
    L.push('## 톤');
    L.push('- ' + tone.label + ' — ' + tone.desc + '. 문장은 짧게, 존댓말은 “~합니다” 체로 통일.');

    L.push('');
    L.push('## 작성 규칙');
    [
      '위에 없는 사실·수치·고객사 실적·후기·수상·인증을 새로 만들지 마세요.',
      '금액·할인·보증·기간을 임의로 바꾸지 마세요.',
      '“최고의, 다양한, 혁신적인, 최적의, 저희는 제공합니다, 구매해 주셔서 감사합니다” 같은 추상어·공급자 중심 표현을 쓰지 마세요.',
      '번역체와 AI 말투(“~에 대해”, “~를 통해”, “또한”, “결론적으로”, “중요한 것은”)를 쓰지 마세요.',
      '이모지·해시태그·굵은 글씨 표시를 쓰지 마세요.',
      '요약: 1문장 80~120자, 고객이 얻는 결과 중심.',
      '도입: 2~3문장 200~300자, 고객의 지금 상황(문제)에서 시작.',
      '배경: 4~5문장 400~700자, 문제 → 원인 → 이 제안이 바꾸는 것.',
      '작업 범위: 5~6줄, 각 40자 이내, 동사로 시작(“~합니다” 없이).',
      '산출물: 2~4개, 제외 범위: 1~3줄.',
      '클로징: 1~2문장, 검토 후 회신을 요청. 일정·금액을 새로 약속하지 않기.',
    ].forEach((rule, i) => L.push((i + 1) + '. ' + rule));

    L.push('');
    L.push('## 출력 형식');
    L.push('아래 라벨을 그대로 쓰고, 인사말·설명·요약문은 붙이지 마세요.');
    L.push('[요약]');
    L.push('[도입]');
    L.push('[배경]');
    L.push('[작업 범위]  (한 줄에 하나, “- ” 시작)');
    L.push('[산출물]  (한 줄에 하나)');
    L.push('[제외 범위]  (한 줄에 하나)');
    L.push('[클로징]');

    return L.join('\n');
  }

  /* ---------- preset integrity helpers used by tests ---------- */
  function presetTotal(preset) {
    return computeTotals({
      items: (preset && preset.items) || [],
      vat: { mode: 'excluded', rate: 0 },
      discount: { mode: 'none', value: 0 },
    }).total;
  }

  return {
    VAT_RATE: VAT_RATE,
    DOC_TYPES: DOC_TYPES,
    VAT_MODES: VAT_MODES,
    DISCOUNT_MODES: DISCOUNT_MODES,
    UNITS: UNITS,
    LIMITS: LIMITS,
    DESIGN_PRESET_IDS: DESIGN_PRESET_IDS,
    PALETTE_KEYS: PALETTE_KEYS,
    PROMPT_TONES: PROMPT_TONES,
    clamp: clamp,
    toNum: toNum,
    roundWon: roundWon,
    safeStr: safeStr,
    oneLine: oneLine,
    parseWon: parseWon,
    formatNumber: formatNumber,
    formatWon: formatWon,
    formatManWon: formatManWon,
    koreanAmount: koreanAmount,
    wonInWords: wonInWords,
    isoFromDate: isoFromDate,
    parseIso: parseIso,
    addDays: addDays,
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    docNumber: docNumber,
    rangeText: rangeText,
    validUntil: validUntil,
    blankDoc: blankDoc,
    sanitizeDoc: sanitizeDoc,
    computeTotals: computeTotals,
    totalRows: totalRows,
    computeMilestones: computeMilestones,
    completeness: completeness,
    isPlaceholder: isPlaceholder,
    isHexColor: isHexColor,
    paletteOk: paletteOk,
    normalizeDesign: normalizeDesign,
    applyPreset: applyPreset,
    pageList: pageList,
    documentTitle: documentTitle,
    summaryText: summaryText,
    firstSentence: firstSentence,
    copyTargets: copyTargets,
    proposalPsych: proposalPsych,
    frameworkInput: frameworkInput,
    insertIntoDoc: insertIntoDoc,
    applyDraftToDoc: applyDraftToDoc,
    buildProposalPrompt: buildProposalPrompt,
    presetTotal: presetTotal,
  };
});
