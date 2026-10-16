import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { starsFor } from '@/components/StoryCard';
import { Card, ProgressBar, SectionTitle } from '@/components/ui';
import { STORIES } from '@/content';
import { t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { computeBadges, computeStats } from '@/state/stats';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

export default function ProgressScreen() {
  const { settings, progress, quizzes, recordings, activeDays, fs } = useApp();
  const { lang } = settings;
  const stats = computeStats(progress, quizzes, recordings, activeDays);
  const badges = computeBadges(stats);
  const results = STORIES.filter((s) => quizzes[s.id]);

  const tiles = [
    { emoji: '📖', value: `${stats.completed}/${stats.totalStories}`, label: t(lang, 'storiesDone') },
    { emoji: '⏱️', value: String(stats.minutes), label: t(lang, 'minutesListened') },
    { emoji: '🔥', value: String(stats.streak), label: t(lang, 'streakDays') },
    { emoji: '🧠', value: stats.quizAverage === null ? '—' : `${stats.quizAverage}%`, label: t(lang, 'quizAverage') },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Card key={tile.label} style={styles.tile}>
            <Text style={styles.tileEmoji}>{tile.emoji}</Text>
            <Text style={[styles.tileValue, { fontSize: fs(fontSize.title) }]}>{tile.value}</Text>
            <Text style={[styles.tileLabel, { fontSize: fs(13) }]}>{tile.label}</Text>
          </Card>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ProgressBar value={stats.completed / stats.totalStories} color={colors.success} height={10} />
      </View>

      <SectionTitle>🏅 {t(lang, 'badges')}</SectionTitle>
      <View style={styles.badges}>
        {badges.map((b) => (
          <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]} accessibilityLabel={`${b.title}: ${b.description}`}>
            <Text style={[styles.badgeEmoji, !b.earned && { opacity: 0.3 }]}>{b.earned ? b.emoji : '🔒'}</Text>
            <Text style={[styles.badgeTitle, { fontSize: fs(13) }]} numberOfLines={2}>
              {b.title}
            </Text>
            <Text style={[styles.badgeDesc, { fontSize: fs(11) }]} numberOfLines={3}>
              {b.description}
            </Text>
          </View>
        ))}
      </View>

      <SectionTitle>✍️ {t(lang, 'quizResults')}</SectionTitle>
      {results.length === 0 ? (
        <Text style={[styles.empty, { fontSize: fs(fontSize.body) }]}>{t(lang, 'noActivity')}</Text>
      ) : (
        results.map((s) => {
          const r = quizzes[s.id];
          return (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: '/story/[id]', params: { id: s.id } })}
              style={styles.resultRow}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, { fontSize: fs(fontSize.body) }]} numberOfLines={1}>
                  {pickLocalized(s.title, lang)}
                </Text>
                <Text style={[styles.resultMeta, { fontSize: fs(13) }]}>
                  {r.best}/{r.total} · {r.attempts} {r.attempts === 1 ? 'intento' : 'intentos'}
                </Text>
              </View>
              <Text style={{ fontSize: fs(16) }}>{'⭐'.repeat(starsFor(r.best, r.total))}</Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: spacing.lg },
  tileEmoji: { fontSize: 28 },
  tileValue: { fontWeight: '900', color: colors.primary, marginTop: spacing.xs },
  tileLabel: { color: colors.textMuted, textAlign: 'center', fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.highlight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  badgeLocked: { backgroundColor: colors.surface, borderColor: colors.border },
  badgeEmoji: { fontSize: 32 },
  badgeTitle: { fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 4 },
  badgeDesc: { color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultTitle: { fontWeight: '800', color: colors.text },
  resultMeta: { color: colors.textMuted, marginTop: 2 },
});
