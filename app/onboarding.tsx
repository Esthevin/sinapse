import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Text } from '@/components/ui';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { ENTORNOS, useThemed, type EntornoId, type Theme } from '@/theme/theme';

const OPCIONES: { id: EntornoId; titulo: string; detalle: string }[] = [
  { id: 'estudiante', titulo: 'Estudiante de secundaria', detalle: 'Interfaz sobria, obras completas, novelas por capítulos y preguntas de análisis.' },
  { id: 'ninos', titulo: 'Niños', detalle: 'Colores, ilustraciones, letra grande y cuentos cortos.' },
];

/** Bienvenida: se elige la lengua y el entorno (estudiante o niños). Lo demás se ajusta luego en Ajustes. */
export default function Onboarding() {
  const { settings, updateSettings } = useApp();
  const { th, styles, colors, spacing } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const { lang } = settings;

  const start = () => {
    updateSettings({ onboarded: true });
    router.replace('/');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Image
        source={th.dark ? require('../assets/marca/logo-claro.png') : require('../assets/marca/logo-oscuro.png')}
        style={{ width: 72, height: 72, marginBottom: spacing.sm }}
        accessibilityLabel="Logo de Sinapse"
      />
      <Text style={styles.brand}>Sinapse</Text>
      <View style={styles.rule} />
      <Text style={styles.title}>{t(lang, 'onboardingWelcome')}</Text>
      <Text style={styles.subtitle}>{t(lang, 'onboardingIntro')}</Text>

      <Text style={styles.question}>{t(lang, 'chooseLanguage')}</Text>
      <LanguagePicker value={lang} onChange={(code) => updateSettings({ lang: code })} />

      <Text style={[styles.question, { marginTop: spacing.xl }]}>¿Quién va a leer?</Text>
      {OPCIONES.map((o) => {
        const on = settings.appearance.entorno === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => updateSettings({ appearance: ENTORNOS[o.id] })}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.option, on && styles.optionOn]}
          >
            <Text style={styles.optionTitle}>{o.titulo}</Text>
            <Text style={styles.optionDetail}>{o.detalle}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.note}>Puedes cambiarlo cuando quieras en Ajustes.</Text>
      <Button label={t(lang, 'continue')} onPress={start} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs, radius, stroke }: Theme) =>
  StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
    brand: { fontFamily: font.heading, fontSize: fs(44), fontWeight: '800', color: colors.text },
    rule: { height: 4, width: 56, backgroundColor: colors.accent, marginTop: spacing.sm, marginBottom: spacing.lg },
    title: { fontFamily: font.heading, fontSize: fs(fontSize.title), fontWeight: '800', color: colors.text },
    subtitle: { fontSize: fs(fontSize.body), color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: fs(26) },
    option: { borderWidth: stroke, borderColor: colors.hairline, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, minHeight: 64 },
    optionOn: { borderColor: colors.accent, borderWidth: Math.max(2, stroke), backgroundColor: colors.accentSoft },
    optionTitle: { fontFamily: font.heading, fontSize: fs(fontSize.body), fontWeight: '800', color: colors.text },
    optionDetail: { fontSize: fs(fontSize.caption), color: colors.textMuted, marginTop: 2, lineHeight: fs(fontSize.caption + 6) },
    note: { fontSize: fs(fontSize.caption), color: colors.textMuted, marginTop: spacing.xs },
    question: { fontFamily: font.heading, fontSize: fs(fontSize.subtitle), fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  });
