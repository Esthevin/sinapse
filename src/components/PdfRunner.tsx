import { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { parsePdfMessage } from '@/services/pdfHtml';
import type { PdfRunnerProps } from './pdfTypes';

/** Android / iPhone: lee el PDF dentro de un WebView oculto. (En la web se usa PdfRunner.web.tsx.) */
export function PdfRunner({ html, base64, onMessage }: PdfRunnerProps) {
  const ref = useRef<WebView>(null);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onMessage={(e) => {
          const m = parsePdfMessage(e.nativeEvent.data);
          if (!m) return;
          if (m.type === 'ready') ref.current?.injectJavaScript(`window.__extract(${JSON.stringify(base64)});true;`);
          else onMessage(m);
        }}
        onError={() => onMessage({ type: 'error', code: 'webview', message: 'No se pudo iniciar el lector de PDF.' })}
        style={{ width: 1, height: 1 }}
      />
    </View>
  );
}
