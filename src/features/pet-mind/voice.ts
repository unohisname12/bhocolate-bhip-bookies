import type { Pet } from '../../types/pet';
import { createMind } from './memory';
import { FOOD_ITEMS } from '../../config/gameConfig';
import { effectiveTraits, dayKey, kidModel, petMood, TREASURES, type Episode, type LearnerFacts, type PetLife, type TreasureId } from './life';

/**
 * The pet's voice. Only fixed, reviewed line templates with slots filled from its own memory,
 * so every sentence a child sees is predictable and school-safe.
 *
 * Tone rules (enforced by tests): never guilt ("I was lonely", "you forgot me"), never recall a
 * wrong answer as a failure, and losses are framed as "we'll try again together".
 */
export type TogetherKind = 'cuddle' | 'dance' | 'fetch' | 'talk';
/** `ask` makes the line an invitation the learner can accept with one tap. */
export interface PetLine { key: string; text: string; animation: string; score: number; reason: string; ask?: TogetherKind }
interface Ctx { pet: Pet; life: PetLife; kid: ReturnType<typeof kidModel>; learner: LearnerFacts; now: number; hour: number; today: string }
type Candidate = Omit<PetLine, 'text'> & { lines: string[]; cooldownDays: number };

const DAY = 86400000;
// Anything but a big moment waits this long after the last memory line, so callbacks feel special.
export const CHATTER_GAP_MS = 90000;
const PLURALS: Record<string, string> = { apple: 'apples', carrot: 'carrots', berry: 'berries', golden_apple: 'golden apples' };
const plural = (id?: string) => PLURALS[id ?? ''] ?? food(id);
const food = (id?: string) => (FOOD_ITEMS.find(f => f.id === id)?.label ?? id ?? 'snack').toLowerCase();
const CARE: Record<string, string> = { play: 'Playing together', fetch: 'Fetch', dance: 'Dancing with you', comfort: 'Cuddle time', pet: 'Getting pets', cuddle: 'Cuddle time', brush: 'Brushing time', wash: 'Bath time', clean: 'Getting cleaned up', train: 'Training together', chat: 'Our chats' };
const ageOf = (e: Episode, now: number) => now - e.at;
const hourWord = (h: number) => h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';

/** Specific callbacks win most days; generic lines fill in so it never feels scripted. */
const preferSpecific = (now: number, specific: string[], generic: string[]) => specific.length && Math.floor(now / DAY) % 3 !== 0 ? specific : [...specific, ...generic];

