import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Cover, ProgressBar, Text } from '@/components/ui';
import { getNarrator } from '@/content';
import { getNovel, loadNovel, novelAsStory } from '@/content/novelas';
import { useAccount } from '@/state/AccountContext';
import { useApp } from '@/state/AppContext';
import { useDownloads } from '@/state/DownloadsContext';
import { useThemed, type Theme } from '@/theme/theme';

/** Una novela: portada, resumen, quién la lee y la lista de capítulos con su avance. */
export default function NovelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novel = getNovel(id);
  const chapters = useMemo(() => (novel ? loadNovel(novel.id) : []), [novel]);
  const { progress } = useApp();
  const { plan } = useAccount();
  const downloads = useDownloads();
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const { styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();

  if (!novel) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Novela no encontrada</Text>
      </View>
    );
  }

  const open = (chapterId: string) => router.push({ pathname: '/story/[id]', params: { id: chapterId } });
  const next = chapters.find((c) => !progress[c.id]?.completed) ?? chapters[0];
  const started = chapters.some((c) => progress[c.id]?.lastOpened);
  const done = chapters.filter((c) => progress[c.id]?.completed).length;
  const downloadedUrls = new Set(downloads.items.map((d) => d.url));
  const pending = chapters.filter((c) => c.audio[0] && /^https?:/.test(c.audio[0].url) && !downloadedUrls.has(c.audio[0].url));
  const narrator = getNarrator(chapters[0]?.audio[0]?.narratorId ?? '');

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ title: novel.title.es }} />
      <View style={{ alignItems: 'center' }}>
        <Cover story={novelAsStory(novel)} size={170} />
      </View>
      <Text style={styles.title}>{novel.title.es}</Text>
      <Text style={styles.meta}>{`${novel.author}${novel.year ? ` · ${novel.year}` : ''} · ${novel.level === 'universidad' ? 'Universidad' : 'Secundaria'}`}</Text>
      <Text style={styles.summary}>{novel.summary.es}</Text>
      {narrator && (
        <Text style={styles.meta}>{`Voz: ${narrator.name} (voluntario/a de LibriVox, dominio público)`}</Text>
      )}

      {downloads.supported && (
        <Button
          label={
            batch
              ? `Descargando capítulo ${Math.min(batch.done + 1, batch.total)} de ${batch.total}…`
              : plan === 'premium'
                ? `Descargar los ${pending.length ? pending.length : 'capítulos'} para escuchar sin internet`
                : 'Descargar para escuchar sin internet (Premium)'
          }
          variant="secondary"
          disabled={!!batch || (plan === 'premium' && pending.length === 0)}
          onPress={async () => {
            if (plan !== 'premium') return router.push('/premium');
            setBatch({ done: 0, total: pending.length });
            for (const [i, c] of pending.entries()) {
              await downloads.download(c.audio[0].url, `${novel.title.es} · ${c.title.es}`);
              setBatch({ done: i + 1, total: pending.length });
            }
            setBatch(null);
          }}
          style={{ marginTop: spacing.sm }}
        />
      )}
      {next && <Button label={started ? 'Continuar leyendo' : 'Empezar la novela'} onPress={() => open(next.id)} style={{ marginTop: spacing.md }} />}
      <Text style={styles.count}>{`Capítulos (${done} de ${chapters.length} terminados)`}</Text>

      {chapters.map((c) => {
        const p = progress[c.id];
        const minutes = Math.max(1, Math.round((c.audio[0]?.durationSec ?? 0) / 60));
        return (
          <Pressable key={c.id} onPress={() => open(c.id)} accessibilityRole="button" accessibilityLabel={c.title.es} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.title.es}</Text>
              <Text style={styles.rowMeta}>{`${minutes} min${p?.completed ? ' · terminado' : ''}${c.audio[0] && downloadedUrls.has(c.audio[0].url) ? ' · descargado' : ''}`}</Text>
              {p && !p.completed && p.paragraph > 0 ? (
                <View style={{ marginTop: spacing.xs }}>
                  <ProgressBar value={p.paragraph / c.paragraphs.es.length} />
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    title: { fontFamily: font.heading, fontWeight: '900', fontSize: fs(fontSize.title + 2), color: colors.text, textAlign: 'center', marginTop: spacing.md },
    meta: { color: colors.textMuted, fontSize: fs(fontSize.caption + 1), textAlign: 'center', marginTop: 2 },
    rowMeta: { color: colors.textMuted, fontSize: fs(fontSize.caption + 1), marginTop: 2 },
    summary: { color: colors.text, fontSize: fs(fontSize.body), lineHeight: fs(24), marginTop: spacing.md },
    count: { marginTop: spacing.lg, fontWeight: '800', fontSize: fs(fontSize.caption), color: colors.textMuted },
    row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowTitle: { fontFamily: font.heading, fontWeight: '700', fontSize: fs(fontSize.body), color: colors.text },
  });
