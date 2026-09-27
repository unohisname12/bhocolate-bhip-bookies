import { engineReducer } from '../state/engineReducer';
import { createInitialEngineState } from '../state/createInitialEngineState';
import type { EngineState } from './EngineTypes';
import type { GameEngineAction } from './ActionTypes';
import { createScreenPreview, SCREEN_CATALOG } from '../../devtools/screenCatalog';
import { isCompanion } from '../../config/companionConfig';
import { miniLessonActive } from '../../features/mini-lesson/pause';

export class GameEngine {
  private state: EngineState;
  private learningSync: (() => Promise<unknown>) | null = null;
  private waitingForLearning = false;
  private pendingLearningAnswer: Promise<void> | null = null;
  async finishPendingAnswer() { await this.pendingLearningAnswer; }
  setLearningSync(sync: (() => Promise<unknown>) | null) { this.learningSync = sync; }

  private normalState: EngineState | null = null;
  private previewReturnState: EngineState | null = null;
  private intervalId: number | null;
  private isRunning: boolean;
  private tickIntervalMs: number;
  private actionLog: GameEngineAction[];
  private subscribers: Array<(state: EngineState) => void> = [];
  private actionSubscribers: Array<(action: GameEngineAction, prevState: EngineState, nextState: EngineState) => void> = [];

  constructor(initialState?: EngineState) {
    this.state = initialState ?? createInitialEngineState();
    this.intervalId = null;
    this.isRunning = false;
    this.tickIntervalMs = 1000;
    this.actionLog = [];
  }

  getState(): EngineState {
    return this.state;
  }

  start(defaultTickMs = 1000): void {
    if (this.isRunning) return;
    this.tickIntervalMs = defaultTickMs;
    this.isRunning = true;
    this.applyAction({ type: 'START_ENGINE' });
    if (!this.isRunning) return;
    this.intervalId = window.setInterval(() => {
      this.tick(this.tickIntervalMs);
    }, this.tickIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
    this.applyAction({ type: 'STOP_ENGINE' });
  }

  pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
    this.applyAction({ type: 'PAUSE_ENGINE' });
  }

  resume(defaultTickMs = 1000): void {
    if (this.isRunning) return;
    this.tickIntervalMs = defaultTickMs;
    this.isRunning = true;
    this.applyAction({ type: 'RESUME_ENGINE' });
    this.intervalId = window.setInterval(() => {
      this.tick(this.tickIntervalMs);
    }, this.tickIntervalMs);
  }

  setTickInterval(ms: number): void {
    this.tickIntervalMs = Math.max(1, ms);
    if (!this.isRunning) return;
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      this.tick(this.tickIntervalMs);
    }, this.tickIntervalMs);
  }

  getActionLog(): GameEngineAction[] {
    return [...this.actionLog];
  }

  onAction(listener: (action: GameEngineAction, prevState: EngineState, nextState: EngineState) => void): () => void {
    this.actionSubscribers.push(listener);
    return () => {
      this.actionSubscribers = this.actionSubscribers.filter((callback) => callback !== listener);
    };
  }

  tick(deltaMs: number): void {
    this.dispatch({ type: 'TICK', deltaMs });
  }

  private externalNavigation: ((label:string,purpose?:'play'|'learning')=>Promise<boolean>) | null = null;
  setExternalNavigationHandler(handler: ((label:string,purpose?:'play'|'learning')=>Promise<boolean>) | null) { this.externalNavigation = handler; }
  prepareExternalActivity(label:string,purpose:'play'|'learning'='play') { return this.externalNavigation?.(label,purpose) ?? Promise.resolve(true); }
  private navigationHandler: ((action: GameEngineAction) => boolean) | null = null;
  private learningGeneration = 0;
  setNavigationHandler(handler: ((action: GameEngineAction) => boolean) | null) { this.navigationHandler = handler; }
  cancelPendingNavigation() { this.learningGeneration++; this.waitingForLearning = false; }
  dispatch(action: GameEngineAction): void {
    if (this.navigationHandler?.(action)) return;
    this.dispatchDirect(action);
  }
  /** Execute an already accepted action without reentering the navigation prompt. */
  dispatchDirect(action: GameEngineAction): void {
    if (miniLessonActive() && (action.type === 'TICK' || action.type === 'ARCADE_TICK')) return;
    if (this.learningSync && ((action.type === 'SET_SCREEN' && ['math','catch_math','discovery','growth','woodland'].includes(action.screen)) || ['ANSWER_BRIDGE_QUESTION', 'ANSWER_DISCOVERY_MISSION', 'ANSWER_GROWTH_TRIAL', 'START_BATTLE', 'START_BATTLE_WITH_CHARACTER', 'START_BRIDGE_CHAPTER', 'START_DISCOVERY_MISSION', 'START_GROWTH_TRIAL', 'OPEN_WOODLAND'].includes(action.type))) {
      if (this.waitingForLearning) return;
      this.waitingForLearning = true;
      const sync = this.learningSync;
      const generation = ++this.learningGeneration;
      const task = sync().then(() => { if (this.learningSync === sync && generation === this.learningGeneration) this.applyAction(action); }).finally(() => { if (generation === this.learningGeneration) this.waitingForLearning = false; });
      if (action.type.startsWith('ANSWER_')) {
        this.pendingLearningAnswer = task.finally(() => { this.pendingLearningAnswer = null; });
      }
      return;
    }
    if (action.type === 'DEV_JUMP_SCREEN') {
      if (!Object.prototype.hasOwnProperty.call(SCREEN_CATALOG, action.payload)) return;
      const pet = this.state.pet;
      this.applyAction({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview(action.payload, this.state.learning, {
        species: pet && isCompanion(pet.speciesId) ? pet.speciesId : 'koala_sprite', stage: pet?.stage ?? 'baby', ready: true,
      }) });
      return;
    }
    this.applyAction(action);
  }

  private applyAction(action: GameEngineAction): void {
    const prevState = this.state;
    if (action.type === 'ENTER_TEST_MODE' && prevState.mode !== 'test') this.normalState = prevState;
    let nextState = action.type === 'EXIT_TEST_MODE' && this.normalState
      ? { ...this.normalState, initialized: prevState.initialized }
      : engineReducer(prevState, action);
    if (action.type === 'LOAD_LEARNER_PROFILE') {
      this.normalState = null;
      this.previewReturnState = null;
      nextState = { ...action.state, initialized: prevState.initialized, devPreview: false };
    }
    if (action.type === 'DEV_PREVIEW_STATE') {
      this.previewReturnState ??= this.normalState ?? prevState;
      this.normalState = null;
      nextState = { ...action.state, initialized: prevState.initialized, devPreview: true };
    }
    if (action.type === 'EXIT_DEV_PREVIEW' && this.previewReturnState) {
      nextState = { ...this.previewReturnState, initialized: prevState.initialized, devPreview: false };
      this.previewReturnState = null;
      this.normalState = null;
    } else if (this.previewReturnState) {
      nextState = { ...nextState, devPreview: true };
    }
    if (action.type === 'EXIT_TEST_MODE') this.normalState = null;
    this.state = nextState;

    this.actionLog.push(action);
    if (this.actionLog.length > 100) {
      this.actionLog.shift();
    }

    this.actionSubscribers.forEach((callback) => callback(action, prevState, nextState));
    this.notify();
  }

  subscribe(callback: (state: EngineState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((callback) => callback(this.state));
  }
}
