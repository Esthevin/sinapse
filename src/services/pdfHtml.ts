/**
 * Lector de PDF: una página HTML mínima que lleva dentro pdf.js y devuelve el texto por líneas
 * (con tamaño de letra) y los marcadores del archivo. El análisis (cuentos, información inicial,
 * párrafos) se hace después en pdfAnalyze.ts.
 * La misma página corre en un iframe (web) o en un WebView oculto (Android/iPhone), y todo ocurre
 * dentro del dispositivo: el PDF no se sube a ningún servidor.
 *
 * Protocolo (mensajes JSON):
 *   página -> app:  {type:'ready'} · {type:'progress',page,total} · {type:'done',title,numPages,pages,outline}
 *                   · {type:'error',code,message}
 *   app -> página:  {type:'extract',data:<PDF en base64>}   (en el WebView: window.__extract(base64))
 */
import type { OutlineItem, RawPage } from './pdfAnalyze';

export type PdfMessage =
  | { type: 'ready' }
  | { type: 'progress'; page: number; total: number }
  | { type: 'done'; title: string; numPages: number; pages: RawPage[]; outline: OutlineItem[] }
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

  // <extract-low-level>
  var LIG = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };
  function clean(s) {
    return s.replace(/[ﬀ-ﬆ]/g, function (c) { return LIG[c]; }).replace(/­/g, '').replace(/\s+/g, ' ').trim();
  }

  function pageLines(items) {
    var lines = [], cur = null;
    items.forEach(function (it) {
      if (!it.str) return;
      var x = it.transform[4], y = it.transform[5];
      var h = it.height || Math.abs(it.transform[3]) || 10;
      if (cur && Math.abs(y - cur.y) <= h * 0.5) {
        var gap = x - cur.endX;
        var space = gap > h * 0.12 && !/\s$/.test(cur.t) && !/^\s/.test(it.str);
        cur.t += (space ? ' ' : '') + it.str;
        cur.endX = x + (it.width || 0);
        if (h > cur.h) cur.h = h;
      } else {
        cur = { t: it.str, y: y, h: h, endX: x + (it.width || 0) };
        lines.push(cur);
      }
    });
    return lines
      .map(function (l) { return { t: clean(l.t), y: Math.round(l.y * 10) / 10, h: Math.round(l.h * 10) / 10 }; })
      .filter(function (l) { return l.t.length > 0; });
  }

  function outlineOf(doc) {
    return doc.getOutline().catch(function () { return null; }).then(function (outline) {
      var res = [];
      if (!outline) return res;
      function resolve(item) {
        var dest = item.dest;
        var first = typeof dest === 'string' ? doc.getDestination(dest) : Promise.resolve(dest);
        return first.then(function (d) {
          if (!d || d[0] == null) return -1;
          return typeof d[0] === 'object' ? doc.getPageIndex(d[0]) : d[0];
        }).catch(function () { return -1; });
      }
      function walk(items, level) {
        return items.reduce(function (chain, item) {
          return chain.then(function () {
            return resolve(item).then(function (page) {
              res.push({ title: clean(item.title || ''), page: page, level: level });
              return item.items && item.items.length ? walk(item.items, level + 1) : null;
            });
          });
        }, Promise.resolve());
      }
      return walk(outline, 0).then(function () { return res; });
    });
  }
  // </extract-low-level>

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
          return Promise.all([doc.getMetadata().catch(function () { return null; }), outlineOf(doc)]).then(function (r) {
            var meta = r[0];
            var title = (meta && meta.info && meta.info.Title) || '';
            send({ type: 'done', title: String(title), numPages: total, pages: pages, outline: r[1] });
          });
        }
        return doc.getPage(p).then(function (page) { return page.getTextContent(); }).then(function (tc) {
          pages.push({ lines: pageLines(tc.items) });
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
