import { expect, it } from 'vitest';
import { freshGame, studentCheckpoint, parseStored, packGame } from './game-state';
import { rewardMath } from '../src/services/game/economy';
import { generateLearningProblem } from '../src/services/game/curriculum';

it('rejects old browser wallets and missing paid-question receipts after the account migration', () => {
  const before = freshGame('learner', 'Learner');
  const oldClient = structuredClone(before); delete oldClient.economy;
  expect(() => studentCheckpoint(oldClient, before, 'learner', 'Learner')).toThrow(/Reward rules changed/);
  const paid = rewardMath(before, generateLearningProblem(before.learning), true, 'practice');
  const missing = structuredClone(paid); missing.economy!.receipts = {};
  expect(() => studentCheckpoint(missing, paid, 'learner', 'Learner')).toThrow(/reward history/);
  expect(studentCheckpoint(paid, paid, 'learner', 'Learner').player.currencies).toEqual(paid.player.currencies);
});

it('converts old stored stockpiles once and round-trips new receipts in the production validator', () => {
  const old = freshGame('learner', 'Learner'); delete old.economy;
  old.player.currencies.tokens = 1034;
  const upgraded = parseStored(JSON.stringify({ version: 17, state: old }));
  expect(upgraded.player.currencies.tokens).toBe(642);
  expect(parseStored(packGame(upgraded))).toEqual(upgraded);
  const paid = rewardMath(upgraded, generateLearningProblem(upgraded.learning), true, 'practice');
  expect(parseStored(packGame(paid))).toEqual(paid);
});

it('keeps a multi-year reward history within the bounded save request budget', () => {
  const state = freshGame('learner', 'Learner');
  for (let i = 0; i < 20000; i++) state.economy!.receipts[`learn_${1750000000000 + i}_abcdefghijk`] = 2;
  expect(new TextEncoder().encode(packGame(state)).length).toBeLessThan(2 * 1024 * 1024 - 4096);
  expect(parseStored(packGame(state)).economy!.receipts).toEqual(state.economy!.receipts);
});
