import { strFromU8, unzipSync } from 'fflate';
import type { OutlineItem, RawPage } from './pdfAnalyze';

/**
 * Importa documentos que no son PDF: Word (.docx), OpenDocument (.odt), texto (.txt) y Markdown (.md).
 * Los convierte a la misma forma que el texto crudo de un PDF (líneas con tamaño de letra) para reutilizar el análisis
 * que separa cuentos y capítulos (src/services/pdfAnalyze.ts). Los títulos del documento («Título», «Título 1»…) se usan
 * como marcadores. No necesita internet y el archivo no sale del dispositivo. Los .doc antiguos (binarios) no se pueden leer.
 */
export interface ImportedDoc {
  pages: RawPage[];
  outline: OutlineItem[];
  numPages: number;
  title: string;
}

export type DocKind = 'pdf' | 'docx' | 'odt' | 'txt' | 'doc';

export function kindOf(name: string, mime?: string | null): DocKind | null {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx') || mime?.includes('wordprocessingml')) return 'docx';
  if (n.endsWith('.odt') || mime?.includes('opendocument.text')) return 'odt';
  if (n.endsWith('.doc') || mime === 'application/msword') return 'doc';
  if (n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.markdown') || mime?.startsWith('text/')) return 'txt';
  return null;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = typeof atob === 'function' ? atob(clean) : '';
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

interface Para {
  text: string;
  /** 0 = texto normal; 1, 2… = título (1 es el de mayor jerarquía); -1 = título del documento (no separa cuentos). */
  heading: number;
}

/** Párrafos de un .docx: cada <w:p>, con su texto y si tiene estilo de título. */
function docxParagraphs(xml: string): Para[] {
  const out: Para[] = [];
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const p = m[0];
    const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? '';
    const outline = /<w:outlineLvl w:val="(\d)"/.exec(p)?.[1];
    let text = '';
    for (const t of p.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) text += t[1] !== undefined ? decodeXml(t[1]) : t[0] === '<w:tab/>' ? ' ' : ' ';
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const h = /^(?:heading|titulo|título|ttulo)\s*(\d)$/i.exec(style);
    const isTitle = /^(?:title|titulo|título|subtitle|subtitulo)$/i.test(style);
    out.push({ text, heading: h ? Number(h[1]) : isTitle ? -1 : outline !== undefined ? Number(outline) + 1 : 0 });
  }
  return out;
}

/** Párrafos de un .odt (OpenDocument): <text:h> son títulos y <text:p> párrafos. */
function odtParagraphs(xml: string): Para[] {
  const out: Para[] = [];
  for (const m of xml.matchAll(/<text:(h|p)(?: [^>]*)?>([\s\S]*?)<\/text:\1>/g)) {
    const text = decodeXml(m[2].replace(/<text:tab\/>/g, ' ').replace(/<text:line-break\/>/g, ' ').replace(/<text:s(?: [^>]*)?\/>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const level = m[1] === 'h' ? Number(/text:outline-level="(\d)"/.exec(m[0])?.[1] ?? 1) : 0;
    out.push({ text, heading: level });
  }
  return out;
}

/** Texto plano o Markdown: párrafos separados por líneas en blanco; «# Título» son títulos. */
function textParagraphs(text: string): Para[] {
  const out: Para[] = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const h = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (h) {
      out.push({ text: h[2].trim(), heading: h[1].length });
      if (lines.length > 1) out.push({ text: lines.slice(1).join(' '), heading: 0 });
      continue;
    }
    const joined = lines.join(' ').replace(/\s+/g, ' ');
    // Una línea corta en mayúsculas o terminada sin punto, seguida de más texto, suele ser un título.
    out.push({ text: joined, heading: lines.length === 1 && joined.length < 70 && /^[^a-záéíóúñ]*$/.test(joined) ? 2 : 0 });
  }
  return out;
}

const PAGE_LINES = 32;

function toPages(paras: Para[], title: string): ImportedDoc {
  const pages: RawPage[] = [];
  const outline: OutlineItem[] = [];
  let lines: RawPage['lines'] = [];
  let page = 0;
  paras.forEach((p, i) => {
    if (lines.length >= PAGE_LINES) {
      pages.push({ lines });
      lines = [];
      page++;
    }
    const big = p.heading !== 0;
    lines.push({ t: p.text, y: 800 - lines.length * 20, h: big ? 22 - Math.min(Math.max(p.heading, 1), 3) * 2 : 11 });
    if (p.heading >= 1 && p.heading <= 2) outline.push({ title: p.text, page, level: p.heading });
    void i;
  });
  if (lines.length) pages.push({ lines });
  // Un solo título al principio no separa cuentos: se ignora como marcador (queda como título del documento).
  const headings = outline.filter((o) => o.level === Math.min(...outline.map((x) => x.level)));
  return { pages, outline: headings.length >= 2 ? headings : [], numPages: Math.max(1, pages.length), title };
}

export function parseDocument(kind: DocKind, bytes: Uint8Array, fileName: string): ImportedDoc {
  const title = fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
  if (kind === 'txt') {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder('windows-1252').decode(bytes); // archivos de texto antiguos en Windows
    }
    return toPages(textParagraphs(text.replace(/^﻿/, '')), title);
  }
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' || f.name === 'content.xml' });
  if (kind === 'docx') {
    const xml = files['word/document.xml'];
    if (!xml) throw new Error('el archivo no parece un documento de Word');
    return toPages(docxParagraphs(strFromU8(xml)), title);
  }
  const xml = files['content.xml'];
  if (!xml) throw new Error('el archivo no parece un documento de OpenDocument');
  return toPages(odtParagraphs(strFromU8(xml)), title);
}
