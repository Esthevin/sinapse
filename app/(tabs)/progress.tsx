import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { starsFor } from '@/components/StoryCard';
import { Card, Cover, ProgressBar, SectionTitle, Stars, Text } from '@/components/ui';
import { STORIES } from '@/content';
import { t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { computeBadges, computeStats } from '@/state/stats';
import { useThemed, type Theme } from '@/theme/theme';

export default function ProgressScreen() {
  const { settings, progress, quizzes, recordings, activeDays } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const { lang } = settings;
  const stats = computeStats(progress, quizzes, recordings, activeDays);
  const badges = computeBadges(stats);
  const results = STORIES.filter((s) => quizzes[s.id]);

  const tiles = [
    { value: `${stats.completed}/${stats.totalStories}`, label: t(lang, 'storiesDone') },
    { value: String(stats.minutes), label: t(lang, 'minutesListened') },
    { value: String(stats.streak), label: t(lang, 'streakDays') },
    { value: stats.quizAverage === null ? '—' : `${stats.quizAverage}%`, label: t(lang, 'quizAverage') },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {!th.playful ? (
        <View>
          {tiles.map((tile) => (
            <View key={tile.label} style={styles.statRow}>
              <Text style={styles.statLabel}>{tile.label}</Text>
              <Text style={styles.statValue}>{tile.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <Card key={tile.label} style={styles.tile}>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Card>
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.md }}>
        <ProgressBar value={stats.completed / stats.totalStories} color={colors.success} height={th.playful ? 18 : 6} />
      </View>

      <SectionTitle>{t(lang, 'badges')}</SectionTitle>
      <View style={styles.badges}>
        {badges.map((b) => (
          <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]} accessibilityLabel={`${b.title}: ${b.description}`}>
            <View style={[styles.mark, b.earned && styles.markOn]} />
            <Text style={styles.badgeTitle} numberOfLines={2}>
              {b.title}
            </Text>
            <Text style={styles.badgeDesc} numberOfLines={3}>
              {b.description}
            </Text>
          </View>
        ))}
      </View>

      <SectionTitle>{t(lang, 'quizResults')}</SectionTitle>
      {results.length === 0 ? (
        <Text style={styles.empty}>{t(lang, 'noActivity')}</Text>
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
              <Cover story={s} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {pickLocalized(s.title, lang)}
                </Text>
                <Text style={styles.resultMeta}>
                  {r.best}/{r.total} · {r.attempts} {r.attempts === 1 ? 'intento' : 'intentos'}
                </Text>
              </View>
              <Stars count={starsFor(r.best, r.total)} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = ({ playful, colors, spacing, radius, fontSize, font, stroke, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 760, alignSelf: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: { flexBasis: '46%', flexGrow: 1, paddingVertical: spacing.lg },
    tileValue: { fontFamily: font.heading, fontWeight: '900', color: colors.text, fontSize: fs(playful ? 42 : 36) },
    tileLabel: { color: colors.textMuted, fontWeight: '700', fontSize: fs(13), marginTop: 2 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    statLabel: { color: colors.textMuted, fontSize: fs(fontSize.body), fontStyle: 'italic' },
    statValue: { fontFamily: font.heading, fontWeight: '700', color: colors.text, fontSize: fs(fontSize.title) },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    badge: {
      width: '31%',
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      borderWidth: stroke,
      borderColor: colors.accent,
    },
    badgeLocked: { borderColor: colors.border, opacity: 0.6 },
    mark: { width: 16, height: 16, borderWidth: 2, borderColor: colors.border, transform: [{ rotate: '45deg' }], marginBottom: spacing.sm, marginTop: 2 },
    markOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    badgeTitle: { fontWeight: '800', color: colors.text, fontSize: fs(13) },
    badgeDesc: { color: colors.textMuted, marginTop: 2, fontSize: fs(11) },
    empty: { color: colors.textMuted, marginTop: spacing.sm, fontSize: fs(fontSize.body) },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultTitle: { fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body) },
    resultMeta: { color: colors.textMuted, marginTop: 2, fontSize: fs(13) },
  });
