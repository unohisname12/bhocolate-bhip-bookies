import { useCallback, useEffect, useRef, useState } from 'react';
import { startPolling } from '../../pilot/polling';
import { pilotAPI } from '../../pilot/api';
import type { DeliveryData } from './model';
export function useDeliveryCloud(enabled: boolean) {
  const [data, setData] = useState<(DeliveryData & { receivedAt: number }) | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false), generation = useRef(0), alive = useRef(true);
  const pending = useRef<{ op: string; body: Record<string, unknown>; requestId: string } | null>(null);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try { const next = await pilotAPI<DeliveryData>('delivery'); if (alive.current && ticket === generation.current) { setData(previous=>({ ...next, rooms:next.rooms.map(room=>{const old=previous?.rooms.find(r=>r.id===room.id);return old?.revision===room.revision?old:room;}), receivedAt: Date.now() })); setError(''); } }
    catch (e) { if (alive.current && ticket === generation.current) setError(e instanceof Error ? e.message : 'City connection interrupted.'); }
  }, []);
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    const stop = startPolling(async () => { if (!lock.current) await refresh(); }, 2500);
    return () => { alive.current = false; stop(); };
  }, [enabled, refresh]);
  const act = async (op: string, body: Record<string, unknown>) => {
    if (lock.current) return null;
    lock.current = true; generation.current++; setBusy(true); setError('');
    // Retry a lost response with the same receipt; do not silently draw another reward.
    if (!pending.current || pending.current.op !== op || JSON.stringify(pending.current.body) !== JSON.stringify(body)) pending.current = { op, body, requestId: crypto.randomUUID() };
    try { const result = await pilotAPI<{ id: string }>(`delivery/${op}`, 'POST', { ...body, requestId: pending.current.requestId }); pending.current = null; await refresh(); return result.id; }
    catch (e) { setError(e instanceof Error ? e.message : 'The move did not connect. Retry the same action.'); return null; }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return { data, error, busy, refresh, act };
}
