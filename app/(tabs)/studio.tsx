import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Cover, Glyph, SectionTitle, Text } from '@/components/ui';
import { isUserBook, STORIES as ALL_STORIES } from '@/content';
import { FAMILY_LABEL, LANGUAGES, languageName, t, type Language, pickLocalized } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';
import { formatTime } from '@/utils/format';

const FAMILIES: Language['family'][] = ['andina', 'amazonica', 'castellano'];

export default function StudioScreen() {
  const STORIES = ALL_STORIES.filter((s) => !isUserBook(s));
  const { settings, recordings } = useApp();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const { lang } = settings;
  // Por defecto, la lengua del usuario; si usa castellano, quechua (la más hablada después).
  const [recLang, setRecLang] = useState(lang === 'es' ? 'qu' : lang);
  const done = STORIES.filter((s) => recordings[s.id]?.[recLang]).length;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Card style={{ backgroundColor: colors.accentSoft }}>
        <Text style={styles.introText}>{t(lang, 'studioIntro')}</Text>
        {Platform.OS === 'web' && <Text style={[styles.introText, { fontWeight: '800', marginTop: spacing.sm }]}>{t(lang, 'webNotSupported')}</Text>}
      </Card>

      <SectionTitle>{t(lang, 'studioChooseLanguage')}</SectionTitle>
      {FAMILIES.map((family) => (
        <View key={family} style={{ marginBottom: spacing.sm }}>
          {family !== 'castellano' && <Text style={styles.familyLabel}>{FAMILY_LABEL[family]}</Text>}
          <View style={styles.chips}>
            {LANGUAGES.filter((l) => l.family === family).map((l) => (
              <Chip key={l.code} label={l.native} active={recLang === l.code} onPress={() => setRecLang(l.code)} />
            ))}
          </View>
        </View>
      ))}

      <SectionTitle>{`${languageName(recLang)} · ${done}/${STORIES.length}`}</SectionTitle>
      {STORIES.map((story) => {
        const rec = recordings[story.id]?.[recLang];
        return (
          <Pressable
            key={story.id}
            onPress={() => router.push({ pathname: '/record/[id]', params: { id: story.id, lang: recLang } })}
            style={styles.storyRow}
            accessibilityRole="button"
            accessibilityLabel={`${rec ? t(lang, 'recorded') : t(lang, 'record')}: ${story.title.es}`}
          >
            <Cover story={story} size={48} title={pickLocalized(story.title, lang)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storyTitle} numberOfLines={2}>
                {pickLocalized(story.title, lang)}
              </Text>
              {rec && (
                <Text style={styles.storyMeta}>
                  {rec.narratorName} · {formatTime(rec.durationSec)}
                </Text>
              )}
            </View>
            {rec ? <Glyph name="check" size={20} color={colors.success} /> : <Text style={styles.statusTodo}>{t(lang, 'record')}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 760, alignSelf: 'center' },
    introText: { color: colors.text, lineHeight: fs(24), fontSize: fs(fontSize.body) },
    familyLabel: { color: colors.textMuted, fontWeight: '800', marginBottom: spacing.xs, fontSize: fs(13) },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    storyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    storyTitle: { fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body) },
    storyMeta: { color: colors.textMuted, marginTop: 2, fontSize: fs(12) },
    statusTodo: { color: colors.accent, fontWeight: '800', fontSize: fs(13) },
  });
