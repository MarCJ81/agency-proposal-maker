/* ============================================================
   ai-bridge.js  ·  내 구독 AI 원클릭 브리지 (제안서판)  v1.0.0
   ------------------------------------------------------------
   의존성 없는 순수 JS(UMD). 브라우저에서는 window.AiBridge,
   node 에서는 require('./ai-bridge.js') 로 쓴다.

   이 모듈이 하는 일
   1) 제안서 프롬프트를 ChatGPT · Claude · Gemini 새 창으로 넘기는 링크 생성
      (주소로 자동 입력할 수 있는 곳은 자동 입력, 안 되는 곳은 클립보드용)
   2) AI가 준 제안서 초안 한 덩어리에서 요약 · 도입 · 배경 · 범위 · 산출물 ·
      제외 범위 · 클로징을 분리
   3) 선택형 무료 Gemini API 키로 브라우저에서 바로 생성하는 요청/응답 처리

   이 파일에는 키를 넣지 않는다. 키는 사용자가 화면에서 넣고
   브라우저 저장소(localStorage)에만 남는다.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AiBridge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ── 공통 유틸 ─────────────────────────────────────────── */

  function str(v) {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  function codePoints(s) {
    return Array.from ? Array.from(str(s)).length : str(s).length;
  }

  function trimBlankLines(lines) {
    var out = lines.slice();
    while (out.length && !out[0].trim()) out.shift();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out;
  }

  function squash(s, max) {
    var t = str(s).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
    if (max && codePoints(t) > max) t = Array.from(t).slice(0, max).join('');
    return t;
  }

  /* ── 1. AI 링크 ────────────────────────────────────────── */

  /**
   * prefilled: 주소의 q 파라미터로 입력창을 채울 수 있는가.
   * maxPrompt: 서비스가 받아 주는 대략의 글자수(넘으면 주소로 넘기지 않음).
   * 주소 파라미터 방식은 각 서비스가 공식 문서로 보장하지 않는 기능이라,
   * 자동 입력이 비어 있으면 붙여넣기로 끝낼 수 있게 클립보드를 항상 함께 쓴다.
   */
  var PROVIDERS = [
    {
      id: 'chatgpt', label: 'ChatGPT', host: 'chatgpt.com',
      base: 'https://chatgpt.com/', param: 'q', prefilled: true, maxPrompt: 6000, maxUrl: 7000,
      note: '입력창에 프롬프트가 채워집니다. 비어 있으면 Ctrl+V로 붙여넣으세요.'
    },
    {
      id: 'claude', label: 'Claude', host: 'claude.ai',
      base: 'https://claude.ai/new', param: 'q', prefilled: true, maxPrompt: 10000, maxUrl: 7000,
      note: '입력창에 프롬프트가 채워집니다. 비어 있으면 Ctrl+V로 붙여넣으세요.'
    },
    {
      id: 'gemini', label: 'Gemini', host: 'gemini.google.com',
      base: 'https://gemini.google.com/app', param: '', prefilled: false, maxPrompt: 0, maxUrl: 0,
      note: 'Gemini는 주소 자동 입력이 안 됩니다. 클립보드에 복사했으니 열린 창에 붙여넣으세요.'
    }
  ];

  var PROVIDER_INDEX = (function () {
    var m = {};
    PROVIDERS.forEach(function (p) { m[p.id] = p; });
    return m;
  })();

  function provider(id) {
    return PROVIDER_INDEX[String(id || '').toLowerCase()] || null;
  }

  function listProviders() {
    return PROVIDERS.map(function (p) {
      return { id: p.id, label: p.label, host: p.host, prefilled: p.prefilled, note: p.note };
    });
  }

  /**
   * 프롬프트를 넘길 링크.
   * @returns {{id,label,url,prefilled,fit,note}}
   */
  function linkFor(id, prompt) {
    var p = provider(id);
    if (!p) return { id: String(id || ''), label: '', url: '', prefilled: false, fit: false, note: '알 수 없는 AI예요.' };
    var text = str(prompt);
    var len = codePoints(text);

    if (!p.prefilled) {
      return { id: p.id, label: p.label, url: p.base, prefilled: false, fit: false, note: p.note };
    }
    if (!text.trim()) {
      return { id: p.id, label: p.label, url: p.base, prefilled: false, fit: false, note: '보낼 프롬프트가 비어 있어요.' };
    }
    if (len > p.maxPrompt) {
      return {
        id: p.id, label: p.label, url: p.base, prefilled: false, fit: false,
        note: '프롬프트가 ' + len.toLocaleString('ko-KR') + '자로 길어 주소에 담지 못했어요. 클립보드에 복사했으니 열린 창에 붙여넣으세요.'
      };
    }
    var encoded = encodeURIComponent(text).length;
    if (p.maxUrl && encoded > p.maxUrl) {
      return {
        id: p.id, label: p.label, url: p.base, prefilled: false, fit: false,
        note: '프롬프트가 길어(주소 ' + encoded.toLocaleString('ko-KR') + '자) 자동 입력 대신 붙여넣기로 안내해요.'
      };
    }
    var sep = p.base.indexOf('?') >= 0 ? '&' : '?';
    return {
      id: p.id, label: p.label,
      url: p.base + sep + p.param + '=' + encodeURIComponent(text),
      prefilled: true, fit: true, note: p.note
    };
  }

  function linksFor(prompt) {
    return PROVIDERS.map(function (p) { return linkFor(p.id, prompt); });
  }

  /* ── 2. AI 제안서 초안 → 필드 분리 ─────────────────────── */

  /** 섹션 이름 별칭. 공백·대소문자를 지우고 비교한다. */
  var SECTIONS = [
    { key: 'summary', labels: ['요약', '한줄요약', '핵심요약', 'summary', '개요'] },
    { key: 'pitch', labels: ['도입', '도입문구', '설득문구', '설득', '훅', 'hook', 'pitch', '한문단'] },
    { key: 'background', labels: ['배경', '제안배경', '문제', '현황', 'context', 'problem', 'background'] },
    { key: 'scope', labels: ['범위', '작업범위', '과업', '업무범위', 'scope', 'works'] },
    { key: 'deliverables', labels: ['산출물', '결과물', 'deliverables', 'outputs'] },
    { key: 'notIncluded', labels: ['제외', '제외범위', 'notincluded', 'exclusions', 'outofscope'] },
    { key: 'closing', labels: ['클로징', '마무리', '맺음말', '요청', 'closing', 'cta'] }
  ];

  var LABEL_INDEX = (function () {
    var m = {};
    SECTIONS.forEach(function (s) {
      s.labels.forEach(function (l) { m[l.replace(/\s+/g, '').toLowerCase()] = s.key; });
    });
    return m;
  })();

  var LIMITS = {
    summary: 200, pitch: 400, background: 1200,
    scope: { lines: 10, chars: 140 },
    deliverables: { lines: 8, chars: 40 },
    notIncluded: { lines: 6, chars: 80 },
    closing: 300
  };

  function cleanInline(s) {
    var t = str(s).trim();
    t = t.replace(/^\s{0,3}#{1,6}\s*/, '');
    t = t.replace(/^\*\*(.+)\*\*$/, '$1');
    t = t.replace(/^__(.+)__$/, '$1');
    t = t.replace(/^[\[【(]\s*/, '').replace(/\s*[\]】)]$/, '');
    return t.trim();
  }

  function cleanBullet(s) {
    var t = str(s).trim();
    t = t.replace(/^\s*(?:[-*•·–—]|✅|☑|✔|\d+[.)]|\(\d+\))\s*/, '');
    return t.replace(/\*\*/g, '').trim();
  }

  /** 한 줄이 섹션 제목인지 판별해 key를 돌려준다. 아니면 null */
  function sectionOf(line) {
    var raw = str(line).trim();
    if (!raw) return null;
    if (codePoints(cleanBullet(raw)) > 24) return null;

    var candidates = [];
    var bracketed = /^[\[【]\s*([^\]】]{1,20})\s*[\]】]\s*:?\s*$/.exec(raw);
    if (bracketed) candidates.push(bracketed[1]);

    var marked = /^\s{0,3}#{1,6}\s*(.+?)\s*$/.exec(raw);
    if (marked) candidates.push(marked[1]);

    var bolded = /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(raw);
    if (bolded) candidates.push(bolded[1]);

    var labeled = /^\s*([가-힣A-Za-z ]{1,12})\s*[:：]\s*$/.exec(raw);
    if (labeled) candidates.push(labeled[1]);

    var inline = /^\s*(?:#{1,6}\s*)?\*{0,2}\s*([가-힣A-Za-z ]{1,12})\s*\*{0,2}\s*[:：]\s+\S/.exec(raw);
    if (inline) candidates.push(inline[1]);

    if (/^[가-힣A-Za-z ]{1,10}$/.test(raw)) candidates.push(raw);

    for (var i = 0; i < candidates.length; i++) {
      var key = candidates[i].replace(/\s+/g, '').replace(/[\[\]【】:：*#]/g, '').toLowerCase();
      if (LABEL_INDEX[key]) return { key: LABEL_INDEX[key], inline: inline && candidates[i] === inline[1] };
    }
    return null;
  }

  /** `[요약] 한 문장` 처럼 제목과 내용이 한 줄에 있는 경우 내용만 뽑는다. */
  function inlineValue(line) {
    var m = /^\s*(?:#{1,6}\s*)?\*{0,2}\s*\[?[가-힣A-Za-z ]{1,12}\]?\s*\*{0,2}\s*[:：]\s+(.+)$/.exec(str(line).trim());
    if (m) return m[1].trim();
    var b = /^\s*[\[【]\s*[^\]】]{1,20}\s*[\]】]\s*[:：]?\s*(.+)$/.exec(str(line).trim());
    if (b) return b[1].trim();
    return '';
  }

  function listFrom(lines, limit) {
    var out = [];
    lines.forEach(function (line) {
      var t = cleanBullet(line);
      if (!t) return;
      out.push(Array.from(t).slice(0, limit.chars).join(''));
    });
    return out.slice(0, limit.lines);
  }

  /**
   * AI가 준 제안서 초안 한 덩어리를 문서 필드로 나눈다.
   * - ```코드블록``` 표시 제거
   * - [요약] · 요약: · ## 요약 · **요약** 제목 인식
   * - 범위/산출물/제외는 줄 단위 목록으로
   * - 제목 표시가 없으면 첫 짧은 문단을 요약, 나머지를 배경으로
   * @param {string} raw
   * @returns {{summary,pitch,background,scope,deliverables,notIncluded,closing,stats,warnings,found,plain}}
   */
  function parseProposal(raw) {
    var text = str(raw).replace(/\r\n?/g, '\n');
    var fences = 0;
    var lines = text.split('\n').filter(function (line) {
      if (/^\s*```/.test(line)) { fences++; return false; }
      return true;
    });

    var buckets = { summary: [], pitch: [], background: [], scope: [], deliverables: [], notIncluded: [], closing: [] };
    var found = [];
    var current = null;
    var preamble = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var sec = sectionOf(line);
      if (sec) {
        current = sec.key;
        if (found.indexOf(current) < 0) found.push(current);
        var rest = inlineValue(line);
        if (rest) buckets[current].push(rest);
        continue;
      }
      if (current) buckets[current].push(line);
      else preamble.push(line);
    }

    var plain = found.length === 0;
    if (plain) {
      var paras = trimBlankLines(text.replace(/^\s*```[^\n]*$/gm, '').split('\n'))
        .join('\n').split(/\n\s*\n+/)
        .map(function (p) { return p.trim(); })
        .filter(Boolean);
      if (paras.length >= 2 && codePoints(paras[0]) <= 120 && codePoints(paras[0]) >= 8) {
        buckets.summary = [paras[0]];
        buckets.background = paras.slice(1).join('\n\n').split('\n');
        found = ['summary', 'background'];
      } else {
        buckets.background = paras.join('\n\n').split('\n');
        found = ['background'];
      }
    } else if (preamble.join('').trim()) {
      /* 라벨 앞에 인사말이 있으면 배경이 비었을 때만 흡수한다. */
      if (!buckets.background.join('').trim()) buckets.background = preamble;
    }

    function join(key) {
      var body = trimBlankLines(buckets[key]).join('\n').trim();
      return squash(body, LIMITS[key]);
    }

    var summary = join('summary');
    var pitch = join('pitch');
    var background = join('background');
    var closing = join('closing');
    var scope = listFrom(buckets.scope, LIMITS.scope);
    var deliverables = listFrom(buckets.deliverables, LIMITS.deliverables);
    var notIncluded = listFrom(buckets.notIncluded, LIMITS.notIncluded);

    /* 라벨이 한 줄에 붙은 경우(`- 요약: …`) 대비 */
    if (!summary && background) {
      var firstLine = background.split('\n')[0];
      if (codePoints(firstLine) <= 120 && /[.!?。]$/.test(firstLine) && background.indexOf('\n') > 0) {
        summary = firstLine.trim();
        background = background.slice(firstLine.length).trim();
      }
    }

    var stats = {
      summaryChars: codePoints(summary),
      pitchChars: codePoints(pitch),
      backgroundChars: codePoints(background),
      backgroundNoSpace: codePoints(background.replace(/\s+/g, '')),
      paragraphs: background ? background.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0,
      scope: scope.length,
      deliverables: deliverables.length,
      notIncluded: notIncluded.length,
      closingChars: codePoints(closing),
      fences: fences
    };

    var warnings = [];
    if (!summary) warnings.push('요약 줄을 찾지 못했어요. 첫 문단을 요약으로 쓰거나 직접 입력하세요.');
    if (!background) warnings.push('제안 배경이 비어 있어요. AI 답변이 잘렸는지 확인하세요.');
    else if (stats.backgroundNoSpace < 160) warnings.push('배경이 ' + stats.backgroundNoSpace + '자(공백 제외)로 짧아요. 답변이 중간에 끊겼는지 확인하세요.');
    else if (stats.backgroundNoSpace > LIMITS.background) warnings.push('배경이 길어 ' + LIMITS.background + '자에서 잘랐어요. 나머지는 직접 덧붙이세요.');
    if (!scope.length) warnings.push('작업 범위 목록이 없어요. 범위는 줄마다 "·" 없이 한 줄씩 받습니다.');
    if (!deliverables.length) warnings.push('산출물 목록이 없어요.');
    if (!found.length) warnings.push('섹션 제목을 찾지 못해 첫 문단을 요약, 나머지를 배경으로 나눴어요.');
    if (fences) warnings.push('코드블록 표시(```)는 자동으로 지웠어요.');

    return {
      summary: summary,
      pitch: pitch,
      background: background,
      scope: scope,
      deliverables: deliverables,
      notIncluded: notIncluded,
      closing: closing,
      fences: fences,
      found: found,
      plain: plain,
      stats: stats,
      warnings: warnings
    };
  }

  function isEmptyDraft(p) {
    if (!p) return true;
    var vals = [p.summary, p.pitch, p.background, p.closing];
    if (vals.some(function (v) { return str(v).trim(); })) return false;
    return !(p.scope.length || p.deliverables.length || p.notIncluded.length);
  }

  function quickStats(raw) {
    var p = parseProposal(raw);
    return {
      summary: p.summary,
      backgroundChars: p.stats.backgroundChars,
      scope: p.scope.length,
      deliverables: p.deliverables.length,
      warnings: p.warnings
    };
  }

  /* ── 3. Gemini API (선택) ───────────────────────────────── */

  var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
  var GEMINI_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash'
  ];

  function geminiModel(model) {
    var m = str(model).trim();
    return m || GEMINI_DEFAULT_MODEL;
  }

  /**
   * 브라우저에서 바로 부를 요청. 키는 주소의 key 파라미터로만 나간다.
   * @returns {{url,model,init}}
   */
  function buildGeminiRequest(opts) {
    var o = opts || {};
    var key = str(o.apiKey).trim();
    if (!key) throw new Error('Gemini API 키가 비어 있어요.');
    var prompt = str(o.prompt);
    if (!prompt.trim()) throw new Error('보낼 프롬프트가 비어 있어요.');
    var model = geminiModel(o.model);
    var url = GEMINI_BASE + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    var body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof o.temperature === 'number' ? o.temperature : 0.6,
        maxOutputTokens: typeof o.maxOutputTokens === 'number' ? o.maxOutputTokens : 4096
      }
    };
    return {
      url: url,
      model: model,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    };
  }

  function textFromParts(parts) {
    if (!Array.isArray(parts)) return '';
    return parts.map(function (p) {
      if (!p || typeof p !== 'object') return '';
      if (p.thought === true) return '';
      return str(p.text);
    }).filter(Boolean).join('');
  }

  /**
   * Gemini 응답 → 초안 텍스트.
   * generateContent(candidates)와 최신 interactions(output_text) 모양을 모두 받는다.
   * @returns {{ok,text,error,code,finishReason,warnings}}
   */
  function parseGeminiResponse(json) {
    var warnings = [];
    if (!json || typeof json !== 'object') {
      return { ok: false, text: '', error: '응답을 읽지 못했어요.', code: 'bad-json', warnings: warnings };
    }
    if (json.error) {
      return {
        ok: false, text: '', code: json.error.code || 'error',
        error: str(json.error.message) || 'Gemini가 오류를 돌려줬어요.',
        warnings: warnings
      };
    }

    var text = '';

    if (Array.isArray(json.candidates) && json.candidates.length) {
      var cand = json.candidates[0] || {};
      text = textFromParts(cand.content && cand.content.parts);
      if (cand.finishReason && cand.finishReason !== 'STOP') {
        warnings.push('응답이 ' + cand.finishReason + '로 끝났어요. 초안이 잘렸으면 이어서 요청하세요.');
      }
    } else if (typeof json.output_text === 'string') {
      text = json.output_text;
    } else if (Array.isArray(json.outputs)) {
      text = json.outputs.map(function (o) {
        if (typeof o === 'string') return o;
        if (o && typeof o.text === 'string') return o.text;
        if (o && o.content && Array.isArray(o.content.parts)) return textFromParts(o.content.parts);
        return '';
      }).filter(Boolean).join('\n');
    } else if (json.promptFeedback && json.promptFeedback.blockReason) {
      return {
        ok: false, text: '', code: 'blocked',
        error: '안전 필터에 걸려 답변이 오지 않았어요(' + json.promptFeedback.blockReason + '). 표현을 바꿔 다시 시도하세요.',
        warnings: warnings
      };
    }

    text = text.trim();
    if (!text) {
      return { ok: false, text: '', code: 'empty', error: '응답은 왔지만 초안이 비어 있어요. 모델명을 확인하거나 다시 시도하세요.', warnings: warnings };
    }
    return { ok: true, text: text, error: null, code: 200, finishReason: null, warnings: warnings };
  }

  /** HTTP 상태 → 사람이 읽는 안내 */
  function explainStatus(status, bodyText) {
    var detail = str(bodyText).slice(0, 160);
    if (status === 400) return '요청 형식이 거부됐어요. 모델명을 확인하세요. ' + detail;
    if (status === 401 || status === 403) return '키가 거부됐어요. 키 제한(IP·API)과 사용 설정을 확인하세요. ' + detail;
    if (status === 404) return '모델을 찾지 못했어요. 모델명을 다른 것으로 바꿔 보세요. ' + detail;
    if (status === 429) return '무료 한도를 넘었어요. 잠시 뒤 다시 시도하거나 다른 모델을 쓰세요. ' + detail;
    if (status >= 500) return 'Gemini 서버가 잠시 응답하지 못했어요. 잠시 뒤 다시 시도하세요. ' + detail;
    return 'Gemini 요청이 실패했어요(HTTP ' + status + '). ' + detail;
  }

  return {
    VERSION: VERSION,
    PROVIDERS: listProviders(),
    GEMINI_DEFAULT_MODEL: GEMINI_DEFAULT_MODEL,
    GEMINI_MODELS: GEMINI_MODELS.slice(),
    LIMITS: LIMITS,
    provider: provider,
    listProviders: listProviders,
    linkFor: linkFor,
    linksFor: linksFor,
    parseProposal: parseProposal,
    isEmptyDraft: isEmptyDraft,
    quickStats: quickStats,
    sectionOf: sectionOf,
    geminiModel: geminiModel,
    buildGeminiRequest: buildGeminiRequest,
    parseGeminiResponse: parseGeminiResponse,
    explainStatus: explainStatus
  };
});
