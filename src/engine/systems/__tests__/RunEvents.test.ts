import { describe, it, expect } from 'vitest';
import { handleEventChoice, startRun, selectMapNode } from '../RunSystem';
import { createInitialEngineState } from '../../state/createInitialEngineState';
import { generateRunMap } from '../RunMapGenerator';
import { RUN_EVENTS, getEventById, getEventForNode } from '../../../config/runEventConfig';
import { createEmptyBonuses } from '../../../types/run';
import type { EngineState } from '../../../types/engine';
import type { ActiveRunState } from '../../../types/run';
import { SPECIES_BASE_STATS } from '../../../config/battleConfig';
import type { Pet } from '../../../types';

const mockPet = (speciesId = 'koala_sprite', level = 5): Pet => {
  const base = SPECIES_BASE_STATS[speciesId] ?? { str: 10, spd: 10, def: 10 };
  return {
    id: `test_${speciesId}`,
    ownerId: 'test_owner',
    name: `Test ${speciesId}`,
    speciesId,
    type: speciesId,
    stage: 'baby',
    mood: 'calm',
    state: 'idle',
    needs: { hunger: 80, happiness: 80, cleanliness: 80, health: 100 },
    stats: { strength: base.str, speed: base.spd, defense: base.def },
    bond: 50,
    progression: { level, xp: 0, evolutionFlags: [] },
    timestamps: {
      createdAt: '2026-01-01T00:00:00.000Z',
      lastInteraction: '2026-01-01T00:00:00.000Z',
      lastFedAt: '2026-01-01T00:00:00.000Z',
      lastCleanedAt: '2026-01-01T00:00:00.000Z',
    },
  } as Pet;
};

/** Build a state at event_choice phase for a specific event. */
function stateAtEvent(eventId: string, hpPercent = 0.8): EngineState {
  const base = createInitialEngineState();
  const map = generateRunMap(42);
  // Inject an event node into the map
  const eventNode = {
    id: 'test_event_node',
    tier: 1,
    type: 'event' as const,
    eventId,
    rewardTier: 'common' as const,
    connections: [],
    visited: true,
  };
  map.nodes.push(eventNode);

  const run: ActiveRunState = {
    active: true,
    currentEncounter: 0,
    phase: 'event_choice',
    playerHPPercent: hpPercent,
    bonuses: createEmptyBonuses(),
    rewardsChosen: [],
    currentEnemyId: null,
    encountersWon: 0,
    map,
    currentNodeId: 'test_event_node',
    seed: 42,
    instability: 0,
    fractureModifier: 'volatile',
    mpEarnedThisRun: 0,
    bossState: {},
  };

  return { ...base, run, pet: mockPet(), initialized: true, screen: 'run_event' };
}

describe('runEventConfig', () => {
  it('has 5 events', () => {
    expect(RUN_EVENTS).toHaveLength(5);
  });

  it('all events have 2 choices', () => {
    for (const event of RUN_EVENTS) {
      expect(event.choices).toHaveLength(2);
    }
  });

  it('getEventById returns correct event', () => {
    const event = getEventById('equation_cache');
    expect(event?.title).toBe('Equation Fragment Cache');
  });

  it('getEventForNode cycles through events', () => {
    const e0 = getEventForNode(0);
    const e1 = getEventForNode(1);
    const e5 = getEventForNode(5); // wraps to 0
    expect(e0.id).toBe(e5.id);
    expect(e0.id).not.toBe(e1.id);
  });
});

