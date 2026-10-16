import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { STORIES } from '@/content';
import { FAMILY_LABEL, LANGUAGES, languageName, t, type Language } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { formatTime } from '@/utils/format';

const FAMILIES: Language['family'][] = ['andina', 'amazonica', 'castellano'];

export default function StudioScreen() {
  const { settings, recordings, fs } = useApp();
  const { lang } = settings;
  // Por defecto, la lengua del usuario; si usa castellano, quechua (la más hablada después).
  const [recLang, setRecLang] = useState(lang === 'es' ? 'qu' : lang);
  const done = STORIES.filter((s) => recordings[s.id]?.[recLang]).length;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Card style={styles.intro}>
        <Text style={styles.introEmoji}>🎙️</Text>
        <Text style={[styles.introText, { fontSize: fs(fontSize.body) }]}>{t(lang, 'studioIntro')}</Text>
        {Platform.OS === 'web' && (
          <Text style={[styles.introText, { fontSize: fs(fontSize.body), fontWeight: '800', marginTop: spacing.sm }]}>
            📱 {t(lang, 'webNotSupported')}
          </Text>
        )}
      </Card>

      <SectionTitle>🌐 {t(lang, 'studioChooseLanguage')}</SectionTitle>
      {FAMILIES.map((family) => (
        <View key={family} style={{ marginBottom: spacing.sm }}>
          {family !== 'castellano' && <Text style={[styles.familyLabel, { fontSize: fs(13) }]}>{FAMILY_LABEL[family]}</Text>}
          <View style={styles.chips}>
            {LANGUAGES.filter((l) => l.family === family).map((l) => (
              <Chip key={l.code} label={l.native} active={recLang === l.code} onPress={() => setRecLang(l.code)} />
            ))}
          </View>
        </View>
      ))}

      <SectionTitle>
        📚 {languageName(recLang)} · {done}/{STORIES.length}
      </SectionTitle>
      {STORIES.map((story) => {
        const rec = recordings[story.id]?.[recLang];
        return (
          <Pressable
            key={story.id}
            onPress={() => router.push({ pathname: '/record/[id]', params: { id: story.id, lang: recLang } })}
            style={[styles.storyRow, rec && styles.storyRowDone]}
            accessibilityRole="button"
            accessibilityLabel={`${rec ? t(lang, 'recorded') : t(lang, 'record')}: ${story.title.es}`}
          >
            <Text style={{ fontSize: 28 }}>{story.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.storyTitle, { fontSize: fs(fontSize.body) }]} numberOfLines={2}>
                {story.title[lang] ?? story.title.es}
              </Text>
              {rec && (
                <Text style={[styles.storyMeta, { fontSize: fs(12) }]}>
                  {rec.narratorName} · {formatTime(rec.durationSec)}
                </Text>
              )}
            </View>
            <Text style={[styles.status, rec ? styles.statusDone : styles.statusTodo, { fontSize: fs(13) }]}>
              {rec ? '✓' : `● ${t(lang, 'record')}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  introEmoji: { fontSize: 36, marginBottom: spacing.xs },
  introText: { color: colors.text, lineHeight: 24 },
  familyLabel: { color: colors.textMuted, fontWeight: '800', marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  storyRow: {
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
  storyRowDone: { backgroundColor: colors.successSoft, borderColor: colors.success },
  storyTitle: { fontWeight: '800', color: colors.text },
  storyMeta: { color: colors.textMuted, marginTop: 2 },
  status: { fontWeight: '800' },
  statusDone: { color: colors.success, fontSize: 20 },
  statusTodo: { color: colors.danger },
});
