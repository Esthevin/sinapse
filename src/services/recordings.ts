import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { LanguageCode } from '@/i18n/translations';

/** Las grabaciones viven en el almacenamiento privado de la app. */
const DIR = `${FileSystem.documentDirectory}grabaciones/`;

/** Copia la grabación temporal a una ubicación permanente y devuelve su URI. */
export async function persistRecording(tempUri: string, storyId: string, lang: LanguageCode): Promise<string> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  const ext = tempUri.split('.').pop()?.split('?')[0] || 'm4a';
  const dest = `${DIR}${storyId}-${lang}-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function deleteRecordingFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/**
 * Abre el menú de compartir del teléfono (WhatsApp, Drive, correo…) para que
 * el narrador envíe su grabación al equipo de producción.
 */
export async function shareRecording(uri: string, title: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'audio/mp4', dialogTitle: title });
  return true;
}
