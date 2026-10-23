import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setDownloaded } from '@/content/narration';
import { downloadAudio, downloadsSupported, loadDownloads, removeDownload, type DownloadItem } from '@/services/downloads';

interface DownloadsValue {
  supported: boolean;
  items: DownloadItem[];
  /** Avance (0–1) de lo que se está descargando, por dirección. */
  progress: Record<string, number>;
  totalBytes: number;
  download: (url: string, title: string) => Promise<boolean>;
  remove: (url: string) => Promise<void>;
}

const DownloadsContext = createContext<DownloadsValue | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<Record<string, DownloadItem>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDownloads().then(setIndex);
  }, []);

  // La resolución de la narración (src/content/narration.ts) usa el archivo local cuando existe.
  useEffect(() => {
    setDownloaded(Object.fromEntries(Object.values(index).map((d) => [d.url, d.file])));
  }, [index]);

  const download = useCallback(
    async (url: string, title: string) => {
      setProgress((p) => ({ ...p, [url]: 0 }));
      try {
        const next = await downloadAudio(url, title, (f) => setProgress((p) => ({ ...p, [url]: f })), index);
        setIndex(next);
        return true;
      } catch {
        return false;
      } finally {
        setProgress(({ [url]: _done, ...rest }) => rest);
      }
    },
    [index]
  );

  const remove = useCallback(
    async (url: string) => {
      setIndex(await removeDownload(url, index));
    },
    [index]
  );

  const value = useMemo<DownloadsValue>(() => {
    const items = Object.values(index).sort((a, b) => b.at - a.at);
    return { supported: downloadsSupported, items, progress, totalBytes: items.reduce((n, d) => n + d.bytes, 0), download, remove };
  }, [index, progress, download, remove]);

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsValue {
  const v = useContext(DownloadsContext);
  if (!v) throw new Error('useDownloads fuera de DownloadsProvider');
  return v;
}
