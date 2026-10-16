import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { estimateMinutes, REGION_LABEL } from '@/content';
import { hasAudioNarration, hasHumanNarration } from '@/content/narration';
import type { Story } from '@/content/types';
import { LANGUAGES, t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { ProgressBar } from './ui';

export function StoryCard({ story }: { story: Story }) {
  const { settings, progress, quizzes, recordings, fs } = useApp();
  const { lang } = settings;
  const title = pickLocalized(story.title, lang);
  const prog = progress[story.id];
  const quiz = quizzes[story.id];
  const region = REGION_LABEL[story.region];
  const stars = quiz ? starsFor(quiz.best, quiz.total) : 0;
  const inProgress = prog && !prog.completed && prog.paragraph > 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${story.author}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.cover, { backgroundColor: story.coverColor }]}>
        <Text style={styles.coverEmoji}>{story.emoji}</Text>
        {prog?.completed && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { fontSize: fs(fontSize.body + 1) }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.author, { fontSize: fs(fontSize.caption) }]} numberOfLines={1}>
          {story.author}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { fontSize: fs(13) }]}>
            {region.emoji} {t(lang, story.region)} · {estimateMinutes(story)} {t(lang, 'minutes')}
          </Text>
          {stars > 0 && <Text style={{ fontSize: fs(13) }}>{'⭐'.repeat(stars)}</Text>}
        </View>

        {/* Lenguas en las que se puede escuchar (🎙️ = voz humana); la del usuario aparece aunque falte */}
        <View style={styles.langRow}>
          {LANGUAGES.filter((l) => l.code === 'es' || l.code === lang || hasAudioNarration(story, l.code, recordings[story.id])).map((l) => {
            const human = hasHumanNarration(story, l.code, recordings[story.id]);
            const audio = hasAudioNarration(story, l.code, recordings[story.id]);
            const available = audio || l.code === 'es';
            return (
              <View key={l.code} style={[styles.langPill, available ? styles.langOn : styles.langOff]}>
                <Text style={[styles.langText, !available && { color: colors.textMuted }]}>
                  {human ? '🎙️ ' : audio ? '✨ ' : ''}
                  {l.short}
                </Text>
              </View>
            );
          })}
        </View>

        {inProgress && (
          <View style={{ marginTop: spacing.sm }}>
            <ProgressBar value={prog.paragraph / story.paragraphs.es.length} height={6} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function starsFor(correct: number, total: number): number {
  const pct = total ? correct / total : 0;
  return pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cover: { width: 92, height: 92, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 42 },
  doneBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: colors.white, fontWeight: '900' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontWeight: '800', color: colors.text },
  author: { color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  meta: { color: colors.textMuted },
  langRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  langPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  langOn: { backgroundColor: colors.successSoft },
  langOff: { backgroundColor: colors.surface },
  langText: { fontSize: 11, fontWeight: '800', color: colors.text },
});
