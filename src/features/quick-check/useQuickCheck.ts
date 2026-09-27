import { useCallback, useEffect, useRef, useState } from 'react';
import { pilotAPI, PilotError } from '../../pilot/api';
import type { CheckView } from './model';

export function useQuickCheck() {
  const activity = useRef<string | undefined>(undefined);
  // The game the learner was opening when the check interrupted; it launches once the check stops being due.
  const resume = useRef<(() => void) | null>(null);
  const [data, setData] = useState<CheckView | null>(null), [error, setError] = useState(''), [open, setOpenState] = useState(false);
  const setOpen = useCallback((next: boolean) => { if (!next) resume.current = null; setOpenState(next); }, []);
  const accept = useCallback((next: CheckView) => {
    setData(old => old && (old.revision > next.revision || old.revision === next.revision && old.serverNow > next.serverNow) ? old : next); setError('');
    if (!next.due && resume.current) { const go = resume.current; resume.current = null; setOpenState(false); setTimeout(go, 0); }
  }, []);
  const refresh = useCallback(async () => { const game = activity.current; const next = await pilotAPI<CheckView>(`quick-checks${game ? `?activity=${encodeURIComponent(game)}` : ''}`); if (game === activity.current) accept(next); return next; }, [accept]);
  /** Another tab or a lost response moved the revision on; re-read and retry once instead of asking for a reload. */
  const send = useCallback(async (operation: (revision: number, latest: CheckView | null) => Promise<CheckView> | CheckView, revision: number) => {
    try { return await operation(revision, null); }
    catch (e) { if (!(e instanceof PilotError && e.status === 409)) throw e; const latest = await refresh(); return operation(latest.revision, latest); }
  }, [refresh]);
  useEffect(() => {
    let active = true;
    const load = () => { if (document.hidden) return; const game = activity.current; void pilotAPI<CheckView>(`quick-checks${game ? `?activity=${encodeURIComponent(game)}` : ''}`).then(next => { if (active && game === activity.current) accept(next); }).catch(e => { if (active && game === activity.current) setError(e.message); }); };
    load(); const timer = setInterval(load, 60000); document.addEventListener('visibilitychange', load);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [accept]);
  const ensureReady = useCallback(async (game?: string, onReady?: () => void) => {
    activity.current = game;
    try { const latest = await refresh(); if (latest.due) { resume.current = onReady ?? null; setOpenState(true); return false; } return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your check.'); resume.current = onReady ?? null; setOpenState(true); return false; }
  }, [refresh]);
  return { data, error, open, setOpen, accept, refresh, send, ensureReady };
}
