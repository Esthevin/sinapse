import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ProgressBar, Text } from '@/components/ui';
import type { Story } from '@/content/types';
import { saveTranslation } from '@/services/books';
import { translateParagraphs, type TranslateLang } from '@/services/translate';
import { useAccount } from '@/state/AccountContext';
import { useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';

const NAMES: Record<TranslateLang, string> = { qu: 'quechua', ay: 'aimara' };

/** Para un libro del usuario: traducirlo al quechua y al aimara (necesita internet y Premium; el resultado es un borrador). */
export function TranslateBook({ story }: { story: Story }) {
  const { configured, profile, plan } = useAccount();
  const { booksChanged } = useApp();
  const { spacing, fontSize, colors, fs } = useTheme();
  const [busy, setBusy] = useState<TranslateLang | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const run = async (lang: TranslateLang) => {
    setError('');
    setBusy(lang);
    setProgress(0);
    try {
      const translated = await translateParagraphs(story.paragraphs.es, lang, setProgress);
      await saveTranslation(story.id, lang, translated);
      booksChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo traducir.');
    } finally {
      setBusy(null);
    }
  };

  const text = { color: colors.textMuted, fontSize: fs(fontSize.caption + 1), lineHeight: fs(20), marginTop: spacing.xs } as const;

  return (
    <Card style={{ marginTop: spacing.md }}>
      <Text style={{ fontWeight: '800', fontSize: fs(fontSize.body) }}>Quechua y aimara</Text>
      <Text style={text}>Traduce este libro para leerlo en otra lengua. Es una traducción automática (borrador): puede tener errores. Se envía el texto por internet solo cuando tú lo pides.</Text>
      {!configured || !profile || plan !== 'premium' ? (
        <>
          <Text style={text}>{!configured ? 'Las cuentas todavía no están activadas en esta versión.' : !profile ? 'Necesitas una cuenta con Premium.' : 'Traducir libros es parte del plan Premium.'}</Text>
          {configured && <Button label={!profile ? 'Ingresar o crear cuenta' : 'Ver Premium'} variant="secondary" onPress={() => router.push(!profile ? '/cuenta' : '/premium')} style={{ marginTop: spacing.sm }} />}
        </>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {(['qu', 'ay'] as const).map((lang) =>
            story.paragraphs[lang] ? (
              <Text key={lang} style={{ fontWeight: '700', color: colors.text }}>{`En ${NAMES[lang]}: listo (borrador). Elígelo con los botones de idioma de arriba.`}</Text>
            ) : (
              <Button key={lang} label={busy === lang ? `Traduciendo al ${NAMES[lang]}… ${Math.round(progress * 100)} %` : `Traducir al ${NAMES[lang]}`} variant="secondary" disabled={!!busy} onPress={() => run(lang)} />
            )
          )}
          {busy && <ProgressBar value={progress} />}
          {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
        </View>
      )}
    </Card>
  );
}
