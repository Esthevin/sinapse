import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StoryCard } from '@/components/StoryCard';
import { Chip, ProgressBar } from '@/components/ui';
import { STORIES } from '@/content';
import { narratedLanguages } from '@/content/narration';
import type { Region } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

const REGIONS: Region[] = ['costa', 'sierra', 'selva'];

/** Quita tildes y mayúsculas para buscar sin importar cómo se escriba. */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export default function LibraryScreen() {
  const { settings, progress, recordings, fs } = useApp();
  const { lang, profile } = settings;
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [onlyMine, setOnlyMine] = useState(true);
  const [onlyHuman, setOnlyHuman] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return STORIES.filter((s) => {
      if (region && s.region !== region) return false;
      if (onlyMine && profile && !s.ages.includes(profile)) return false;
      if (onlyHuman && !narratedLanguages(s, recordings[s.id]).length) return false;
      if (q && !normalize(`${s.title.es} ${s.author} ${s.collection ?? ''} ${s.summary.es}`).includes(q)) return false;
      return true;
    });
  }, [query, region, onlyMine, onlyHuman, profile, recordings]);

  // La historia abierta más recientemente que aún no se termina.
  const resume = useMemo(
    () =>
      STORIES.filter((s) => progress[s.id] && !progress[s.id].completed && progress[s.id].lastOpened > 0).sort(
        (a, b) => progress[b.id].lastOpened - progress[a.id].lastOpened
      )[0],
    [progress]
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={filtered}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <Text style={[styles.hello, { fontSize: fs(fontSize.title) }]}>{t(lang, 'hello')} 👋</Text>
          <Text style={[styles.tagline, { fontSize: fs(fontSize.body) }]}>{t(lang, 'appTagline')}</Text>

          {resume && (
            <Pressable
              onPress={() => router.push({ pathname: '/story/[id]', params: { id: resume.id } })}
              style={[styles.resume, { backgroundColor: resume.coverColor }]}
              accessibilityRole="button"
              accessibilityLabel={`${t(lang, 'continueListening')}: ${resume.title.es}`}
            >
              <Text style={styles.resumeEmoji}>{resume.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeLabel, { fontSize: fs(fontSize.caption) }]}>▶ {t(lang, 'continueListening')}</Text>
                <Text style={[styles.resumeTitle, { fontSize: fs(fontSize.subtitle) }]} numberOfLines={1}>
                  {resume.title[lang] ?? resume.title.es}
                </Text>
                <View style={{ marginTop: spacing.sm }}>
                  <ProgressBar
                    value={progress[resume.id].paragraph / resume.paragraphs.es.length}
                    height={6}
                    color={colors.white}
                  />
                </View>
              </View>
            </Pressable>
          )}

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`🔍 ${t(lang, 'searchPlaceholder')}`}
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { fontSize: fs(fontSize.body) }]}
            accessibilityLabel={t(lang, 'searchPlaceholder')}
            returnKeyType="search"
          />

          <View style={styles.chips}>
            <Chip label={t(lang, 'all')} active={region === null} onPress={() => setRegion(null)} />
            {REGIONS.map((r) => (
              <Chip key={r} label={t(lang, r)} active={region === r} onPress={() => setRegion(region === r ? null : r)} />
            ))}
            <Chip label={`🎙️ ${t(lang, 'humanVoice')}`} active={onlyHuman} onPress={() => setOnlyHuman((v) => !v)} />
          </View>

          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { fontSize: fs(fontSize.subtitle) }]}>{t(lang, 'allStories')}</Text>
            {profile && (
              <Chip
                label={onlyMine ? `👤 ${t(lang, 'forMe')}` : t(lang, 'all')}
                active={onlyMine}
                onPress={() => setOnlyMine((v) => !v)}
              />
            )}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={[styles.empty, { fontSize: fs(fontSize.body) }]}>{t(lang, 'noResults')}</Text>}
      renderItem={({ item }) => <StoryCard story={item} />}
    />
  );
}

const styles = StyleSheet.create({
  hello: { fontWeight: '900', color: colors.text },
  tagline: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resumeEmoji: { fontSize: 44 },
  resumeLabel: { color: colors.white, fontWeight: '700', opacity: 0.9 },
  resumeTitle: { color: colors.white, fontWeight: '900' },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontWeight: '800', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
