import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfRunner } from '@/components/PdfRunner';
import { isUserBook, STORIES } from '@/content';
import { FREE_PDFS_PER_MONTH } from '@/content/plan';
import { confirmAction } from '@/utils/confirm';
import { Button, Card, Chip, Glyph, ProgressBar, Text } from '@/components/ui';
import { buildPdfHtml, type PdfMessage } from '@/services/pdfHtml';
import { loadPdfJs } from '@/services/pdfSources';
import { listSpanishVoices, voiceLabel } from '@/services/speech';
import { deleteBook, prepareParagraphs, saveBook, wordCount } from '@/services/books';
import { analyzePdf, previewOf, type Analysis, type Section } from '@/services/pdfAnalyze';
import { useAccount } from '@/state/AccountContext';
import { useApp } from '@/state/AppContext';
import { canConvertPdf, pdfsUsedThisMonth, registerPdf } from '@/services/limits';
import { useThemed, type Theme } from '@/theme/theme';

const MAX_BYTES = 25 * 1024 * 1024;
/** Una voz de teléfono lee unas 150 palabras por minuto. */
const WORDS_PER_MINUTE = 150;

type Phase =
  | { name: 'idle' }
  | { name: 'working'; label: string; progress: number }
  | { name: 'preview'; analysis: Analysis; pages: number; selected: Record<string, boolean> }
  | { name: 'error'; message: string };

const ERRORS: Record<string, string> = {
  password: 'Este PDF tiene contraseña. Quítala y vuelve a intentarlo.',
  invalid: 'No se pudo abrir el archivo. Revisa que sea un PDF válido.',
};

function fileBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const file = asset.file;
      if (!file) return reject(new Error('sin archivo'));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function PdfScreen() {
  const { booksChanged, catalogVersion, settings, updateSettings } = useApp();
  const { plan } = useAccount();
  const [limitHit, setLimitHit] = useState(false);
  const [used, setUsed] = useState(0);
  useEffect(() => {
    pdfsUsedThisMonth().then(setUsed);
  }, [catalogVersion, limitHit]);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  useEffect(() => {
    listSpanishVoices().then(setVoices);
  }, []);
  const tryVoice = (id: string | null) => {
    Speech.stop();
    Speech.speak('Así sonará la lectura de tu libro.', { language: 'es-PE', voice: id ?? undefined, rate: settings.speechRate });
  };
  const { styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [job, setJob] = useState<{ html: string; base64: string; fileName: string } | null>(null);
  const [title, setTitle] = useState('');

  const onMessage = useCallback(
    (m: PdfMessage) => {
      if (m.type === 'progress') {
        setPhase({ name: 'working', label: `Leyendo página ${m.page} de ${m.total}`, progress: m.page / m.total });
      } else if (m.type === 'done') {
        setJob(null);
        const analysis = analyzePdf(m.pages, m.outline);
        const readable = analysis.sections.reduce((n, sec) => n + sec.chars, 0);
        if (readable < 80) {
          setPhase({
            name: 'error',
            message: 'No encontramos texto en este PDF. Si es un escaneo (fotos de páginas), todavía no podemos leerlo: hace falta reconocimiento de texto (OCR).',
          });
          return;
        }
        // El nombre del libro sale del archivo (los títulos internos de los PDF suelen ser basura).
        const fromFile = (job?.fileName ?? '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim();
        setTitle(fromFile || m.title.trim() || 'Mi libro');
        setPhase({ name: 'preview', analysis, pages: m.numPages, selected: Object.fromEntries(analysis.sections.map((sec) => [sec.id, sec.selected])) });
      } else if (m.type === 'error') {
        setJob(null);
        setPhase({ name: 'error', message: ERRORS[m.code] ?? `No se pudo leer el PDF (${m.message}).` });
      }
    },
    [job?.fileName]
  );

  // Si el lector no responde (por ejemplo, un WebView que no arrancó), no dejar la pantalla esperando.
  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => {
      setJob(null);
      setPhase({ name: 'error', message: 'El lector tardó demasiado. Prueba con un PDF más corto.' });
    }, 120000);
    return () => clearTimeout(timer);
  }, [job]);

  const pick = async () => {
    const gate = await canConvertPdf(plan);
    if (!gate.allowed) {
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (asset.size && asset.size > MAX_BYTES) {
        setPhase({ name: 'error', message: 'El PDF pesa más de 25 MB. Prueba con uno más liviano.' });
        return;
      }
      setPhase({ name: 'working', label: 'Preparando el lector…', progress: 0 });
      const [base64, { lib, worker }] = await Promise.all([fileBase64(asset), loadPdfJs()]);
      setPhase({ name: 'working', label: 'Abriendo el PDF…', progress: 0 });
      setJob({ html: buildPdfHtml(lib, worker), base64, fileName: asset.name });
    } catch (e) {
      setPhase({ name: 'error', message: `No se pudo abrir el archivo (${e instanceof Error ? e.message : 'error'}).` });
    }
  };

  const create = async () => {
    if (phase.name !== 'preview') return;
    const chosen = phase.analysis.sections.filter((sec) => phase.selected[sec.id]);
    if (!chosen.length) return;
    const name = title.trim() || 'Mi libro';
    const single = phase.analysis.method === 'none';
    const total = chosen.reduce((n, sec) => n + sec.chars, 0) || 1;
    try {
      let firstId = '';
      for (const sec of chosen) {
        const paragraphs = prepareParagraphs(sec.paragraphs);
        const pages = Math.max(1, Math.round((phase.pages * sec.chars) / total));
        const ids = await saveBook(single ? name : sec.title, paragraphs, pages, single ? undefined : name);
        firstId ||= ids[0];
      }
      await registerPdf();
      booksChanged();
      if (chosen.length === 1) router.replace({ pathname: '/story/[id]', params: { id: firstId } });
      else router.replace('/');
    } catch {
      setPhase({ name: 'error', message: 'No hay espacio para guardar estos libros en el dispositivo. Borra algún audiolibro e inténtalo de nuevo.' });
    }
  };

  // Audiolibros ya creados (catalogVersion hace que la lista se actualice al borrar).
  const myBooks = catalogVersion >= 0 ? STORIES.filter(isUserBook) : [];

  const removeBook = async (id: string, name: string) => {
    if (!(await confirmAction(`¿Eliminar "${name}" del dispositivo?`, 'Eliminar', 'Cancelar'))) return;
    await deleteBook(id);
    booksChanged();
  };

  const removeAll = async () => {
    if (!(await confirmAction(`¿Eliminar los ${myBooks.length} audiolibros del dispositivo?`, 'Eliminar todos', 'Cancelar'))) return;
    for (const b of [...myBooks]) await deleteBook(b.id);
    booksChanged();
  };

  const toggle = (id: string) => phase.name === 'preview' && setPhase({ ...phase, selected: { ...phase.selected, [id]: !phase.selected[id] } });
  const setAll = (value: boolean) =>
    phase.name === 'preview' && setPhase({ ...phase, selected: Object.fromEntries(phase.analysis.sections.map((sec) => [sec.id, value])) });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Audiolibro desde PDF' }} />
      {job && <PdfRunner html={job.html} base64={job.base64} onMessage={onMessage} />}

      <Text style={styles.lead}>Sube un PDF con texto y Sinapse lo lee en voz alta, párrafo por párrafo, igual que las historias.</Text>

      {(phase.name === 'idle' || phase.name === 'error') && (
        <>
          {phase.name === 'error' && (
            <Card style={{ marginTop: spacing.md, backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
              <Text style={styles.body}>{phase.message}</Text>
            </Card>
          )}
          {plan === 'normal' && (
            <Text style={[styles.note, { marginTop: spacing.md }]}>
              {`Plan Normal: ${Math.min(used, FREE_PDFS_PER_MONTH)} de ${FREE_PDFS_PER_MONTH} PDF usados este mes.`}
            </Text>
          )}
          {limitHit && (
            <Card style={{ marginTop: spacing.md, backgroundColor: colors.accentSoft }}>
              <Text style={styles.body}>Ya usaste tus {FREE_PDFS_PER_MONTH} PDF de este mes. Con Premium conviertes todos los que quieras.</Text>
              <Button label="Ver Premium" onPress={() => router.push('/premium')} style={{ marginTop: spacing.md }} />
            </Card>
          )}
          <Button label="Elegir un PDF" onPress={pick} style={{ marginTop: spacing.lg }} />
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.noteTitle}>Antes de empezar</Text>
            <Text style={styles.note}>
              {'•'} Funciona con PDF de texto (libros, artículos, apuntes). Los escaneos como fotos aún no.{'\n'}
              {'•'} El archivo se lee dentro de tu dispositivo: no se sube a ningún servidor.{'\n'}
              {'•'} La lectura usa la voz en español del teléfono. Los libros largos se parten en partes de unos 20 minutos.{'\n'}
              {'•'} Usa solo documentos que tengas derecho a usar.
            </Text>
          </Card>

          <Text style={styles.heading}>Voz para leer tus libros</Text>
          <Text style={styles.note}>Son voces del teléfono (no inteligencia artificial de Sinapse). Toca una para escucharla.</Text>
          <View style={styles.chips}>
            <Chip label="Una voz por personaje" active={settings.multiVoice} onPress={() => updateSettings({ multiVoice: !settings.multiVoice })} />
            <Chip label="Automática" active={settings.voiceId === null} onPress={() => { updateSettings({ voiceId: null }); tryVoice(null); }} />
          </View>
          {voices.map((v, i) => {
            const on = settings.voiceId === v.identifier;
            return (
              <Pressable
                key={v.identifier}
                onPress={() => {
                  updateSettings({ voiceId: v.identifier });
                  tryVoice(v.identifier);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={styles.sectionRow}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Glyph name="check" size={18} color={colors.onPrimary} />}</View>
                <Text style={[styles.sectionTitle, { flex: 1 }]}>{voiceLabel(v, i)}</Text>
              </Pressable>
            );
          })}

          {myBooks.length > 0 && (
            <>
              <Text style={styles.heading}>Mis audiolibros ({myBooks.length})</Text>
              {myBooks.map((b) => (
                <View key={b.id} style={styles.sectionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{b.title.es}</Text>
                    <Text style={styles.sectionMeta}>
                      {b.paragraphs.es.length} párrafos{b.collection ? ` · ${b.collection}` : ''}
                    </Text>
                  </View>
                  <Button label="Eliminar" variant="danger" onPress={() => removeBook(b.id, b.title.es)} />
                </View>
              ))}
              {myBooks.length > 1 && (
                <Button label="Eliminar todos" variant="danger" onPress={removeAll} style={{ marginTop: spacing.md }} />
              )}
            </>
          )}
        </>
      )}

      {phase.name === 'working' && (
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.body, { marginTop: spacing.md }]}>{phase.label}</Text>
          <View style={{ width: '100%', marginTop: spacing.md }}>
            <ProgressBar value={phase.progress} />
          </View>
        </View>
      )}

      {phase.name === 'preview' && (() => {
        const { analysis, selected } = phase;
        const count = analysis.sections.filter((sec) => selected[sec.id]).length;
        const stories = analysis.sections.filter((sec) => sec.kind === 'story').length;
        const single = analysis.method === 'none';
        const minutes = (sec: Section) => Math.max(1, Math.round(wordCount(sec.paragraphs) / WORDS_PER_MINUTE));
        return (
          <>
            <Text style={styles.label}>{single ? 'Título' : 'Nombre del libro'}</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} accessibilityLabel="Nombre del libro" />

            <Text style={styles.heading}>
              {single ? 'Esto es lo que encontramos' : `Encontramos ${stories} ${stories === 1 ? 'cuento' : 'cuentos'}`}
            </Text>
            {!single && <Text style={styles.note}>Marca los que quieras convertir en audiolibro. La información inicial (portada, créditos, índice, prólogo) viene sin marcar.</Text>}
            {!single && (
              <View style={styles.chips}>
                <Chip label="Marcar todo" onPress={() => setAll(true)} />
                <Chip label="Quitar todo" onPress={() => setAll(false)} />
              </View>
            )}

            {analysis.sections.map((sec) => {
              const on = !!selected[sec.id];
              const tag = sec.kind === 'front' ? 'Información inicial' : sec.kind === 'back' ? 'Al final del libro' : '';
              return (
                <Pressable key={sec.id} onPress={() => toggle(sec.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.sectionRow}>
                  <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Glyph name="check" size={18} color={colors.onPrimary} />}</View>
                  <View style={{ flex: 1 }}>
                    {!!tag && <Text style={styles.tag}>{tag}</Text>}
                    <Text style={styles.sectionTitle}>{single && sec.kind === 'story' ? title || sec.title : sec.title}</Text>
                    <Text style={styles.sectionMeta}>
                      {sec.paragraphs.length} párrafos · unos {minutes(sec)} min · desde la página {sec.startPage + 1}
                    </Text>
                    <Text style={styles.sectionPreview} numberOfLines={2}>
                      {previewOf(sec)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Button
              label={count === 0 ? 'Marca al menos uno' : count === 1 ? 'Crear audiolibro' : `Crear ${count} audiolibros`}
              onPress={create}
              disabled={count === 0}
              style={{ marginTop: spacing.lg }}
            />
            <Button label="Elegir otro PDF" variant="secondary" onPress={() => setPhase({ name: 'idle' })} style={{ marginTop: spacing.sm }} />
          </>
        );
      })()}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, font, stroke, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
    lead: { color: colors.text, fontSize: fs(fontSize.body + 1), lineHeight: fs(27), marginTop: spacing.sm },
    body: { color: colors.text, fontSize: fs(fontSize.body), lineHeight: fs(24) },
    label: { color: colors.textMuted, fontWeight: '800', fontSize: fs(13), marginTop: spacing.lg, marginBottom: spacing.xs },
    input: {
      borderWidth: stroke,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: font.body,
      fontSize: fs(fontSize.body),
    },
    heading: { fontFamily: font.heading, fontWeight: '800', color: colors.text, fontSize: fs(fontSize.subtitle), marginTop: spacing.lg },
    chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    sectionRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start' },
    checkbox: { width: 28, height: 28, borderRadius: 4, borderWidth: 2, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tag: { color: colors.accent, fontWeight: '800', fontSize: fs(12), marginBottom: 2 },
    sectionTitle: { fontFamily: font.heading, fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body) },
    sectionMeta: { color: colors.textMuted, fontSize: fs(13), marginTop: 2 },
    sectionPreview: { color: colors.text, fontSize: fs(fontSize.caption), marginTop: 4, fontStyle: 'italic' },
    noteTitle: { fontFamily: font.heading, fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body), marginBottom: spacing.xs },
    note: { color: colors.text, fontSize: fs(fontSize.caption + 1), lineHeight: fs(22) },
  });
