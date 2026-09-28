import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDLE_AFTER, SLEEP_AFTER, noteActivity, setLastActive, startPolling } from './polling';

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
  it('returning to a sleeping tab resumes normal polling beyond the first refresh', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500);
    flip('hidden'); await vi.advanceTimersByTimeAsync(8 * 3600_000); run.mockClear();
    flip('visible'); await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(5); stop();
  });
  it('an untouched visible tab slows to once a minute; a touch wakes it right away', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500);
    setLastActive(Date.now() - IDLE_AFTER - 1); await vi.advanceTimersByTimeAsync(0); run.mockClear();
    await vi.advanceTimersByTimeAsync(20 * 60_000); expect(run.mock.calls.length).toBeLessThanOrEqual(21); expect(run.mock.calls.length).toBeGreaterThanOrEqual(19);
    run.mockClear(); noteActivity(); await vi.advanceTimersByTimeAsync(0); expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000); expect(run.mock.calls.length).toBeGreaterThanOrEqual(4); stop();
  });
  it('a projector mid-match stays live even though nobody touches it', async () => {
    const run = vi.fn(); let live = true; const stop = startPolling(run, 1500, { awake: () => live });
    setLastActive(Date.now() - IDLE_AFTER - 1); await vi.advanceTimersByTimeAsync(0); run.mockClear();
    await vi.advanceTimersByTimeAsync(15_000); expect(run.mock.calls.length).toBeGreaterThanOrEqual(9);
    live = false; run.mockClear(); await vi.advanceTimersByTimeAsync(15_000); expect(run.mock.calls.length).toBeLessThanOrEqual(1); stop();
  });
  it('a tab forgotten overnight stops asking after 30 minutes, and one touch brings it back', async () => {
    const run = vi.fn(); const stop = startPolling(run, 2500); await vi.advanceTimersByTimeAsync(0);
    setLastActive(Date.now() - SLEEP_AFTER - 1); run.mockClear();
    await vi.advanceTimersByTimeAsync(8 * 3600_000); expect(run).not.toHaveBeenCalled();
    noteActivity(); await vi.advanceTimersByTimeAsync(0); expect(run).toHaveBeenCalledTimes(1); stop();
  });
  it('a live projector bypasses sleep only until its round deadline, and still sleeps when hidden', async () => {
    const run = vi.fn(); const deadline = Date.now() + 20_000;
    const stop = startPolling(run, 5000, { awake: () => Date.now() < deadline });
    setLastActive(Date.now() - SLEEP_AFTER - 1);
    await vi.advanceTimersByTimeAsync(10_000); expect(run).toHaveBeenCalledTimes(3);
    flip('hidden'); run.mockClear(); await vi.advanceTimersByTimeAsync(5000); expect(run).not.toHaveBeenCalled();
    flip('visible'); setLastActive(Date.now() - SLEEP_AFTER - 1);
    await vi.advanceTimersByTimeAsync(10_000); run.mockClear();
    await vi.advanceTimersByTimeAsync(3600_000); expect(run).not.toHaveBeenCalled(); stop();
  });
});
