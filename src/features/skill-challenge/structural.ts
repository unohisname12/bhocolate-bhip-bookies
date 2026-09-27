import type { Challenge } from '../../services/game/curriculum';
import type { LearningProblem, Visual } from './lessons';

/** In-world consequence of a wrong answer: the game world, not the checker, shows why precision matters. */
export interface Stakes { unit: string; short: string; over: string }
export type World = 'cafe' | 'shellguard' | 'delivery';
export interface Form { form: string; world: World; build: (n: Numbers) => Omit<LearningProblem, 'templateId' | 'representation' | 'hints' | 'guided' | 'outcome'> & { visual?: Visual; stakes?: Stakes } }
interface Numbers { a: number; b: number; c: number; k: number }

export function consequence(stakes: Stakes, response: number, answer: number): string {
  const gap = Number(Math.abs(answer - response).toPrecision(6));
  return (response < answer ? stakes.short : stakes.over).replace('{gap}', `${gap} ${stakes.unit}`);
}

const table = (caption: string, rows: [string, string | number][]): Visual => ({ kind: 'table', caption, rows: rows.map(([k, v]) => [k, String(v)]) });
const graph = (caption: string, points: [number, number][]): Visual => ({ kind: 'coordinate', caption, points, rows: points.map(([x, y]) => [`(${x}, ${y})`, 'on the line']) });
const bike: Stakes = { unit: 'km', short: 'With that answer the EV bike runs out of charge {gap} short of the drop-off.', over: 'With that answer the crew hauls {gap} of charge it never uses, and a rival crew gets there first.' };

/** Structural different-use families. Each form changes what is unknown, how the relationship is shown,
 * or which game world it lives in, and some include numbers that are not needed, so a learner cannot
 * reuse the practice procedure by pattern-matching the sentence. Listed objectives only, not a full course. */