function candidates({ pet, life, kid, learner, now, hour, today }: Ctx): Candidate[] {
  const out: Candidate[] = [], add = (c: Candidate | false | undefined) => { if (c) out.push(c); };
  const latest = (kind: Episode['kind']) => life.episodes.find(e => e.kind === kind);
  const fresh = (e: Episode | undefined, ms: number) => e && ageOf(e, now) >= 0 && ageOf(e, now) < ms ? e : undefined;

  const reunion = fresh(latest('reunion'), 6 * 3600000);
  // Greetings lean on something specific from last time, so a returning visit never sounds canned.
  const lastTogether = life.episodes.find(e => (e.kind === 'care' || e.kind === 'together') && reunion && e.at < reunion.at);
  const gap = reunion ? Number(reunion.subject) : 0, fav = kid.favoriteFood && food(kid.favoriteFood);
  add(reunion && { key: `reunion:${reunion.id}`, animation: 'happy', score: 190, cooldownDays: 0, reason: `First visit after ${gap} days apart.`,
    lines: preferSpecific(now, [
      ...(lastTogether && CARE[lastTogether.subject ?? ''] ? [`You’re back! Last time: ${CARE[lastTogether.subject!].toLowerCase()}. Can we do that again?`] : []),
      ...(fav ? [`There you are! I was just dreaming about ${fav}.`] : []),
    ], [
      gap === 2 ? 'Two whole days! I have SO much to tell you.' : `You’re back! ${gap} days — I kept everything cozy for you.`,
      `${gap} days! Come here, I’ve been practicing my happy dance.`,
      'Yay, you’re here! Let’s make today a good one.',
    ]) });
  const label = (e: Episode) => e.kind === 'fed' ? `some ${plural(e.subject)}` : e.kind === 'care' ? CARE[e.subject ?? '']?.toLowerCase() : e.kind === 'math' ? `${e.subject} practice` : e.kind === 'battle_won' ? 'a big win' : undefined;
  const tallyOf = (e: Episode) => e.kind === 'fed' ? life.tallies[`food:${e.subject}`] : e.kind === 'care' ? life.tallies[`care:${e.subject}`] : e.kind === 'math' ? life.tallies[`math:${e.subject}`] : 0;
  const yesterdays = life.episodes.filter(e => dayKey(e.at) === dayKey(now - DAY) && label(e));
  // Only something rare for this learner is news; their everyday routine is not worth recapping.
  const novel = Array.from(new Set(yesterdays.filter(e => e.first || (tallyOf(e) ?? 0) <= 3 || e.kind === 'battle_won').map(e => label(e)!)));
  const all = Array.from(new Set(yesterdays.map(e => label(e)!)));
  const moments = [...novel, ...all.filter(m => !novel.includes(m))].slice(0, 3);
  const listed = moments.length > 1 ? `${moments.slice(0, -1).join(', ')} and ${moments.at(-1)}` : moments[0];
  add(novel.length >= 1 && moments.length >= 2 && { key: 'recap', animation: 'happy', score: 80, cooldownDays: 2, reason: `Yesterday had something new: ${novel.join(', ')}.`,
    lines: [`Yesterday we had ${listed}. Can today top that?`, `I keep thinking about yesterday — ${listed}!`] });
  const streak = fresh(latest('streak'), DAY);
  add(streak && { key: `streak:${streak.id}`, animation: 'happy', score: 170, cooldownDays: 0, reason: `A ${streak.subject}-day visit streak.`,
    lines: [`${streak.subject} days in a row together! We’re unstoppable.`, `Day ${streak.subject} in a row! Best streak buddies.`] });
  const hatchday = fresh(latest('hatchday'), DAY);
  add(hatchday && { key: `hatchday:${hatchday.id}`, animation: 'happy', score: 175, cooldownDays: 0, reason: `Hatch anniversary: ${hatchday.subject} days.`,
    lines: [`Guess what? I hatched ${hatchday.subject} days ago — and you were right there!`, `Happy hatch-day to me! ${hatchday.subject} days of us.`] });
  const mastered = fresh(latest('mastered'), DAY);
  add(mastered && { key: `mastered:${mastered.subject}`, animation: 'happy', score: 160, cooldownDays: 30, reason: `Mastered ${mastered.subject} on two separate days.`,
    lines: [`You mastered ${mastered.subject}! I felt it all the way in my paws.`, `${mastered.subject}: mastered. I’m telling everyone.`] });
  const evolved = fresh(latest('evolved'), 2 * DAY);
  add(evolved && { key: `evolved:${evolved.id}`, animation: 'happy', score: 150, cooldownDays: 0, reason: 'Recently grew to a new stage.',
    lines: ['Look how big I got! Remember when I was tiny?', 'New stage, same best friend. Thanks for raising me.'] });

  const growth = kid.growthTopics[0];
  add(!!growth && { key: `growth:${growth}`, animation: 'happy', score: 110, cooldownDays: 14, reason: `${growth} was tricky before it was mastered.`,
    lines: [`Remember when ${growth} felt tricky? Look at you now.`, `${growth} used to be a puzzle. Now it’s easy for you!`] });

  const mathToday = life.episodes.filter(e => e.kind === 'math' && dayKey(e.at) === today).reduce((n, e) => n + e.count, 0);
  add(mathToday >= 5 && { key: `math-day:${today}`, animation: 'happy', score: 100, cooldownDays: 1, reason: `${mathToday} first-try answers today.`,
    lines: [`${mathToday} problems today! My brain feels bigger just watching.`, `You’re on a roll today. ${mathToday} solved!`] });

  const won = fresh(latest('battle_won'), 12 * 3600000), lost = fresh(latest('battle_lost'), 12 * 3600000);
  add(won && (!lost || won.at > lost.at) && { key: `won:${won.id}`, animation: 'happy', score: 95, cooldownDays: 0, reason: 'Won a battle recently.',
    lines: ['Did you see that last battle? We were amazing.', 'That win! I’m still bouncing.'] });
  add(lost && (!won || lost.at > won.at) && { key: `lost:${lost.id}`, animation: 'idle', score: 90, cooldownDays: 0, reason: 'Lost a battle recently; respond with encouragement.',
    lines: ['That last battle was tough. We’ll train and try again together.', 'Close one! Next time we’ve got this.'] });
  const rival = kid.rivals.find(r => r.wins + r.losses >= 2);
  add(rival && { key: `rival:${rival.name}`, animation: 'idle', score: 70, cooldownDays: 5, reason: `Faced ${rival.name} ${rival.wins + rival.losses} times.`,
    lines: [`${rival.name} again soon? We’re ${rival.wins}–${rival.losses}. I’ve been practicing.`, `I keep thinking about ${rival.name}. Rematch?`] });

  const fed = fresh(latest('fed'), 10 * 60000);
  const favFood = kid.favoriteFood, fedCount = favFood ? life.tallies[`food:${favFood}`] ?? 0 : 0;
  add(!!fed && !!favFood && fed.subject === favFood && fedCount >= 10 && { key: `food-count:${favFood}:${Math.floor(fedCount / 10)}`, animation: 'eating', score: 105, cooldownDays: 0, reason: `The ${fedCount}th ${food(favFood)}.`,
    lines: [`That’s ${food(favFood)} number ${fedCount}. I’m keeping count!`, `${fedCount} ${food(favFood)}s and I still love every one.`] });
  add(!!fed && !!favFood && fed.subject === favFood && { key: `food-fav:${favFood}`, animation: 'eating', score: 85, cooldownDays: 3, reason: `Most-fed food is ${food(favFood)}.`,
    lines: [`${food(favFood)[0].toUpperCase()}${food(favFood).slice(1)} again? You know me SO well.`, 'My favorite! You always remember.', `Mmm, ${food(favFood)}. You’re the best snack chooser.`, `How did you know I wanted ${food(favFood)}?`] });
  const firstFood = life.core.find(e => e.kind === 'fed' && e.first);
  add(firstFood && ageOf(firstFood, now) > 3 * DAY && { key: `first-food:${firstFood.subject}`, animation: 'happy', score: 60, cooldownDays: 21, reason: 'A core first-time memory.',
    lines: [`Remember my very first ${food(firstFood.subject)}? I still think about it.`] });
  const firstWin = life.core.find(e => e.kind === 'battle_won' && e.first);
  add(firstWin && ageOf(firstWin, now) > 3 * DAY && { key: 'first-win', animation: 'happy', score: 60, cooldownDays: 21, reason: 'A core first-time memory.',
    lines: ['I’ll never forget our very first win.'] });

  const interest = Object.entries(life.tallies).filter(([k,v]) => k.startsWith('preference:') && v >= 1).sort((a,b)=>b[1]-a[1])[0]?.[0].slice(11);
  const interests: Record<string,string> = { plants: 'You picked plants for our home. A leafy corner sounds lovely!', books: 'You picked books for our home. Shall we make a reading nook?', toys: 'You picked toys for our home. Let’s leave room to play!' };
  add(!!interest && !!interests[interest] && { key:`interest:${interest}`, animation:'happy', score:72, cooldownDays:3, reason:'A room interest the learner actually chose.', lines:[interests[interest]] });

  const careName = kid.favoriteCare ? CARE[kid.favoriteCare] : undefined;
  add(!!careName && { key: `care-fav:${kid.favoriteCare}`, animation: 'happy', score: 55, cooldownDays: 5, reason: `Most frequent care: ${kid.favoriteCare}.`,
    lines: [`${careName} is the best part of my day.`, `${careName} — we’ve done that together a few times!`, `${careName} with you > everything else.`] });
  if (kid.usualHour !== undefined) {
    const off = Math.abs(kid.usualHour - hour) >= 3;
    add(life.visit.lastDay === today && { key: off ? 'hour-surprise' : 'hour-usual', animation: 'happy', score: 45, cooldownDays: 6, reason: off ? 'Visit at an unusual time.' : 'Visit at the usual time.',
      lines: off ? ['Oh! A surprise visit at a new time!', 'You’re here early — I mean late — I mean YAY!'] : [`Right on time — ${hourWord(hour)} is our time.`, `Our ${hourWord(hour)} hangout! My favorite part of the day.`] });
  }
  add([10, 25, 50, 100, 200].includes(kid.days) && { key: `days:${kid.days}`, animation: 'happy', score: 120, cooldownDays: 0, reason: `${kid.days} days together.`,
    lines: [`That’s ${kid.days} days of us. Best ${kid.days} days ever.`] });
  const drifted = (Object.entries(life.drift) as [keyof PetLife['drift'], number][]).sort((a, b) => b[1] - a[1])[0];
  const traitLine: Record<string, string> = { playfulness: 'All our playing made me extra bouncy lately!', comfort: 'I’m so much cozier than I used to be. That’s because of you.', curiosity: 'I’ve been getting more curious about our world.', sociability: 'I love meeting new friends now. You taught me that.', quiet: 'I’ve learned to enjoy the calm moments with you.', nature: 'I’m growing fonder of leafy little corners.' };
  add(drifted && drifted[1] >= 0.1 && { key: `trait:${drifted[0]}`, animation: 'happy', score: 65, cooldownDays: 7, reason: `Personality grew toward ${drifted[0]}.`, lines: [traitLine[drifted[0]]] });
  const gift = fresh(latest('gift'), 6 * 3600000), treasure = gift && TREASURES[gift.subject as TreasureId];
  add(!!treasure && { key: `gift:${gift!.id}`, animation: 'happy', score: 140, cooldownDays: 0, reason: 'Found a keepsake for the shelf today.',
    lines: [`Look what I found: a ${treasure!.name} ${treasure!.icon}! I put it on our shelf.`, `A ${treasure!.name} ${treasure!.icon}! It reminded me of you, so I saved it.`] });

  const ASK: Record<string, TogetherKind> = { play: 'fetch', fetch: 'fetch', dance: 'dance', comfort: 'cuddle', pet: 'cuddle', cuddle: 'cuddle', brush: 'cuddle', chat: 'talk' };
  const ASK_TEXT: Record<TogetherKind, string[]> = {
    fetch: ['Fetch? Pleeease? You throw the best throws.', 'I found my ball! Want to play fetch?', 'Bet I can catch it in one try. Fetch?', 'My tail is wagging. That means fetch time!'],
    dance: ['I made up a new dance move. Wanna see? Dance with me!', 'Dance party? You pick the wiggle.', 'Music in my head. Dance with me?', 'Spin, hop, wiggle — your turn!'],
    cuddle: ['Cuddle break? Just a little one.', 'Come sit with me for a sec?', 'I saved you the cozy spot. Cuddle?', 'Hug o’clock?'],
    talk: ['Can we chat? I have a question for you.', 'Tell me about your day?', 'Guess what I was thinking about? Chat with me!', 'Got a minute to talk?'],
  };
  const want = kid.favoriteCare ? ASK[kid.favoriteCare] : undefined, mood = petMood(life, now);
  const asking = mood === 'cuddly' ? 'cuddle' : want;
  add(!!asking && { key: `ask:${asking}`, ask: asking, animation: 'happy', score: 100, cooldownDays: 2, reason: mood === 'cuddly' ? 'Cuddly after time apart.' : `Asks for the learner's most frequent care (${kid.favoriteCare}).`,
    lines: ASK_TEXT[asking!] });

  const due = (learner.skillReviews ?? []).filter(r => r.independentChecks >= 1 && r.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt)[0];
  add(!!due && { key: `review:${due.topic}`, animation: 'idle', score: 58, cooldownDays: 2, reason: `${due.topic} is due for spaced review.`,
    lines: [`${due.topic} wants a quick hello today. One practice problem later?`, `I bet you still remember ${due.topic}. A quick check would make it stick!`] });

  add(mood === 'sleepy' && { key: 'sleepy', animation: 'sleeping', score: 42, cooldownDays: 1, reason: 'Late in the day.',
    lines: ['Mmm… getting sleepy. Stay a little?', 'Big yawn. Today was a good one.'] });
  void pet;
  return out;
}

