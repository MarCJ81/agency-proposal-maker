/* ============================================================
   proposal-pdf.js · 견적서·제안서 A4 PDF 생성 엔진  v1.0.0
   ------------------------------------------------------------
   브라우저 인쇄(window.print) 대신 jsPDF + jspdf-autotable 로
   좌표가 고정된 A4 PDF를 만든다. 프린터·브라우저에 따라 여백과
   페이지 나눔이 달라지던 문제를 없앤다.

   - 한글: IBM Plex Sans KR 정식 TTF를 필요할 때만 받아 임베드한다.
     (assets/vendor/plexkr-regular.js · SIL OFL 1.1)
   - jsPDF 4.2.1 (MIT) · jspdf-autotable 5.0.9 (MIT) 지연 로딩.
   - 라이브러리가 없거나 실패하면 호출한 쪽이 인쇄로 되돌아갈 수 있게
     { ok:false, reason } 을 돌려준다(무음 실패 없음).

   사용:
     ProposalPDF.export(doc, { writer: '파일명' })
       .then(function (r) { r.ok ? ... : ... });
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.ProposalPDF = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var VERSION = '1.0.0';

  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (resolve, reject) {
      var doc = root.document;
      if (!doc) { reject(new Error('no_document')); return; }
      var s = doc.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { loaded[src] = null; reject(new Error('load_failed:' + src)); };
      doc.head.appendChild(s);
    });
    return loaded[src];
  }

  function deps() {
    if (root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API.autoTable) return Promise.resolve(true);
    var chain = root.jspdf && root.jspdf.jsPDF
      ? Promise.resolve(true)
      : loadScript('assets/vendor/jspdf.umd.min.js');
    return chain
      .then(function () { return loadScript('assets/vendor/jspdf.plugin.autotable.min.js'); })
      .then(function () { return true; });
  }

  function font() {
    if (root.PLEXKR_REGULAR_B64) return Promise.resolve(root.PLEXKR_REGULAR_B64);
    return loadScript('assets/vendor/plexkr-regular.js').then(function () {
      return root.PLEXKR_REGULAR_B64 || '';
    });
  }

  function safeFilename(s) {
    return String(s || '견적서')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) || '견적서';
  }

  /* ── 공용 그리기 도구 ─────────────────────────────────── */

  function makeWriter(doc, C) {
    var M = 16;                    // 좌우 여백(mm)
    var W = 210, H = 297;
    var y = M;
    var page = 1;

    function mm(n) { return n; }
    function remaining() { return H - M - 12 - y; }   // footer 12mm 확보

    function newPage() {
      doc.addPage();
      page++;
      y = M;
    }

    function ensure(space) {
      if (remaining() < space) newPage();
    }

    function text(str, opts) {
      var o = opts || {};
      var size = o.size || 10;
      var style = o.style || 'normal';
      var color = o.color || [30, 32, 38];
      doc.setFont('PlexKR', style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      var x = o.x !== undefined ? o.x : M;
      var maxW = o.width || (W - M * 2 - (x - M));
      var lines = doc.splitTextToSize(String(str == null ? '' : str), maxW);
      var lh = size * 0.42 + 1.2;
      lines.forEach(function (line) {
        ensure(lh + 1);
        doc.text(line, x, y + lh * 0.62);
        y += lh;
      });
      return y;
    }

    return {
      doc: doc, C: C, M: M, W: W, H: H,
      get y() { return y; }, set y(v) { y = v; },
      get page() { return page; },
      remaining: remaining, ensure: ensure, newPage: newPage,
      text: text,
      gap: function (n) { y += (n || 2); },
      rule: function (color) {
        ensure(3);
        var c = color || [220, 222, 228];
        doc.setDrawColor(c[0], c[1], c[2]);
        doc.setLineWidth(0.3);
        doc.line(M, y + 1, W - M, y + 1);
        y += 3;
      },
      label: function (k, v) {
        var lh = 5.4;
        var width = (W - M * 2) - 34;
        doc.setFont('PlexKR', 'normal');
        doc.setFontSize(9.6);
        var lines = doc.splitTextToSize(String(v == null || v === '' ? '—' : v), width);
        ensure(lh * Math.max(1, lines.length));
        doc.setFontSize(8.6);
        doc.setTextColor(110, 114, 124);
        doc.text(String(k), M, y + 3.6);
        doc.setTextColor(28, 30, 36);
        doc.setFontSize(9.6);
        lines.forEach(function (line, i) {
          doc.text(line, M + 34, y + 3.6 + i * lh);
        });
        y += lh * Math.max(1, lines.length);
      },
    };
  }

  /* ── 본문 ──────────────────────────────────────────────── */

  function build(docApi, C, d, fontB64, opts) {
    var jsPDF = docApi.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });

    var fname = 'PlexKR';
    doc.addFileToVFS('PlexKR-Regular.ttf', fontB64);
    doc.addFont('PlexKR-Regular.ttf', fname, 'normal');
    doc.addFont('PlexKR-Regular.ttf', fname, 'bold');   // 굵기는 크기·색으로 대신한다
    doc.setFont(fname, 'normal');

    var totals = C.computeTotals(d);
    var miles = C.computeMilestones(d, totals.total);
    var w = makeWriter(doc, C);
    var meta = d.meta || {};
    var supplier = d.supplier || {};
    var client = d.client || {};
    var project = d.project || {};
    var terms = d.terms || {};
    var title = (meta.title || '프로젝트 제안 및 견적').trim();

    /* 표지 머리 */
    w.text(supplier.name || '제안사', { size: 9, color: [110, 114, 124] });
    w.gap(1);
    w.text(title, { size: 20 });
    w.gap(1.5);
    w.text([
      '문서번호 ' + (meta.number || '—'),
      '발행일 ' + (meta.issueDate || '—'),
      '유효기간 ' + (C.validUntil ? C.validUntil(d) : '—'),
    ].join('   ·   '), { size: 8.6, color: [110, 114, 124] });
    w.gap(3);
    w.rule();

    /* 고객·프로젝트 */
    w.gap(1);
    w.text('수신', { size: 8.6, color: [110, 114, 124] });
    w.text((client.company || '—') + (client.contact ? ' · ' + client.contact + (client.role ? ' ' + client.role : '') : ''), { size: 10 });
    w.gap(1);
    w.label('프로젝트', project.summary || title);
    w.label('진행 기간', meta.startDate && meta.durationDays
      ? C.rangeText(meta.startDate, meta.durationDays).text
      : '—');
    if (supplier.bizNo || supplier.phone || supplier.email) {
      w.label('제안사 정보', [supplier.bizNo ? '사업자 ' + supplier.bizNo : '', supplier.phone, supplier.email].filter(Boolean).join(' · '));
    }

    /* 제안 요약 */
    if (project.pitch || project.background) {
      w.gap(3);
      w.text('제안 요약', { size: 12 });
      w.gap(1);
      if (project.pitch) w.text(project.pitch, { size: 9.6 });
      if (project.background) {
        w.gap(1);
        w.text(project.background, { size: 9.2, color: [80, 84, 94] });
      }
    }

    /* 범위·산출물 */
    function bulletBlock(heading, list) {
      if (!list || !list.length) return;
      w.gap(3);
      w.text(heading, { size: 11 });
      w.gap(0.6);
      list.forEach(function (item) {
        w.text('·  ' + item, { size: 9.2, x: w.M + 1.5 });
      });
    }
    bulletBlock('업무 범위', project.scope);
    bulletBlock('산출물', project.deliverables);

    /* 견적 표 */
    w.gap(3);
    w.ensure(24);
    w.text('견적 내역', { size: 11 });
    w.gap(1.5);

    var body = totals.lines.map(function (l, i) {
      return [
        String(i + 1),
        l.name + (l.detail ? '\n' + l.detail : ''),
        l.qty + ' ' + l.unit,
        C.formatNumber(l.unitPrice),
        C.formatNumber(l.net),
      ];
    });
    var totalRowsList = C.totalRows(d, totals).map(function (r) {
      return ['', r.label, '', '', (r.value < 0 ? '-' : '') + C.formatNumber(Math.abs(r.value))];
    });

    doc.autoTable({
      startY: w.y,
      margin: { left: w.M, right: w.M, top: w.M, bottom: 18 },
      head: [['No', '항목', '수량', '단가', '금액(원)']],
      body: body.concat(totalRowsList),
      styles: { font: fname, fontSize: 8.4, cellPadding: 2, textColor: [32, 34, 40], lineColor: [226, 228, 234], lineWidth: 0.2 },
      headStyles: { fillColor: [24, 26, 32], textColor: [255, 255, 255], fontSize: 8.6, fontStyle: 'normal' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 92 },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 34, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index >= totals.lines.length) {
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.fontSize = 8.6;
          if (data.column.index === 1) data.cell.styles.halign = 'right';
          var rowLabel = data.row.raw && data.row.raw[1];
          if (rowLabel === '합계 금액' || rowLabel === '합계 금액 (VAT 포함)') {
            data.cell.styles.fontSize = 9.6;
            data.cell.styles.textColor = [16, 18, 24];
          }
        }
      },
    });

    w.y = doc.lastAutoTable.finalY + 3;
    w.text(C.wonInWords(totals.total), { size: 9.4 });
    w.text('부가세 ' + totals.vatRate + '% ' + (totals.vatMode === 'included' ? '포함' : '별도') + ' · 합계 ' + C.formatWon(totals.total), { size: 8.6, color: [110, 114, 124] });

    /* 지급 일정 */
    if (miles.rows.length) {
      w.gap(3);
      w.ensure(26);
      w.text('지급 일정', { size: 11 });
      w.gap(1.2);
      doc.autoTable({
        startY: w.y,
        margin: { left: w.M, right: w.M, bottom: 18 },
        head: [['구분', '시기', '비율', '금액(원)']],
        body: miles.rows.map(function (r) {
          return [r.name, r.period, r.ratio + '%', C.formatNumber(r.amount)];
        }),
        styles: { font: fname, fontSize: 8.4, cellPadding: 2, lineColor: [226, 228, 234], lineWidth: 0.2 },
        headStyles: { fillColor: [244, 245, 248], textColor: [40, 42, 50], fontSize: 8.4, fontStyle: 'normal' },
        columnStyles: {
          0: { cellWidth: 60 }, 1: { cellWidth: 50 },
          2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 38, halign: 'right' },
        },
      });
      w.y = doc.lastAutoTable.finalY + 2;
    }

    /* 제외 항목·조건 */
    bulletBlock('포함되지 않는 항목', project.notIncluded);

    var termRows = [
      ['대금 지급', terms.payment],
      ['유지보수', terms.maintenance],
      ['저작권·사용권', terms.copyright],
      ['기타', terms.note],
    ].filter(function (r) { return String(r[1] || '').trim(); });
    if (termRows.length) {
      w.gap(3);
      w.text('계약 조건', { size: 11 });
      w.gap(1);
      termRows.forEach(function (r) {
        w.label(r[0], r[1]);
      });
    }

    if (project.closing) {
      w.gap(3);
      w.text(project.closing, { size: 9.4, color: [70, 74, 84] });
    }

    /* 서명란 */
    w.gap(6);
    w.ensure(26);
    w.text(supplier.name || '', { size: 9, color: [110, 114, 124] });
    w.text('위 견적과 조건으로 제안합니다.', { size: 9.2 });
    w.gap(8);
    w.rule();
    w.text('서명 ____________________        ' + (meta.issueDate || ''), { size: 8, color: [130, 134, 144] });

    /* 꼬리말: 페이지 번호 */
    var totalPages = doc.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont(fname, 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(150, 154, 164);
      doc.text((meta.number || '') + '  ·  ' + (supplier.name || '') + '  ·  ' + p + ' / ' + totalPages, 105, 289, { align: 'center' });
    }

    return {
      doc: doc,
      pages: totalPages,
      filename: safeFilename((opts && opts.filename) || (meta.number ? meta.number + '-' + title : title)) + '.pdf',
    };
  }

  /**
   * @param {object} d   문서 상태(sanitizeDoc 통과 객체)
   * @param {object} opts { filename }
   * @returns {Promise<{ok:boolean, reason?:string, message?:string, filename?:string, pages?:number}>}
   */
  function exportPdf(d, opts) {
    var C = root.AgencyCore || root.CORE || null;
    if (!C) return Promise.resolve({ ok: false, reason: 'no_core', message: '계산 엔진을 찾지 못했어요.' });
    if (!root.document) return Promise.resolve({ ok: false, reason: 'no_document', message: '브라우저에서만 만들 수 있어요.' });
    return deps()
      .then(function () { return font(); })
      .then(function (b64) {
        if (!b64) throw new Error('no_font');
        var built = build(root.jspdf, C, d, b64, opts || {});
        built.doc.save(built.filename);
        return { ok: true, filename: built.filename, pages: built.pages };
      })
      .catch(function (err) {
        var reason = err && err.message ? err.message : 'unknown';
        return {
          ok: false, reason: reason,
          message: reason.indexOf('load_failed') === 0
            ? 'PDF 엔진을 불러오지 못했어요. 새로고침 뒤 다시 시도해 주세요.'
            : 'PDF를 만들지 못했어요. 인쇄로 저장해 주세요.',
        };
      });
  }

  return { VERSION: VERSION, export: exportPdf };
});
