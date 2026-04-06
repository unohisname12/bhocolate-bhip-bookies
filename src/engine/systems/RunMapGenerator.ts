import type { RunMap, RunMapNode, RunNodeType, FractureModifierId } from '../../types/run';
import { getEnemyForTier, getBossEnemy } from '../../config/runEnemyConfig';
import { getEventForNode } from '../../config/runEventConfig';
import { FRACTURE_MODIFIER_IDS } from '../../config/runConfig';

/** Simple seeded PRNG (Mulberry32). */
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate a branching run map from a seed.
 *
 * Structure:
 *   Tier 0 (tier 1): 2 combat nodes
 *   Tier 1 (tier 2): 2-3 nodes, at least 1 combat + 1 non-combat
 *   Tier 2 (tier 3): 2-3 nodes, at least 1 elite
 *   Tier 3 (boss):   1 boss node
 *
 * Each tier's nodes connect to 1-2 nodes in the next tier.
 * Player picks one node per tier. All paths converge at boss.
 */
export function generateRunMap(seed: number): RunMap {
  const rng = createRng(seed);
  const nodes: RunMapNode[] = [];
  let nodeIdCounter = 0;
  const makeId = () => `node_${nodeIdCounter++}`;

  // --- Tier 0: 2 combat nodes (one easier, one harder) ---
  const tier0Nodes: RunMapNode[] = [];
  const t1Enemies = shuffled([0, 1, 2], rng);
  for (let i = 0; i < 2; i++) {
    const enemy = getEnemyForTier(1, t1Enemies[i]);
    tier0Nodes.push({
      id: makeId(),
      tier: 0,
      type: 'combat',
      enemyId: enemy.id,
      rewardTier: 'common',
      connections: [],
      visited: false,
    });
  }
  nodes.push(...tier0Nodes);

  // --- Tier 1: 3 nodes, at least 1 combat + 1 non-combat (rest or event) ---
  const tier1Count = 3;
  const tier1NonCombat: RunNodeType = rng() < 0.5 ? 'rest' : 'event';
  const tier1Types: RunNodeType[] = ['combat', tier1NonCombat];
  // Third slot: mix of combat, rest, or event
  const t1Roll = rng();
  tier1Types.push(t1Roll < 0.4 ? 'combat' : t1Roll < 0.7 ? 'rest' : 'event');
  const shuffledTier1Types = shuffled(tier1Types, rng);
  const t2Enemies = shuffled([0, 1, 2], rng);
  let t2EnemyIdx = 0;
  let t1EventIdx = Math.floor(rng() * 100);

  const tier1Nodes: RunMapNode[] = [];
  for (let i = 0; i < tier1Count; i++) {
    const type = shuffledTier1Types[i];
    const node: RunMapNode = {
      id: makeId(),
      tier: 1,
      type,
      rewardTier: 'common',
      connections: [],
      visited: false,
    };
    if (type === 'combat') {
      const enemy = getEnemyForTier(2, t2Enemies[t2EnemyIdx++]);
      node.enemyId = enemy.id;
      node.rewardTier = 'rare';
    } else if (type === 'event') {
      const event = getEventForNode(t1EventIdx++);
      node.eventId = event.id;
    }
    tier1Nodes.push(node);
  }
  nodes.push(...tier1Nodes);

  // --- Tier 2: 3 nodes, at least 1 elite ---
  const tier2Count = 3;
  const tier2Types: RunNodeType[] = ['elite'];
  // Second slot: combat or event
  tier2Types.push(rng() < 0.6 ? 'combat' : 'event');
  // Third slot: rest or event
  tier2Types.push(rng() < 0.5 ? 'rest' : 'event');
  const shuffledTier2Types = shuffled(tier2Types, rng);
  const t3Enemies = shuffled([0, 1, 2], rng);
  let t3EnemyIdx = 0;
  let t2EventIdx = Math.floor(rng() * 100) + 10; // offset from tier 1

  const tier2Nodes: RunMapNode[] = [];
  for (let i = 0; i < tier2Count; i++) {
    const type = shuffledTier2Types[i];
    const node: RunMapNode = {
      id: makeId(),
      tier: 2,
      type,
      rewardTier: type === 'elite' ? 'elite' : 'rare',
      connections: [],
      visited: false,
    };
    if (type === 'combat' || type === 'elite') {
      const enemy = getEnemyForTier(3, t3Enemies[t3EnemyIdx++]);
      node.enemyId = enemy.id;
    } else if (type === 'event') {
      const event = getEventForNode(t2EventIdx++);
      node.eventId = event.id;
    }
    tier2Nodes.push(node);
  }
  nodes.push(...tier2Nodes);

  // --- Tier 3: 1 boss node ---
  const bossEnemy = getBossEnemy(Math.floor(rng() * 100));
  const bossNode: RunMapNode = {
    id: makeId(),
    tier: 3,
    type: 'boss',
    enemyId: bossEnemy.id,
    rewardTier: 'elite',
    connections: [],
    visited: false,
  };
  nodes.push(bossNode);

  // --- Wire connections: each node in tier N connects to 1-2 nodes in tier N+1 ---
  const tiers = [tier0Nodes, tier1Nodes, tier2Nodes, [bossNode]];
  for (let t = 0; t < tiers.length - 1; t++) {
    const currentTier = tiers[t];
    const nextTier = tiers[t + 1];

    // Ensure every next-tier node has at least one incoming connection
    // and every current-tier node connects to at least one next-tier node
    for (const node of currentTier) {
      // Connect to 1 random next-tier node
      const target = pickRandom(nextTier, rng);
      if (!node.connections.includes(target.id)) {
        node.connections.push(target.id);
      }
    }

    // Ensure every next-tier node is reachable
    for (const nextNode of nextTier) {
      const hasIncoming = currentTier.some(n => n.connections.includes(nextNode.id));
      if (!hasIncoming) {
        const source = pickRandom(currentTier, rng);
        source.connections.push(nextNode.id);
      }
    }

    // Optionally add a second connection for some nodes
    for (const node of currentTier) {
      if (node.connections.length < 2 && nextTier.length > 1 && rng() < 0.4) {
        const candidates = nextTier.filter(n => !node.connections.includes(n.id));
        if (candidates.length > 0) {
          node.connections.push(pickRandom(candidates, rng).id);
        }
      }
    }
  }

  return { nodes, currentPath: [] };
}

/** Pick a fracture modifier for the run. */
export function pickFractureModifier(seed: number): FractureModifierId {
  const rng = createRng(seed + 7919); // offset to avoid correlation with map seed
  return FRACTURE_MODIFIER_IDS[Math.floor(rng() * FRACTURE_MODIFIER_IDS.length)];
}

/** Get nodes available for selection (tier's nodes that connect from current position). */
export function getSelectableNodes(map: RunMap, currentNodeId: string | null): RunMapNode[] {
  if (currentNodeId === null) {
    // At start: tier 0 nodes are selectable
    return map.nodes.filter(n => n.tier === 0);
  }
  const currentNode = map.nodes.find(n => n.id === currentNodeId);
  if (!currentNode) return [];
  return map.nodes.filter(n => currentNode.connections.includes(n.id));
}

/** Get a node by ID. */
export function getNodeById(map: RunMap, nodeId: string): RunMapNode | undefined {
  return map.nodes.find(n => n.id === nodeId);
}
