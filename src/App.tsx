import { useEffect, useState } from 'react';
import { useGameEngine } from './engine/hooks/useGameEngine';
import { createInitialEngineState } from './engine/state/createInitialEngineState';
import { IncubationScreen } from './screens/IncubationScreen';
import { GameSceneShell } from './components/scene/GameSceneShell';
import { MathScreen } from './screens/MathScreen';
import { CatchNumberScreen } from './features/catch-math/CatchNumberScreen';
import { FeedingScreen } from './screens/FeedingScreen';
import { ShopScreen } from './screens/ShopScreen';
import { BattleScreen } from './screens/BattleScreen';
import { MomentumScreen } from './screens/MomentumScreen';
import { NumberMergeScreen } from './screens/NumberMergeScreen';
import { ClassRosterScreen } from './screens/ClassRosterScreen';
import { ChallengerPreviewScreen } from './screens/ChallengerPreviewScreen';
import { MatchResultScreen } from './screens/MatchResultScreen';
import { AssetReviewScreen } from './screens/AssetReviewScreen';
import { AnimationReviewScreen } from './screens/AnimationReviewScreen';
import { RunStartScreen } from './screens/RunStartScreen';
import { RunEncounterScreen } from './screens/RunEncounterScreen';
import { RunRewardScreen } from './screens/RunRewardScreen';
import { RunOverScreen } from './screens/RunOverScreen';
import { RunMapScreen } from './screens/RunMapScreen';
import { RunRestScreen } from './screens/RunRestScreen';
import { RunEventScreen } from './screens/RunEventScreen';
import { TestModeScreen } from './screens/TestModeScreen';
import { PetCareScreen } from './screens/PetCareScreen';
import { QuestLogScreen } from './screens/QuestLogScreen';
import { SeasonPassScreen } from './screens/SeasonPassScreen';
import { GachaScreen } from './screens/GachaScreen';
import { PowerForgeScreen } from './screens/PowerForgeScreen';
import { ComingSoonScreen } from './screens/ComingSoonScreen';
import { WarmHomeSceneReview } from './screens/WarmHomeSceneReview';
import { FeatureHUD } from './components/scene/FeatureHUD';
import { DevCombatPicker } from './components/battle/DevCombatPicker';
import { FOOD_ITEMS } from './config/gameConfig';
import { validateConfigs } from './config';
import { DevToolsOverlay } from './devtools';
import { isDevModeEnabled } from './utils/featureFlags';
import * as SaveManager from './services/persistence/SaveManager';
import { AchievementPopup } from './components/ui/AchievementPopup';
import { HelpProvider } from './components/help/HelpProvider';
import { OnboardingGate } from './components/help/OnboardingGate';
import { PreBattleWarmup } from './components/battle/PreBattleWarmup';
import { registerAllHelp } from './config/help';
import type { EngineState } from './engine/core/EngineTypes';
import type { PetState } from './types';

// Register all help configs once at module load
registerAllHelp();


const LEGACY_SAVE_KEY = 'vpet_gamestate_v1';

function loadInitialState(): EngineState {
  const base = createInitialEngineState();
  try {
    // Try new SaveManager format first
    const saved = SaveManager.load();
    if (saved) return { ...saved, initialized: false };

    // Migrate legacy GameState format (pre-Step-14 saves)
    const legacySave = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacySave) {
      const legacy = JSON.parse(legacySave) as {
        player?: { currencies?: { tokens?: number; coins?: number }; [key: string]: unknown };
        pet?: { needs?: { hunger?: number; happiness?: number; health?: number; cleanliness?: number }; state?: string; name?: string; type?: string; speciesId?: string; [key: string]: unknown } | null;
        egg?: import('./types').Egg | null;
      };
      const migratedPet = legacy.pet
        ? {
            ...legacy.pet,
            needs: {
              hunger: legacy.pet.needs?.hunger ?? 100,
              happiness: legacy.pet.needs?.happiness ?? 100,
              health: legacy.pet.needs?.health ?? 100,
              cleanliness: legacy.pet.needs?.cleanliness ?? 100,
            },
            state: ((legacy.pet.state as PetState) || 'idle') as PetState,
            name: legacy.pet.name || 'Pet',
            type: legacy.pet.type || legacy.pet.speciesId || 'slime_baby',
          } as import('./types').Pet
        : null;
      return {
        ...base,
        pet: migratedPet,
        egg: legacy.egg ?? base.egg,
        player: {
          ...base.player,
          ...(legacy.player as Partial<typeof base.player>),
          currencies: {
            tokens: legacy.player?.currencies?.tokens ?? 100,
            coins: legacy.player?.currencies?.coins ?? 0,
            mp: 0,
            mpLifetime: 0,
            seasonPoints: 0,
            shards: 0,
          },
        },
        screen: migratedPet ? 'home' : 'incubation',
        initialized: false,
      };
    }
  } catch (e) {
    console.error('[App] Error loading saved state:', e);
  }
  return base;
}

