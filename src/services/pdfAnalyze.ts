/**
 * Analiza el texto crudo de un PDF y lo separa en secciones: la información inicial
 * (portada, créditos, índice, prólogo) y cada cuento o capítulo por separado.
 *
 * No depende de React ni de pdf.js: recibe líneas de texto con su posición y tamaño de letra
 * (ver pdfHtml.ts) y se puede probar en Node (scripts/pdf-a-audiolibro.mjs).
 *
 * Cómo encuentra dónde empieza cada cuento (se usa la primera señal que dé al menos 2):
 *  1. Marcadores del PDF (outline / “favoritos”): la más fiable, la crean los editores.
 *  2. Índice impreso: líneas “Título ......... 23”; cada título se busca luego en el texto.
 *  3. Tamaño de letra: líneas cortas claramente más grandes que el cuerpo del texto.
 *  4. Encabezados escritos: “Capítulo 3”, “Cuento primero”, numerales romanos solos.
 */
export interface RawLine {
  /** Texto de la línea. */
  t: string;
  /** Altura de la línea desde la base de la página (mayor = más arriba). */
  y: number;
  /** Tamaño de letra aproximado. */
  h: number;
}
export interface RawPage {
  lines: RawLine[];
}
export interface OutlineItem {
  title: string;
  /** Página (desde 0) a la que apunta; -1 si no se pudo resolver. */
  page: number;
  level: number;
}

export type SectionKind = 'front' | 'story' | 'back';
export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  /** Párrafos listos para narrar (el primero es el título, salvo en la información inicial). */
  paragraphs: string[];
  startPage: number;
  /** Si se marca por defecto al elegir qué agregar. */
  selected: boolean;
  chars: number;
}

export interface Analysis {
  sections: Section[];
  /** Cómo se detectaron los cuentos (para mostrarlo y depurar). */
  method: 'outline' | 'index' | 'font' | 'headings' | 'none';
}

