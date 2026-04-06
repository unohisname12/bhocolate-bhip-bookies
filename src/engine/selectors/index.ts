import type { EngineState } from '../core/EngineTypes';
import type { Pet, Egg, PlayerProfile, PetState, PetNeeds } from '../../types';
import type { ScreenName } from '../../types/session';
import type { RoomId } from '../../types/room';

export const selectPet = (state: EngineState): Pet | null => state.pet;

export const selectEgg = (state: EngineState): Egg | null => state.egg;

export const selectPlayer = (state: EngineState): PlayerProfile => state.player;

export const selectTokens = (state: EngineState): number => state.player.currencies.tokens;

export const selectCoins = (state: EngineState): number => state.player.currencies.coins;

export const selectPetState = (state: EngineState): PetState | null => state.pet?.state ?? null;

export const selectScreen = (state: EngineState): ScreenName => state.screen;

export const selectIsTestMode = (state: EngineState): boolean => state.mode === 'test';

export const selectPetNeeds = (state: EngineState): PetNeeds | null => state.pet?.needs ?? null;

export const selectCanAfford = (state: EngineState, cost: number): boolean =>
  state.player.currencies.tokens >= cost;

export const selectPetName = (state: EngineState): string => state.pet?.name ?? '';

export const selectPetLevel = (state: EngineState): number =>
  state.pet?.progression?.level ?? 1;

export const selectPetXP = (state: EngineState): number =>
  state.pet?.progression?.xp ?? 0;

export const selectCurrentRoom = (state: EngineState): RoomId => state.currentRoom;

export const selectMP = (state: EngineState): number => state.player.currencies.mp;

export const selectMPLifetime = (state: EngineState): number => state.player.currencies.mpLifetime;
