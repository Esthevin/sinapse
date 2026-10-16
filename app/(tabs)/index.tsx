import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { StoryCard } from '@/components/StoryCard';
import { Card, Chip, Cover, label, ProgressBar, Text } from '@/components/ui';
import { STORIES } from '@/content';
import { narratedLanguages } from '@/content/narration';
import type { Region } from '@/content/types';
import { t, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';

const REGIONS: Region[] = ['costa', 'sierra', 'selva'];
const MAX_WIDTH = 760;

/** Quita tildes y mayúsculas para buscar sin importar cómo se escriba. */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export default function LibraryScreen() {
  const { settings, progress, recordings } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const { width: screenWidth } = useWindowDimensions();
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

  const ninos = th.id === 'ninos';
  const jovenes = th.id === 'jovenes';
  const contentWidth = Math.min(screenWidth, MAX_WIDTH) - spacing.md * 2;
  const gap = spacing.md;
  const cardWidth = Math.floor((contentWidth - gap) / 2);
  const openResume = () => resume && router.push({ pathname: '/story/[id]', params: { id: resume.id } });
  const resumeFraction = resume ? progress[resume.id].paragraph / resume.paragraphs.es.length : 0;

  const header = (
    <View>
      {jovenes && <Text style={styles.kicker}>{label(th, t(lang, 'appTagline'))}</Text>}
      <Text style={styles.hello}>{ninos ? t(lang, 'hello') : jovenes ? t(lang, 'tabLibrary') : 'Sinapse'}</Text>
      {!jovenes && <Text style={styles.tagline}>{t(lang, 'appTagline')}</Text>}
      {th.id === 'adultos' && !resume && <View style={styles.rule} />}

      {resume &&
        (ninos ? (
          <Pressable onPress={openResume} accessibilityRole="button" accessibilityLabel={`${t(lang, 'continueListening')}: ${resume.title.es}`}>
            <Card style={{ marginBottom: spacing.md, backgroundColor: colors.accentSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Cover story={resume} size={84} title={pickLocalized(resume.title, lang)} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeLabel}>{t(lang, 'continueListening')}</Text>
                  <Text style={styles.resumeTitle} numberOfLines={2}>
                    {pickLocalized(resume.title, lang)}
                  </Text>
                  <View style={{ marginTop: spacing.sm }}>
                    <ProgressBar value={resumeFraction} />
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        ) : (
          <Pressable
            onPress={openResume}
            style={jovenes ? styles.resumeBar : styles.resumeLine}
            accessibilityRole="button"
            accessibilityLabel={`${t(lang, 'continueListening')}: ${resume.title.es}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeLabel}>{label(th, t(lang, 'continueListening'))}</Text>
              <Text style={styles.resumeTitle} numberOfLines={1}>
                {pickLocalized(resume.title, lang)}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <ProgressBar value={resumeFraction} />
              </View>
            </View>
          </Pressable>
        ))}

      {!ninos && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t(lang, 'searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          accessibilityLabel={t(lang, 'searchPlaceholder')}
          returnKeyType="search"
        />
      )}

      <View style={styles.chips}>
        <Chip label={t(lang, 'all')} active={region === null} onPress={() => setRegion(null)} />
        {REGIONS.map((r) => (
          <Chip key={r} label={t(lang, r)} active={region === r} onPress={() => setRegion(region === r ? null : r)} />
        ))}
        {!ninos && <Chip label={t(lang, 'humanVoice')} active={onlyHuman} onPress={() => setOnlyHuman((v) => !v)} />}
        {!ninos && profile && <Chip label={t(lang, 'forMe')} active={onlyMine} onPress={() => setOnlyMine((v) => !v)} />}
      </View>

      {!ninos && (
        <Text style={styles.count}>
          {label(th, `${t(lang, 'allStories')} (${filtered.length})`)}
        </Text>
      )}
    </View>
  );

  return (
    <FlatList
      key={th.id}
      style={{ backgroundColor: colors.background }}
      data={filtered}
      keyExtractor={(s) => s.id}
      numColumns={ninos ? 2 : 1}
      columnWrapperStyle={ninos ? { gap, marginBottom: gap } : undefined}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{t(lang, 'noResults')}</Text>}
      renderItem={({ item, index }) => <StoryCard story={item} index={index} width={cardWidth} />}
    />
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, font, id, stroke, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    kicker: { fontSize: fs(12), fontWeight: '800', letterSpacing: 1.8, color: colors.accent, marginTop: spacing.sm },
    hello: {
      fontFamily: font.heading,
      fontWeight: '900',
      color: colors.text,
      fontSize: fs(id === 'ninos' ? 44 : id === 'jovenes' ? 40 : 36),
      marginTop: id === 'jovenes' ? 2 : spacing.sm,
      letterSpacing: id === 'jovenes' ? -1 : 0,
    },
    tagline: {
      color: colors.textMuted,
      fontSize: fs(id === 'ninos' ? fontSize.subtitle - 2 : fontSize.body),
      fontStyle: id === 'adultos' ? 'italic' : 'normal',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    rule: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
    resumeBar: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    resumeLine: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    resumeLabel: {
      fontSize: fs(id === 'ninos' ? fontSize.caption : 12),
      fontWeight: '800',
      color: id === 'adultos' ? colors.accent : colors.textMuted,
      letterSpacing: id === 'jovenes' ? 1.4 : 0,
    },
    resumeTitle: { fontFamily: font.heading, fontSize: fs(fontSize.subtitle), fontWeight: '800', color: colors.text, marginTop: 2 },
    search: {
      marginTop: spacing.md,
      color: colors.text,
      fontFamily: font.body,
      fontSize: fs(fontSize.body),
      paddingHorizontal: id === 'adultos' ? 0 : spacing.md,
      paddingVertical: spacing.md - 2,
      backgroundColor: id === 'adultos' ? 'transparent' : colors.surface,
      borderRadius: radius.md,
      borderWidth: id === 'adultos' ? 0 : 0,
      borderBottomWidth: id === 'adultos' ? stroke : 0,
      borderColor: colors.border,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    count: {
      marginTop: spacing.lg,
      fontSize: fs(id === 'jovenes' ? 12 : fontSize.caption),
      fontWeight: '800',
      letterSpacing: id === 'jovenes' ? 1.6 : 0,
      color: colors.textMuted,
    },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, fontSize: fs(fontSize.body) },
  });