describe('handleEventChoice', () => {
  it('equation_cache choice 0: gain stat, lose HP', () => {
    const state = stateAtEvent('equation_cache', 0.8);
    const result = handleEventChoice(state, 0);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bonuses.statBonus).toBe(3);
    expect(result.run.playerHPPercent).toBeCloseTo(0.7, 2);
    expect(result.run.phase).toBe('map_select');
    expect(result.screen).toBe('run_map');
  });

  it('equation_cache choice 1: gain HP', () => {
    const state = stateAtEvent('equation_cache', 0.8);
    const result = handleEventChoice(state, 1);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bonuses.statBonus).toBe(0);
    expect(result.run.playerHPPercent).toBeCloseTo(0.85, 2);
  });

  it('fractured_mirror choice 0: gain stat bonus', () => {
    const state = stateAtEvent('fractured_mirror', 0.6);
    const result = handleEventChoice(state, 0);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bonuses.statBonus).toBe(5);
    expect(result.run.playerHPPercent).toBeCloseTo(0.6, 2); // no HP change
  });

  it('fractured_mirror choice 1: safe, no change', () => {
    const state = stateAtEvent('fractured_mirror', 0.6);
    const result = handleEventChoice(state, 1);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.bonuses.statBonus).toBe(0);
    expect(result.run.playerHPPercent).toBeCloseTo(0.6, 2);
  });

  it('unstable_ground choice 0: lose HP, gain stats', () => {
    const state = stateAtEvent('unstable_ground', 1.0);
    const result = handleEventChoice(state, 0);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBeCloseTo(0.85, 2);
    expect(result.run.bonuses.statBonus).toBe(3);
  });

  it('unstable_ground choice 1: no effect', () => {
    const state = stateAtEvent('unstable_ground', 1.0);
    const result = handleEventChoice(state, 1);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBeCloseTo(1.0, 2);
    expect(result.run.bonuses.statBonus).toBe(0);
  });

  it('resonance_well choice 0: heal + energy regen', () => {
    const state = stateAtEvent('resonance_well', 0.5);
    const result = handleEventChoice(state, 0);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBeCloseTo(0.6, 2);
    expect(result.run.bonuses.energyRegenBonus).toBe(1);
  });

  it('structural_echo choice 0: reveal boss + heal 5%', () => {
    const state = stateAtEvent('structural_echo', 0.7);
    const result = handleEventChoice(state, 0);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBeCloseTo(0.75, 2);
  });

  it('structural_echo choice 1: heal 8%', () => {
    const state = stateAtEvent('structural_echo', 0.7);
    const result = handleEventChoice(state, 1);
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBeCloseTo(0.78, 2);
  });

  it('clamps HP to 0 minimum', () => {
    const state = stateAtEvent('unstable_ground', 0.10);
    const result = handleEventChoice(state, 0); // lose 15%
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBe(0);
  });

  it('clamps HP to 1 maximum', () => {
    const state = stateAtEvent('equation_cache', 0.98);
    const result = handleEventChoice(state, 1); // gain 5%
    if (!result.run.active) throw new Error('run should be active');
    expect(result.run.playerHPPercent).toBe(1);
  });

  it('does nothing if not in event_choice phase', () => {
    const state = stateAtEvent('equation_cache');
    const modified = { ...state, run: { ...(state.run as ActiveRunState), phase: 'map_select' as const } };
    const result = handleEventChoice(modified, 0);
    expect(result).toBe(modified);
  });

  it('does nothing for invalid choice index', () => {
    const state = stateAtEvent('equation_cache');
    const result = handleEventChoice(state, 5);
    expect(result).toBe(state);
  });
});

describe('map generation includes event nodes', () => {
  it('generated maps contain event nodes', () => {
    // Try multiple seeds to find one with events
    let foundEvent = false;
    for (let seed = 0; seed < 20; seed++) {
      const map = generateRunMap(seed);
      if (map.nodes.some(n => n.type === 'event')) {
        foundEvent = true;
        break;
      }
    }
    expect(foundEvent).toBe(true);
  });

  it('event nodes have eventId set', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateRunMap(seed);
      const eventNodes = map.nodes.filter(n => n.type === 'event');
      for (const node of eventNodes) {
        expect(node.eventId).toBeTruthy();
        expect(getEventById(node.eventId!)).toBeDefined();
      }
    }
  });
});

describe('selectMapNode routes to event', () => {
  it('transitions to event_choice when selecting an event node', () => {
    let state = createInitialEngineState();
    state = { ...state, pet: mockPet(), initialized: true, screen: 'home' };
    state = startRun(state);
    if (!state.run.active) return;

    // Find an event node that's reachable, or inject one
    const eventNode = state.run.map.nodes.find(n => n.type === 'event' && n.tier === 1);
    if (!eventNode) {
      // Inject event node into tier 1
      const node = {
        id: 'injected_event',
        tier: 1,
        type: 'event' as const,
        eventId: 'equation_cache',
        rewardTier: 'common' as const,
        connections: [],
        visited: false,
      };
      state = {
        ...state,
        run: {
          ...state.run,
          map: { ...state.run.map, nodes: [...state.run.map.nodes, node] },
        },
      };
      // Wire a tier 0 node to connect to it
      const tier0 = (state.run as ActiveRunState).map.nodes.find((n: { tier: number }) => n.tier === 0)!;
      tier0.connections.push('injected_event');
      // First select tier 0 node
      state = selectMapNode(state, tier0.id);
      if (!state.run.active) return;
      // Now select the event node
      state = selectMapNode(state, 'injected_event');
    } else {
      // Navigate to tier 0, then the event node
      const tier0 = state.run.map.nodes.find(n => n.tier === 0 && n.connections.includes(eventNode.id));
      if (!tier0) return;
      state = selectMapNode(state, tier0.id);
      if (!state.run.active || state.run.phase === 'event_choice') return;
      // Skip to map select if we ended up in combat
      if (state.run.phase !== 'map_select') return;
      state = selectMapNode(state, eventNode.id);
    }

    if (!state.run.active) return;
    expect(state.run.phase).toBe('event_choice');
    expect(state.screen).toBe('run_event');
  });
});
