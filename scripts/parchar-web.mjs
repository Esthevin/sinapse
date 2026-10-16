#!/usr/bin/env node
/**
 * Ajusta dist/index.html después de `expo export --platform web`:
 *  - Si el navegador guardó una página vieja que apunta a un programa (.js) que ya no existe
 *    (pasa tras publicar una versión nueva), recarga una sola vez en vez de quedar en blanco.
 *  - Si la app tarda en dibujarse, muestra un aviso con botón para recargar.
 *  - Pone título, color del navegador y descripción.
 * Uso: node scripts/parchar-web.mjs dist
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const file = join(dir, 'index.html');
let html = readFileSync(file, 'utf8');

const guard = `<style>#sinapse-wait{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:Georgia,serif;background:#F6F1E7;color:#1D1A16;text-align:center;padding:24px}#sinapse-wait button{margin-top:16px;padding:12px 24px;border:0;border-radius:4px;background:#7B2230;color:#FBF7EE;font-size:16px;font-weight:700}</style>
<script>
(function () {
  var KEY = 'sinapse.reloaded';
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1');
      location.reload();
    }
  }, true);
  window.addEventListener('load', function () {
    setTimeout(function () {
      var root = document.getElementById('root');
      if (root && root.childElementCount === 0) {
        var w = document.getElementById('sinapse-wait');
        if (w) w.style.display = 'flex';
      }
    }, 8000);
  });
})();
</script>`;
const wait = `<div id="sinapse-wait"><div style="font-size:22px;font-weight:700">Sinapse</div><p>La app no terminó de cargar.</p><button onclick="sessionStorage.removeItem('sinapse.reloaded');location.reload()">Recargar</button></div>`;

if (!html.includes('sinapse-wait')) {
  html = html.replace('</head>', `${guard}\n</head>`).replace('</body>', `${wait}\n</body>`);
}
html = html
  .replace(/<title>[^<]*<\/title>/, '<title>Sinapse</title>')
  .replace('</head>', '<meta name="theme-color" content="#1D1A16"><meta name="description" content="Historias del Perú para escuchar, leer y aprender."></head>');
writeFileSync(file, html);
console.log(`index.html ajustado en ${dir}`);
