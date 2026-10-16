import type { PdfMessage } from '@/services/pdfHtml';

export interface PdfRunnerProps {
  /** Página con pdf.js (ver buildPdfHtml). */
  html: string;
  /** PDF en base64. */
  base64: string;
  onMessage: (m: PdfMessage) => void;
}
