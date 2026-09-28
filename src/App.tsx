import type {PopCommand} from './features/math-pop/model';
import type {StackCommand} from './features/math-stack/model';
import type {ArenaCommand} from './features/pet-arena/model';
const PetArena = lazy(() => import('./features/pet-arena/Arena').then(m=>({default:m.Arena})));
import { unlockedFeatures } from './features/student-navigation/unlocks';
import { StudentShell } from './features/student-navigation/StudentShell';
import { demoLearners, selectDemoLearner, createDemoLearner } from './demo/demoClassroom';
import { FirstAdventureScreen, NextAdventure } from './features/first-adventure/FirstAdventure';
import { createHomeBase } from './features/home-base/model';
const MathPop = lazy(() => import('./features/math-pop/MathPop'));
const MathStack = lazy(() => import('./features/math-stack/MathStack'));
const HomeBaseScreen = lazy(() => import('./features/home-base/HomeBaseScreen').then(m => ({ default: m.HomeBaseScreen })));
import { PrizeStudio } from './features/clash/PrizeStudio';
import { DEMO_MODE, createDemoState, connectDemoPersistence } from './demo/demoMode';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameEngine } from './engine/hooks/useGameEngine';
import { createInitialEngineState } from './engine/state/createInitialEngineState';
import { IncubationScreen } from './screens/IncubationScreen';
import { GameSceneShell } from './components/scene/GameSceneShell';
const MathScreen = lazy(() => import('./screens/MathScreen').then(module => ({ default: module.MathScreen })));
const CatchNumberScreen = lazy(() => import('./features/catch-math/CatchNumberScreen').then(module => ({ default: module.CatchNumberScreen })));
const FeedingScreen = lazy(() => import('./screens/FeedingScreen').then(module => ({ default: module.FeedingScreen })));
const ShopScreen = lazy(() => import('./screens/ShopScreen').then(module => ({ default: module.ShopScreen })));
const BattleScreen = lazy(() => import('./screens/BattleScreen').then(module => ({ default: module.BattleScreen })));
const MomentumScreen = lazy(() => import('./screens/MomentumScreen').then(module => ({ default: module.MomentumScreen })));
const NumberMergeScreen = lazy(() => import('./screens/NumberMergeScreen').then(module => ({ default: module.NumberMergeScreen })));
const ClassRosterScreen = lazy(() => import('./screens/ClassRosterScreen').then(module => ({ default: module.ClassRosterScreen })));
const ChallengerPreviewScreen = lazy(() => import('./screens/ChallengerPreviewScreen').then(module => ({ default: module.ChallengerPreviewScreen })));
const MatchResultScreen = lazy(() => import('./screens/MatchResultScreen').then(module => ({ default: module.MatchResultScreen })));
const AssetReviewScreen = lazy(() => import('./screens/AssetReviewScreen').then(module => ({ default: module.AssetReviewScreen })));
const AnimationReviewScreen = lazy(() => import('./screens/AnimationReviewScreen').then(module => ({ default: module.AnimationReviewScreen })));
const RunStartScreen = lazy(() => import('./screens/RunStartScreen').then(module => ({ default: module.RunStartScreen })));
const RunEncounterScreen = lazy(() => import('./screens/RunEncounterScreen').then(module => ({ default: module.RunEncounterScreen })));
const RunRewardScreen = lazy(() => import('./screens/RunRewardScreen').then(module => ({ default: module.RunRewardScreen })));
const RunOverScreen = lazy(() => import('./screens/RunOverScreen').then(module => ({ default: module.RunOverScreen })));
const RunMapScreen = lazy(() => import('./screens/RunMapScreen').then(module => ({ default: module.RunMapScreen })));
const RunRestScreen = lazy(() => import('./screens/RunRestScreen').then(module => ({ default: module.RunRestScreen })));
const RunEventScreen = lazy(() => import('./screens/RunEventScreen').then(module => ({ default: module.RunEventScreen })));
const TestModeScreen = lazy(() => import('./screens/TestModeScreen').then(module => ({ default: module.TestModeScreen })));
const PetCareScreen = lazy(() => import('./screens/PetCareScreen').then(module => ({ default: module.PetCareScreen })));
const QuestLogScreen = lazy(() => import('./screens/QuestLogScreen').then(module => ({ default: module.QuestLogScreen })));
const SeasonPassScreen = lazy(() => import('./screens/SeasonPassScreen').then(module => ({ default: module.SeasonPassScreen })));
const GachaScreen = lazy(() => import('./screens/GachaScreen').then(module => ({ default: module.GachaScreen })));
const PowerForgeScreen = lazy(() => import('./screens/PowerForgeScreen').then(module => ({ default: module.PowerForgeScreen })));
const ComingSoonScreen = lazy(() => import('./screens/ComingSoonScreen').then(module => ({ default: module.ComingSoonScreen })));
const WarmHomeSceneReview = lazy(() => import('./screens/WarmHomeSceneReview').then(module => ({ default: module.WarmHomeSceneReview })));
import { FeatureHUD } from './components/scene/FeatureHUD';
import { DevCombatPicker } from './components/battle/DevCombatPicker';
import { FOOD_ITEMS } from './config/gameConfig';
import { validateConfigs } from './config';
import { DevToolsOverlay } from './devtools';
import { isDevModeEnabled } from './utils/featureFlags';
import * as SaveManager from './services/persistence/SaveManager';
import { saveTeacherSettings } from './services/persistence/saveTeacherSettings';
import { readLearnerIndex } from './services/persistence/learnerIndex';
import { createLearner, selectLearner } from './services/persistence/learnerProfiles';
import { AchievementPopup } from './components/ui/AchievementPopup';
import { HelpProvider } from './components/help/HelpProvider';
import { OnboardingGate } from './components/help/OnboardingGate';
import { PreBattleWarmup } from './components/battle/PreBattleWarmup';
import { registerAllHelp } from './config/help';
import type { EngineState } from './engine/core/EngineTypes';
import type { PetState } from './types';
import './screens/woodland.css';
const WoodlandScreen = lazy(() => import('./screens/WoodlandScreen').then(module => ({ default: module.WoodlandScreen })));
import { LearningActionContext, LearningContext, SkillReviewContext } from './components/LearningContext';
import { ActivePetContext } from './components/ActivePetContext';
import { petVisualKey } from './config/companionConfig';
import './growth.css';
const GrowthScreen = lazy(() => import('./screens/GrowthScreen').then(module => ({ default: module.GrowthScreen })));
const DiscoveryScreen = lazy(() => import('./screens/DiscoveryScreen').then(module => ({ default: module.DiscoveryScreen })));
import { DeveloperMenu } from './devtools/DeveloperMenu';
const TeacherDashboard = lazy(() => import('./screens/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const ArcadeScreen = lazy(() => import('./features/arcade/ArcadeScreen').then(module => ({ default: module.ArcadeScreen })));
const PlayScreen = lazy(() => import('./screens/PlayScreen').then(module => ({ default: module.PlayScreen })));

// Register all help configs once at module load
registerAllHelp();


const LEGACY_SAVE_KEY = 'vpet_gamestate_v1';

function loadInitialState(): EngineState {
  const base = createInitialEngineState();
  const learners = readLearnerIndex();
  const selected = learners.profiles.find(p => p.id === learners.activeId);
  if (selected && selected.id !== 'default') {
    base.learnerProfileId = selected.id;
    base.player = { ...base.player, id: selected.id, displayName: selected.label };
  }
  try {
    // Try new SaveManager format first
    const saved = SaveManager.load();
    if (saved) return { ...saved, learnerProfileId: learners.activeId, initialized: false };
    // Never import the original legacy user's data into a different learner.
    if (learners.activeId !== 'default') return base;

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
        eggDiscovery: null,
        pet: migratedPet,
        egg: legacy.egg ?? (migratedPet ? null : { id: `legacy_egg_${Date.now()}`, type: 'koala', state: 'incubating', progress: 0, createdAt: new Date().toISOString() }),
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


function App({ initialStateOverride, persistence, studentPilot = false, studentFlush, studentAssignment, studentTools, arenaExecute, stackExecute, popExecute }: { initialStateOverride?: EngineState; persistence?: typeof import('./services/persistence/enginePersistence').connectPersistence; studentPilot?: boolean; studentFlush?:()=>Promise<boolean>; studentAssignment?:()=>string; studentTools?:ReactNode; arenaExecute?:(command:ArenaCommand)=>Promise<void>; popExecute?:(command:PopCommand)=>Promise<void>; stackExecute?:(command:StackCommand)=>Promise<void> } = {}) {
  const [initialState] = useState<EngineState>(() => initialStateOverride ?? (DEMO_MODE ? createDemoState() : loadInitialState()));
  const { state, engine, dispatch } = useGameEngine(initialState, DEMO_MODE ? connectDemoPersistence : persistence);
  const learnerFacts = useMemo(() => ({ skillReviews: state.skillReviews, matchHistory: state.matchHistory }), [state.skillReviews, state.matchHistory]);
  const [studentActive, setStudentActive] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [saveError, setSaveError] = useState(SaveManager.getSaveError);
  useEffect(() => {
    const update = () => setSaveError(SaveManager.getSaveError());
    window.addEventListener('vpet-save-status', update);
    return () => window.removeEventListener('vpet-save-status', update);
  }, []);
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
    if (action.type === 'START_BATTLE' && !studentPilot && isDevModeEnabled()) {
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

  const bridgeActive = state.woodland?.phase === 'route' && ((state.woodland.route === 'catch' && state.screen === 'catch_math') || (state.woodland.route === 'merge' && state.screen === 'number_merge'));
  const renderScreen = () => {
    if (state.screen === 'first_adventure') return <FirstAdventureScreen state={state} dispatch={dispatch}/>;
    if (state.screen === 'woodland') return <WoodlandScreen state={state} dispatch={dispatch} />;
    if (state.screen === 'discovery' || (!state.pet && !state.egg && state.eggDiscovery && ['home', 'incubation', 'growth'].includes(state.screen))) return <DiscoveryScreen state={state} dispatch={dispatch} />;
    if (state.screen === 'growth') return <GrowthScreen state={state} dispatch={dispatch} />;
    if (state.screen === 'feeding') return <div className="min-h-dvh bg-slate-950"><FeedingScreen isOpen onClose={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })} currentTokens={state.player.currencies.tokens} mpLifetime={state.player.currencies.mpLifetime} onFeed={foodId => { const food = FOOD_ITEMS.find(item => item.id === foodId); if (food) dispatch({ type: 'FEED_PET', food }); }} /></div>;
    if (state.screen === 'home_builder') return <HomeBaseScreen state={state} dispatch={dispatch}/>;
    if (state.screen === 'arcade') return <ArcadeScreen state={state} dispatch={dispatch}/>;
    if (state.screen === 'play') return <PlayScreen dispatch={devDispatch} hasPet={!!state.pet} arcade={state.arcade} reviews={state.skillReviews} />;
    if (state.mode === 'test') {
      return <TestModeScreen onExit={() => dispatch({ type: 'EXIT_TEST_MODE' })} />;
    }
    if (state.screen === 'asset_review') {
      return <AssetReviewScreen onExit={() => dispatch({ type: 'SET_SCREEN', screen: bridgeActive ? 'woodland' : 'home' })} />;
    }
    if (state.screen === 'animation_review') {
      return <AnimationReviewScreen onExit={() => dispatch({ type: 'SET_SCREEN', screen: bridgeActive ? 'woodland' : 'home' })} />;
    }
    if (state.screen === 'momentum' && state.momentum.active) {
      return (
        <MomentumScreen
          state={state.momentum}
          petSpeciesId={state.pet ? petVisualKey(state.pet) : null}
          dispatch={dispatch}
        />
      );
    }
    if (state.screen === 'number_merge') {
      return (
        <NumberMergeScreen
          onComplete={() => dispatch({ type: 'COMPLETE_CLASSROOM_ACTIVITY', game: 'merge' })}
          petSpeciesId={state.pet ? petVisualKey(state.pet) : null}
          onExit={() => dispatch({ type: 'SET_SCREEN', screen: bridgeActive ? 'woodland' : 'home' })}
          onWin={(tokens) => { dispatch({ type: 'AWARD_TOKENS', amount: tokens }); if (bridgeActive) dispatch({ type: 'BRIDGE_MERGE_COMPLETE' }); }}
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
    if (state.screen === 'math_pop') return <MathPop state={state} dispatch={dispatch} execute={popExecute}/>;
    if (state.screen === 'math_stack') return <MathStack state={state} dispatch={dispatch} execute={stackExecute}/>;
    if (state.screen === 'pet_arena') return <PetArena state={state} dispatch={dispatch} execute={arenaExecute}/>;
    if (state.screen === 'battle' && state.battle.active) {
      return <BattleScreen prizeWins={state.prizes?.wins ?? 0} key={state.battle.playerPet.speciesId} battle={state.battle} dispatch={dispatch} matchHistory={state.matchHistory} trophyCase={state.trophyCase} />;
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
          battlesWon={Math.max(state.prizes?.wins ?? 0, state.player.pvpRecord?.totalWins ?? 0)}
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
          <MathScreen
            receipts={state.economy?.receipts}
            tokens={state.player.currencies.tokens}
            mathReward={Math.round(10 * (1 + (state.player.powerForge?.forge_math_reward ?? 0) / 10))}
            pendingXP={state.economy?.pendingXP}
            checkpoint={state.practiceCheckpoint}
            reviews={state.skillReviews}
            adventure={state.firstAdventure}
            dispatch={dispatch}
            onExit={() => dispatch({ type: 'SET_SCREEN', screen: bridgeActive ? 'woodland' : 'home' })}
            initialStreak={state.player.streaks.correctAnswers}
            speciesId={state.pet?.speciesId ?? 'koala_sprite'}
          />
        </>
      );
    }
    if (state.screen === 'catch_math') {
      return (
        <>
          <CatchNumberScreen
            dispatch={dispatch}
            pet={state.pet}
            initialStreak={state.player.streaks.correctAnswers}
            onExit={() => dispatch({ type: 'SET_SCREEN', screen: bridgeActive ? 'woodland' : 'home' })}
          />
        </>
      );
    }
    if (state.pet && state.screen === 'home') {
      return (
        <>
          {!studentPilot && <FeatureHUD state={state} dispatch={dispatch} />}
          <GameSceneShell
            nextGoal={<NextAdventure state={state} dispatch={dispatch}/>}
            pet={state.pet}
            learner={learnerFacts}
            currentRoom={state.currentRoom}
            homeBase={state.homeBase ?? createHomeBase(state)}
            playerTokens={state.player.currencies.tokens}
            mp={state.player.currencies.mp}
            mpLifetime={state.player.currencies.mpLifetime}
            mathBuffs={state.player.mathBuffs}
            showPower={unlockedFeatures(state).has('forge')}
            dailyGoals={state.dailyGoals}
            lifetimeMathCorrect={state.player.lifetimeMathCorrect}
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
            home={state.currentRoom === 'inside' ? state.homeBase ?? createHomeBase(state) : undefined}
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
          <IncubationScreen
            onPlay={() => dispatch({ type: 'SET_SCREEN', screen: 'arcade' })}
            key={state.egg.id}
            egg={state.egg}
            onTap={() => dispatch({ type: 'TAP_EGG' })}
            onHatch={() => dispatch({ type: 'HATCH_EGG' })}
            onChoose={!studentPilot && (state.devPreview || !state.eggDiscovery) ? speciesId => dispatch({ type: 'CHOOSE_COMPANION_EGG', speciesId }) : undefined}
            ownedSpecies={(state.companionRoster ?? []).map(p => p.speciesId)}
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
    <LearningContext.Provider value={state.learning}>
    <LearningActionContext.Provider value={dispatch}>
    <SkillReviewContext.Provider value={state.skillReviews ?? []}>
    <ActivePetContext.Provider value={state.pet}>
      {studentPilot ? <StudentShell state={state} engine={engine} flush={studentFlush} assignment={studentAssignment} tools={studentTools} onActivity={setStudentActive}>
      <div key={`${state.learnerProfileId ?? 'default'}-${state.screen}-${state.activityRoute ?? ''}-${state.devPreview ? 'preview' : 'player'}`} className={`screen-reveal ${bridgeActive && state.woodland?.route === 'catch' ? 'bridge-session' : ''}`}>
        <Suspense fallback={<div role="status" className="min-h-dvh bg-slate-950 text-white grid place-items-center">Loading your activity…</div>}>
          {bridgeActive && <div className="woodland-return"><span role="status">Bridge mission · {state.woodland?.route === 'catch' ? `${state.woodland.deliveries.length}/3 supply deliveries` : 'Build a winning board'}</span><button onClick={() => dispatch({ type: 'OPEN_WOODLAND' })}>Back to bridge</button></div>}
          {renderScreen()}
        </Suspense>
      </div>
      </StudentShell> : <>
      <div key={`${state.learnerProfileId ?? 'default'}-${state.screen}-${state.activityRoute ?? ''}-${state.devPreview ? 'preview' : 'player'}`} className={`screen-reveal ${bridgeActive && state.woodland?.route === 'catch' ? 'bridge-session' : ''}`}>
        <Suspense fallback={<div role="status" className="min-h-dvh bg-slate-950 text-white grid place-items-center">Loading your activity…</div>}>
          {bridgeActive && <div className="woodland-return"><span role="status">Bridge mission · {state.woodland?.route === 'catch' ? `${state.woodland.deliveries.length}/3 supply deliveries` : 'Build a winning board'}</span><button onClick={() => dispatch({ type: 'OPEN_WOODLAND' })}>Back to bridge</button></div>}
          {renderScreen()}
        </Suspense>
      </div>
      </>}
      <HelpProvider
        showButton={(!studentPilot || studentActive) && !showTeacher && state.screen !== 'home_builder' && state.screen !== 'battle' && state.screen !== 'run_encounter'}
        helpState={state.help}
        dispatch={dispatch}
      >
        {/* HelpProvider renders its own overlays; children slot is unused but required */}
        <></>
      </HelpProvider>
      {/* Intro tutorial — only fires when explicitly requested via SHOW_ONBOARDING (dev tools / help panel) */}
      {(!studentPilot || studentActive) && state.pet && (
        <OnboardingGate
          showOnboarding={state.showOnboarding === true}
          dispatch={dispatch}
        />
      )}
      {/* Pre-battle warmup — math question before every wild battle */}
      {(!studentPilot || studentActive) && state.pendingBattleWarmup && (
        <PreBattleWarmup
          difficulty={Math.min(3, Math.max(1, Math.floor((state.pet?.progression.level ?? 1) / 5) + 1))}
          dispatch={dispatch}
        />
      )}
      <AchievementPopup notifications={state.notifications} dispatch={dispatch} muted={(studentPilot && !studentActive) || showTeacher || state.screen === 'home_builder' || state.learning.schoolSafe !== false && (state.screen === 'woodland' || bridgeActive)} />
      {!studentPilot && !(import.meta.env.MODE === 'offline' && state.screen === 'home') && ['home', 'incubation', 'play', 'discovery', 'growth', 'woodland', 'pet_care'].includes(state.screen) && <button className="fixed right-3 top-3 z-[70] min-h-11 rounded-xl border border-teal-500/50 bg-slate-950/95 text-teal-200 px-4 text-sm font-bold" onClick={() => setShowTeacher(true)}>Teacher dashboard</button>}
      {!studentPilot && state.pet && state.mode === 'normal' && ['home', 'play'].includes(state.screen) && !state.interaction.careGameActive && !state.interaction.isInteracting && <PrizeStudio state={state} dispatch={dispatch}/>}
      {!studentPilot && showTeacher && <Suspense fallback={<div role="status" className="fixed inset-0 z-[150] bg-slate-950 text-white grid place-items-center">Opening teacher dashboard…</div>}><TeacherDashboard key={`${state.learnerProfileId ?? state.player.id}-${state.devPreview || state.mode === 'test' ? 'preview' : 'learner'}`} state={state} dispatch={dispatch} learners={{ ...(DEMO_MODE ? demoLearners(state) : readLearnerIndex()), activeId: state.learnerProfileId ?? 'default' }} onSelectLearner={id => DEMO_MODE ? selectDemoLearner(engine, id) : selectLearner(engine, id)} onCreateLearner={label => DEMO_MODE ? createDemoLearner(engine, label) : createLearner(engine, label)} onSave={settings => { if (DEMO_MODE) { dispatch({ type: 'SET_LEARNING_SETTINGS', settings }); return { status: 'saved' }; } return saveTeacherSettings(engine, settings); }} onClose={() => setShowTeacher(false)} /></Suspense>}
      {!studentPilot && saveError && <div role="alert" className="fixed bottom-0 inset-x-0 z-[200] bg-amber-100 text-amber-950 p-3 text-center">{saveError}</div>}
      {!studentPilot && !showTeacher && <DeveloperMenu state={state} dispatch={action => { setShowTeacher(false); setIsFeeding(false); setShowCombatPicker(false); dispatch(DEMO_MODE && action.type === 'DEV_PREVIEW_STATE' ? { ...action, state: { ...action.state, learnerProfileId: state.learnerProfileId } } : action); }} onTeacher={() => setShowTeacher(true)} />}
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
      {!studentPilot && isDevModeEnabled() && <DevToolsOverlay engine={engine} state={state} dispatch={action => { if (action.type === 'DEV_JUMP_SCREEN') { setShowTeacher(false); setIsFeeding(false); setShowCombatPicker(false); } dispatch(action); }} />}
    </ActivePetContext.Provider>
    </SkillReviewContext.Provider>
    </LearningActionContext.Provider>
    </LearningContext.Provider>
  );
}

export default App;
