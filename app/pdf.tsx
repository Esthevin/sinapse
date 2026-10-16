import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfRunner } from '@/components/PdfRunner';
import { Button, Card, ProgressBar, Text } from '@/components/ui';
import { buildPdfHtml, type PdfMessage } from '@/services/pdfHtml';
import { loadPdfJs } from '@/services/pdfSources';
import { prepareParagraphs, saveBook, wordCount } from '@/services/books';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';

const MAX_BYTES = 25 * 1024 * 1024;
/** Una voz de teléfono lee unas 150 palabras por minuto. */
const WORDS_PER_MINUTE = 150;

type Phase =
  | { name: 'idle' }
  | { name: 'working'; label: string; progress: number }
  | { name: 'preview'; fileName: string; pages: number; paragraphs: string[]; title: string }
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
  const { booksChanged } = useApp();
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
        const paragraphs = prepareParagraphs(m.paragraphs);
        const chars = paragraphs.join('').length;
        setJob(null);
        if (chars < 80) {
          setPhase({
            name: 'error',
            message: 'No encontramos texto en este PDF. Si es un escaneo (fotos de páginas), todavía no podemos leerlo: hace falta reconocimiento de texto (OCR).',
          });
          return;
        }
        // Los títulos internos de los PDF suelen ser basura ("about:blank", "Microsoft Word - ..."): se prefiere el nombre del archivo.
        const fromFile = (job?.fileName ?? '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim();
        const base = fromFile || m.title.trim() || 'Mi libro';
        setTitle(base);
        setPhase({ name: 'preview', fileName: job?.fileName ?? '', pages: m.numPages, paragraphs, title: base });
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
    try {
      const ids = await saveBook(title.trim() || 'Mi libro', phase.paragraphs, phase.pages);
      booksChanged();
      router.replace({ pathname: '/story/[id]', params: { id: ids[0] } });
    } catch {
      setPhase({ name: 'error', message: 'No hay espacio para guardar este libro en el dispositivo. Borra algún audiolibro e inténtalo de nuevo.' });
    }
  };

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

      {phase.name === 'preview' && (
        <>
          <Text style={styles.label}>Título</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} accessibilityLabel="Título del audiolibro" />
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.noteTitle}>Esto es lo que encontramos</Text>
            <Text style={styles.note}>
              {phase.pages} páginas · {phase.paragraphs.length} párrafos · unos {Math.max(1, Math.round(wordCount(phase.paragraphs) / WORDS_PER_MINUTE))} minutos de audio
            </Text>
            <Text style={[styles.note, { marginTop: spacing.sm, fontStyle: 'italic' }]} numberOfLines={5}>
              {phase.paragraphs.slice(0, 2).join('\n\n')}
            </Text>
          </Card>
          <Button label="Crear audiolibro" onPress={create} style={{ marginTop: spacing.lg }} />
          <Button label="Elegir otro PDF" variant="secondary" onPress={() => setPhase({ name: 'idle' })} style={{ marginTop: spacing.sm }} />
        </>
      )}
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
    noteTitle: { fontFamily: font.heading, fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body), marginBottom: spacing.xs },
    note: { color: colors.text, fontSize: fs(fontSize.caption + 1), lineHeight: fs(22) },
  });
