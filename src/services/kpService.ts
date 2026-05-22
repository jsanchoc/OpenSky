import type { KpSnapshot } from '../types/weather';

type NoaaKpRow = { time_tag?: string; kp_index?: string | number };

export async function fetchLatestKp(): Promise<KpSnapshot | null> {
  try {
    const res = await fetch(
      'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as NoaaKpRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const last = rows[rows.length - 1];
    const raw = last.kp_index;
    const kp = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? 'NaN'));
    if (Number.isNaN(kp)) return null;
    return {
      kp,
      fetchedAt: last.time_tag ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
