/* ============================================================
   견적서 스튜디오 · design.js
   디자인 레퍼런스 엔진(engines/design-ref-engine.js)을 이 앱의 A4 문서에
   연결하는 얇은 어댑터. DOM을 만지지 않는 순수 함수만 둔다.

   - 테마 목록(스튜디오 기본 + 프리셋 8종)
   - 문서 맥락 → 추천 3~4안
   - 테마 → 종이 CSS 변수(--p-*)·구조 키
   - 레퍼런스 이미지 팔레트 → 커스텀 테마 스펙
   - 저장 스펙(design.id / custom) 정규화
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engines/design-ref-engine.js'));
  } else {
    root.AgencyDesign = factory(root.DesignRef);
  }
})(typeof self !== 'undefined' ? self : this, function (DR) {
  'use strict';

  var VERSION = '1.0.0';

  if (!DR) throw new Error('design-ref-engine.js를 먼저 불러와야 합니다.');

  /* ---------- 폰트 스택 (앱에 번들된 PlexKR 우선) ---------- */
  var SANS = "'PlexKR', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Helvetica Neue', Arial, sans-serif";
  var SERIF = "'Nanum Myeongjo', 'Noto Serif KR', 'Noto Serif CJK KR', 'AppleMyungjo', '바탕', Batang, Georgia, 'Times New Roman', serif";
  var MONO = "'JetBrains Mono', 'D2Coding', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
  var ROUNDED = "'PlexKR', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Trebuchet MS', system-ui, sans-serif";

  var FONTS = { sans: SANS, serif: SERIF, mono: MONO, rounded: ROUNDED };

  function stack(family) { return FONTS[family] || SANS; }

  /* ---------- 스튜디오 기본 테마 (지금 앱의 문서 톤) ---------- */
  var STUDIO = {
    id: 'studio',
    name: '스튜디오 기본',
    nameEn: 'Studio Default',
    tagline: '지금 앱의 핑크 포인트 그대로. 단정한 문서형.',
    keywords: ['핑크 포인트', '문서형', '균형'],
    palette: {
      bg: '#FFFFFF', surface: '#F7F8FB', ink: '#14161B', sub: '#666E7B',
      line: '#E6E9EF', accent: '#DE1A53', accentInk: '#FFFFFF', accentSoft: '#FFF3F0'
    },
    ratio: { bg: 70, surface: 20, accent: 10 },
    type: {
      base: 13, ratio: 1.2,
      family: { display: 'sans', body: 'sans', mono: 'mono' },
      roles: {
        display: { weight: 800, lineHeight: 1.18, tracking: '-0.03em', transform: 'none' },
        h1: { weight: 700, lineHeight: 1.28, tracking: '-0.025em', transform: 'none' },
        h2: { weight: 700, lineHeight: 1.3, tracking: '-0.01em', transform: 'none' },
        lead: { weight: 400, lineHeight: 1.6, tracking: '0em', transform: 'none' },
        body: { weight: 400, lineHeight: 1.62, tracking: '0em', transform: 'none' },
        caption: { weight: 500, lineHeight: 1.45, tracking: '0.01em', transform: 'none' },
        micro: { weight: 800, lineHeight: 1.3, tracking: '0.18em', transform: 'uppercase' }
      }
    },
    layout: {
      unit: 8, columns: 12, gutter: 24, margin: 48, radius: 2, border: 1, shadow: 'soft',
      density: 'high', imageRatio: '4:5', sectionGap: 48, maxWidth: 1180,
      cta: { pos: 'inline-left', radius: 2, height: 44, minWidth: 180 },
      badge: { pos: 'top-left', style: 'soft' }, grid: 'editorial-12'
    },
    fit: { '뷰티·패션': 0.7, '테크·IT': 0.85, '푸드·리빙': 0.7, '금융·B2B': 0.8, '숏폼 바이럴': 0.55 },
    moods: ['정돈', '친근', '실무'],
    purposes: { cardnews: 0.6, detail: 0.6, saas: 0.6, proposal: 0.82 },
    dna: {
      layout: { structure: 'studio-doc', columns: 12, gridLines: true, textAlign: 'left', note: '앱 기본 문서형' },
      image: { ratio: '4:5', fill: false, crop: 'center', focal: 'center', overlay: { type: 'none' }, textOnImage: false },
      graphics: { shadowType: 'soft', radius: 2, rules: '1px', decoration: 'top-bar' },
      type: { displayFamily: 'sans', bodyFamily: 'sans' }
    },
    trust: 0.85,
    defaultRisk: { risk: 0.25, flagged: false, label: '개성 있음', reasons: ['브랜드 고정 팔레트'] },
    rules: ['포인트 색은 브랜드 한 곳(견적 번호·합계)에만.', '표는 괘선과 여백으로 구분한다.']
  };

  var STUDIO_ID = 'studio';
  var BRAND_ID = 'brand';

  function presetIds() {
    return DR.PRESETS.map(function (p) { return p.id; });
  }

  function isPresetId(id) {
    return presetIds().indexOf(String(id || '')) >= 0;
  }

  function isHex(v) {
    return /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
  }

  var PALETTE_KEYS = ['bg', 'surface', 'ink', 'sub', 'line', 'accent', 'accentInk', 'accentSoft'];

  function paletteOk(p) {
    if (!p || typeof p !== 'object') return false;
    return PALETTE_KEYS.every(function (k) { return isHex(p[k]); });
  }

  function pickPalette(p) {
    var out = {};
    PALETTE_KEYS.forEach(function (k) { out[k] = String(p[k]).toUpperCase(); });
    return out;
  }

  /** 저장된 design 스펙을 화이트리스트로 정리한다. */
  function normalizeDesign(raw) {
    var r = raw;
    if (typeof r === 'string') r = { id: r };
    if (!r || typeof r !== 'object') return { id: STUDIO_ID, custom: null };

    var id = String(r.id || STUDIO_ID);
    if (id === 'custom') {
      var c = r.custom;
      if (c && paletteOk(c.palette)) {
        return {
          id: 'custom',
          custom: {
            name: String(c.name || '레퍼런스 색').slice(0, 40),
            base: isPresetId(c.base) ? c.base : 'swiss-magazine',
            palette: pickPalette(c.palette)
          }
        };
      }
      return { id: STUDIO_ID, custom: null };
    }
    if (id === BRAND_ID) return { id: BRAND_ID, custom: null };
    if (id === STUDIO_ID || isPresetId(id)) return { id: id, custom: null };
    return { id: STUDIO_ID, custom: null };
  }

  function customThemeOf(spec) {
    if (!spec || !spec.custom) return null;
    try {
      var p = DR.buildCustomTheme({
        id: 'custom-theme',
        name: spec.custom.name || '레퍼런스 색',
        base: spec.custom.base || 'swiss-magazine',
        palette: spec.custom.palette
      });
      return p;
    } catch (e) { return null; }
  }

  function themeOfSpec(spec) {
    var d = normalizeDesign(spec);
    if (d.id === 'custom') {
      var ct = customThemeOf(d);
      if (ct) return { theme: ct, kind: 'custom', spec: d };
    }
    if (d.id === STUDIO_ID) return { theme: STUDIO, kind: 'studio', spec: d };
    if (isPresetId(d.id)) return { theme: DR.get(d.id), kind: 'preset', spec: d };
    return { theme: STUDIO, kind: 'studio', spec: { id: STUDIO_ID, custom: null } };
  }

  /**
   * 문서의 design 스펙 → 실제 테마.
   * @param {object|string} spec design 스펙
   * @param {object} [opts] { brand:{name, design, savedAt} }
   */
  function themeFor(spec, opts) {
    opts = opts || {};
    var d = normalizeDesign(spec);
    var brand = opts.brand && opts.brand.design ? opts.brand : null;

    var resolved = d;
    var isBrand = false;
    if (d.id === BRAND_ID) {
      isBrand = true;
      resolved = brand ? normalizeDesign(brand.design) : { id: STUDIO_ID, custom: null };
      if (resolved.id === BRAND_ID) resolved = { id: STUDIO_ID, custom: null };
    }

    var got = themeOfSpec(resolved);
    var theme = got.theme;
    var tokens = DR.tokens(theme);
    var dna = null;
    try { dna = DR.dnaOf(theme); } catch (e) { dna = null; }

    var warnings = [];
    if (d.id === BRAND_ID && !brand) warnings.push('저장된 브랜드 스타일이 없어 기본 디자인으로 표시합니다.');

    return {
      specId: d.id,
      resolvedId: resolved.id,
      isBrand: isBrand,
      kind: got.kind,
      theme: theme,
      name: isBrand && brand ? (brand.name || theme.name) : theme.name,
      tagline: theme.tagline,
      palette: theme.palette,
      structure: dna && dna.layout ? dna.layout.structure : 'swiss-grid',
      dna: dna,
      tokens: tokens,
      warnings: warnings
    };
  }

  /** 테마 목록 (스튜디오 기본 + 프리셋 8종) */
  function listThemes() {
    var out = [{
      id: STUDIO_ID,
      name: STUDIO.name,
      tagline: STUDIO.tagline,
      keywords: STUDIO.keywords.slice(),
      palette: STUDIO.palette,
      structure: 'studio-doc',
      family: 'studio',
      familyLabel: '앱 기본',
      proposalScore: 0.82,
      defaultRisk: STUDIO.defaultRisk
    }];
    DR.PRESETS.forEach(function (p) {
      out.push({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        tagline: p.tagline,
        keywords: (p.keywords || []).slice(),
        palette: p.palette,
        structure: p.dna && p.dna.layout ? p.dna.layout.structure : 'swiss-grid',
        family: p.family,
        familyLabel: p.familyLabel,
        proposalScore: (p.purposes && p.purposes.proposal) || 0,
        defaultRisk: p.defaultRisk,
        rules: (p.rules || []).slice(0, 5)
      });
    });
    return out;
  }

  function docText(doc, presetName) {
    var d = doc || {};
    var pr = d.project || {};
    var cli = d.client || {};
    var meta = d.meta || {};
    var terms = d.terms || {};
    return [
      meta.title, presetName, cli.company, cli.role,
      pr.summary, pr.pitch, pr.background,
      (pr.scope || []).join('\n'), (pr.deliverables || []).join('\n'), (pr.notIncluded || []).join('\n'),
      terms.payment, terms.maintenance, terms.note
    ].filter(Boolean).join('\n');
  }

  /**
   * 문서 맥락으로 3~4안 추천.
   * @returns {{ok,context,refs,rejected,note}}
   */
  function recommend(doc, opts) {
    opts = opts || {};
    try {
      var rec = DR.recommendDesignRefs({
        text: docText(doc, opts.presetName),
        purpose: '제안서',
        industry: opts.industry || undefined,
        mood: opts.mood || undefined
      }, { count: 4 });
      return {
        ok: true,
        context: rec.context,
        note: rec.note,
        rejected: rec.rejected,
        refs: rec.refs.map(function (r) {
          return {
            id: r.id,
            name: r.name,
            rank: r.rank,
            score: r.score,
            percent: Math.round(r.score * 100),
            familyLabel: r.familyLabel,
            reasons: r.reasons.slice(0, 3),
            defaultRisk: r.defaultRisk
          };
        })
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e), context: null, refs: [], rejected: [], note: '' };
    }
  }

  /** radius(px) → mm (A4 문서에서 쓰는 단위) */
  function radiusMm(px) {
    var mm = Number(px || 0) / 3.7795;
    return Math.round(Math.min(4.5, Math.max(0, mm)) * 100) / 100;
  }

  function shadowCss(kind) {
    if (kind === 'hard') return '2.4px 2.4px 0 var(--p-ink)';
    if (kind === 'glow') return '0 0 4mm -0.6mm var(--p-brand)';
    if (kind === 'none') return 'none';
    return '0 1.6mm 4mm -2.6mm rgba(15, 18, 24, .22)';
  }

  /**
   * 테마 → 종이(A4)에 적용할 CSS 변수와 구조 키.
   * @returns {{vars, structure, name, palette, contrast, allPass, dark, inkNote, warnings}}
   */
  function paperTheme(theme) {
    var t = DR.tokens(theme);
    var c = t.color;
    var mix = DR.color.mix;
    var dark = DR.color.relativeLuminance(c.bg) < 0.32;
    var radius = (theme.layout && theme.layout.radius) || 0;
    var dna = null;
    try { dna = DR.dnaOf(theme); } catch (e) { dna = null; }
    var structure = dna && dna.layout ? dna.layout.structure : 'swiss-grid';

    var vars = {
      '--p-paper': c.bg,
      '--p-surface': c.surface,
      '--p-surface-2': mix(c.surface, c.bg, 0.45),
      '--p-ink': c.ink,
      '--p-ink-2': mix(c.ink, c.bg, 0.18),
      '--p-ink-3': c.sub,
      '--p-ink-4': mix(c.sub, c.bg, 0.42),
      '--p-line': c.line,
      '--p-line-2': mix(c.line, c.bg, 0.5),
      '--p-brand': c.accent,
      '--p-brand-2': mix(c.accent, c.bg, 0.28),
      '--p-soft': c.accentSoft,
      '--p-accent-ink': c.accentInk,
      '--p-radius': radiusMm(radius) + 'mm',
      '--p-card-border': ((theme.layout && theme.layout.border) || 1) + 'px',
      '--p-table-head-bg': dark ? mix(c.ink, c.bg, 0.16) : c.ink,
      '--p-table-head-ink': dark ? c.ink : c.bg,
      '--p-font-display': stack(t.type.family.display),
      '--p-font-body': stack(t.type.family.body),
      '--p-mono': stack('mono'),
      '--p-display-weight': String(t.type.roles.display.weight),
      '--p-h1-weight': String(t.type.roles.h1.weight),
      '--p-h2-weight': String(t.type.roles.h2.weight),
      '--p-body-weight': String(t.type.roles.body.weight),
      '--p-display-tracking': t.type.roles.display.tracking,
      '--p-micro-tracking': t.type.roles.micro.tracking,
      '--p-body-leading': String(t.type.roles.body.lineHeightRatio),
      '--p-shadow': shadowCss(theme.layout && theme.layout.shadow),
      '--p-mark-radius': radius >= 8 ? '50%' : radiusMm(radius) + 'mm',
      '--p-upper': t.type.roles.micro.transform === 'uppercase' ? 'uppercase' : 'none'
    };

    var warnings = [];
    if (dark) warnings.push('어두운 종이입니다. 인쇄(PDF)에서 잉크가 많이 들고, 흑백 프린터에서는 글자가 묻힐 수 있어요.');
    if (structure === 'brutal-block') warnings.push('네오 브루탈리즘은 금융·B2B·공공 제안서에서 신뢰도가 떨어집니다.');
    if (structure === 'full-bleed-photo') warnings.push('본문을 흰색으로 올리면 눈이 아파 보조 텍스트 톤을 유지하세요.');

    return {
      vars: vars,
      structure: structure,
      name: theme.name,
      palette: theme.palette,
      contrast: t.a11y.contrast,
      allPass: t.a11y.allPass,
      dark: dark,
      radius: radius,
      shadow: (theme.layout && theme.layout.shadow) || 'soft',
      warnings: warnings
    };
  }

  /** 레퍼런스 이미지(ImageData) → 팔레트 */
  function paletteFromImageData(data, opts) {
    try {
      var ex = DR.paletteFromImageData(data, opts || {});
      if (!ex || !ex.ok) return ex || { ok: false, reason: 'empty' };
      return ex;
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  }

  /** 추출 결과 → 저장 가능한 커스텀 테마 스펙 */
  function themeSpecFromPalette(extraction, opts) {
    opts = opts || {};
    if (!extraction || !extraction.ok || !paletteOk(extraction.palette)) return null;
    return {
      id: 'custom',
      custom: {
        name: String(opts.name || '레퍼런스 색').slice(0, 40),
        base: isPresetId(opts.base) ? opts.base : 'swiss-magazine',
        palette: pickPalette(extraction.palette)
      }
    };
  }

  /** 현재 design 스펙 → 브랜드 저장용 스펙(프리셋·커스텀 모두) */
  function brandDesignOf(spec) {
    var d = normalizeDesign(spec);
    if (d.id === BRAND_ID) return null;
    return d;
  }

  function contrastOf(theme) {
    try { return DR.contrastReport(theme); } catch (e) { return []; }
  }

  function describe(spec, opts) {
    var res = themeFor(spec, opts);
    return {
      specId: res.specId,
      name: res.name,
      isBrand: res.isBrand,
      kind: res.kind,
      structure: res.structure,
      palette: res.palette
    };
  }

  return {
    VERSION: VERSION,
    STUDIO: STUDIO,
    STUDIO_ID: STUDIO_ID,
    BRAND_ID: BRAND_ID,
    FONTS: FONTS,
    PALETTE_KEYS: PALETTE_KEYS,
    presetIds: presetIds,
    isPresetId: isPresetId,
    isHex: isHex,
    paletteOk: paletteOk,
    normalizeDesign: normalizeDesign,
    themeFor: themeFor,
    listThemes: listThemes,
    recommend: recommend,
    paperTheme: paperTheme,
    paletteFromImageData: paletteFromImageData,
    themeSpecFromPalette: themeSpecFromPalette,
    brandDesignOf: brandDesignOf,
    contrastOf: contrastOf,
    docText: docText,
    describe: describe,
    engine: DR
  };
});
