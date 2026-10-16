import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@/i18n/translations';
import { AppProvider, useApp } from '@/state/AppContext';
import { useTheme } from '@/theme/theme';

function RootNavigator() {
  const { ready, settings } = useApp();
  const th = useTheme();
  const { colors } = th;

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
    <StatusBar style={th.dark ? 'light' : 'dark'} />
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: th.font.heading, fontWeight: '800', fontSize: th.fs(th.fontSize.subtitle), color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="story/[id]" options={{ title: '' }} />
      <Stack.Screen name="quiz/[id]" options={{ title: t(settings.lang, 'quizTitle') }} />
      <Stack.Screen name="record/[id]" options={{ title: t(settings.lang, 'studioTitle') }} />
      <Stack.Screen name="sync/[id]" options={{ title: '' }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
