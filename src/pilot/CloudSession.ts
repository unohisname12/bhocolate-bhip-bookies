import type {ArenaCommand} from '../features/pet-arena/model';
import { upgradeDiscoveryActivities } from '../services/game/discoveryActivity';
import { startPolling } from './polling';
import type { ClassroomMetadata } from './metadata';
import type { EngineState } from '../types/engine';
import type { GameEngine } from '../engine/core/GameEngine';
import { computeChecksum, validateSave } from '../services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION } from '../services/persistence/saveMigrations';
import { pilotAPI, PilotError, downloadJSON, type CloudSave } from './api';

type Pending = { studentId: string; baseRevision: number; requestId: string; state: EngineState };
export interface SyncStatus { phase: 'saved' | 'saving' | 'offline' | 'conflict' | 'signin'; message: string; savedAt: number; canRetryValidation?: boolean }
export class CloudSession {
  readonly initial: EngineState;
  private metadataFlight: Promise<ClassroomMetadata> | null = null;
  private disposed = false;
  private revision: number;
  private latest: EngineState | null = null;
  private flight: Pending | null = null;
  private sending = false;
  private flushFlight: Promise<boolean> | null = null;
  private claiming = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  private engine?: GameEngine;
  private storageFailed = false;
  private status: SyncStatus;
  private readonly key: string;
  readonly save: CloudSave;
  constructor(save: CloudSave) {
    this.save = save;
    this.revision = save.revision; this.key = `auralith-pending-${save.studentId}`;
    this.status = { phase: 'saved', message: 'Saved online', savedAt: save.updatedAt };
    this.initial = save.state;
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const pending = JSON.parse(raw) as Pending;
        const valid = pending.studentId === save.studentId && pending.state?.player?.id === save.studentId && validateSave({ version: CURRENT_SAVE_VERSION, timestamp: Date.now(), state: pending.state, checksum: computeChecksum(pending.state) }).valid;
        if (valid && pending.state.eggDiscovery?.status === 'collecting' && pending.state.eggDiscovery.matchingVersion === undefined) pending.state = upgradeDiscoveryActivities(pending.state);
        if (!valid) { this.status = { ...this.status, phase: 'conflict', message: 'An unreadable device recovery copy was kept. Use the server copy or ask your teacher for help.' }; }
        else if (save.state.economy && pending.state.economy?.version !== save.state.economy.version) {
          this.latest = pending.state;
          this.status = { ...this.status, phase: 'conflict', message: 'Reward rules changed. Your old device copy is kept for recovery. Use the updated server copy to continue.' };
        } else if (pending.baseRevision === save.revision || pending.requestId === save.lastRequestId) {
          this.initial = pending.state; this.latest = pending.state;
          this.status = { ...this.status, phase: 'saving', message: 'Recovering this device’s unsent progress…' };
        } else {
          this.latest = pending.state;
          this.status = { ...this.status, phase: 'conflict', message: 'This device has unsent progress and the server has a newer save. Neither copy has been overwritten.' };
        }
      }
    } catch {
      this.storageFailed = true;
      this.status = { ...this.status, phase: 'conflict', message: 'This device’s recovery storage could not be read. Nothing has been overwritten. Ask your teacher to preserve the device copy before continuing.' };
    }

  }
  private applyMetadata(meta: ClassroomMetadata) {
    if (this.disposed) return;
    this.save.alias = meta.alias; this.save.assignment = meta.assignment;
    const current = this.engine?.getState();
    if (current && JSON.stringify(current.learning) !== JSON.stringify(meta.learning)) this.engine?.dispatch({ type: 'SET_LEARNING_SETTINGS', settings: meta.learning });
    if (current && current.player.displayName !== meta.alias) this.engine?.dispatch({ type: 'SYNC_CLASSROOM_ALIAS', alias: meta.alias });
    // The reducer ignores this unless a pet uses a typed name, and returns the same state when nothing changed.
    if (current && meta.petNames) this.engine?.dispatch({ type: 'SYNC_APPROVED_PET_NAMES', names: Object.fromEntries(meta.petNames.flatMap(r => r.approved ? [[r.pet_id, r.approved]] : [])) });
  }
  refreshLearning = async () => {
    this.metadataFlight ??= pilotAPI<ClassroomMetadata>('metadata');
    try { const meta = await this.metadataFlight; this.applyMetadata(meta); return meta.learning; }
    catch { return this.engine?.getState().learning ?? this.initial.learning; }
    finally { this.metadataFlight = null; }
  };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getStatus = () => this.status;
  private update(phase: SyncStatus['phase'], message: string, savedAt = this.status.savedAt, canRetryValidation = false) {
    this.status = { phase, message, savedAt, canRetryValidation }; for (const listener of this.listeners) listener();
  }
  private cache() {
    if (!this.latest) return;
    try {
      localStorage.setItem(this.key, JSON.stringify({ studentId: this.save.studentId, baseRevision: this.flight?.baseRevision ?? this.revision, requestId: this.flight?.requestId ?? '', state: this.latest } satisfies Pending));
      this.storageFailed = false;
    } catch { this.storageFailed = true; }
  }
  private queue(state: EngineState) {
    if (this.claiming) return;
    if (state.player.id !== this.save.studentId || state.devPreview || state.mode !== 'normal') return;
    if (['conflict', 'signin', 'offline'].includes(this.status.phase)) return;
    this.latest = state; this.cache();
    this.update('saving', this.storageFailed ? 'Device recovery storage is unavailable. Keep this tab open until Saved online.' : 'Saving your progress…');
    clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush(); }, 350);
  }
  flush = (): Promise<boolean> => {
    if (this.flushFlight) return this.flushFlight;
    this.flushFlight = this.flushPending().finally(() => { this.flushFlight = null; });
    return this.flushFlight;
  };
  private flushPending = async (): Promise<boolean> => {
    if (this.sending || ['conflict', 'signin'].includes(this.status.phase)) return false;
    if (!this.latest) return true;
    this.sending = true;
    this.flight ??= { studentId: this.save.studentId, baseRevision: this.revision, requestId: crypto.randomUUID(), state: this.latest };
    this.cache(); const flight = this.flight;
    try {
      const result = await pilotAPI<{ revision: number; updatedAt: number; metadata?: ClassroomMetadata }>('save', 'PUT', { revision: flight.baseRevision, requestId: flight.requestId, state: flight.state });
      this.revision = result.revision; this.flight = null;
      if (result.metadata) this.applyMetadata(result.metadata);
      if (this.latest === flight.state) {
        this.latest = null;
        try { localStorage.removeItem(this.key); } catch { /* Server acknowledgment is still valid. */ }
        this.update('saved', 'Saved online', result.updatedAt);
      } else { this.cache(); this.update('saving', 'Saving the next part…', result.updatedAt); }
      this.sending = false;
      return this.latest ? this.flushPending() : true;
    } catch (error) {
      this.sending = false;
      const message = error instanceof Error ? error.message : 'Connection interrupted.';
      if (error instanceof PilotError && [409, 413, 422].includes(error.status)) this.update('conflict', message, this.status.savedAt, error.status === 422 && error.code === 'invalid_save');
      else if (error instanceof PilotError && [401, 403].includes(error.status)) this.update('signin', message);
      else this.update('offline', `${message} Your last online save is safe. Keep this tab open and retry.${this.storageFailed ? ' Device recovery storage is also unavailable.' : ' Unsent progress is kept on this device.'}`);
      return false;
    }
  };
  retryValidationSave = async (): Promise<boolean> => {
    if (!this.status.canRetryValidation || this.sending) return false;
    // Keep the unsent state, revision and request receipt. The server still
    // validates everything; stale/foreign saves never gain a bypass.
    this.update('offline', 'Retrying your saved progress…');
    return this.flush();
  };
  claimClashPrize = async (roundId: string) => {
    if (this.engine && !await this.engine.prepareExternalActivity('collect your prize')) throw new Error('Your prize is kept for later.');
    this.claiming = true;
    this.engine?.pause();
    try {
      if (!await this.flush()) throw new Error('Wait for Saved online, then claim again.');
      if(roundId.startsWith('gift:'))await pilotAPI('clash/gift-claim','POST',{grantId:roundId.slice(5)});
      else await pilotAPI('clash/claim', 'POST', { roundId });
      window.location.reload();
    } catch (error) {
      this.claiming = false; this.engine?.resume(); throw error;
    }
  };
  arenaCommand = async(command:ArenaCommand):Promise<void> => {
    if(!this.engine||this.claiming)throw new Error('Wait for the current save to finish.');
    this.claiming=true;this.engine.pause();
    if(!await this.flush()){this.claiming=false;this.engine.resume();throw new Error('Wait for Saved online before changing your battle.');}
    const body={revision:this.revision,requestId:crypto.randomUUID(),command};
    try {
      // Retry the same receipt: a lost response cannot apply an item or turn twice.
      let result:CloudSave;
      try{result=await pilotAPI<CloudSave>('arena-command','POST',body);}catch(error){if(error instanceof PilotError)throw error;result=await pilotAPI<CloudSave>('arena-command','POST',body);}
      this.revision=result.revision;this.latest=null;this.flight=null;
      this.engine.dispatchDirect({type:'LOAD_LEARNER_PROFILE',state:{...result.state,screen:this.engine.getState().screen}});
      try{localStorage.removeItem(this.key);}catch{/* The server receipt is authoritative. */}
      this.update('saved','Saved online',result.updatedAt);
    }catch(error){if(!(error instanceof PilotError)||error.status===409&&error.code==='conflict')this.update('conflict','The battle service may have saved newer progress. Load the server copy before continuing.');throw error;}
    finally{this.claiming=false;this.engine.resume();}
  };
  recordPartyActivity = (game: 'dash' | 'guard' | 'cafe') => { this.engine?.dispatch({ type: 'COMPLETE_CLASSROOM_ACTIVITY', game }); };

  prepareLearningTarget = async (): Promise<string | null> => {
    if (!this.engine) return 'Your saved game is still opening.';
    return await this.engine.prepareExternalActivity('your learning target', 'learning') ? null : 'Your current activity is kept. Choose Home when you are ready to switch.';
  };
  prepareParty = async (): Promise<string | null> => {
    if (!this.engine) return 'Your saved game is still opening.';
    return await this.engine.prepareExternalActivity('your classroom activity') ? null : 'Your current activity is kept. Choose Home when you are ready to switch.';
  };
  openClashActivity = (screen: 'math' | 'catch_math') => {
    const state = this.engine?.getState();
    if (!state) return;
    this.engine?.dispatch({ type: 'SET_SCREEN', screen });
  };
  downloadRecovery = () => {
    const state = this.latest ?? this.initial;
    downloadJSON(`${this.save.alias.replaceAll(' ', '-')}-recovery.json`, { studentId: this.save.studentId, alias: this.save.alias, state, saveVersion: CURRENT_SAVE_VERSION, revision: this.revision, savedAt: Date.now() });
  };
  useServerCopy = () => {
    // Preserve the unsent copy for teacher-assisted recovery; never silently discard it.
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) localStorage.setItem(`${this.key}-recovery-${Date.now()}`, raw);
      localStorage.removeItem(this.key);
      window.location.reload();
    } catch { this.update('conflict', 'Could not preserve the recovery copy. Download it before reloading.'); }
  };
  canOpenGames = () => !!this.engine;
  openGames = () => { if(this.canOpenGames()) this.engine?.dispatch({type:'SET_SCREEN',screen:'play'}); };
  openAssignment = () => {
    if (!this.engine) return;
    const screen = this.save.assignment === 'bridge' ? 'woodland' : this.save.assignment === 'practice' ? 'math' : this.save.assignment === 'discovery' ? 'discovery' : this.save.assignment === 'care' && this.engine.getState().pet ? 'pet_care' : 'play';
    this.engine.dispatch({ type: 'SET_SCREEN', screen });
  };
  connect = (engine: GameEngine, page: EventTarget, visibility: EventTarget) => {
    this.disposed = false; this.engine = engine;
    engine.setLearningSync(this.refreshLearning);
    this.update(this.status.phase, this.status.message);
    void this.refreshLearning();
    // A backgrounded tab still counts against the worker's request budget, so
    // every poll below waits for the student to actually be looking.
    const watching = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const heartbeat = () => { if (watching()) void pilotAPI('presence','POST',{visible:true,activity:engine.getState().screen,phase:this.status.phase}).catch(()=>undefined); };
    heartbeat();
    // Shared polling rules: nothing while hidden, once a minute when nobody has touched the page for a while.
    const presencePoll = startPolling(heartbeat, 30000, { immediate: false });
    const metadataPoll = startPolling(() => this.refreshLearning(), 10000, { immediate: false });
    const ignore = new Set(['TICK', 'START_ENGINE', 'STOP_ENGINE', 'PAUSE_ENGINE', 'RESUME_ENGINE', 'NEXT_FRAME']);
    const off = engine.onAction((action, previous, next) => { if (next !== previous && !ignore.has(action.type)) this.queue(next); });
    const flush = () => { void this.flush(); };
    const beforeUnload = (event: Event) => { if (this.latest || this.sending) { event.preventDefault(); (event as BeforeUnloadEvent).returnValue = ''; } };
    const retry = setInterval(() => { if (this.status.phase === 'offline' || this.status.phase === 'saving') void this.flush(); }, 5000);
    const poll = startPolling(async () => {
      if (this.claiming || this.latest || this.sending || this.status.phase !== 'saved') return;
      try {
        const remote = await pilotAPI<CloudSave>('save');
        if (remote.revision !== this.revision && !this.latest && !this.sending) this.update('conflict', 'Your teacher or another device updated your game. Load the latest saved pet to continue.');
      } catch (error) { if (error instanceof PilotError && [401, 403].includes(error.status)) this.update('signin', error.message); }
    }, 15000, { immediate: false });
    // Coming back to the tab must feel instant, since the poll above slept.
    const resume = () => { flush(); if (watching()) { heartbeat(); void this.refreshLearning(); } };
    page.addEventListener('pagehide', flush); page.addEventListener('online', flush); page.addEventListener('beforeunload', beforeUnload);
    visibility.addEventListener('visibilitychange', resume);
    if (this.latest && this.status.phase === 'saving') void this.flush();
    return () => { this.disposed = true; engine.setLearningSync(null); metadataPoll(); presencePoll(); off(); clearInterval(retry); poll(); clearTimeout(this.timer); page.removeEventListener('pagehide', flush); page.removeEventListener('online', flush); page.removeEventListener('beforeunload', beforeUnload); visibility.removeEventListener('visibilitychange', resume); this.engine = undefined; };
  };
}
