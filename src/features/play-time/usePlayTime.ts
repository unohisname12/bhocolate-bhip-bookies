import { useCallback, useEffect, useRef, useState } from 'react';
import { pilotAPI } from '../../pilot/api';
import type { GameEngine } from '../../engine/core/GameEngine';
import type { Attempt, PlayView } from './model';
import { newScanMemo, scanEvidence } from './evidence';
import { miniLessonActive } from '../mini-lesson/pause';

type StuckReport = { skillId: string; topic: string };

// Syncs are batched: only when a round completes, every two minutes of play, or when time runs out.
// Idle students check in every ten minutes so teacher toggles still arrive (Workers request budget).
const PLAY_SYNC = 120000, IDLE_SYNC = 600000;

export function usePlayTime(engine: GameEngine, playing: boolean) {
  const [view, setView] = useState<PlayView | null>(null), [playedLocal, setPlayedLocal] = useState(0), [pending, setPending] = useState(0);
  const stuck = useRef<StuckReport[]>([]), memo = useRef(newScanMemo()), floor = useRef(false);
  const attempts = useRef<Attempt[]>([]), played = useRef(0), inFlight = useRef(false), viewRef = useRef<PlayView | null>(null), lastSync = useRef(0);
  const accept = useCallback((next: PlayView) => { viewRef.current = next; setView(next); }, []);
  const sync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; lastSync.current = Date.now();
    const sentAttempts = attempts.current, sentPlayed = played.current, sentStuck = stuck.current, sentFloor = floor.current;
    attempts.current = []; played.current = 0; stuck.current = []; floor.current = false;
    try {
      accept(sentAttempts.length || sentPlayed || sentStuck.length || sentFloor
        ? await pilotAPI<PlayView>('play-time/sync', 'POST', { attempts: sentAttempts, playedMs: sentPlayed, stuck: sentStuck, floor: sentFloor })
        : await pilotAPI<PlayView>('play-time'));
      setPlayedLocal(played.current); setPending(attempts.current.length);
    } catch {
      // Keep unsent work for the next sync; a network blip must not erase earned questions.
      attempts.current = [...sentAttempts, ...attempts.current]; played.current += sentPlayed;
      stuck.current = [...sentStuck, ...stuck.current]; floor.current ||= sentFloor;
    } finally { inFlight.current = false; }
  }, [accept]);

  useEffect(() => engine.onAction((_a, prev, next) => {
    if (next.learningEvidence === prev.learningEvidence) return;
    const found = scanEvidence(prev.learningEvidence, next.learningEvidence, memo.current, !!viewRef.current?.floorAvailable, Date.now());
    attempts.current.push(...found.attempts); stuck.current.push(...found.stuck); floor.current ||= found.floor;
    setPending(attempts.current.length);
    const v = viewRef.current;
    if (found.floor || found.stuck.length || (v && v.progress + attempts.current.length >= v.questionsPerRound)) void sync();
  }), [engine, sync]);

  useEffect(() => {
    void sync();
    const onVisible = () => { if (document.hidden) { if (played.current || attempts.current.length) void sync(); } else void sync(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => {
      if (document.hidden) return;
      const since = Date.now() - lastSync.current;
      if (since >= IDLE_SYNC || (since >= PLAY_SYNC && (played.current || attempts.current.length))) void sync();
    }, 15000);
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(timer); };
  }, [sync]);

  useEffect(() => {
    if (!playing || !view?.enabled) return;
    const timer = setInterval(() => {
      const v = viewRef.current;
      if (document.hidden || miniLessonActive() || !v || v.mathOnly || v.balanceMs - played.current <= 0) return;
      played.current += 1000; setPlayedLocal(played.current);
      if (v.balanceMs - played.current <= 0) void sync();
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, view?.enabled, sync]);

  const balanceMs = view ? Math.max(0, view.balanceMs - playedLocal) : 0;
  // Unknown state (offline, first load) never blocks play; the server stays the source of truth.
  const blocked = !!view && view.enabled && (view.mathOnly || balanceMs <= 0);
  const progress = view ? Math.min(view.questionsPerRound - 1, view.progress + pending) : 0;
  return { view, balanceMs, blocked, progress, sync };
}
