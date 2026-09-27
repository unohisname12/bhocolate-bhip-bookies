import type { EngineState } from '../../types/engine';

/** Tokens are the only spendable money a student sees. Medals, arcade stars and play charges were
 * separate currencies; their values below keep old prices equivalent (a 5-medal prize = 25 tokens = a sofa). */
export const TOKENS_PER_MEDAL = 5;
export const TOKENS_PER_STAR = 2;
export const TOKENS_PER_CHARGE = 5;
// Coins were a scarce second shop money (2–5 per reward, cosmetics at 5–200).
export const TOKENS_PER_COIN = 10;

export const addTokens = (state: EngineState, amount: number): EngineState => amount === 0 ? state
  : { ...state, player: { ...state.player, currencies: { ...state.player.currencies, tokens: Math.max(0, state.player.currencies.tokens + amount) } } };

/** Idempotent: runs on every load and every server checkpoint, so a save or a tab still holding the
 * retired currencies converts once, and a stale tab re-sending them cannot mint or lose value. */
export function consolidateWallet(state: EngineState): EngineState {
  const medals = Math.max(0, state.prizes?.medals ?? 0), stars = Math.max(0, state.arcade?.stars ?? 0), charges = Math.max(0, state.arcade?.charges ?? 0), coins = Math.max(0, state.player.currencies.coins ?? 0);
  if (!medals && !stars && !charges && !coins) return state;
  const paid = addTokens(state, medals * TOKENS_PER_MEDAL + stars * TOKENS_PER_STAR + charges * TOKENS_PER_CHARGE + coins * TOKENS_PER_COIN);
  const next = { ...paid, player: { ...paid.player, currencies: { ...paid.player.currencies, coins: 0 } } };
  return { ...next, ...(state.prizes ? { prizes: { ...state.prizes, medals: 0 } } : {}), ...(state.arcade ? { arcade: { ...state.arcade, stars: 0, charges: 0 } } : {}) };
}
