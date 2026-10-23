import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_PDFS_PER_MONTH, type Plan } from '@/content/plan';

/** Cuántos PDF se convirtieron este mes (para el límite del plan Normal). Se guarda solo en el teléfono. */
const KEY = 'sinapse.pdfusage.v1';
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export async function pdfsUsedThisMonth(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as { month: string; count: number }) : null;
    return v && v.month === monthKey() ? v.count : 0;
  } catch {
    return 0;
  }
}

export async function registerPdf(): Promise<void> {
  const count = (await pdfsUsedThisMonth()) + 1;
  await AsyncStorage.setItem(KEY, JSON.stringify({ month: monthKey(), count })).catch(() => {});
}

/** ¿Puede convertir otro PDF con este plan? */
export async function canConvertPdf(plan: Plan): Promise<{ allowed: boolean; used: number; limit: number }> {
  const used = await pdfsUsedThisMonth();
  return { allowed: plan === 'premium' || used < FREE_PDFS_PER_MONTH, used, limit: FREE_PDFS_PER_MONTH };
}
