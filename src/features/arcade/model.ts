import { addTokens, consolidateWallet, TOKENS_PER_STAR } from '../../services/game/wallet';
import { arcadeDecision, supportsLearningRun, validPendingPlan, type PendingArcadePlan } from './learning';
import { recordLearning } from '../../services/game/learningEvidence';
import { checkAnswer } from '../../services/game/mathEngine';
import { arcadeStars, cafeTarget } from './catalog';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
export type ArcadeGame = 'dash' | 'guard' | 'cafe';
export type Tower = 'rapid' | 'frost' | 'shield';
export interface ArcadeRun {
  learningMode?: boolean; learningRunId?: string; learningSolved?: number; pendingPlan?: PendingArcadePlan; learningReceipt?: string;
  retryUsed?: boolean; towerLevels?: number[]; served?: number[];
  game: ArcadeGame; level: number; step: number; score: number; health: number;
  lane: number; seed: number; energy: number; towers: (Tower | null)[];
  enemies: { id: number; position: number; hp: number }[];
  stock: number[]; orders: number[]; tray: number[]; selected: number;
  done: boolean; message: string;
}
export interface ArcadeProgress {
  charges: number; practice: number; trials: ArcadeGame[]; stars: number;
  best: Record<ArcadeGame, number>; plays: Record<ArcadeGame, number>;
  owned: string[]; equipped: string | null; run: ArcadeRun | null;
}
export const freshArcade = (): ArcadeProgress => ({ charges: 0, practice: 0, trials: [], stars: 0, best: { dash: 0, guard: 0, cafe: 0 }, plays: { dash: 0, guard: 0, cafe: 0 }, owned: [], equipped: null, run: null });
export const practiceTarget = (grade: number) => grade >= 8 ? 2 : 3;
export const RECIPES = [ { name: 'Berry bowl', icon: '🍓', parts: [0, 0] }, { name: 'Forest toast', icon: '🍞', parts: [1, 0] }, { name: 'Honey tea', icon: '🍵', parts: [2, 2] }, { name: 'Honey toast', icon: '🥪', parts: [1, 2, 1] }, { name: 'Berry parfait', icon: '🍨', parts: [0, 2, 0] } ];
export const DECORATIONS = [{ id: 'flowers', name: 'Wildflower garden', icon: '🌸', cost: 8 }, { id: 'lanterns', name: 'Starlight lanterns', icon: '🏮', cost: 16 }, { id: 'rainbow', name: 'Rainbow celebration', icon: '🌈', cost: 24 }];
export function road(seed: number, step: number, level = 1) {
  // Mix each road section independently; a linear generator repeated lane patterns.
  let n = (seed ^ Math.imul(step + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad) >>> 0;
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97) >>> 0;
  n = (n ^ (n >>> 15)) >>> 0;
  const rock=n%3, secondRock=level===3 && step%4===3 ? (rock+1)%3 : -1;
  const coin=secondRock>=0?(rock+2)%3:(rock+1+Math.floor(n/7)%2)%3;
  return {rock, secondRock, coin};
}
export function startRun(game: ArcadeGame, level: number, seed: number): ArcadeRun {
  return { retryUsed: false, towerLevels: [1, 1, 1], served: [0, 0, 0], game, level, seed, step: 0, score: 0, health: game === 'guard' ? 12 : 5, lane: 1, energy: game === 'cafe' && level === 3 ? 4 : 12, towers: [null, null, null], enemies: [], stock: [8, 8, 8], orders: [seed % (level > 1 ? RECIPES.length : 3), (seed + 1) % (level > 1 ? RECIPES.length : 3), (seed + 2) % (level > 1 ? RECIPES.length : 3)], tray: [], selected: 0, done: false, message: 'Ready when you are.' };
}
export const canRetry = (r: ArcadeRun) => r.done && r.health === 0 && !r.retryUsed && (r.game === 'dash' ? r.step < 20 : r.game === 'guard' && r.step < 32);
export const buildCost = (r: ArcadeRun, slot: number, tower: Tower) => r.towers[slot] === tower ? 2 + (r.towerLevels?.[slot] ?? 1) * 2 : 4;
function finish(a: ArcadeProgress, r: ArcadeRun): ArcadeProgress {
  if (!r.done) return { ...a, run: r };
  const stars = arcadeStars(r.game, r.score);
  return { ...a, run: { ...r, message: `${r.message} +${stars * TOKENS_PER_STAR} tokens!` }, stars: a.stars + stars, best: { ...a.best, [r.game]: Math.max(a.best[r.game], r.score) }, plays: { ...a.plays, [r.game]: a.plays[r.game] + 1 } };
}
export function reduceArcade(s: EngineState, action: GameEngineAction): EngineState | null {
  if (!action.type.startsWith('ARCADE_')) return null;
  const a = s.arcade ?? freshArcade();
  // Stars are paid out as tokens the moment a round finishes; tokens are the only money students see.
  const put = (next: ArcadeProgress): EngineState => consolidateWallet({ ...s, arcade: next });
  if (action.type === 'ARCADE_START') {
    if (a.run && !a.run.done) return s;
    const integrated = action.learningMode === true && supportsLearningRun(action.game, s.learning);
    // Classroom game time decides how long students play; rounds no longer cost a separate charge.
    return put({ ...a, trials: a.trials.includes(action.game) ? a.trials : [...a.trials, action.game], run: {...startRun(action.game, Math.max(1, Math.min(3, action.level)), Math.floor(Math.random() * 100000)), learningMode:integrated, learningRunId:crypto.randomUUID(), learningSolved:0} });
  }
  if (action.type === 'ARCADE_BUY') {
    const item = DECORATIONS.find(d => d.id === action.id);
    if (!item) return s;
    if (a.owned.includes(item.id)) return put({ ...a, equipped: item.id });
    const price = item.cost * TOKENS_PER_STAR;
    if (s.player.currencies.tokens < price) return s;
    return consolidateWallet(addTokens({ ...s, arcade: { ...a, owned: [...a.owned, item.id], equipped: item.id } }, -price));
  }
  if (action.type === 'ARCADE_RETRY') {
    if (!a.run || !canRetry(a.run)) return s;
    return put({ ...a, run: { ...startRun(a.run.game, a.run.level, a.run.seed), retryUsed: true, learningMode:a.run.learningMode, learningRunId:crypto.randomUUID(), learningSolved:0 } });
  }
  if (action.type === 'ARCADE_CLOSE') return a.run?.done ? put({ ...a, run: null }) : s;
  const r = a.run;
  if (!r || r.done || s.screen !== 'arcade') return s;
  if (action.type === 'ARCADE_CANCEL_PLAN') return put({...a,run:{...r,pendingPlan:undefined}});
  if (action.type === 'ARCADE_DECIDE') {
    const pending=r.pendingPlan;
    if(!pending || !validPendingPlan(r))return s;
    const correct=checkAnswer(pending.problem, action.answer);
    const recorded=recordLearning(s,pending.problem,pending.problem.context ?? 'arcade',correct);
    if(!correct)return recorded;
    const base={...recorded,arcade:{...a,run:{...r,pendingPlan:undefined}}};
    let next: EngineState | null;
    if(pending.move.kind==='build-row') {
      next=base as EngineState;
      const slots=r.towers.map((t,i)=>t===null?i:-1).filter(i=>i>=0).slice(0,pending.problem.answer);
      for(const slot of slots)next=reduceArcade(next,{type:'ARCADE_BUILD',slot,tower:pending.move.tower})!;
    } else if(pending.move.kind==='recipe-batch') {
      const servings=pending.move.servings,stock=[...r.stock];
      for(const ingredient of RECIPES[r.orders[r.selected]].parts)stock[ingredient]-=servings;
      const step=r.step+servings,orders=[...r.orders],served=[...(r.served??[0,0,0])];
      orders[r.selected]=(r.seed+step+r.selected)%(step>=3?RECIPES.length:3);served[r.selected]+=servings;
      const variety=served.every(n=>n>0);if(variety)served.fill(0);
      next={...base,arcade:finish(base.arcade,{...base.arcade.run,stock,orders,served,tray:[],step,score:r.score+20*servings+(variety?10:0),done:step>=cafeTarget(r.level),message:`${servings} servings prepared from your batch. ${step>=cafeTarget(r.level)?'Shift complete!':'Your remaining stock is ready for the next order.'}`})};
    } else if(pending.move.kind==='batch') {
      next=base as EngineState;
      for(let slot=0;slot<3;slot++){
        next=reduceArcade(next,{type:'ARCADE_CAFE',kind:'select',value:slot})!;
        const parts: number[]=RECIPES[next.arcade!.run!.orders[slot]].parts;
        for(const value of parts)next=reduceArcade(next,{type:'ARCADE_CAFE',kind:'ingredient',value})!;
        next=reduceArcade(next,{type:'ARCADE_CAFE',kind:'serve',value:0})!;
      }
    } else next=reduceArcade(base,pending.move.kind==='serve'?{type:'ARCADE_CAFE',kind:'serve',value:0}:{type:'ARCADE_BUILD',slot:pending.move.slot,tower:pending.move.tower});
    if(!next?.arcade?.run)return s;
    return {...next,arcade:{...next.arcade,run:{...next.arcade.run,learningSolved:(r.learningSolved??0)+1,learningReceipt:`${pending.problem.explanation?.[0]} Your plan is now in the game.`}}};
  }
  if(r.pendingPlan && action.type!=='ARCADE_END')return s;
  if(action.type==='ARCADE_PLAN') {
    const pendingPlan=arcadeDecision(r,s.learning,action.move);
    return pendingPlan?put({...a,run:{...r,pendingPlan}}):s;
  }
  if (action.type === 'ARCADE_END') return put(finish(a, { ...r, done: true, message: 'Round complete. Your progress counts.' }));
  if (action.type === 'ARCADE_LANE' && r.game === 'dash') return put({ ...a, run: { ...r, lane: Math.max(0, Math.min(2, action.lane)) } });
  if (action.type === 'ARCADE_BUILD' && r.game === 'guard') {
    if (r.step % 16 !== 0 || r.enemies.length || !Number.isInteger(action.slot) || action.slot < 0 || action.slot > 2) return s;
    const cost = buildCost(r, action.slot, action.tower);
    const levels = [...(r.towerLevels ?? [1, 1, 1])];
    if (r.energy < cost || (r.towers[action.slot] === action.tower && levels[action.slot] >= 3)) return s;
    levels[action.slot] = r.towers[action.slot] === action.tower ? levels[action.slot] + 1 : 1;
    const towers = [...r.towers]; towers[action.slot] = action.tower;
    return put({ ...a, run: { ...r, towers, towerLevels: levels, energy: r.energy - cost, message: 'Defense ready! Select the same type to upgrade, or a different type to replace it.' } });
  }
  if (action.type === 'ARCADE_CAFE' && r.game === 'cafe') {
    if (action.kind === 'select') return action.value >= 0 && action.value < r.orders.length ? put({ ...a, run: { ...r, selected: action.value, tray: [] } }) : s;
    if (action.kind === 'clear') return put({ ...a, run: { ...r, tray: [] } });
    if (action.kind === 'ingredient') return action.value >= 0 && action.value < 3 && r.tray.length < RECIPES[r.orders[r.selected]].parts.length ? put({ ...a, run: { ...r, tray: [...r.tray, action.value] } }) : s;
    const recipe = RECIPES[r.orders[r.selected]];
    if (!recipe || recipe.parts.join() !== r.tray.join()) return put({ ...a, run: { ...r, tray: [], message: 'Check the recipe card and try again. No supplies lost.' } });
    const stock = [...r.stock];
    for (const p of recipe.parts) stock[p]--;
    if (stock.some(n => n < 0)) return put({ ...a, run: { ...r, tray: [], message: 'Restock that ingredient first.' } });
    const step = r.step + 1, orders = [...r.orders];
    const served = [...(r.served ?? [0, 0, 0])]; served[r.selected]++;
    const variety = served.every(count => count > 0);
    orders[r.selected] = (r.seed + step + r.selected) % (step >= 3 ? RECIPES.length : 3);
    const bonus = variety ? 10 : 0;
    if (variety) served.fill(0);
    return put(finish(a, { ...r, step, stock, orders, served, tray: [], score: r.score + 20 + bonus, done: step >= cafeTarget(r.level), message: step >= cafeTarget(r.level) ? `All ${cafeTarget(r.level)} orders served. Shift complete!` : variety ? 'Everyone served! +10 variety bonus. New specials are on the menu.' : step === 3 ? 'New specials unlocked! Try serving each customer for a bonus.' : 'Order served! Serve each customer for a variety bonus.' }));
  }
  if (action.type === 'ARCADE_RESTOCK' && r.game === 'cafe') {
    if (r.level===3 && r.energy===0) return put({ ...a, run: { ...r, message: 'No deliveries left. Use remaining stock or finish your shift to collect earned tokens.' } });
    const stock = [...r.stock]; if (action.ingredient < 0 || action.ingredient > 2) return s;
    stock[action.ingredient] += 4;
    return put({ ...a, run: { ...r, stock, energy: r.level===3 ? r.energy-1 : r.energy, score: Math.max(0, r.score - 5), message: 'Supplies delivered. Restocking costs 5 score, never math credit.' } });
  }
  if (action.type !== 'ARCADE_TICK') return s;
  if (r.game === 'dash') {
    const row = road(r.seed, r.step, r.level), hit = row.rock === r.lane || row.secondRock === r.lane;
    const health = r.health - (hit ? 1 : 0), step = r.step + 1;
    return put(finish(a, { ...r, step, health, score: r.score + (hit ? 0 : row.coin === r.lane ? 15 : 5), done: health <= 0 || step >= 60, message: health <= 0 ? 'Cart needs a rest. Try a different route next time!' : step >= 60 ? 'Finish line! Beautiful driving.' : hit ? 'Bump! Watch the next obstacle.' : row.coin === r.lane ? 'Star collected!' : 'Clear road.' }));
  }
  if (r.game === 'guard') {
    const wave = Math.floor(r.step / 16) + 1;
    let enemies = r.enemies.map(e => ({ ...e }));
    if (r.step % 16 < 6) enemies.push({ id: r.step, position: 0, hp: (2 + wave * 2 + r.level) * (r.level===3 && r.step%16===5 ? 3 : 1) });
    let kills = 0;
    r.towers.forEach((tower, i) => {
      const target = enemies.filter(e => e.hp > 0 && Math.abs(e.position - (i * 3 + 2)) <= 3).sort((x, y) => y.position - x.position)[0];
      if (!tower || !target) return;
      const level = r.towerLevels?.[i] ?? 1;
      target.hp -= (tower === 'rapid' ? (wave === 3 || wave === 5 ? 2 : 3) : tower === 'frost' ? (r.level===3 && target.id%16===5 ? 5 : 2) : 1) + level - 1;
      if (tower === 'frost') target.position = Math.max(0, target.position - (0.5 + level * 0.15));
      if (target.hp <= 0) kills++;
    });
    enemies = enemies.filter(e => e.hp > 0).map(e => ({ ...e, position: e.position + 0.8 + r.level * 0.1 }));
    const leaks = enemies.filter(e => e.position >= 11).length;
    const shield = r.towers.reduce((total, t, i) => total + (t === 'shield' ? r.towerLevels?.[i] ?? 1 : 0), 0);
    const health = Math.max(0, r.health - Math.max(0, leaks - (r.step % 2 === 0 ? shield : 0)));
    enemies = enemies.filter(e => e.position < 11);
    const step = r.step + 1;
    if (step % 16 === 0) { // Slowed survivors retreat; reaching the nest is the only way to damage it.
      enemies = []; }
    const done = health <= 0 || step >= 80;
    return put(finish(a, { ...r, step, enemies, health, energy: r.energy + kills + (step % 16 === 0 ? 4 : 0), score: r.score + kills * 10, done, message: health <= 0 ? 'The woodland bugs got through. Try a new defense!' : done ? 'Five waves defended!' : step % 16 === 0 ? 'Wave cleared. Build or replace defenses.' : `Wave ${wave}: hold the path!` }));
  }
  return s;
}
export function observeArcade(before: EngineState, next: EngineState, action: GameEngineAction): EngineState {
  if (!['SOLVE_MATH', 'RECORD_LEARNING_ATTEMPT', 'ANSWER_BRIDGE_QUESTION', 'ANSWER_DISCOVERY_MISSION', 'ANSWER_GROWTH_TRIAL'].includes(action.type) || next.player.lifetimeMathCorrect <= before.player.lifetimeMathCorrect) return next;
  const a = next.arcade ?? freshArcade();
  const target = practiceTarget(before.learning.grade), count = a.practice + 1;
  return { ...next, arcade: { ...a, practice: count >= target ? 0 : count } };
}