interface Line extends RawLine {
  page: number;
  /** true si es una línea del índice impreso (se descarta). */
  toc?: boolean;
}
interface Marker {
  title: string;
  /** Posición en el arreglo de líneas. */
  at: number;
  /** Cuántas líneas ocupa el título, si ya se sabe. */
  span?: number;
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const FRONT_RE = /^(indice|contenido|contenidos|tabla de contenido|sumario|portada|creditos|ficha tecnica|prologo|prefacio|presentacion|introduccion|dedicatoria|epigrafe|nota (del|de la) (autor|autora|editor|editora|edicion)|palabras preliminares|advertencia)\b/;
const BACK_RE = /^(colofon|indice general|bibliografia|notas|glosario|apendice|anexo|sobre (el|la) autor|sobre (el|la) autora|acerca del autor|acerca de la autora|biografia|otras obras|agradecimientos|epilogo)\b/;
const CREDIT_RE = /(isbn|copyright|©|derechos reservados|todos los derechos|impreso en|primera edicion|deposito legal|hecho el deposito|editorial|diseno de|dise.o de cubierta|corrector|queda prohibida)/i;
const ORDINAL = '(?:primero|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|septima|octavo|octava|noveno|novena|decimo|decima|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|unico|unica)';
const HEADING_WORD = '(?:capitulo|cuento|relato|leyenda|fabula|tradicion|historia|parte|libro)';
/** "Capítulo 3", "Cuento primero", "Parte 2" (sobre texto sin tildes ni mayúsculas). */
const HEADING_NUM_RE = new RegExp(`^${HEADING_WORD}\\s+(?:\\d{1,3}|${ORDINAL})\\b`);
/** "Capítulo IV" (el numeral romano debe venir en mayúsculas en el texto original). */
const HEADING_ROMAN_RE = /^\S+\s+[IVXLCDM]{1,7}\b/;
const ROMAN_ALONE = /^[IVXLCDM]{1,7}\.?$/;

const SMALL_SECTION = 300; // caracteres: menos que esto no se marca por defecto

// ---------- limpieza de líneas ----------
function cleanLines(pages: RawPage[]): Line[] {
  // Encabezados y pies: líneas cortas en el borde superior o inferior que se repiten en muchas páginas.
  const edge = (lines: RawLine[], i: number) => i < 2 || i >= lines.length - 2;
  const key = (t: string) => norm(t).replace(/\d+/g, '#');
  const freq: Record<string, number> = {};
  for (const p of pages) {
    const seen = new Set<string>();
    p.lines.forEach((l, i) => {
      const k = key(l.t);
      if (edge(p.lines, i) && k.length < 70 && !seen.has(k)) {
        seen.add(k);
        freq[k] = (freq[k] ?? 0) + 1;
      }
    });
  }
  // Un encabezado corrido está en la mayoría de las páginas; un título de capítulo, solo en unas pocas.
  const threshold = Math.max(4, Math.ceil(pages.length * 0.5));
  const out: Line[] = [];
  pages.forEach((p, pi) => {
    p.lines.forEach((l, i) => {
      const k = key(l.t);
      const numberOnly = /^(pagina )?#{1,4}$/.test(k);
      const looksLikeTitle = HEADING_NUM_RE.test(norm(l.t));
      if (edge(p.lines, i) && (numberOnly || (pages.length >= 4 && freq[k] >= threshold && !looksLikeTitle))) return;
      out.push({ ...l, page: pi });
    });
  });
  return out;
}

function bodySize(lines: Line[]): number {
  // Mediana del tamaño de letra ponderada por la cantidad de texto.
  const w: Record<string, number> = {};
  for (const l of lines) if (l.t.length >= 15) w[l.h.toFixed(1)] = (w[l.h.toFixed(1)] ?? 0) + l.t.length;
  const entries = Object.entries(w).sort((a, b) => Number(a[0]) - Number(b[0]));
  const total = entries.reduce((n, [, c]) => n + c, 0);
  let acc = 0;
  for (const [h, c] of entries) {
    acc += c;
    if (acc >= total / 2) return Number(h);
  }
  return 12;
}

// ---------- ¿cuántas líneas forman el título? ----------
function titleSpan(lines: Line[], at: number, title: string): number {
  const want = norm(title);
  let acc = '';
  for (let k = at; k < Math.min(lines.length, at + 3); k++) {
    acc = `${acc} ${lines[k].t}`.trim();
    const have = norm(acc);
    if (have === want) return k - at + 1;
    if (!want.startsWith(have)) break;
  }
  return 1;
}

// ---------- estrategia 1: marcadores del PDF ----------
function byOutline(lines: Line[], outline: OutlineItem[]): Marker[] {
  const usable = outline.filter((o) => o.page >= 0 && o.title.trim());
  if (usable.length < 2) return [];
  const counts: Record<number, number> = {};
  for (const o of usable) counts[o.level] = (counts[o.level] ?? 0) + 1;
  const level = Math.min(...Object.keys(counts).map(Number).filter((l) => counts[l] >= 2));
  if (!Number.isFinite(level)) return [];
  const markers: Marker[] = [];
  let from = 0;
  for (const o of usable.filter((x) => x.level === level)) {
    let at = lines.findIndex((l, i) => i >= from && l.page >= o.page);
    if (at === -1) continue;
    // Si el título aparece como línea en esa página (o la siguiente), empezar justo ahí.
    const want = norm(o.title);
    for (let i = at; i < lines.length && lines[i].page <= o.page + 1; i++) {
      const have = norm(lines[i].t);
      if (have && (want.startsWith(have) || have.startsWith(want)) && Math.abs(have.length - want.length) < 40) {
        at = i;
        break;
      }
    }
    if (markers.length && markers[markers.length - 1].at >= at) continue;
    markers.push({ title: o.title.trim(), at });
    from = at;
  }
  return markers;
}

// ---------- estrategia 2: índice impreso ----------
const TOC_LINE = /^(.{3,90}?)\s*(?:\.{2,}|·{2,}|…+|_{2,}|-{2,}|\s{2,}|\s)\s*(\d{1,4})$/;
/** Detecta páginas de índice, marca sus líneas para descartarlas y devuelve los títulos que listan. */
function markToc(lines: Line[]): { titles: string[]; last: number } {
  const maxPage = Math.min(20, lines.length ? lines[lines.length - 1].page : 0);
  const byPage = new Map<number, number[]>();
  lines.forEach((l, i) => {
    if (l.page > maxPage) return;
    const m = TOC_LINE.exec(l.t.trim());
    if (m && /[a-záéíóúñ]/i.test(m[1]) && !/^(pagina|p\.|pág)/i.test(m[1])) byPage.set(l.page, [...(byPage.get(l.page) ?? []), i]);
  });
  // Una página de índice tiene varias de estas líneas.
  const idx = [...byPage.values()].filter((v) => v.length >= 3).flat().sort((a, b) => a - b);
  if (idx.length < 3) return { titles: [], last: -1 };
  const titles = idx.map((i) => TOC_LINE.exec(lines[i].t.trim())![1].replace(/[.·…_\-\s]+$/, '').trim());
  for (const i of idx) lines[i].toc = true;
  // También se descarta el rótulo "Índice" de esa página.
  for (const p of new Set(idx.map((i) => lines[i].page))) {
    lines.forEach((l) => {
      if (l.page === p && /^(indice|contenido|contenidos|tabla de contenido|sumario)$/.test(norm(l.t))) l.toc = true;
    });
  }
  return { titles, last: idx[idx.length - 1] };
}

function byIndex(lines: Line[], toc: { titles: string[]; last: number }): Marker[] {
  const markers: Marker[] = [];
  let from = toc.last + 1;
  for (const title of toc.titles) {
    const want = norm(title);
    let at = -1;
    for (let i = from; i < lines.length; i++) {
      const have = norm(lines[i].t);
      if (!have) continue;
      if (have === want || (want.startsWith(have) && have.length >= 8 && titleSpan(lines, i, title) > 1) || (have.startsWith(want) && have.length - want.length < 12)) {
        at = i;
        break;
      }
    }
    if (at === -1) continue;
    markers.push({ title, at });
    from = at + 1;
  }
  return markers.length >= 2 ? markers : [];
}

// ---------- estrategia 3: tamaño de letra ----------
function byFont(lines: Line[]): Marker[] {
  const body = bodySize(lines);
  const markers: Marker[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.toc && l.h >= body * 1.22 && l.t.length <= 100 && /[a-záéíóúñ]/i.test(l.t) && !/^(pagina )?\d+$/i.test(l.t)) {
      // Junta líneas seguidas del mismo tamaño (un título partido en dos).
      let j = i;
      let title = l.t;
      while (j + 1 < lines.length && lines[j + 1].page === l.page && Math.abs(lines[j + 1].h - l.h) < 0.6 && lines[j + 1].t.length <= 100) {
        j++;
        title += ` ${lines[j].t}`;
      }
      markers.push({ title: title.trim(), at: i });
      i = j + 1;
    } else i++;
  }
  return markers.length >= 2 && markers.length <= 300 ? markers : [];
}

