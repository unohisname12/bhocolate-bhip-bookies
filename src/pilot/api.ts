import { tabSession } from './tabSession';
import type { EngineState } from '../types/engine';
export interface CloudSave { studentId: string; alias: string; revision: number; assignment: string; state: EngineState; updatedAt: number; lastRequestId: string }
export class PilotError extends Error {
  status: number; code: string;
  constructor(message: string, status: number, code = '') { super(message); this.status = status; this.code = code; }
}
export async function pilotAPI<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/pilot/${path}`, { method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Pilot-Request': '1', ...(tabSession() ? { 'X-Pilot-Tab': tabSession() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new PilotError(data.error ?? 'The request could not be completed.', response.status, data.code);
  return data as T;
}
export function downloadJSON(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
