import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_AFTER, noteActivity, setLastActive, startPolling } from './polling';

let visibility: DocumentVisibilityState = 'visible';
// No DOM in unit tests: a bare EventTarget stands in for document, the same way CloudSession's tests do it.
let doc: EventTarget & { visibilityState: DocumentVisibilityState };
beforeEach(() => { vi.useFakeTimers(); visibility = 'visible'; doc = Object.defineProperty(new EventTarget(), 'visibilityState', { get: () => visibility }) as typeof doc; vi.stubGlobal('document', doc); setLastActive(Date.now()); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const flip = (v: DocumentVisibilityState) => { visibility = v; doc.dispatchEvent(new Event('visibilitychange')); };

describe('shared polling rules', () => {
  it('polls at its own pace while someone is using the page', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500);
    await vi.advanceTimersByTimeAsync(10_000); expect(run).toHaveBeenCalledTimes(5); stop();
  });
  it('makes no requests at all while the tab is hidden, and refreshes the moment it comes back', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500); await vi.advanceTimersByTimeAsync(0); run.mockClear();
    flip('hidden'); await vi.advanceTimersByTimeAsync(8 * 3600_000); expect(run).not.toHaveBeenCalled();
    flip('visible'); await vi.advanceTimersByTimeAsync(0); expect(run).toHaveBeenCalledTimes(1); stop();
  });
  it('an untouched visible tab slows to once a minute; a touch wakes it right away', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500);
    setLastActive(Date.now() - IDLE_AFTER - 1); await vi.advanceTimersByTimeAsync(0); run.mockClear();
    await vi.advanceTimersByTimeAsync(3600_000); expect(run.mock.calls.length).toBeLessThanOrEqual(61); expect(run.mock.calls.length).toBeGreaterThanOrEqual(59);
    run.mockClear(); noteActivity(); await vi.advanceTimersByTimeAsync(0); expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000); expect(run.mock.calls.length).toBeGreaterThanOrEqual(4); stop();
  });
  it('a projector mid-match stays live even though nobody touches it', async () => {
    const run = vi.fn(); let live = true; const stop = startPolling(run, 1500, { awake: () => live });
    setLastActive(Date.now() - IDLE_AFTER - 1); await vi.advanceTimersByTimeAsync(0); run.mockClear();
    await vi.advanceTimersByTimeAsync(15_000); expect(run.mock.calls.length).toBeGreaterThanOrEqual(9);
    live = false; run.mockClear(); await vi.advanceTimersByTimeAsync(15_000); expect(run.mock.calls.length).toBeLessThanOrEqual(1); stop();
  });
  it('overnight, one forgotten tab goes from ~1,440 requests an hour to ~60', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500); setLastActive(Date.now() - IDLE_AFTER - 1);
    await vi.advanceTimersByTimeAsync(3600_000); expect(run.mock.calls.length).toBeLessThanOrEqual(62); stop();
  });
});
