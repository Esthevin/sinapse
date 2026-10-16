/**
 * Lector de PDF: una página HTML mínima que lleva dentro pdf.js y devuelve el texto por párrafos.
 * La misma página corre en un iframe (web) o en un WebView oculto (Android/iPhone), y todo ocurre
 * dentro del dispositivo: el PDF no se sube a ningún servidor.
 *
 * Protocolo (mensajes JSON):
 *   página -> app:  {type:'ready'} · {type:'progress',page,total} · {type:'done',title,numPages,paragraphs}
 *                   · {type:'error',code,message}
 *   app -> página:  {type:'extract',data:<PDF en base64>}   (en el WebView: window.__extract(base64))
 */
export type PdfMessage =
  | { type: 'ready' }
  | { type: 'progress'; page: number; total: number }
  | { type: 'done'; title: string; numPages: number; paragraphs: string[] }
  | { type: 'error'; code: string; message: string };

export function parsePdfMessage(data: unknown): PdfMessage | null {
  try {
    const m = JSON.parse(String(data));
    return m && typeof m.type === 'string' ? (m as PdfMessage) : null;
  } catch {
    return null;
  }
}

const PAGE_SCRIPT = String.raw`
(function () {
  function send(m) {
    var s = JSON.stringify(m);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage(s, '*');
  }
  window.onerror = function (msg) { send({ type: 'error', code: 'script', message: String(msg) }); };

  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([__WORKER__], { type: 'text/javascript' }));

  var LIG = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };
  function clean(s) {
    return s.replace(/[ﬀ-ﬆ]/g, function (c) { return LIG[c]; }).replace(/­/g, '').replace(/\s+/g, ' ').trim();
  }
  function norm(s) { return s.toLowerCase().replace(/\d+/g, '#').trim(); }

  function pageLines(items) {
    var lines = [], cur = null;
    items.forEach(function (it) {
      if (!it.str) return;
      var x = it.transform[4], y = it.transform[5];
      var h = it.height || Math.abs(it.transform[3]) || 10;
      if (cur && Math.abs(y - cur.y) <= h * 0.5) {
        var gap = x - cur.endX;
        var space = gap > h * 0.12 && !/\s$/.test(cur.text) && !/^\s/.test(it.str);
        cur.text += (space ? ' ' : '') + it.str;
        cur.endX = x + (it.width || 0);
      } else {
        cur = { text: it.str, y: y, h: h, endX: x + (it.width || 0) };
        lines.push(cur);
      }
    });
    lines.forEach(function (l) { l.text = clean(l.text); });
    return lines.filter(function (l) { return l.text.length > 0; });
  }

  function build(pages) {
    // Encabezados y pies: líneas cortas en el borde superior o inferior que se repiten en muchas páginas.
    var freq = {};
    function edge(lines, li) { return li < 2 || li >= lines.length - 2; }
    pages.forEach(function (lines) {
      var seen = {};
      lines.forEach(function (l, li) {
        var k = norm(l.text);
        if (edge(lines, li) && k.length < 70 && !seen[k]) { seen[k] = 1; freq[k] = (freq[k] || 0) + 1; }
      });
    });
    var thr = Math.max(3, Math.ceil(pages.length * 0.4));
    var all = [];
    pages.forEach(function (lines, pi) {
      lines.forEach(function (l, li) {
        var k = norm(l.text);
        if (edge(lines, li) && (/^(pagina\s*)?#{1,4}$/.test(k) || (pages.length >= 3 && freq[k] >= thr))) return;
        all.push({ t: l.text, y: l.y, page: pi });
      });
    });
    var gaps = [];
    for (var i = 1; i < all.length; i++) {
      if (all[i].page === all[i - 1].page) { var d = all[i - 1].y - all[i].y; if (d > 0) gaps.push(d); }
    }
    gaps.sort(function (a, b) { return a - b; });
    var med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
    var paras = [], buf = '';
    function flush() { if (buf.trim()) paras.push(buf.trim()); buf = ''; }
    all.forEach(function (l, i) {
      var prev = all[i - 1];
      if (prev) {
        if (prev.page === l.page) { if (prev.y - l.y > med * 1.55) flush(); }
        else if (/[.!?:»”"]$/.test(prev.t)) flush();
      }
      if (buf && /[A-Za-zÀ-ÿ]-$/.test(buf) && /^[a-zà-ÿ]/.test(l.t)) buf = buf.slice(0, -1) + l.t;
      else buf += (buf ? ' ' : '') + l.t;
    });
    flush();
    return paras;
  }

  function toBytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  window.__extract = function (b64) {
    pdfjsLib.getDocument({ data: toBytes(b64) }).promise.then(function (doc) {
      var total = doc.numPages, pages = [];
      function next(p) {
        if (p > total) {
          return doc.getMetadata().catch(function () { return null; }).then(function (meta) {
            var title = (meta && meta.info && meta.info.Title) || '';
            send({ type: 'done', title: String(title), numPages: total, paragraphs: build(pages) });
          });
        }
        return doc.getPage(p).then(function (page) { return page.getTextContent(); }).then(function (tc) {
          pages.push(pageLines(tc.items));
          send({ type: 'progress', page: p, total: total });
          return next(p + 1);
        });
      }
      return next(1);
    }).catch(function (e) {
      var name = e && e.name ? e.name : '';
      send({ type: 'error', code: name === 'PasswordException' ? 'password' : 'invalid', message: String(e && e.message ? e.message : e) });
    });
  };

  function onMsg(e) {
    try { var m = JSON.parse(e.data); if (m && m.type === 'extract') window.__extract(m.data); } catch (_) {}
  }
  window.addEventListener('message', onMsg);
  document.addEventListener('message', onMsg);
  send({ type: 'ready' });
})();
`;

/** Arma la página con pdf.js y su worker incluidos (texto de los .js originales). */
export function buildPdfHtml(lib: string, worker: string): string {
  const safe = (s: string) => s.replace(/<\/script/gi, '<\\/script');
  const workerLiteral = JSON.stringify(worker).replace(/</g, '\\u003c');
  const script = PAGE_SCRIPT.replace('__WORKER__', () => workerLiteral);
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${safe(lib)}</script><script>${safe(script)}</script></body></html>`;
}