// ---------- estrategia 4: encabezados escritos ----------
const wordsOf = (t: string) => t.trim().split(/\s+/).length;
function byHeadings(lines: Line[]): Marker[] {
  const markers: Marker[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const t = l.t.trim();
    if (l.toc || t.length > 70) continue;
    const isHeading = HEADING_NUM_RE.test(norm(t)) || (HEADING_ROMAN_RE.test(t) && HEADING_NUM_RE.test(norm(t).replace(/\b[ivxlcdm]+\b/, '1')));
    const isRoman = ROMAN_ALONE.test(t);
    if (!isHeading && !isRoman) continue;
    // Un subtítulo corto en la línea siguiente ("Capítulo 1" / "El pastor y la nube") es parte del título.
    const next = lines[i + 1];
    const sub = next && !next.toc && next.page === l.page && next.t.length <= 60 && !/[.!?]$/.test(next.t) && wordsOf(next.t) <= 8 && /^[A-ZÁÉÍÓÚÑ¿¡]/.test(next.t);
    const title = sub ? `${t.replace(/\.$/, '')}. ${next.t}` : t.replace(/\.$/, '');
    markers.push({ title, at: i, span: sub ? 2 : 1 });
    if (sub) i++;
  }
  return markers.length >= 2 && markers.length <= 300 ? markers : [];
}

// ---------- párrafos ----------
function paragraphsOf(lines: Line[], medianGap: number): string[] {
  const paras: string[] = [];
  let buf = '';
  const flush = () => {
    if (buf.trim()) paras.push(buf.trim());
    buf = '';
  };
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    if (prev) {
      if (prev.page === l.page) {
        if (prev.y - l.y > medianGap * 1.55) flush();
      } else if (/[.!?:»”"]$/.test(prev.t.trim())) flush();
    }
    if (buf && /[A-Za-zÀ-ÿ]-$/.test(buf) && /^[a-zà-ÿ]/.test(l.t)) buf = buf.slice(0, -1) + l.t;
    else buf += (buf ? ' ' : '') + l.t;
  });
  flush();
  return paras;
}

function medianGap(lines: Line[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page) {
      const d = lines[i - 1].y - lines[i].y;
      if (d > 0) gaps.push(d);
    }
  }
  gaps.sort((a, b) => a - b);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
}

const chars = (p: string[]) => p.reduce((n, s) => n + s.length, 0);

