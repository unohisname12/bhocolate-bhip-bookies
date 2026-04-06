import { engineReducer } from '../state/engineReducer';
import { createInitialEngineState } from '../state/createInitialEngineState';
import type { EngineState } from './EngineTypes';
import type { GameEngineAction } from './ActionTypes';

export class GameEngine {
  private state: EngineState;
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

  dispatch(action: GameEngineAction): void {
    this.applyAction(action);
  }

  private applyAction(action: GameEngineAction): void {
    const prevState = this.state;
    const nextState = engineReducer(prevState, action);
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
