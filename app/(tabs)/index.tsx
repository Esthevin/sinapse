import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { StoryCard } from '@/components/StoryCard';
import { Button, Card, Chip, Cover, ProgressBar, Text } from '@/components/ui';
import { STORIES } from '@/content';
import { narratedLanguages } from '@/content/narration';
import type { Region } from '@/content/types';
import { LANGUAGES, t, pickLocalized } from '@/i18n/translations';
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
  const { settings, progress, recordings, catalogVersion, updateSettings } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const { width: screenWidth } = useWindowDimensions();
  const { lang } = settings;
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [onlyHuman, setOnlyHuman] = useState(false);
  const [pickingLang, setPickingLang] = useState(false);
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return STORIES.filter((s) => {
      if (region && s.region !== region) return false;
      if (onlyHuman && !narratedLanguages(s, recordings[s.id]).length) return false;
      if (q && !normalize(`${s.title.es} ${s.author} ${s.collection ?? ''} ${s.summary.es}`).includes(q)) return false;
      return true;
    });
  }, [query, region, onlyHuman, recordings, catalogVersion]);

  // La historia abierta más recientemente que aún no se termina.
  const resume = useMemo(
    () =>
      STORIES.filter((s) => progress[s.id] && !progress[s.id].completed && progress[s.id].lastOpened > 0).sort(
        (a, b) => progress[b.id].lastOpened - progress[a.id].lastOpened
      )[0],
    [progress, catalogVersion]
  );

  const contentWidth = Math.min(screenWidth, MAX_WIDTH) - spacing.md * 2;
  const gap = spacing.md;
  const cardWidth = Math.floor((contentWidth - gap) / 2);
  const openResume = () => resume && router.push({ pathname: '/story/[id]', params: { id: resume.id } });
  const resumeFraction = resume ? progress[resume.id].paragraph / resume.paragraphs.es.length : 0;

  const header = (
    <View>
      {/* Idioma de la app: se puede cambiar desde el inicio, sin entrar a Ajustes. */}
      <View style={styles.langRow}>
        <Pressable
          onPress={() => setPickingLang((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: pickingLang }}
          accessibilityLabel={`${t(lang, 'chooseLanguage')}: ${currentLang?.native ?? lang}`}
          style={styles.langButton}
        >
          <Text style={styles.langText}>{`${currentLang?.native ?? lang}  ${pickingLang ? '▴' : '▾'}`}</Text>
        </Pressable>
      </View>
      {pickingLang && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.langTitle}>{t(lang, 'chooseLanguage')}</Text>
          <LanguagePicker
            value={lang}
            onChange={(code) => {
              updateSettings({ lang: code });
              setPickingLang(false);
            }}
          />
        </Card>
      )}

      <Text style={styles.hello}>{t(lang, 'hello')}</Text>
      <Text style={styles.tagline}>{t(lang, 'appTagline')}</Text>

      {resume && (
        <Pressable onPress={openResume} accessibilityRole="button" accessibilityLabel={`${t(lang, 'continueListening')}: ${resume.title.es}`}>
          <Card style={{ marginBottom: spacing.md, backgroundColor: colors.accentSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Cover story={resume} size={th.playful ? 84 : 64} title={pickLocalized(resume.title, lang)} />
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
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t(lang, 'searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel={t(lang, 'searchPlaceholder')}
        returnKeyType="search"
      />

      <View style={styles.chips}>
        <Chip label={t(lang, 'all')} active={region === null} onPress={() => setRegion(null)} />
        {REGIONS.map((r) => (
          <Chip key={r} label={t(lang, r)} active={region === r} onPress={() => setRegion(region === r ? null : r)} />
        ))}
        <Chip label={t(lang, 'humanVoice')} active={onlyHuman} onPress={() => setOnlyHuman((v) => !v)} />
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Button label="Convertir un PDF en audiolibro" variant="secondary" onPress={() => router.push('/pdf')} />
      </View>

      <Text style={styles.count}>{`${t(lang, 'allStories')} (${filtered.length})`}</Text>
    </View>
  );

  return (
    <FlatList
      key={th.grid ? 'grid' : 'list'}
      style={{ backgroundColor: colors.background }}
      data={filtered}
      keyExtractor={(s) => s.id}
      numColumns={th.grid ? 2 : 1}
      columnWrapperStyle={th.grid ? { gap, marginBottom: gap } : undefined}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{t(lang, 'noResults')}</Text>}
      renderItem={({ item }) => <StoryCard story={item} width={cardWidth} />}
    />
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, font, stroke, playful, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
    hello: { fontFamily: font.heading, fontWeight: '900', color: colors.text, fontSize: fs(playful ? 44 : 36), marginTop: spacing.sm },
    tagline: { color: colors.textMuted, fontSize: fs(playful ? fontSize.subtitle - 2 : fontSize.body), marginTop: spacing.xs, marginBottom: spacing.md },
    resumeLabel: { fontSize: fs(fontSize.caption), fontWeight: '800', color: colors.textMuted },
    resumeTitle: { fontFamily: font.heading, fontSize: fs(fontSize.subtitle), fontWeight: '800', color: colors.text, marginTop: 2 },
    search: {
      marginTop: spacing.md,
      color: colors.text,
      fontFamily: font.body,
      fontSize: fs(fontSize.body),
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: stroke,
      borderColor: colors.border,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    langRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs, marginBottom: spacing.xs },
    langButton: { borderWidth: stroke, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, backgroundColor: colors.card },
    langText: { fontWeight: '800', fontSize: fs(fontSize.caption + 1), color: colors.text },
    langTitle: { fontWeight: '800', fontSize: fs(fontSize.subtitle), marginBottom: spacing.sm, color: colors.text },
    count: { marginTop: spacing.lg, fontSize: fs(fontSize.caption), fontWeight: '800', color: colors.textMuted },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, fontSize: fs(fontSize.body) },
  });
