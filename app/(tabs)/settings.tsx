import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Chip, SectionTitle, Text } from '@/components/ui';
import type { AgeGroup } from '@/content/types';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useThemed, type Theme } from '@/theme/theme';
import { confirmAction } from '@/utils/confirm';

const PROFILES: AgeGroup[] = ['ninos', 'jovenes', 'adultos'];
const FONT_SCALES = [
  { value: 0.9, label: 'A-' },
  { value: 1, label: 'A' },
  { value: 1.2, label: 'A+' },
  { value: 1.4, label: 'A++' },
];
const SPEEDS = [0.75, 1, 1.25];

export default function SettingsScreen() {
  const { settings, updateSettings, resetProgress, refreshCatalog } = useApp();
  const { styles, colors, spacing } = useThemed(makeStyles);
  const { lang } = settings;
  const [checking, setChecking] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState('');

  const reset = async () => {
    if (await confirmAction(t(lang, 'resetConfirm'), t(lang, 'confirm'), t(lang, 'cancel'))) resetProgress();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <SectionTitle>{t(lang, 'whoListens')}</SectionTitle>
      <View style={styles.row}>
        {PROFILES.map((id) => (
          <Chip key={id} label={t(lang, id)} active={settings.profile === id} onPress={() => updateSettings({ profile: id })} />
        ))}
      </View>

      <SectionTitle>{t(lang, 'language')}</SectionTitle>
      <LanguagePicker value={lang} onChange={(code) => updateSettings({ lang: code })} />
      <Text style={styles.note}>{t(lang, 'translationNote')}</Text>

      <SectionTitle>{t(lang, 'textSize')}</SectionTitle>
      <View style={styles.row}>
        {FONT_SCALES.map((f) => (
          <Chip key={f.value} label={f.label} active={settings.fontScale === f.value} onPress={() => updateSettings({ fontScale: f.value })} />
        ))}
      </View>
      <Text style={styles.preview}>Había una vez, en lo alto de la puna…</Text>

      <SectionTitle>{t(lang, 'readingSpeed')}</SectionTitle>
      <View style={styles.row}>
        {SPEEDS.map((s) => (
          <Chip key={s} label={`${s}x`} active={settings.speechRate === s} onPress={() => updateSettings({ speechRate: s })} />
        ))}
      </View>

      <SectionTitle>{t(lang, 'about')}</SectionTitle>
      <Card>
        <Text style={styles.about}>{t(lang, 'aboutText')}</Text>
        <Text style={styles.version}>Versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Card>

      <Button
        label={checking ? '…' : t(lang, 'updateStories')}
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
      {catalogMsg ? <Text style={styles.version}>{catalogMsg}</Text> : null}

      <Button label={t(lang, 'resetProgress')} variant="danger" onPress={reset} style={{ marginTop: spacing.xl }} />

      <View style={[styles.row, { marginTop: spacing.xl }]}>
        <Chip
          label={settings.teamTools ? 'Herramientas del equipo: activadas' : 'Herramientas del equipo'}
          active={settings.teamTools}
          onPress={() => updateSettings({ teamTools: !settings.teamTools })}
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = ({ colors, spacing, fontSize, font, fs }: Theme) =>
  StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, width: '100%', maxWidth: 760, alignSelf: 'center' },
    note: { color: colors.textMuted, marginTop: spacing.xs, fontSize: fs(13) },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    preview: { color: colors.text, marginTop: spacing.md, fontStyle: 'italic', fontFamily: font.body, fontSize: fs(fontSize.body + 2) },
    about: { color: colors.text, lineHeight: fs(24), fontSize: fs(fontSize.body) },
    version: { color: colors.textMuted, marginTop: spacing.md, fontSize: fs(13) },
  });