const FAMILIES: Record<string, Form[]> = {
  // Grade 6 already has two structural transfer forms in transfer.ts; these add a third, in another game world, for follow-up and retention.
  'g6-s0': [{ form: 'table-delivery', world: 'delivery', build: ({ a, b, c }) => ({
    text: `A delivery crew’s EV bike log shows a constant speed. The battery reads ${60 + c * 5}%. How many km does the bike travel per minute?`, answer: a,
    visual: table('EV bike trip log', [['Minutes riding', b], ['Distance (km)', a * b], ['Minutes riding', b + c], ['Distance (km)', a * (b + c)]]),
    hint: 'Pick any row pair and divide distance by minutes. The battery reading is not part of the rate.', explanation: `${a * b} ÷ ${b} = ${a} km per minute (and ${a * (b + c)} ÷ ${b + c} = ${a}).`,
    reasonPrompt: 'Which numbers did you ignore, and why?', stakes: bike }) }],
  'g6-s1': [{ form: 'changed-unknown-shellguard', world: 'shellguard', build: ({ a, b, k }) => ({
    text: `Shellguard towers are powered with crystals and energy in the ratio ${a}:${b}. Each tower also costs 2 coins. You have ${b * k} energy and must use all of it in the same ratio. How many crystals do you need?`, answer: a * k,
    hint: 'Find how many times larger the energy is, then scale the crystals the same way. The coin cost does not change the ratio.', explanation: `${b * k} ÷ ${b} = ${k}, so crystals = ${a} × ${k} = ${a * k}.`,
    reasonPrompt: 'Why must both parts of the ratio be multiplied by the same number?',
    stakes: { unit: 'crystals', short: 'With that answer the towers are underpowered: {gap} missing, and a wall section falls.', over: 'With that answer you waste {gap} you could have spent on another tower.' } }) }],
  'g6-s2': [{ form: 'graph-cafe', world: 'cafe', build: ({ a, b, c }) => ({
    text: `The Nest Café oven bakes muffins at a constant rate. The graph shows muffins baked over time. How many muffins are ready after ${b + c} minutes?`, answer: a * (b + c),
    visual: graph('Muffins (y) after minutes (x)', [[0, 0], [b, a * b]]),
    hint: 'Read one point to find muffins per minute, then scale to the new time.', explanation: `The line passes (${b}, ${a * b}), so the rate is ${a} per minute; ${a} × ${b + c} = ${a * (b + c)}.`,
    reasonPrompt: 'How does the point (0, 0) tell you this is a constant rate?',
    stakes: { unit: 'muffins', short: 'With that answer, {gap} customers leave the café without a muffin.', over: 'With that answer, {gap} go stale on the counter.' } }) }],
  'g7-s0': [
    { form: 'complement-shellguard', world: 'shellguard', build: ({ a, b }) => ({
      text: `A Shellguard wall has ${b * 20} shield points. An attack removes ${a * 5}% of them. How many shield points are left?`, answer: b * 20 - a * b,
      hint: 'Find the part that was removed, or use the percent that is left.', explanation: `${a * 5}% of ${b * 20} = ${a * b} removed; ${b * 20} − ${a * b} = ${b * 20 - a * b} left (or ${100 - a * 5}% of ${b * 20}).`,
      reasonPrompt: 'What percent of the shield is left, and how does that give a second way to solve it?',
      stakes: { unit: 'shield points', short: 'With that plan you expect {gap} too few, and send backup nobody needed.', over: 'With that plan you count on {gap} that are gone, and the next wave breaks through.' } }) },
    { form: 'two-routes-delivery', world: 'delivery', build: ({ a, b, c }) => ({
      text: `Route A is ${b * 20} km and ${a * 5}% of it is highway. Route B has ${a * b + c} km of highway and costs ${c + 2} coins in tolls. How many more highway km does Route B have than Route A?`, answer: c,
      visual: table('Route planner', [['Route A length', `${b * 20} km`], ['Route A highway', `${a * 5}%`], ['Route B highway', `${a * b + c} km`], ['Route B tolls', `${c + 2} coins`]]),
      hint: 'Turn Route A’s percent into kilometres first. The toll is not needed.', explanation: `Route A highway: ${a * 5}% of ${b * 20} = ${a * b} km. ${a * b + c} − ${a * b} = ${c} km.`,
      reasonPrompt: 'Why can’t you compare a percent directly with a number of kilometres?', stakes: bike }) },
    { form: 'error-analysis-cafe', world: 'cafe', build: ({ a, b }) => ({
      text: `The café has ${b * 20} cups of flour. Pip says a recipe using ${a * 5}% of the flour needs ${b * 20 - a * 5} cups, because “percent means take away.” How many cups does the recipe actually use?`, answer: a * b,
      hint: 'Percent means “out of 100.” Find that many hundredths of the whole.', explanation: `${a * 5}/100 × ${b * 20} = ${a * b} cups. Pip subtracted the percent number instead.`,
      reasonPrompt: 'How could you tell Pip’s answer is far too big before calculating?',
      stakes: { unit: 'cups', short: 'With that answer the batter is {gap} short and the recipe fails.', over: 'With that answer {gap} of flour are wasted.' } }) },
  ],
  'g7-s1': [
    { form: 'bar-model-delivery', world: 'delivery', build: ({ a, b }) => ({
      text: `The delivery app says the EV bike has ridden ${a * b} km, which is ${a * 5}% of today’s route. How long is the whole route?`, answer: b * 20,
      visual: table('Route progress bar (each block = 5%)', [['Blocks filled', a], ['Distance in those blocks', `${a * b} km`], ['Blocks in the full route', 20]]),
      hint: 'Find how far one 5% block is, then count all 20 blocks.', explanation: `${a * b} ÷ ${a} = ${b} km per 5% block; ${b} × 20 = ${b * 20} km.`,
      reasonPrompt: 'Why is the whole larger than the part you were given?', stakes: bike }) },
    { form: 'complement-whole-shellguard', world: 'shellguard', build: ({ a, b }) => ({
      text: `After a battle, a Shellguard tower still has ${b * (20 - a)} energy. That is ${100 - a * 5}% of its full charge. What is its full charge?`, answer: b * 20,
      hint: 'The number you know matches the percent that is LEFT, not the percent used.', explanation: `${100 - a * 5}% is ${20 - a} blocks of 5%. ${b * (20 - a)} ÷ ${20 - a} = ${b} per 5% block, so 100% (20 blocks) is ${b * 20}.`,
      reasonPrompt: 'Which percent goes with the number you were given?',
      stakes: { unit: 'energy', short: 'With that answer you recharge {gap} too little and the tower fails mid-wave.', over: 'With that answer you buy {gap} of charge the tower cannot hold.' } }) },
    { form: 'table-scale-cafe', world: 'cafe', build: ({ a, b, c }) => ({
      text: `The café stock sheet was smudged. Use it to find the full amount of sugar in stock (100%).`, answer: b * 20,
      visual: table('Café stock sheet', [['Percent of sugar stock', `${a * 5}%`], ['Cups of sugar', a * b], ['Price per cup', `${c} coins`], ['Percent of sugar stock', '100%'], ['Cups of sugar', '?']]),
      hint: 'Scale the percent row up to 100% and scale cups the same way. Price is not needed.', explanation: `${a * 5}% → ${a * b} cups, so 5% → ${b} cups and 100% → ${b * 20} cups.`,
      reasonPrompt: 'What stays the same between the two rows of the table?' }) },
  ],
  'g7-s2': [
    { form: 'changed-context-shellguard', world: 'shellguard', build: ({ a, b }) => ({
      text: `A Shellguard shield blocked ${a * b} of ${b * 20} incoming sparks. What percent of the sparks were blocked? Enter the percent number.`, answer: a * 5,
      hint: 'Divide blocked by total, then write it out of 100.', explanation: `${a * b} ÷ ${b * 20} = ${a / 20}, which is ${a * 5}%.`,
      reasonPrompt: 'What is the whole in this situation?' }) },
    { form: 'complement-delivery', world: 'delivery', build: ({ a, b, c }) => ({
      text: `A crew had ${b * 20} parcels. ${a * b} arrived late and ${c} drivers worked the shift. What percent of the parcels arrived on time? Enter the percent number.`, answer: 100 - a * 5,
      hint: 'Find the on-time parcels first, or find the late percent and subtract from 100. The number of drivers is not needed.', explanation: `Late: ${a * b} ÷ ${b * 20} = ${a * 5}%. On time: 100 − ${a * 5} = ${100 - a * 5}%.`,
      reasonPrompt: 'Which two percents must add to 100, and why?',
      stakes: { unit: 'percentage points', short: 'The crew report is off by {gap}, and the district rating drops for a bad report.', over: 'The crew report is off by {gap}, and the district rating drops for a bad report.' } }) },
    { form: 'error-analysis-cafe', world: 'cafe', build: ({ a, b }) => ({
      text: `The café sold ${a * b} of its ${b * 20} muffins before noon. Mo says that is ${a * b}% “because the part is the percent.” What percent was actually sold? Enter the percent number.`, answer: a * 5,
      hint: 'A percent compares the part to 100 equal shares of the whole.', explanation: `${a * b} ÷ ${b * 20} × 100 = ${a * 5}%. Mo only matches when the whole is exactly 100.`,
      reasonPrompt: 'When would Mo’s shortcut accidentally be right?' }) },
  ],
  'g7-s9': [
    { form: 'graph-delivery', world: 'delivery', build: ({ a, b, c }) => ({
      text: `The graph shows an EV bike’s charge used (y, in %) against km ridden (x). It is proportional. What is the constant of proportionality k in y = kx?`, answer: b,
      visual: graph('Charge used (%) vs km', [[0, 0], [a, a * b], [a + c, (a + c) * b]]),
      hint: 'Divide y by x for any point that is not the origin.', explanation: `${a * b} ÷ ${a} = ${b}, and ${(a + c) * b} ÷ ${a + c} = ${b}. k = ${b}.`,
      reasonPrompt: 'What does k mean for the bike?' }) },
    { form: 'story-shellguard', world: 'shellguard', build: ({ b, c }) => ({
      text: `Every Shellguard tower uses the same amount of energy. ${c + 1} towers used ${(c + 1) * b} energy together. Write the relationship as energy = k × towers. What is k?`, answer: b,
      hint: 'k is the energy for exactly one tower.', explanation: `${(c + 1) * b} ÷ ${c + 1} = ${b}, so energy = ${b} × towers.`,
      reasonPrompt: 'How would the total change if you doubled the towers?' }) },
    { form: 'broken-table-cafe', world: 'cafe', build: ({ b }) => ({
      text: `A café recipe table should be proportional (cups of oats → servings), but the last row was copied wrong. What should the last servings value be?`, answer: 5 * b,
      visual: table('Oats recipe', [['2 cups', `${2 * b} servings`], ['3 cups', `${3 * b} servings`], ['5 cups', `${5 * b + 1} servings (copied wrong)`]]),
      hint: 'Find servings per cup from the rows that agree, then fix the last row.', explanation: `${2 * b} ÷ 2 = ${b} and ${3 * b} ÷ 3 = ${b}, so 5 cups → ${5 * b} servings.`,
      reasonPrompt: 'How did you know which row was wrong?',
      stakes: { unit: 'servings', short: 'With that answer the café plans {gap} too few and runs out at lunch.', over: 'With that answer the café promises {gap} it can’t make.' } }) },
  ],
  'g7-s10': [
    { form: 'inverse-unknown-delivery', world: 'delivery', build: ({ a, b }) => ({
      text: `Delivery tolls follow T = ${b}d coins, where d is the number of districts crossed. A trip’s tolls were ${a * b} coins. How many districts did it cross?`, answer: a,
      hint: 'This time you know T. Undo the multiplication to find d.', explanation: `${b}d = ${a * b}, so d = ${a * b} ÷ ${b} = ${a}.`,
      reasonPrompt: 'How is this different from finding the toll for a known number of districts?' }) },
    { form: 'graph-to-equation-shellguard', world: 'shellguard', build: ({ a, b, c }) => ({
      text: `The graph shows energy cost (y) for Shellguard walls (x). It is proportional. What is the energy cost of ${a + c + 1} walls?`, answer: (a + c + 1) * b,
      visual: graph('Energy (y) for walls (x)', [[0, 0], [1, b], [c + 1, (c + 1) * b]]),
      hint: 'Read the cost of one wall from the graph, then write y = kx.', explanation: `k = ${b} (1 wall costs ${b}); y = ${b} × ${a + c + 1} = ${(a + c + 1) * b}.`,
      reasonPrompt: 'Why is the point (1, k) especially useful?',
      stakes: { unit: 'energy', short: 'With that answer you are {gap} short and the last wall never goes up.', over: 'With that answer you hold back {gap} that could have built something else.' } }) },
    { form: 'compare-equations-cafe', world: 'cafe', build: ({ a, b, c }) => ({
      text: `Supplier A charges y = ${b}x coins for x bags of beans. Supplier B charges y = ${b + c}x. How much more does Supplier B cost for ${a} bags?`, answer: a * c,
      hint: 'Find both totals, or find the difference per bag first.', explanation: `B − A per bag = ${c}; for ${a} bags that is ${a * c} coins (${a * (b + c)} − ${a * b}).`,
      reasonPrompt: 'Why can you subtract the rates before multiplying?' }) },
  ],
  'g7-s11': [
    { form: 'savings-cafe', world: 'cafe', build: ({ a, b, c }) => ({
      text: `Shop A sells ${c} bags of flour for ${c * b} coins. Shop B sells ${c + 1} bags for ${(c + 1) * (b + 1)} coins. If the café buys ${a} bags at the cheaper price per bag, how many coins does it save compared with the other shop?`, answer: a,
      hint: 'Find the price per bag at each shop, then compare for the number of bags you need.', explanation: `A: ${b} per bag. B: ${b + 1} per bag. Saving ${1} per bag × ${a} bags = ${a} coins.`,
      reasonPrompt: 'Why compare price per bag instead of the total price on the sign?' }) },
    { form: 'rate-comparison-delivery', world: 'delivery', build: ({ a, b, c }) => ({
      text: `EV bike A travels ${a * b} km on ${a} kWh. EV bike B travels ${c * (b + 2)} km on ${c} kWh. How many more km per kWh does the better bike get?`, answer: 2,
      hint: 'Find km per kWh for each bike — a unit rate, like a unit price.', explanation: `A: ${a * b} ÷ ${a} = ${b}. B: ${c * (b + 2)} ÷ ${c} = ${b + 2}. Difference: 2 km per kWh.`,
      reasonPrompt: 'How is km per kWh like price per item?', stakes: bike }) },
    { form: 'error-analysis-shellguard', world: 'shellguard', build: ({ a, b, c }) => ({
      text: `Crystal Pack A has ${a} crystals for ${a * (b + 1)} coins. Pack B has ${a + c} crystals for ${(a + c) * b} coins. Zee says “always buy the pack with the smaller total price.” What is the price per crystal of the pack that is really the better deal?`, answer: b,
      hint: 'Compare coins per crystal, not the total price.', explanation: `A: ${b + 1} per crystal. B: ${b} per crystal. Pack B is the better deal at ${b} coins each, whatever the totals are.`,
      reasonPrompt: 'Give a case where Zee’s rule picks the wrong pack.' }) },
  ],
};

