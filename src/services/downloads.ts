import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Descargas para escuchar sin internet (plan Premium). Solo las narraciones que viven en internet; las que
 * vienen dentro de la app ya funcionan sin conexión. Se guardan en el almacenamiento de la app y se pueden borrar.
 */
export interface DownloadItem {
  url: string;
  file: string;
  bytes: number;
  title: string;
  at: number;
}

const INDEX_KEY = 'sinapse.downloads.v1';
const dir = () => `${FileSystem.documentDirectory ?? ''}descargas/`;

/** La web no puede guardar archivos grandes: la descarga es solo para la app del teléfono. */
export const downloadsSupported = Platform.OS !== 'web' && !!FileSystem.documentDirectory;

export async function loadDownloads(): Promise<Record<string, DownloadItem>> {
  if (!downloadsSupported) return {};
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const index: Record<string, DownloadItem> = raw ? JSON.parse(raw) : {};
    // Solo lo que sigue existiendo en el teléfono.
    const alive: Record<string, DownloadItem> = {};
    for (const [url, item] of Object.entries(index)) {
      const info = await FileSystem.getInfoAsync(item.file).catch(() => null);
      if (info?.exists) alive[url] = item;
    }
    return alive;
  } catch {
    return {};
  }
}

const save = (index: Record<string, DownloadItem>) => AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index)).catch(() => {});

const fileName = (url: string) => `${Math.abs([...url].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)).toString(36)}.mp3`;

export async function downloadAudio(url: string, title: string, onProgress: (fraction: number) => void, index: Record<string, DownloadItem>): Promise<Record<string, DownloadItem>> {
  await FileSystem.makeDirectoryAsync(dir(), { intermediates: true }).catch(() => {});
  const file = `${dir()}${fileName(url)}`;
  const task = FileSystem.createDownloadResumable(url, file, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const res = await task.downloadAsync();
  if (!res || res.status < 200 || res.status >= 300) {
    await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    throw new Error('No se pudo descargar el audio.');
  }
  const info = await FileSystem.getInfoAsync(file);
  const next = { ...index, [url]: { url, file, bytes: info.exists ? info.size : 0, title, at: Date.now() } };
  await save(next);
  return next;
}

export async function removeDownload(url: string, index: Record<string, DownloadItem>): Promise<Record<string, DownloadItem>> {
  const item = index[url];
  if (item) await FileSystem.deleteAsync(item.file, { idempotent: true }).catch(() => {});
  const { [url]: _gone, ...rest } = index;
  await save(rest);
  return rest;
}