/** Reject broken imported arcade data before it can reach gameplay. */
export function validArcade(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const a = value as ArcadeProgress;
  const natural = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
  const games = ['dash', 'guard', 'cafe'];
  if (![a.charges, a.practice, a.stars].every(natural) || a.practice > 4
    || !Array.isArray(a.trials) || a.trials.some(g => !games.includes(g))
    || !a.best || !a.plays || games.some(g => !natural(a.best[g as ArcadeGame]) || !natural(a.plays[g as ArcadeGame]))
    || !Array.isArray(a.owned) || a.owned.some(id => !DECORATIONS.some(d => d.id === id))
    || (a.equipped !== null && !a.owned.includes(a.equipped))) return false;
  const r = a.run;
  if (r === null) return true;
  return !!r && games.includes(r.game) && [1, 2, 3].includes(r.level)
    && [r.step, r.score, r.health, r.lane, r.seed, r.energy, r.selected].every(natural)
    && (r.learningMode === undefined || typeof r.learningMode==='boolean')
    && (r.learningRunId === undefined || typeof r.learningRunId==='string' && r.learningRunId.length<100)
    && (r.learningSolved === undefined || natural(r.learningSolved))
    && (r.pendingPlan === undefined || !!r.pendingPlan && !!r.pendingPlan.problem && typeof r.pendingPlan.problem.id==='string' && Number.isFinite(r.pendingPlan.problem.answer) && ['serve','batch','build','recipe-batch','build-row'].includes(r.pendingPlan.move?.kind))
    && (r.retryUsed === undefined || typeof r.retryUsed === 'boolean')
    && (r.towerLevels === undefined || (Array.isArray(r.towerLevels) && r.towerLevels.length === 3 && r.towerLevels.every(n => [1, 2, 3].includes(n))))
    && (r.served === undefined || (Array.isArray(r.served) && r.served.length === 3 && r.served.every(natural)))
    && r.lane < 3 && r.selected < 3 && typeof r.done === 'boolean' && typeof r.message === 'string'
    && Array.isArray(r.towers) && r.towers.length === 3 && r.towers.every(t => t === null || ['rapid', 'frost', 'shield'].includes(t))
    && Array.isArray(r.enemies) && r.enemies.every(e => !!e && natural(e.id) && Number.isFinite(e.hp) && e.hp > 0 && Number.isFinite(e.position) && e.position >= 0)
    && Array.isArray(r.stock) && r.stock.length === 3 && r.stock.every(natural)
    && Array.isArray(r.orders) && r.orders.length === 3 && r.orders.every(n => natural(n) && n < RECIPES.length)
    && Array.isArray(r.tray) && r.tray.length <= 3 && r.tray.every(n => natural(n) && n < 3) && validPendingPlan(r);
}
