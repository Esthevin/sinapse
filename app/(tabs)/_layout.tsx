import { Redirect, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const { settings } = useApp();
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { colors } = th;
  const { lang } = settings;

  if (!settings.onboarded) return <Redirect href="/onboarding" />;

  // Solo etiquetas (sin íconos): la pestaña activa se marca con una barra del color de acción.
  const tabLabel = (text: string) =>
    function TabLabel({ focused }: { focused: boolean }) {
      return (
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <Text
            style={{
              fontSize: th.fs(th.id === 'ninos' ? 16 : 13),
              fontWeight: focused ? '900' : '600',
              color: focused ? colors.text : colors.textMuted,
              letterSpacing: th.uppercaseLabels ? 1 : 0,
            }}
          >
            {th.uppercaseLabels ? text.toUpperCase() : text}
          </Text>
          <View style={{ marginTop: 6, height: th.id === 'ninos' ? 5 : 3, width: 28, borderRadius: 3, backgroundColor: focused ? colors.accent : 'transparent' }} />
        </View>
      );
    };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, shadowOpacity: 0, elevation: 0, borderBottomWidth: th.stroke, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        headerTitleAlign: 'left',
        headerTitleStyle: { fontFamily: th.font.heading, fontWeight: '900', fontSize: th.fs(th.fontSize.subtitle + (th.id === 'ninos' ? 2 : 0)), color: colors.text },
        tabBarShowLabel: true,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: th.stroke,
          borderTopColor: colors.border,
          height: (th.id === 'ninos' ? 74 : 64) + insets.bottom,
          paddingBottom: insets.bottom,
          ...(Platform.OS === 'web' ? {} : { elevation: 0 }),
        },
        tabBarItemStyle: { justifyContent: 'center' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sinapse', tabBarLabel: tabLabel(t(lang, 'tabLibrary')) }} />
      <Tabs.Screen name="progress" options={{ title: t(lang, 'progressTitle'), tabBarLabel: tabLabel(t(lang, 'tabProgress')) }} />
      <Tabs.Screen name="studio" options={{ title: t(lang, 'studioTitle'), tabBarLabel: tabLabel(t(lang, 'tabStudio')) }} />
      <Tabs.Screen name="settings" options={{ title: t(lang, 'settingsTitle'), tabBarLabel: tabLabel(t(lang, 'tabSettings')) }} />
    </Tabs>
  );
}
