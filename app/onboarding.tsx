import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Text } from '@/components/ui';
import type { AgeGroup } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { THEMES, useThemed, type Theme } from '@/theme/theme';

const PROFILES: AgeGroup[] = ['ninos', 'jovenes', 'adultos'];

export default function Onboarding() {
  const { settings, updateSettings } = useApp();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const { lang } = settings;

  const finish = (profile: AgeGroup) => {
    updateSettings({ profile, onboarded: true });
    router.replace('/');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Image source={require('../assets/marca/logo-oscuro.png')} style={{ width: 72, height: 72, marginBottom: spacing.sm }} accessibilityLabel="Logo de Sinapse" />
      <Text style={styles.brand}>Sinapse</Text>
      <View style={styles.rule} />
      <Text style={styles.title}>{t(lang, 'onboardingWelcome')}</Text>
      <Text style={styles.subtitle}>{t(lang, 'onboardingIntro')}</Text>

      {step === 0 ? (
        <View>
          <Text style={styles.question}>{t(lang, 'chooseLanguage')}</Text>
          <LanguagePicker value={lang} onChange={(code) => updateSettings({ lang: code })} />
          <Button label={t(lang, 'continue')} onPress={() => setStep(1)} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <View>
          <Text style={styles.question}>{t(lang, 'whoListens')}</Text>
          {PROFILES.map((id) => {
            // Cada opción se dibuja con la identidad visual que tendrá la app para ese perfil.
            const p = THEMES[id];
            return (
              <Pressable
                key={id}
                onPress={() => finish(id)}
                accessibilityRole="button"
                accessibilityLabel={t(lang, id)}
                style={{
                  backgroundColor: p.colors.background,
                  borderColor: id === 'jovenes' ? p.colors.accent : p.colors.border,
                  borderWidth: Math.max(2, p.stroke),
                  borderRadius: p.radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontFamily: p.font.heading,
                    fontWeight: '900',
                    fontSize: 24,
                    color: p.colors.text,
                    letterSpacing: p.uppercaseLabels ? 1 : 0,
                  }}
                >
                  {p.uppercaseLabels ? t(lang, id).toUpperCase() : t(lang, id)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[p.colors.region.costa.bg, p.colors.region.sierra.bg, p.colors.region.selva.bg].map((c) => (
                    <View key={c} style={{ width: 22, height: 22, backgroundColor: c, borderRadius: id === 'ninos' ? 11 : p.radius.sm }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs }: Theme) =>
  StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
    brand: { fontFamily: font.heading, fontSize: fs(44), fontWeight: '800', color: colors.text },
    rule: { height: 3, width: 56, backgroundColor: colors.accent, marginTop: spacing.sm, marginBottom: spacing.lg },
    title: { fontFamily: font.heading, fontSize: fs(fontSize.title), fontWeight: '700', color: colors.text },
    subtitle: { fontSize: fs(fontSize.body), color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: fs(26) },
    question: { fontFamily: font.heading, fontSize: fs(fontSize.subtitle), fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  });
