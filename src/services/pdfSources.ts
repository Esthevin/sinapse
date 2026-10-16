import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/** Texto de pdf.js y de su worker (assets/pdfjs, empaquetados con la app; no se descargan). */
async function readText(module: number): Promise<string> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  if (Platform.OS === 'web') return (await fetch(asset.uri)).text();
  return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
}

let cache: Promise<{ lib: string; worker: string }> | null = null;

export function loadPdfJs() {
  cache ??= Promise.all([
    readText(require('../../assets/pdfjs/pdf.min.txt')),
    readText(require('../../assets/pdfjs/pdf.worker.min.txt')),
  ]).then(([lib, worker]) => ({ lib, worker }));
  return cache;
}
