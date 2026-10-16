import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { FAMILY_LABEL, hasUiTranslation, LANGUAGES, t, type Language, type LanguageCode } from '@/i18n/translations';
import { useThemed, type Theme } from '@/theme/theme';

const FAMILIES: Language['family'][] = ['castellano', 'andina', 'amazonica'];

/** Selector de lengua agrupado por familia (castellano, andinas, amazónicas). */
export function LanguagePicker({ value, onChange }: { value: LanguageCode; onChange: (code: LanguageCode) => void }) {
  const { styles, spacing } = useThemed(makeStyles);
  const current = LANGUAGES.find((l) => l.code === value);

  return (
    <View>
      {FAMILIES.map((family) => (
        <View key={family} style={{ marginBottom: spacing.sm }}>
          {family !== 'castellano' && <Text style={styles.family}>{FAMILY_LABEL[family]}</Text>}
          <View style={styles.grid}>
            {LANGUAGES.filter((l) => l.family === family).map((l) => {
              const active = l.code === value;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => onChange(l.code)}
                  style={[styles.option, active && styles.optionActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                >
                  <Text style={styles.native} numberOfLines={2}>
                    {l.native}
                  </Text>
                  {l.native !== l.label && (
                    <Text style={styles.label} numberOfLines={1}>
                      {l.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {current && !hasUiTranslation(current.code) && (
        <Text style={styles.note}>{t('es', 'uiFallbackNote', { lang: current.native })}</Text>
      )}
    </View>
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, stroke, uppercaseLabels, fs }: Theme) =>
  StyleSheet.create({
    family: {
      color: colors.textMuted,
      fontWeight: '800',
      fontSize: fs(13),
      marginBottom: spacing.xs,
      marginTop: spacing.xs,
      letterSpacing: uppercaseLabels ? 1.2 : 0,
      textTransform: uppercaseLabels ? 'uppercase' : 'none',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    option: {
      flexBasis: '47%',
      flexGrow: 1,
      borderWidth: stroke,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    optionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft, borderWidth: Math.max(2, stroke) },
    native: { fontWeight: '800', color: colors.text, fontSize: fs(fontSize.body + 1) },
    label: { color: colors.textMuted, marginTop: 2, fontSize: fs(12) },
    note: { color: colors.text, backgroundColor: colors.highlight, padding: spacing.sm, borderRadius: radius.sm, lineHeight: 20, fontSize: fs(13) },
  });
