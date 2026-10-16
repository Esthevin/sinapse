import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button } from '@/components/ui';
import type { AgeGroup } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

const PROFILES: { id: AgeGroup; emoji: string }[] = [
  { id: 'ninos', emoji: '🧒' },
  { id: 'jovenes', emoji: '🧑' },
  { id: 'adultos', emoji: '🧓' },
];

export default function Onboarding() {
  const { settings, updateSettings } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const { lang } = settings;

  const finish = (profile: AgeGroup) => {
    updateSettings({ profile, onboarded: true });
    router.replace('/');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.primary }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.logo}>📖🎧</Text>
      <Text style={styles.title}>{t(lang, 'onboardingWelcome')}</Text>
      <Text style={styles.subtitle}>{t(lang, 'onboardingIntro')}</Text>

      {step === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.question}>🌐 {t(lang, 'chooseLanguage')}</Text>
          <LanguagePicker value={lang} onChange={(code) => updateSettings({ lang: code })} />
          <Button label={t(lang, 'continue')} onPress={() => setStep(1)} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.question}>👂 {t(lang, 'whoListens')}</Text>
          {PROFILES.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => finish(p.id)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityLabel={t(lang, p.id)}
            >
              <Text style={styles.optionTitle}>
                {p.emoji} {t(lang, p.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, alignItems: 'stretch' },
  logo: { fontSize: 64, textAlign: 'center' },
  title: { fontSize: fontSize.display, fontWeight: '900', color: colors.white, textAlign: 'center', marginTop: spacing.md },
  subtitle: { fontSize: fontSize.body, color: '#D6E2EE', textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  panel: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },
  question: { fontSize: fontSize.subtitle, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  option: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionTitle: { fontSize: fontSize.subtitle, fontWeight: '800', color: colors.text },
});
