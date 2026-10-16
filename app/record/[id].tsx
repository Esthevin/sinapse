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
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from '@/components/ui';
import { getStory } from '@/content';
import type { Story } from '@/content/types';
import { isLanguageCode, languageName, t, type LanguageCode } from '@/i18n/translations';
import { deleteRecordingFile, persistRecording, shareRecording } from '@/services/recordings';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { confirmAction } from '@/utils/confirm';
import { formatTime } from '@/utils/format';

export default function RecordScreen() {
  const params = useLocalSearchParams<{ id: string; lang?: string }>();
  const story = getStory(params.id);
  const lang: LanguageCode = isLanguageCode(params.lang) ? params.lang : 'qu';
  const { settings, fs } = useApp();

  if (!story) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>📱</Text>
        <Text style={[styles.centerText, { fontSize: fs(fontSize.subtitle) }]}>{t(settings.lang, 'webNotSupported')}</Text>
      </View>
    );
  }

  return <Recorder story={story} lang={lang} />;
}

type Phase = 'consent' | 'ready' | 'recording' | 'review' | 'saved';

function Recorder({ story, lang }: { story: Story; lang: LanguageCode }) {
  const { settings, recordings, saveRecording, removeRecording, fs } = useApp();
  const insets = useSafeAreaInsets();
  const ui = settings.lang;
  const existing = recordings[story.id]?.[lang];

  const [phase, setPhase] = useState<Phase>(existing ? 'saved' : 'consent');
  const [narratorName, setNarratorName] = useState(existing?.narratorName ?? '');
  const [consent, setConsent] = useState(false);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
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
    setPhase('recording');
  };

  const stop = async () => {
    const seconds = recState.durationMillis / 1000;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setTempUri(recorder.uri);
    setDurationSec(seconds);
    setPhase('review');
  };

  const save = async () => {
    if (!tempUri) return;
    setBusy(true);
    try {
      const uri = await persistRecording(tempUri, story.id, lang);
      if (existing) await deleteRecordingFile(existing.uri);
      saveRecording(story.id, lang, { uri, narratorName: narratorName.trim(), consent: true, durationSec, date: Date.now() });
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
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: `🎙️ ${langName}` }} />

      <View style={styles.header}>
        <Text style={{ fontSize: 40 }}>{story.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: fs(fontSize.subtitle) }]}>{story.title.es}</Text>
          <Text style={[styles.subtitle, { fontSize: fs(fontSize.caption) }]}>Narración en {langName}</Text>
        </View>
      </View>

      {error && (
        <Card style={[styles.notice, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
          <Text style={{ fontSize: fs(fontSize.body), color: colors.text }}>⚠️ {error}</Text>
        </Card>
      )}

      {/* 1. Consentimiento */}
      {phase === 'consent' && (
        <Card style={styles.notice}>
          <Text style={[styles.stepTitle, { fontSize: fs(fontSize.subtitle) }]}>1. ¿Quién narra?</Text>
          <TextInput
            value={narratorName}
            onChangeText={setNarratorName}
            placeholder="Nombre de la persona que narra"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { fontSize: fs(fontSize.body) }]}
            accessibilityLabel="Nombre de la persona que narra"
          />
          <Pressable
            onPress={() => setConsent((c) => !c)}
            style={styles.consentRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>{consent && <Text style={styles.checkMark}>✓</Text>}</View>
            <Text style={[styles.consentText, { fontSize: fs(fontSize.caption + 1) }]}>
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
            <Text style={[styles.stepTitle, { fontSize: fs(fontSize.subtitle) }]}>2. Grabar</Text>
            <Text style={[styles.tip, { fontSize: fs(fontSize.caption + 1) }]}>
              💡 Busca un lugar silencioso. {lang === 'es' ? 'Lee el texto con calma.' : `Puedes leer el texto o contar la historia con tus propias palabras en ${langName}.`}
            </Text>
            <View style={styles.recordRow}>
              <Pressable
                onPress={phase === 'recording' ? stop : start}
                style={[styles.recordButton, phase === 'recording' && styles.recordButtonActive]}
                accessibilityRole="button"
                accessibilityLabel={phase === 'recording' ? 'Detener grabación' : 'Empezar a grabar'}
              >
                <Text style={styles.recordIcon}>{phase === 'recording' ? '■' : '●'}</Text>
              </Pressable>
              <View>
                <Text style={[styles.timer, { fontSize: fs(fontSize.display) }]}>{formatTime(recState.durationMillis / 1000)}</Text>
                <Text style={[styles.subtitle, { fontSize: fs(fontSize.caption) }]}>
                  {phase === 'recording' ? '🔴 Grabando… toca ■ para terminar' : 'Toca ● para empezar'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Texto guía (teleprompter) */}
          {paragraphs.map((p, i) => (
            <Text key={i} style={[styles.prompter, { fontSize: fs(fontSize.subtitle), lineHeight: fs(32) }]}>
              {p}
            </Text>
          ))}
        </>
      )}

      {/* 3. Revisar */}
      {phase === 'review' && (
        <Card style={styles.notice}>
          <Text style={[styles.stepTitle, { fontSize: fs(fontSize.subtitle) }]}>3. Escucha tu grabación</Text>
          <Button
            label={playerStatus.playing ? 'Pausar' : `Escuchar (${formatTime(durationSec)})`}
            icon={playerStatus.playing ? '⏸' : '▶'}
            variant="secondary"
            onPress={togglePreview}
          />
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={busy ? 'Guardando…' : 'Guardar grabación'} icon="💾" onPress={save} disabled={busy} />
            <Button
              label="Grabar de nuevo"
              icon="🔁"
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
          <Text style={[styles.stepTitle, { fontSize: fs(fontSize.subtitle) }]}>✅ Grabación guardada</Text>
          <Text style={[styles.tip, { fontSize: fs(fontSize.body) }]}>
            Narra: {existing.narratorName} · {formatTime(existing.durationSec)}
          </Text>
          <Text style={[styles.tip, { fontSize: fs(fontSize.caption + 1) }]}>
            Ya se escucha en este teléfono al elegir {langName} en la historia. Para publicarla para todos, compártela con el equipo de Sinapse.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label={playerStatus.playing ? 'Pausar' : 'Escuchar'} icon={playerStatus.playing ? '⏸' : '▶'} variant="secondary" onPress={togglePreview} />
            <Button
              label="Compartir con el equipo"
              icon="📤"
              onPress={async () => {
                const ok = await shareRecording(existing.uri, `${story.title.es} (${langName}) - ${existing.narratorName}`);
                if (!ok) setError('Compartir no está disponible en este teléfono.');
              }}
            />
            <Button
              label="Ir a la historia"
              icon="🎧"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/story/[id]', params: { id: story.id } })}
            />
            <Button label="Grabar de nuevo" icon="🔁" variant="secondary" onPress={() => setPhase('consent')} />
            <Button label="Borrar grabación" icon="🗑️" variant="danger" onPress={remove} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  centerText: { textAlign: 'center', color: colors.text, marginTop: spacing.md, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontWeight: '900', color: colors.text },
  subtitle: { color: colors.textMuted },
  notice: { marginTop: spacing.md },
  stepTitle: { fontWeight: '900', color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  consentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkMark: { color: colors.white, fontWeight: '900' },
  consentText: { flex: 1, color: colors.text, lineHeight: 22 },
  tip: { color: colors.text, lineHeight: 22, marginTop: spacing.xs },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: { backgroundColor: colors.primary },
  recordIcon: { fontSize: 36, color: colors.white },
  timer: { fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  prompter: { color: colors.text, marginTop: spacing.md, paddingHorizontal: spacing.xs },
});