const TestModeButton = ({ dispatch }: { dispatch: (a: import('./engine/core/ActionTypes').GameEngineAction) => void }) => (
  <div className="fixed top-4 right-4 z-50 flex gap-2">
    {isDevModeEnabled() && (
      <>
        <button
          className="px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded text-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'asset_review' })}
        >
          Review Assets
        </button>
        <button
          className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded text-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'animation_review' })}
        >
          Review Animations
        </button>
        <button
          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded text-sm"
          onClick={() => dispatch({ type: 'START_MOMENTUM' })}
        >
          Momentum
        </button>
      </>
    )}
    <button
      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded"
      onClick={() => dispatch({ type: 'ENTER_TEST_MODE' })}
    >
      Test Mode
    </button>
  </div>
);

function App() {
  const [initialState] = useState<EngineState>(() => loadInitialState());
  const { state, engine, dispatch } = useGameEngine(initialState);
  const [isFeeding, setIsFeeding] = useState(false);
  const [lastFoodIcon, setLastFoodIcon] = useState<string | null>(null);

  // Pre-combat character picker — intercepts practice-battle start so the
  // player can choose which species to fight with. Previously gated behind
  // `import.meta.env.DEV`, which meant beta testers on the deployed site
  // hit battles with no way to pick a pet.
  const [showCombatPicker, setShowCombatPicker] = useState(false);

  // Intercept START_BATTLE (practice/wild) so we can always show the picker
  // before committing to a battle. PvP (START_PVP_BATTLE) uses the player's
  // own pet by design and is not intercepted here.
  const devDispatch: typeof dispatch = (action) => {
    if (action.type === 'START_BATTLE') {
      setShowCombatPicker(true);
      return;
    }
    dispatch(action);
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      validateConfigs();
    }
    dispatch({ type: 'CHECK_LOGIN_STREAK' });
    dispatch({ type: 'CHECK_DAILY_GOALS' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderScreen = () => {
    if (state.mode === 'test') {
      return <TestModeScreen onExit={() => dispatch({ type: 'EXIT_TEST_MODE' })} />;
    }
    if (state.screen === 'asset_review') {
      return <AssetReviewScreen onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} />;
    }
    if (state.screen === 'animation_review') {
      return <AnimationReviewScreen onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} />;
    }
    if (state.screen === 'momentum' && state.momentum.active) {
      return (
        <MomentumScreen
          state={state.momentum}
          petSpeciesId={state.pet?.speciesId ?? null}
          dispatch={dispatch}
        />
      );
    }
    if (state.screen === 'number_merge') {
      return (
        <NumberMergeScreen
          petSpeciesId={state.pet?.speciesId ?? null}
          onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          onWin={(tokens) => dispatch({ type: 'AWARD_TOKENS', amount: tokens })}
        />
      );
    }
    if (state.screen === 'run_start') {
      return <RunStartScreen pet={state.pet} dispatch={dispatch} />;
    }
    if (state.screen === 'run_map' && state.run.active) {
      return <RunMapScreen run={state.run} pet={state.pet} dispatch={dispatch} />;
    }
    if (state.screen === 'run_encounter' && state.run.active) {
      return <RunEncounterScreen run={state.run} pet={state.pet} dispatch={dispatch} />;
    }
    if (state.screen === 'run_reward' && state.run.active) {
      return <RunRewardScreen run={state.run} dispatch={dispatch} />;
    }
    if (state.screen === 'run_rest' && state.run.active) {
      return <RunRestScreen run={state.run} pet={state.pet} dispatch={dispatch} />;
    }
    if (state.screen === 'run_event' && state.run.active) {
      return <RunEventScreen run={state.run} dispatch={dispatch} />;
    }
    if (state.screen === 'run_over') {
      return <RunOverScreen run={state.run} pet={state.pet} dispatch={dispatch} />;
    }
    if (state.screen === 'battle' && state.battle.active) {
      return <BattleScreen battle={state.battle} dispatch={dispatch} matchHistory={state.matchHistory} trophyCase={state.trophyCase} />;
    }
    if (state.screen === 'match_result') {
      const lastResult = state.matchHistory[state.matchHistory.length - 1];
      const lastTrophy = lastResult?.trophyMinted
        ? state.trophyCase.trophies.find(t => t.id === lastResult.trophyMinted) ?? null
        : null;
      if (lastResult) {
        return <MatchResultScreen result={lastResult} trophy={lastTrophy} dispatch={dispatch} />;
      }
    }
    if (state.screen === 'class_roster') {
      return (
        <ClassRosterScreen
          classmates={state.classroom.classmates}
          playerLevel={state.pet?.progression.level ?? 1}
          ticketState={state.battleTickets}
          matchupTrackers={state.matchupTrackers}
          dispatch={dispatch}
          onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          onPractice={() => devDispatch({ type: 'START_BATTLE' })}
        />
      );
    }
    if (state.screen === 'challenger_preview' && state.classroom.selectedOpponentId) {
      const opponent = state.classroom.classmates.find(c => c.id === state.classroom.selectedOpponentId);
      if (opponent && state.pet) {
        return (
          <ChallengerPreviewScreen
            opponent={opponent}
            playerPet={state.pet}
            playerTokens={state.player.currencies.tokens}
            ticketCount={state.battleTickets.tickets.length}
            dispatch={dispatch}
            onBack={() => {
              dispatch({ type: 'CLEAR_OPPONENT_SELECTION' });
              dispatch({ type: 'SET_SCREEN', screen: 'class_roster' });
            }}
          />
        );
      }
    }
    if (state.screen === 'shop') {
      return (
        <ShopScreen
          tokens={state.player.currencies.tokens}
          coins={state.player.currencies.coins}
          mpLifetime={state.player.currencies.mpLifetime}
          level={state.pet?.progression.level ?? 1}
          battlesWon={state.player.pvpRecord?.totalWins ?? 0}
          bond={state.pet?.bond ?? 0}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'quest_log') {
      return (
        <QuestLogScreen
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'season_pass') {
      return (
        <SeasonPassScreen
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'gacha') {
      return (
        <GachaScreen
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'power_forge') {
      return (
        <PowerForgeScreen
          mp={state.player.currencies.mp}
          mpLifetime={state.player.currencies.mpLifetime}
          forge={state.player.powerForge}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'coming_soon') {
      return (
        <ComingSoonScreen
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'warm_preview') {
      return (
        <WarmHomeSceneReview
          dispatch={dispatch}
          petSpriteSrc={state.pet ? '/assets/pets/blue-koala/portrait.png' : undefined}
          equippedCosmetics={state.pet ? state.cosmetics.equipped[state.pet.id] ?? undefined : undefined}
          interaction={state.interaction}
          cosmetics={state.cosmetics}
          petId={state.pet?.id}
        />
      );
    }
    if (state.screen === 'pet_care' && state.pet) {
      return (
        <PetCareScreen
          pet={state.pet}
          interaction={state.interaction}
          inventory={state.inventory}
          playerTokens={state.player.currencies.tokens}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        />
      );
    }
    if (state.screen === 'math') {
      return (
        <>
          <TestModeButton dispatch={dispatch} />
          <MathScreen
            dispatch={dispatch}
            onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
            initialStreak={state.player.streaks.correctAnswers}
            speciesId={state.pet?.speciesId ?? 'koala_sprite'}
          />
        </>
      );
    }
    if (state.screen === 'catch_math') {
      return (
        <>
          <TestModeButton dispatch={dispatch} />
          <CatchNumberScreen
            dispatch={dispatch}
            pet={state.pet}
            initialStreak={state.player.streaks.correctAnswers}
            onExit={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          />
        </>
      );
    }
    if (state.pet && state.screen === 'home') {
      return (
        <>
          <TestModeButton dispatch={dispatch} />
          <FeatureHUD state={state} dispatch={dispatch} />
          <GameSceneShell
            pet={state.pet}
            currentRoom={state.currentRoom}
            playerTokens={state.player.currencies.tokens}
            mp={state.player.currencies.mp}
            mpLifetime={state.player.currencies.mpLifetime}
            mathBuffs={state.player.mathBuffs}
            dailyGoals={state.dailyGoals}
            ticketCount={state.battleTickets.tickets.length}
            mailbox={state.mailbox}
            interaction={state.interaction}
            dispatch={devDispatch}
            onFeed={() => setIsFeeding(true)}
            lastFoodIcon={lastFoodIcon}
            equippedCosmetics={state.cosmetics.equipped[state.pet.id] ?? undefined}
            loginStreak={state.player.streaks.login}
            dailyQuests={state.quests.daily}
            showDailyRitual={state.showDailyRitual ?? false}
          />
          <FeedingScreen
            isOpen={isFeeding}
            onClose={() => setIsFeeding(false)}
            currentTokens={state.player.currencies.tokens}
            mpLifetime={state.player.currencies.mpLifetime}
            onFeed={(foodId) => {
              const foundFood = FOOD_ITEMS.find((item) => item.id === foodId);
              if (!foundFood) return;
              setLastFoodIcon(foundFood.icon);
              dispatch({ type: 'FEED_PET', food: foundFood });
            }}
          />
        </>
      );
    }
    if (state.egg) {
      return (
        <>
          <TestModeButton dispatch={dispatch} />
          <IncubationScreen
            egg={state.egg}
            onTap={() => dispatch({ type: 'TAP_EGG' })}
            onHatch={() => dispatch({ type: 'HATCH_EGG' })}
          />
        </>
      );
    }
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <h1>Something went wrong.</h1>
        <button className="mt-4 px-4 py-2 bg-blue-500 rounded" onClick={() => window.location.reload()}>
          Restart App
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="anim-screen-enter">
        {renderScreen()}
      </div>
      <HelpProvider
        helpState={state.help}
        dispatch={dispatch}
      >
        {/* HelpProvider renders its own overlays; children slot is unused but required */}
        <></>
      </HelpProvider>
      {/* Intro tutorial — only fires when explicitly requested via SHOW_ONBOARDING (dev tools / help panel) */}
      {state.pet && (
        <OnboardingGate
          showOnboarding={state.showOnboarding === true}
          dispatch={dispatch}
        />
      )}
      {/* Pre-battle warmup — math question before every wild battle */}
      {state.pendingBattleWarmup && (
        <PreBattleWarmup
          difficulty={Math.min(3, Math.max(1, Math.floor((state.pet?.progression.level ?? 1) / 5) + 1))}
          dispatch={dispatch}
        />
      )}
      <AchievementPopup notifications={state.notifications} dispatch={dispatch} />
      {/* Pre-combat character picker modal (always available) */}
      {showCombatPicker && (
        <DevCombatPicker
          onSelect={(speciesId) => {
            setShowCombatPicker(false);
            dispatch({ type: 'START_BATTLE_WITH_CHARACTER', speciesId });
          }}
          onCancel={() => setShowCombatPicker(false)}
        />
      )}
      {isDevModeEnabled() && <DevToolsOverlay engine={engine} state={state} dispatch={dispatch} />}
    </>
  );
}

export default App;