export const STRUCTURAL_SKILLS = Object.keys(FAMILIES);
export const formsFor = (id: string) => FAMILIES[id] ?? [];

/** Picks a form so transfer (2 questions), follow-up, and retention do not repeat a structure where possible. */
export function structuralTransfer(id: string, level: Challenge, stage: string, index: number, r: () => number): (LearningProblem & { stakes?: Stakes; world?: World }) | null {
  const forms = FAMILIES[id];
  if (!forms || !['transfer', 'follow', 'retention'].includes(stage)) return null;
  // Grade 6 transfer keeps its reviewed transfer.ts forms; its extra world form covers follow-up and retention.
  if (forms.length === 1 && stage === 'transfer') return null;
  const pick = forms.length === 1 ? 0 : stage === 'transfer' ? index % 2 : stage === 'follow' ? (2 + index) % forms.length : (1 + index) % forms.length;
  const f = forms[pick], limit = level === 'support' ? 5 : level === 'stretch' ? 12 : 9;
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const n = { a: int(2, Math.min(limit, 12)), b: int(2, limit), c: int(1, 4), k: int(2, 5) };
  const built = f.build(n);
  return { ...built, hints: [built.hint, `Worked example: ${built.explanation}`], guided: false, templateId: `${id}:structural-v1:${f.form}`, representation: f.form, world: f.world,
    outcome: 'Your teacher reviews the calculation and your explanation separately.' };
}
