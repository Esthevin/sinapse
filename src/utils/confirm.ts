import { Alert, Platform } from 'react-native';

/** Diálogo de confirmación que funciona en el teléfono y en la web. */
export function confirmAction(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { confirm?: (m: string) => boolean };
    return Promise.resolve(g.confirm ? g.confirm(message) : true);
  }
  return new Promise((resolve) =>
    Alert.alert(
      'Sinapse',
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  );
}
