import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FAMILY_LABEL, hasUiTranslation, LANGUAGES, t, type Language, type LanguageCode } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';

const FAMILIES: Language['family'][] = ['castellano', 'andina', 'amazonica'];

/** Selector de lengua agrupado por familia (castellano, andinas, amazónicas). */
export function LanguagePicker({ value, onChange }: { value: LanguageCode; onChange: (code: LanguageCode) => void }) {
  const { fs } = useApp();
  const current = LANGUAGES.find((l) => l.code === value);

  return (
    <View>
      {FAMILIES.map((family) => (
        <View key={family} style={{ marginBottom: spacing.sm }}>
          {family !== 'castellano' && <Text style={[styles.family, { fontSize: fs(13) }]}>{FAMILY_LABEL[family]}</Text>}
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
                  <Text style={[styles.native, { fontSize: fs(fontSize.body + 1) }]} numberOfLines={2}>
                    {active ? '✓ ' : ''}
                    {l.native}
                  </Text>
                  {l.native !== l.label && (
                    <Text style={[styles.label, { fontSize: fs(12) }]} numberOfLines={1}>
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
        <Text style={[styles.note, { fontSize: fs(13) }]}>ℹ️ {t('es', 'uiFallbackNote', { lang: current.native })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  family: { color: colors.textMuted, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  native: { fontWeight: '800', color: colors.text },
  label: { color: colors.textMuted, marginTop: 2 },
  note: { color: colors.text, backgroundColor: colors.highlight, padding: spacing.sm, borderRadius: radius.sm, lineHeight: 20 },
});