/** Pick one memory line to say now, or nothing. `random` in [0,1) picks between near-equal options. */
export function speak(pet: Pet, learner: LearnerFacts, now: number, random: number): PetLine | undefined {
  const life = pet.mind?.life;
  if (!life || pet.state === 'dead' || pet.state === 'sleeping') return undefined;
  const ctx: Ctx = { pet, life, kid: kidModel(learner, life), learner, now, hour: new Date(now).getHours(), today: dayKey(now) };
  const lastSaid = Math.max(0, ...life.said.map(s => s.at));
  const open = candidates(ctx).filter(c => {
    const said = life.said.find(s => s.key === c.key);
    if (said && (c.cooldownDays === 0 || now - said.at < c.cooldownDays * DAY)) return false;
    return c.score >= 150 || now - lastSaid >= CHATTER_GAP_MS;
  }).sort((a, b) => b.score - a.score);
  if (!open.length) return undefined;
  const near = open.filter(c => c.score >= open[0].score - 10), pick = near[Math.min(near.length - 1, Math.floor(random * near.length))];
  // Rotate by day as well as chance, so the same template reads differently from one visit to the next.
  const text = pick.lines[(Math.floor(now / DAY) + Math.floor(random * 97)) % pick.lines.length];
  return { key: pick.key, text, animation: pick.animation, score: pick.score, reason: pick.reason, ...(pick.ask ? { ask: pick.ask } : {}) };
}

