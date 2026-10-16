import { useEffect } from 'react';
import { parsePdfMessage } from '@/services/pdfHtml';
import type { PdfRunnerProps } from './pdfTypes';

/** Web: lee el PDF dentro de un iframe oculto y aislado (sandbox), sin salir del navegador. */
export function PdfRunner({ html, base64, onMessage }: PdfRunnerProps) {
  useEffect(() => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    iframe.srcdoc = html;
    const listener = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const m = parsePdfMessage(e.data);
      if (!m) return;
      if (m.type === 'ready') iframe.contentWindow?.postMessage(JSON.stringify({ type: 'extract', data: base64 }), '*');
      else onMessage(m);
    };
    window.addEventListener('message', listener);
    document.body.appendChild(iframe);
    return () => {
      window.removeEventListener('message', listener);
      iframe.remove();
    };
    // onMessage es estable por contrato de la pantalla; solo se reinicia con otro PDF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, base64]);
  return null;
}
