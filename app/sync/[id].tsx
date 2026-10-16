import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Text } from '@/components/ui';
import { getStory } from '@/content';
import { resolveNarration } from '@/content/narration';
import { isLanguageCode, pickLocalized, type LanguageCode } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';
import { formatTime } from '@/utils/format';

/**
 * Herramienta del equipo: escucha la narración y toca "Marcar" justo cuando empieza
 * cada párrafo. Genera `paragraphStartsSec` para pegar en el JSON de la historia
 * y lograr un resaltado exacto con voz humana.
 */
export default function SyncScreen() {
  const params = useLocalSearchParams<{ id: string; lang?: string }>();
  const story = getStory(params.id);
  const { settings, recordings } = useApp();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const lang: LanguageCode = isLanguageCode(params.lang) ? params.lang : settings.lang;
  const insets = useSafeAreaInsets();

  const resolved = story ? resolveNarration(story, lang, recordings[story.id]) : null;
  const source = resolved?.source.kind === 'audio' ? resolved.source : null;
  const player = useAudioPlayer(source ? source.asset ?? { uri: source.uri } : null);
  const status = useAudioPlayerStatus(player);
  const [marks, setMarks] = useState<number[]>([]);

  if (!story || !resolved) return null;

  if (!source) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>
          Esta historia no tiene una narración en audio para sincronizar.
        </Text>
      </View>
    );
  }

  const paragraphs = source.paragraphs;
  const next = marks.length;
  const done = next >= paragraphs.length;
  const json = `"paragraphStartsSec": [${marks.map((m) => m.toFixed(1)).join(', ')}]`;

  const mark = () => {
    if (done) return;
    // El primer párrafo no puede empezar antes que el anterior: se mantiene la lista creciente.
    const at = Math.max(status.currentTime, marks[marks.length - 1] ?? 0);
    setMarks((m) => [...m, Math.round(at * 10) / 10]);
  };

  const undo = () => {
    const last = marks[marks.length - 2];
    setMarks((m) => m.slice(0, -1));
    player.seekTo(Math.max(0, (last ?? 0) - 1));
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
    >
      <Stack.Screen options={{ title: 'Sincronizar' }} />
      <Text style={styles.title}>
        {pickLocalized(story.title, lang)}
      </Text>
      <Text style={styles.hint}>
        Voz: {resolved.voice.kind === 'audio' ? resolved.voice.name : 'teléfono'} · Escucha y toca “Marcar” cuando empiece cada párrafo.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.time}>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={status.playing ? 'Pausar' : 'Reproducir'}
            variant="secondary"
            onPress={() => (status.playing ? player.pause() : player.play())}
          />
          <Button
            label={done ? 'Todos los párrafos marcados' : `Marcar inicio del párrafo ${next + 1} de ${paragraphs.length}`}
           
            onPress={mark}
            disabled={done || !status.isLoaded}
          />
          <Button label="Deshacer última marca" variant="secondary" onPress={undo} disabled={marks.length === 0} />
        </View>
      </Card>

      {!done && <Text style={styles.current}>{paragraphs[next]}</Text>}

      {marks.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.title}>
            Marcas ({marks.length}/{paragraphs.length})
          </Text>
          <Text selectable style={styles.code}>
            {json}
          </Text>
          <Button
            label="Compartir marcas"
           
            disabled={!done}
            onPress={() => Share.share({ message: json })}
            style={{ marginTop: spacing.md }}
          />
          {!done && <Text style={styles.hint}>Termina de marcar todos los párrafos para compartir.</Text>}
          <Text style={styles.hint}>
            Pega la línea en el audio correspondiente de src/content/historias/{story.id}.json y corre npm run validar.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, font, fs }: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
    text: { textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: fs(fontSize.subtitle) },
    title: { fontFamily: font.heading, fontWeight: '900', color: colors.text, fontSize: fs(fontSize.subtitle) },
    hint: { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20, fontSize: fs(fontSize.caption) },
    card: { marginTop: spacing.md },
    time: { fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'], textAlign: 'center', fontSize: fs(fontSize.display) },
    current: { color: colors.text, marginTop: spacing.md, lineHeight: 26, paddingHorizontal: spacing.xs, fontSize: fs(fontSize.body + 1) },
    code: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontFamily: 'monospace',
    },
  });