/** The welcome uses saved experiences; a new pet expresses a temperament without inventing history. */
export function welcomeLine(pet: Pet, learner: LearnerFacts, now: number): PetLine {
  const basic = (key: string, text: string, animation = 'idle'): PetLine => ({ key, text, animation, score: 0, reason: 'Welcome based on current needs or personality.' });
  if (pet.state === 'dead') return basic('rest', `${pet.name} is resting.`, 'dead');
  if (pet.state === 'sleeping') return basic('sleep', 'A quiet little rest…', 'sleeping');
  if (pet.needs.health < 30) return basic('health', 'A gentle care break would feel good.', 'sick');
  if (pet.needs.hunger < 30) return basic('hunger', 'Hello! Shall we find a snack?', 'hungry');
  const remembered = speak(pet, learner, now, 0);
  if (remembered) return remembered;
  const mind = pet.mind ?? createMind(pet), traits = effectiveTraits(mind.traits, mind.life);
  const strongest = (Object.keys(traits) as (keyof typeof traits)[]).sort((a, b) => traits[b] - traits[a])[0];
  const lines = {
    curiosity: 'Hello! Ready to explore something together?', playfulness: 'You’re here! I’m ready for a little playtime.',
    sociability: 'Hello, friend! Come tell me about your day.', quiet: 'Hello! A cozy story sounds lovely today.',
    nature: 'Hello! Shall we check on our leafy friends?', comfort: 'You’re here! Let’s have a cozy moment together.',
  };
  return basic(`hello:${strongest}`, lines[strongest], strongest === 'playfulness' ? 'happy' : 'being_petted');
}
