import type { ArcadeGame, ArcadeRun } from './model';
export const MODE_NAMES = ['Relaxed','Standard','Challenge'];
export const ARCADE_GAMES = [
  { id:'dash' as const, icon:'🏁', name:'Egg Dash', genre:'RACE • DODGE • COLLECT', detail:'Read the road, pick your route, and chase a personal best.',color:'mint',duration:'1–2 min',controls:'Arrow keys or tap a lane',modes:['One obstacle at a time. Slower pace.','Faster reactions, same readable road.','Double barriers every fourth section. Plan your lane early.'] },
  { id:'guard' as const, icon:'🏰', name:'Shellguard', genre:'BUILD • PLAN • DEFEND', detail:'Build a defense, counter armored waves, and upgrade between rounds.',color:'violet',duration:'2–4 min',controls:'Select a defense, then a build slot',modes:['More time to learn tower combinations.','Stronger enemies and faster movement.','Boss enemies every wave have triple health. Frost deals bonus boss damage.'] },
  { id:'cafe' as const, icon:'🍓', name:'Nest Café', genre:'PLAN • SERVE • MANAGE', detail:'Choose orders and manage ingredients. Serve all three customers for a combo bonus.',color:'peach',duration:'2–4 min',controls:'Choose order, add ingredients, serve',modes:['Nine orders. Unlimited restocks.','Twelve orders and the full recipe menu from the start.','Twelve orders. Four deliveries only: plan stock and recipes. No timer.'] },
];
export const cafeTarget=(level:number)=>level===1?9:12;
export const arcadeStars=(game:ArcadeGame,score:number)=>score===0?0:Math.max(1,Math.min(8,Math.floor(score/(game==='dash'?60:20))+1));
export const rewardExplanation=(game:ArcadeGame)=>`Earn 2 tokens for scoring, plus 2 per ${game==='dash'?60:20} score, up to 16 tokens per round. Zero score earns 0.`;
export const currentReward=(run:ArcadeRun)=>arcadeStars(run.game,run.score);