// ---------- principal ----------
export function analyzePdf(pages: RawPage[], outline: OutlineItem[] = []): Analysis {
  const lines = cleanLines(pages);
  if (!lines.length) return { sections: [], method: 'none' };

  // El índice impreso se descarta siempre (aunque otra señal marque los cuentos).
  const toc = markToc(lines);
  let method: Analysis['method'] = 'outline';
  let markers = byOutline(lines, outline);
  if (markers.length < 2) {
    method = 'index';
    markers = byIndex(lines, toc);
  }
  if (markers.length < 2) {
    method = 'font';
    markers = byFont(lines);
  }
  if (markers.length < 2) {
    method = 'headings';
    markers = byHeadings(lines);
  }
  if (markers.length < 2) {
    method = 'none';
    markers = [];
  }

  const gap = medianGap(lines);
  const usable = lines.filter((l) => !l.toc);
  const sections: Section[] = [];

  if (!markers.length) {
    // Un solo texto: se quitan las primeras páginas si parecen portada o créditos.
    const firstBody = (() => {
      for (let p = 0; p < Math.min(6, pages.length); p++) {
        const text = usable.filter((l) => l.page === p).map((l) => l.t).join(' ');
        if (text.length >= 900 && !CREDIT_RE.test(text)) return p;
      }
      return 0;
    })();
    const front = usable.filter((l) => l.page < firstBody);
    const body = usable.filter((l) => l.page >= firstBody);
    if (front.length) {
      const p = paragraphsOf(front, gap);
      sections.push({ id: 'front', title: 'Información inicial', kind: 'front', paragraphs: p, startPage: 0, selected: false, chars: chars(p) });
    }
    const p = paragraphsOf(body, gap);
    sections.push({ id: 'texto', title: 'Texto completo', kind: 'story', paragraphs: p, startPage: firstBody, selected: true, chars: chars(p) });
    return { sections, method };
  }

  // Todo lo anterior al primer cuento es información inicial.
  const firstAt = markers[0].at;
  const frontLines = lines.slice(0, firstAt).filter((l) => !l.toc);
  if (frontLines.length) {
    const p = paragraphsOf(frontLines, gap);
    if (p.length) sections.push({ id: 'front', title: 'Información inicial (portada, créditos, índice)', kind: 'front', paragraphs: p, startPage: 0, selected: false, chars: chars(p) });
  }

  markers.forEach((m, k) => {
    const end = k + 1 < markers.length ? markers[k + 1].at : lines.length;
    const span = m.span ?? titleSpan(lines, m.at, m.title);
    const body = lines.slice(m.at + span, end).filter((l) => !l.toc);
    const paras = paragraphsOf(body, gap);
    const title = m.title.replace(/\s+/g, ' ').trim();
    const t = norm(title);
    // Portada y créditos: empiezan en la primera página, son cortos o traen datos de edición.
    const credits = CREDIT_RE.test(paras.join(' ')) || (lines[m.at].page === 0 && chars(paras) < 1500);
    const kind: SectionKind = FRONT_RE.test(t) || credits ? 'front' : BACK_RE.test(t) ? 'back' : 'story';
    const all = [title, ...paras];
    const c = chars(paras);
    sections.push({
      id: `s${k + 1}`,
      title,
      kind,
      paragraphs: all,
      startPage: lines[m.at].page,
      selected: kind === 'story' && c >= SMALL_SECTION,
      chars: c,
    });
  });
  return { sections, method };
}

/** Texto de un fragmento sin títulos repetidos al principio (para vista previa). */
export function previewOf(section: Section, max = 160): string {
  const text = section.paragraphs.slice(section.kind === 'front' ? 0 : 1).join(' ');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const MAX_PARAGRAPH_CHARS = 650;

/** Parte los párrafos largos en frases para que la voz y la pantalla los manejen bien. */
export function prepareParagraphs(raw: string[]): string[] {
  const out: string[] = [];
  for (const p of raw) {
    const text = p.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (text.length <= MAX_PARAGRAPH_CHARS) {
      out.push(text);
      continue;
    }
    const sentences = text.match(/[^.!?…]+[.!?…]+["”»)]*\s*|[^.!?…]+$/g) ?? [text];
    let buf = '';
    for (const s of sentences) {
      if (buf && buf.length + s.length > MAX_PARAGRAPH_CHARS) {
        out.push(buf.trim());
        buf = '';
      }
      buf += s;
      // Una "frase" sin puntuación demasiado larga: cortar por espacios.
      while (buf.length > MAX_PARAGRAPH_CHARS * 1.5) {
        const cut = buf.lastIndexOf(' ', MAX_PARAGRAPH_CHARS);
        out.push(buf.slice(0, cut > 0 ? cut : MAX_PARAGRAPH_CHARS).trim());
        buf = buf.slice(cut > 0 ? cut : MAX_PARAGRAPH_CHARS);
      }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

export function wordCount(paragraphs: string[]): number {
  return paragraphs.reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
}

/** Parte una lista larga de párrafos en tramos de ~20 minutos (sin dejar una última parte minúscula). */
export function splitIntoParts(paragraphs: string[], max = 110): string[][] {
  const parts: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += max) parts.push(paragraphs.slice(i, i + max));
  if (parts.length > 1 && parts[parts.length - 1].length < max / 4) {
    const tail = parts.pop() as string[];
    parts[parts.length - 1].push(...tail);
  }
  return parts;
}
