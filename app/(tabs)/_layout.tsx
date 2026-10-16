import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/i18n/translations';
import { useApp } from '@/state/AppContext';
import { colors, fontSize } from '@/theme/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  // lineHeight fijo: el emoji no debe exceder la caja de 24 px del ícono, o aplasta la etiqueta.
  return <Text style={{ fontSize: 20, lineHeight: 24, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { settings } = useApp();
  const insets = useSafeAreaInsets();
  const { lang } = settings;

  if (!settings.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: fontSize.subtitle },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
        // Más alta que la barra por defecto (49 px) para dedos y etiquetas grandes,
        // sumando el área segura inferior del teléfono.
        tabBarStyle: { height: 70 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sinapse',
          tabBarLabel: t(lang, 'tabLibrary'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t(lang, 'progressTitle'),
          tabBarLabel: t(lang, 'tabProgress'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: t(lang, 'studioTitle'),
          tabBarLabel: t(lang, 'tabStudio'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎙️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t(lang, 'settingsTitle'),
          tabBarLabel: t(lang, 'tabSettings'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
