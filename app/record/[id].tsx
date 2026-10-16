import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Glyph, Text } from '@/components/ui';
import { getStory } from '@/content';
import type { Story } from '@/content/types';
import { isLanguageCode, languageName, t, type LanguageCode } from '@/i18n/translations';
import { deleteRecordingFile, persistRecording, shareRecording } from '@/services/recordings';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';
import { confirmAction } from '@/utils/confirm';
import { formatTime } from '@/utils/format';

export default function RecordScreen() {
  const params = useLocalSearchParams<{ id: string; lang?: string }>();
  const story = getStory(params.id);
  const lang: LanguageCode = isLanguageCode(params.lang) ? params.lang : 'qu';
  const { settings } = useApp();
  const { styles } = useThemed(makeStyles);

  if (!story) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>{t(settings.lang, 'webNotSupported')}</Text>
      </View>
    );
  }

  return <Recorder story={story} lang={lang} />;
}

type Phase = 'consent' | 'ready' | 'recording' | 'review' | 'saved';

function Recorder({ story, lang }: { story: Story; lang: LanguageCode }) {
  const { settings, recordings, saveRecording, removeRecording } = useApp();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const ui = settings.lang;
  const existing = recordings[story.id]?.[lang];

  const [phase, setPhase] = useState<Phase>(existing ? 'saved' : 'consent');
  const [narratorName, setNarratorName] = useState(existing?.narratorName ?? '');
  const [consent, setConsent] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  /** Segundos en que se tocó «Siguiente párrafo» (el primero empieza en 0). */
  const [marks, setMarks] = useState<number[]>([]);
  const [finalMarks, setFinalMarks] = useState<number[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);

  // Reproductor para revisar la toma o la grabación guardada.
  const previewUri = phase === 'review' ? tempUri : phase === 'saved' ? existing?.uri ?? null : null;
  const player = useAudioPlayer(previewUri ? { uri: previewUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  // Si se sale a mitad de una grabación, detenerla.
  useEffect(
    () => () => {
      if (recorder.isRecording) recorder.stop().catch(() => {});
    },
    [recorder]
  );

  const langName = languageName(lang);
  const paragraphs = story.paragraphs[lang] ?? story.paragraphs.es;

  const start = async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para usar el micrófono. Actívalo en los ajustes del teléfono.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setMarks([0]);
    setFinalMarks(undefined);
    setPhase('recording');
  };

  const stop = async () => {
    const seconds = recState.durationMillis / 1000;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setTempUri(recorder.uri);
    setDurationSec(seconds);
    // Solo sirven las marcas si se marcaron TODOS los párrafos; si no, el resaltado se estima.
    setFinalMarks(marks.length === paragraphs.length ? marks : undefined);
    setPhase('review');
  };

  const save = async () => {
    if (!tempUri) return;
    setBusy(true);
    try {
      const uri = await persistRecording(tempUri, story.id, lang);
      if (existing) await deleteRecordingFile(existing.uri);
      saveRecording(story.id, lang, { uri, narratorName: narratorName.trim(), consent: true, durationSec, date: Date.now(), paragraphStarts: finalMarks });
      setPhase('saved');
    } catch (e) {
      setError('No se pudo guardar la grabación. Intenta de nuevo.');
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAction('¿Borrar esta grabación del teléfono?', t(ui, 'confirm'), t(ui, 'cancel'));
    if (!ok) return;
    player.pause();
    await deleteRecordingFile(existing.uri);
    removeRecording(story.id, lang);
    setPhase('consent');
  };

  const togglePreview = () => {
    if (playerStatus.playing) player.pause();
    else {
      if (playerStatus.duration && playerStatus.currentTime >= playerStatus.duration - 0.5) player.seekTo(0);
      player.play();
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: langName }} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{story.title.es}</Text>
          <Text style={styles.subtitle}>Narración en {langName}</Text>
        </View>
      </View>

      {error && (
        <Card style={[styles.notice, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
          <Text style={styles.tip}>{error}</Text>
        </Card>
      )}

      {/* 1. Consentimiento */}
      {phase === 'consent' && (
        <Card style={styles.notice}>
          <Text style={styles.stepTitle}>1. ¿Quién narra?</Text>
          <TextInput
            value={narratorName}
            onChangeText={setNarratorName}
            placeholder="Nombre de la persona que narra"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Nombre de la persona que narra"
          />
          <Pressable
            onPress={() => setConsent((c) => !c)}
            style={styles.consentRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>{consent && <Glyph name="check" size={18} color={colors.onPrimary} />}</View>
            <Text style={styles.consentText}>
              Doy mi consentimiento para que Sinapse use esta grabación de mi voz con fines educativos, y entiendo que puedo pedir que se retire en cualquier momento.
            </Text>
          </Pressable>
          <Button
            label={t(ui, 'continue')}
            onPress={() => setPhase('ready')}
            disabled={!consent || narratorName.trim().length < 2}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* 2. Grabar */}
      {(phase === 'ready' || phase === 'recording') && (
        <>
          <Card style={styles.notice}>
            <Text style={styles.stepTitle}>2. Grabar</Text>
            <Text style={styles.tip}>
              Busca un lugar silencioso. {lang === 'es' ? 'Lee el texto con calma.' : `Puedes leer el texto o contar la historia con tus propias palabras en ${langName}.`}
            </Text>
            {phase === 'ready' && (
              <Text style={styles.tip}>
                Mientras lees, toca «Siguiente párrafo» cada vez que empieces uno nuevo. Así la app resalta el texto justo cuando lo dices.
              </Text>
            )}
            <View style={styles.recordRow}>
              <Pressable
                onPress={phase === 'recording' ? stop : start}
                style={[styles.recordButton, phase === 'recording' && styles.recordButtonActive]}
                accessibilityRole="button"
                accessibilityLabel={phase === 'recording' ? 'Detener grabación' : 'Empezar a grabar'}
              >
                <Glyph name={phase === 'recording' ? 'stop' : 'record'} size={34} color="#FFFFFF" />
              </Pressable>
              <View>
                <Text style={styles.timer}>{formatTime(recState.durationMillis / 1000)}</Text>
                <Text style={styles.subtitle}>
                  {phase === 'recording' ? 'Grabando. Toca el cuadro para terminar' : 'Toca el círculo para empezar'}
                </Text>
              </View>
            </View>
            {phase === 'recording' && (
              <Button
                label={marks.length < paragraphs.length ? `Siguiente párrafo (${marks.length} de ${paragraphs.length})` : 'Último párrafo marcado'}
                variant="secondary"
                disabled={marks.length >= paragraphs.length}
                onPress={() => setMarks((m) => (m.length < paragraphs.length ? [...m, recState.durationMillis / 1000] : m))}
                style={{ marginTop: spacing.md }}
              />
            )}
          </Card>

          {/* Texto guía (teleprompter): el párrafo que toca leer va resaltado */}
          {paragraphs.map((p, i) => {
            const current = phase === 'recording' && i === marks.length - 1;
            return (
              <Text key={i} style={[styles.prompter, current && styles.prompterCurrent, phase === 'recording' && !current && { opacity: 0.45 }]}>
                {p}
              </Text>
            );
          })}
        </>
      )}

      {/* 3. Revisar */}
      {phase === 'review' && (
        <Card style={styles.notice}>
          <Text style={styles.stepTitle}>3. Escucha tu grabación</Text>
          <Text style={styles.tip}>
            {finalMarks ? 'Marcaste todos los párrafos: el texto se resaltará justo cuando lo dices.' : 'No marcaste todos los párrafos: el resaltado será aproximado.'}
          </Text>
          <Button
            label={playerStatus.playing ? 'Pausar' : `Escuchar (${formatTime(durationSec)})`}
            variant="secondary"
            onPress={togglePreview}
          />
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={busy ? 'Guardando…' : 'Guardar grabación'} onPress={save} disabled={busy} />
            <Button
              label="Grabar de nuevo"
             
              variant="secondary"
              onPress={() => {
                player.pause();
                setPhase('ready');
              }}
            />
          </View>
        </Card>
      )}

      {/* Guardado */}
      {phase === 'saved' && existing && (
        <Card style={[styles.notice, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
          <Text style={styles.stepTitle}>Grabación guardada</Text>
          <Text style={styles.tip}>
            Narra: {existing.narratorName} · {formatTime(existing.durationSec)}
          </Text>
          <Text style={styles.tip}>
            Ya se escucha en este teléfono al elegir {langName} en la historia. Para publicarla para todos, compártela con el equipo de Sinapse.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={playerStatus.playing ? 'Pausar' : 'Escuchar'} variant="secondary" onPress={togglePreview} />
            <Button
              label="Compartir con el equipo"
             
              onPress={async () => {
                const ok = await shareRecording(existing.uri, `${story.title.es} (${langName}) - ${existing.narratorName}`);
                if (!ok) setError('Compartir no está disponible en este teléfono.');
              }}
            />
            <Button
              label="Ir a la historia"
             
              variant="secondary"
              onPress={() => router.replace({ pathname: '/story/[id]', params: { id: story.id } })}
            />
            <Button label="Grabar de nuevo" variant="secondary" onPress={() => setPhase('consent')} />
            <Button label="Borrar grabación" variant="danger" onPress={remove} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ playful, colors, spacing, radius, fontSize, font, stroke, fs }: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
    centerText: { textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: fs(fontSize.subtitle) },
    content: { padding: spacing.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontFamily: font.heading, fontWeight: '900', color: colors.text, fontSize: fs(fontSize.subtitle) },
    subtitle: { color: colors.textMuted, fontSize: fs(fontSize.caption) },
    notice: { marginTop: spacing.md },
    stepTitle: { fontFamily: font.heading, fontWeight: '900', color: colors.text, marginBottom: spacing.sm, fontSize: fs(fontSize.subtitle) },
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
    consentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: playful ? 8 : 3,
      borderWidth: 2,
      borderColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    consentText: { flex: 1, color: colors.text, lineHeight: 22, fontSize: fs(fontSize.caption + 1) },
    tip: { color: colors.text, lineHeight: 22, marginTop: spacing.xs, fontSize: fs(fontSize.caption + 1) },
    recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
    recordButton: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordButtonActive: { backgroundColor: colors.text },
    timer: { fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'], fontSize: fs(fontSize.display) },
    prompterCurrent: { backgroundColor: colors.highlight, borderLeftWidth: 4, borderLeftColor: colors.highlightBar, paddingVertical: spacing.sm, paddingLeft: spacing.sm, borderRadius: radius.sm },
    prompter: { color: colors.text, marginTop: spacing.md, paddingHorizontal: spacing.xs, fontFamily: font.body, fontSize: fs(fontSize.subtitle), lineHeight: fs(32) },
  });
