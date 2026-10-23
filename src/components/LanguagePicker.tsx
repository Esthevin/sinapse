import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { languageStatus, storiesIn, type LanguageStatus } from '@/content/languageStatus';
import { hasUiTranslation, LANGUAGES, t, type LanguageCode } from '@/i18n/translations';
import { useThemed, type Theme } from '@/theme/theme';

const GROUPS: { status: LanguageStatus; title: string; hint?: string }[] = [
  { status: 'contenido', title: 'Con historias para escuchar y leer' },
  { status: 'interfaz', title: 'Menús traducidos (historias en preparación)', hint: 'Las historias se escuchan en castellano mientras tanto.' },
  { status: 'pronto', title: 'En preparación', hint: 'Aún no hay audios ni menús en estas lenguas. Puedes elegirlas para ayudar a grabarlas.' },
];

/** Selector de lengua agrupado por familia (castellano, andinas, amazónicas). */
export function LanguagePicker({ value, onChange }: { value: LanguageCode; onChange: (code: LanguageCode) => void }) {
  const { styles, spacing } = useThemed(makeStyles);
  const current = LANGUAGES.find((l) => l.code === value);

  return (
    <View>
      {GROUPS.map((group) => {
        const items = LANGUAGES.filter((l) => languageStatus(l.code) === group.status);
        if (!items.length) return null;
        return (
        <View key={group.status} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.family}>{group.title}</Text>
          {group.hint && <Text style={styles.hint}>{group.hint}</Text>}
          <View style={styles.grid}>
            {items.map((l) => {
              const active = l.code === value;
              const n = group.status === 'contenido' ? storiesIn(l.code) : 0;
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
                  {n > 0 && <Text style={styles.count}>{n} {n === 1 ? 'historia' : 'historias'}</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
        );
      })}

      {current && !hasUiTranslation(current.code) && (
        <Text style={styles.note}>{t('es', 'uiFallbackNote', { lang: current.native })}</Text>
      )}
    </View>
  );
}

const makeStyles = ({ colors, spacing, radius, fontSize, stroke, fs }: Theme) =>
  StyleSheet.create({
    family: {
      color: colors.textMuted,
      fontWeight: '800',
      fontSize: fs(13),
      marginBottom: spacing.xs,
      marginTop: spacing.xs,
    },
    hint: { color: colors.textMuted, fontSize: fs(12), marginBottom: spacing.xs, lineHeight: 18 },
    count: { color: colors.accent, fontWeight: '800', marginTop: 2, fontSize: fs(12) },
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
