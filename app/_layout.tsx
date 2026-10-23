import { setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@/i18n/translations';
import { AccountProvider } from '@/state/AccountContext';
import { AppProvider, useApp } from '@/state/AppContext';
import { DownloadsProvider } from '@/state/DownloadsContext';
import { useTheme } from '@/theme/theme';

/**
 * Red de seguridad: si una pantalla falla, se muestra un aviso con un botón para volver al inicio
 * en vez de una pantalla en blanco. Usa colores fijos porque el error pudo ocurrir en el tema.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const home = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign(Constants.expoConfig?.experiments?.baseUrl ?? '/');
    } else retry();
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F6F1E7' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#1D1A16', textAlign: 'center' }}>Algo salió mal</Text>
      <Text style={{ fontSize: 16, color: '#6A6256', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
        Tu avance está guardado. Toca el botón para volver a empezar.
      </Text>
      <Pressable onPress={retry} style={{ backgroundColor: '#7B2230', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 4, marginBottom: 12 }}>
        <Text style={{ color: '#FBF7EE', fontSize: 17, fontWeight: '800' }}>Reintentar</Text>
      </Pressable>
      <Pressable onPress={home} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
        <Text style={{ color: '#1D1A16', fontSize: 16, fontWeight: '700' }}>Ir al inicio</Text>
      </Pressable>
      {__DEV__ ? <Text style={{ marginTop: 16, fontSize: 12, color: '#A12D2D' }}>{String(error?.message)}</Text> : null}
    </View>
  );
}

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
      <Stack.Screen name="pdf" options={{ title: 'Audiolibro desde PDF' }} />
      <Stack.Screen name="cuenta" options={{ title: 'Mi cuenta' }} />
      <Stack.Screen name="premium" options={{ title: 'Premium' }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  // Narración y sonidos ambientales deben sonar juntos y también con el interruptor de silencio del iPhone.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', allowsRecording: false }).catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AccountProvider>
          <DownloadsProvider>
            <RootNavigator />
          </DownloadsProvider>
        </AccountProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
