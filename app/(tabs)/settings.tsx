import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import type { AgeGroup } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize, spacing } from '@/theme/theme';
import { confirmAction } from '@/utils/confirm';

const PROFILES: { id: AgeGroup; emoji: string }[] = [
  { id: 'ninos', emoji: '🧒' },
  { id: 'jovenes', emoji: '🧑' },
  { id: 'adultos', emoji: '🧓' },
];
const FONT_SCALES = [
  { value: 0.9, label: 'A-' },
  { value: 1, label: 'A' },
  { value: 1.2, label: 'A+' },
  { value: 1.4, label: 'A++' },
];
const SPEEDS = [0.75, 1, 1.25];

export default function SettingsScreen() {
  const { settings, updateSettings, resetProgress, refreshCatalog, fs } = useApp();
  const { lang } = settings;
  const [checking, setChecking] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState('');

  const reset = async () => {
    if (await confirmAction(t(lang, 'resetConfirm'), t(lang, 'confirm'), t(lang, 'cancel'))) resetProgress();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <SectionTitle>🌐 {t(lang, 'language')}</SectionTitle>
      <LanguagePicker value={lang} onChange={(code) => updateSettings({ lang: code })} />
      <Text style={[styles.note, { fontSize: fs(13) }]}>{t(lang, 'translationNote')}</Text>

      <SectionTitle>👂 {t(lang, 'whoListens')}</SectionTitle>
      <View style={styles.row}>
        {PROFILES.map((p) => (
          <Chip
            key={p.id}
            label={`${p.emoji} ${t(lang, p.id)}`}
            active={settings.profile === p.id}
            onPress={() => updateSettings({ profile: p.id })}
          />
        ))}
      </View>

      <SectionTitle>🔠 {t(lang, 'textSize')}</SectionTitle>
      <View style={styles.row}>
        {FONT_SCALES.map((f) => (
          <Chip key={f.value} label={f.label} active={settings.fontScale === f.value} onPress={() => updateSettings({ fontScale: f.value })} />
        ))}
      </View>
      <Text style={[styles.preview, { fontSize: fs(fontSize.body + 2) }]}>Había una vez, en lo alto de la puna…</Text>

      <SectionTitle>🐢 {t(lang, 'readingSpeed')}</SectionTitle>
      <View style={styles.row}>
        {SPEEDS.map((s) => (
          <Chip key={s} label={`${s}x`} active={settings.speechRate === s} onPress={() => updateSettings({ speechRate: s })} />
        ))}
      </View>

      <SectionTitle>💛 {t(lang, 'about')}</SectionTitle>
      <Card>
        <Text style={[styles.about, { fontSize: fs(fontSize.body) }]}>{t(lang, 'aboutText')}</Text>
        <Text style={[styles.version, { fontSize: fs(12) }]}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Card>

      <Button
        label={checking ? '…' : t(lang, 'updateStories')}
        icon="⬇️"
        variant="secondary"
        disabled={checking}
        onPress={async () => {
          setChecking(true);
          const n = await refreshCatalog();
          setChecking(false);
          setCatalogMsg(n === null ? t(lang, 'storiesOffline') : n > 0 ? t(lang, 'storiesUpdated', { n }) : t(lang, 'storiesUpToDate'));
        }}
        style={{ marginTop: spacing.xl }}
      />
      {catalogMsg ? <Text style={[styles.version, { fontSize: fs(13) }]}>{catalogMsg}</Text> : null}

      <Button label={t(lang, 'resetProgress')} icon="🗑️" variant="danger" onPress={reset} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { color: colors.text, marginTop: spacing.md, fontStyle: 'italic' },
  about: { color: colors.text, lineHeight: 24 },
  version: { color: colors.textMuted, marginTop: spacing.md },
});
