import { router } from 'expo-router';
import { View } from 'react-native';
import type { Story } from '@/content/types';
import { Button, Card, Cover, Text } from '@/components/ui';
import { pickLocalized } from '@/i18n/translations';
import { useAccount } from '@/state/AccountContext';
import { useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';

/** Se muestra en lugar del reproductor cuando una historia es Premium y la cuenta tiene el plan Normal. */
export function PremiumGate({ story }: { story: Story }) {
  const { settings } = useApp();
  const { profile } = useAccount();
  const th = useTheme();
  const { spacing, fontSize, colors } = th;
  return (
    <View style={{ flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.background }}>
      <View style={{ marginTop: spacing.lg }}>
        <Cover story={story} size={200} title={pickLocalized(story.title, settings.lang)} />
      </View>
      <Text style={{ fontFamily: th.font.heading, fontWeight: '900', fontSize: th.fs(fontSize.title), textAlign: 'center', marginTop: spacing.lg }}>
        {pickLocalized(story.title, settings.lang)}
      </Text>
      <Card style={{ marginTop: spacing.lg, width: '100%', maxWidth: 520 }}>
        <Text style={{ fontWeight: '800', fontSize: th.fs(fontSize.subtitle) }}>Historia Premium</Text>
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm, lineHeight: th.fs(22) }}>
          Esta historia es exclusiva del plan Premium, que también incluye descargas para escuchar sin internet y PDF sin límite. El resto del catálogo es gratis.
        </Text>
        <Button label={profile ? 'Ver Premium' : 'Ingresar o crear cuenta'} onPress={() => router.push(profile ? '/premium' : '/cuenta')} style={{ marginTop: spacing.md }} />
        <Button label="Volver" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
      </Card>
    </View>
  );
}
