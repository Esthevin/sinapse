import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Chip, Glyph, SectionTitle, Text } from '@/components/ui';
import { listSpanishVoices, voiceLabel } from '@/services/speech';
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
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  useEffect(() => {
    listSpanishVoices().then(setVoices);
  }, []);

  const tryVoice = (id: string | null) => {
    Speech.stop();
    Speech.speak('Había una vez, en lo alto de la puna, un zorro que soñaba con volar.', {
      language: 'es-PE',
      voice: id ?? undefined,
      rate: settings.speechRate,
    });
  };

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

      <SectionTitle>Voz para leer</SectionTitle>
      <Text style={styles.note}>
        Es la voz del teléfono: se usa en los audiolibros de PDF y en las historias que no tienen narrador. Si suena robótica, elige otra de la lista.
      </Text>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <Chip label="Automática" active={settings.voiceId === null} onPress={() => { updateSettings({ voiceId: null }); tryVoice(null); }} />
      </View>
      {voices.map((v, i) => {
        const on = settings.voiceId === v.identifier;
        return (
          <Pressable
            key={v.identifier}
            onPress={() => {
              updateSettings({ voiceId: v.identifier });
              tryVoice(v.identifier);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={styles.voiceRow}
          >
            <View style={[styles.radio, on && styles.radioOn]}>{on && <Glyph name="check" size={14} color={colors.onPrimary} />}</View>
            <Text style={styles.voiceName}>{voiceLabel(v, i)}</Text>
          </Pressable>
        );
      })}
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.note}>
          Para una voz más natural:{'\n'}
          {'\u2022'} Android: Ajustes, Idioma y entrada, Texto a voz, Google, Instalar datos de voz, Español (elige una voz «en línea» o de alta calidad).{'\n'}
          {'\u2022'} iPhone: Ajustes, Accesibilidad, Contenido hablado, Voces, Español, y descarga una voz «Mejorada» o «Premium».{'\n'}
          Las historias del catálogo ya traen una voz mejor (Camila o Alex) cuando el equipo las genera con el script de voces.
        </Text>
      </Card>

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
    note: { color: colors.textMuted, marginTop: spacing.xs, fontSize: fs(13), lineHeight: fs(20) },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    voiceName: { flex: 1, color: colors.text, fontSize: fs(fontSize.caption + 1) },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    preview: { color: colors.text, marginTop: spacing.md, fontStyle: 'italic', fontFamily: font.body, fontSize: fs(fontSize.body + 2) },
    about: { color: colors.text, lineHeight: fs(24), fontSize: fs(fontSize.body) },
    version: { color: colors.textMuted, marginTop: spacing.md, fontSize: fs(13) },
  });
