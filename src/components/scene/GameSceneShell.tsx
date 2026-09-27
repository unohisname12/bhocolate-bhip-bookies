import '../../features/home-base/house.css';
import { useRoomLife } from '../../features/home-base/useRoomLife';
import { PetInvite } from '../../features/pet-mind/PetInvite';
import { roomSize } from '../../features/home-base/catalog';
import { MindInspector } from '../../features/pet-mind/MindInspector';
import { BookProp } from '../../features/home-base/BookProp';
import { SavedHomeScene, SavedHomeForeground } from '../../features/home-base/HomeRoomView';
import { HOME_ROOMS } from '../../features/home-base/catalog';
import React, { useState, useCallback, useMemo } from 'react';
import { SceneLayerRenderer, SceneForegroundAccents } from './SceneLayerRenderer';
import { SceneProps } from './SceneProps';
import { SceneStage } from './SceneStage';
import { SceneOverlay } from './SceneOverlay';
import { TopHUD } from './TopHUD';
import { InfoDrawer } from './InfoDrawer';
import { RoomNavigator } from './RoomNavigator';
import { InteractiveObjects } from './InteractiveObjects';
import { EnvironmentalLife } from './EnvironmentalLife';
import { MailboxPopup } from './MailboxPopup';
import { PetSprite } from '../pet/PetSprite';
import { HandCursor } from '../interaction/HandCursor';
import { PetTouchZone } from '../interaction/PetTouchZone';
import { InteractionToolbar } from '../interaction/InteractionToolbar';
import { InteractionVFX } from '../interaction/InteractionVFX';
import { InteractionFeedback } from '../interaction/InteractionFeedback';
import { CareGameOverlay } from '../care-games/CareGameOverlay';
import { InteractionDebug } from '../interaction/InteractionDebug';
import { CharacterPicker } from './CharacterPicker';
import { DailyRitualCard } from './DailyRitualCard';
import { PowerPathStrip } from './PowerPathStrip';
import { getRoomConfig } from '../../config/roomConfig';
import { getSceneConfig } from '../../config/sceneConfig';
import './pet-room-layout.css';
import { useSceneScale } from '../../hooks/useSceneScale';
import { useIdleWander } from '../../hooks/useIdleWander';
import { useHandInteraction } from '../../hooks/useHandInteraction';
import { usePetReaction } from '../../hooks/usePetReaction';
import { usePetOneShot } from '../../hooks/usePetOneShot';
import { useScriptedMove } from '../../hooks/useScriptedMove';
import { getPetIntent, resolveIntentAnimation, type PetIntent } from '../../engine/systems/PetIntentSystem';
import { ANIMATION_DEFAULTS } from '../../config/gameConfig';
import { createDefaultInteractionState } from '../../types/interaction';
import type { Pet } from '../../types';
import type { RoomId } from '../../types/room';
import type { DailyGoals, MailboxState } from '../../types/engine';
import type { InteractionState } from '../../types/interaction';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import type { CosmeticSlot } from '../../types/cosmetic';
import type { MathBuffs } from '../../types/player';
import type { QuestProgress } from '../../types/quest';
import { isDevModeEnabled } from '../../utils/featureFlags';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { WorldAtmosphere } from './WorldAtmosphere';

interface GameSceneShellProps {
  pet: Pet;
  /** What the pet can remember about the learner beyond its own save slice. */
  learner?: import('../../features/pet-mind/life').LearnerFacts;
  currentRoom: RoomId;
  homeBase: import('../../features/home-base/model').HomeBase;
  playerTokens: number;
  mp: number;
  mpLifetime: number;
  mathBuffs?: MathBuffs;
  showPower?: boolean;
  nextGoal?: React.ReactNode;
  dailyGoals: DailyGoals;
  lifetimeMathCorrect?: number;
  ticketCount: number;
  mailbox: MailboxState;
  interaction?: InteractionState;
  dispatch: (action: GameEngineAction) => void;
  onFeed: () => void;
  /** Icon (URL or emoji) of the last food fed — shown in pet's hand while eating. */
  lastFoodIcon?: string | null;
  /** Cosmetics equipped on this pet (home scene only). */
  equippedCosmetics?: Partial<Record<CosmeticSlot, string | null>>;
  /** Current login streak — displayed in the daily ritual card. */
  loginStreak?: number;
  /** Daily quest progress — drives the Power Path rows. */
  dailyQuests?: QuestProgress[];
  /** Whether to show the daily ritual modal on mount. */
  showDailyRitual?: boolean;
}

/** Mailbox gives a daily reward — check if one is available today */
const hasMailReward = (mailbox: MailboxState): boolean => {
  const today = new Date().toISOString().slice(0, 10);
  return mailbox.lastClaimedDate !== today;
};

/** Compute the reward amount (mirrors reducer logic) */
const getMailReward = (mailbox: MailboxState) => {
  const reward = Math.min(50, 15 + mailbox.totalClaimed * 2);
  return {
    tokens: reward,
    message: mailbox.totalClaimed === 0
      ? 'Welcome! Here\'s a gift to get you started.'
      : `Daily delivery! Day ${mailbox.totalClaimed + 1} reward.`,
  };
};

/**
 * Master assembly — composes all scene layers in z-order to form the
 * full-screen game scene replacing the old PetHomeScreen.
 */
export const GameSceneShell: React.FC<GameSceneShellProps> = ({
  pet,
  learner,
  currentRoom,
  homeBase,
  playerTokens,
  mp,
  mpLifetime,
  mathBuffs,
  showPower,
  nextGoal,
  dailyGoals,
  lifetimeMathCorrect,
  mailbox,
  interaction: interactionProp,
  dispatch,
  onFeed,
  lastFoodIcon,
  equippedCosmetics,
  loginStreak = 0,
  dailyQuests = [],
  showDailyRitual = false,
}) => {
  const room = getRoomConfig(currentRoom);
  const scene = getSceneConfig(currentRoom);
  const sceneViewport = React.useRef<HTMLDivElement>(null);
  const shell = React.useRef<HTMLDivElement>(null);
  const scale = useSceneScale(sceneViewport);
  React.useLayoutEffect(() => {
    const bars = Array.from(document.querySelectorAll('.pilot-savebar, .student-nav, .student-activity-bar'));
    const update = () => {
      const top = Math.max(0, ...bars.map(bar => bar.getBoundingClientRect().bottom));
      shell.current?.style.setProperty('--pet-room-top', `${top}px`);
    };
    const observer = new ResizeObserver(update);
    bars.forEach(bar => observer.observe(bar));
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  const reducedMotion = useReducedMotion();
  const [greeting, setGreeting] = useState(0);
  const [showMailbox, setShowMailbox] = useState(false);
  const [debugHideUI, setDebugHideUI] = useState(false);
  const [debugSprite, setDebugSprite] = useState(false);
  const [debugInteraction, setDebugInteraction] = useState(false);
  const [speciesOverride, setSpeciesOverride] = useState<string | null>(null);
  const displaySpeciesId = speciesOverride ?? pet.type;

  const interaction = interactionProp ?? createDefaultInteractionState();

  // Derive intent-driven animation
  const intent = getPetIntent(pet);
  const animationName = resolveIntentAnimation(intent);

  // One-shot action animations (eating, happy burst, wash) + scripted
  // walks. When a care action fires, the pet walks to the matching
  // activity spot, plays an expressive anim, then walks home.
  const oneShot = usePetOneShot();
  const scripted = useScriptedMove();
  const { moveTo: scriptedMoveTo, release: scriptedRelease } = scripted;
  const { trigger: oneShotTrigger } = oneShot;

  const activitySpots = useMemo(() => {
    const { minX, maxX } = scene.walkBounds;
    const range = maxX - minX;
    return {
      feed:  minX + range * 0.30,
      play:  minX + range * 0.75,
      clean: minX + range * 0.50,
    };
  }, [scene.walkBounds]);

  // Idle wander — paused during sleep/death, care touch, one-shot anim,
  // or scripted movement. When scripted move releases, wander resumes
  // from the scripted final x (no teleport).
  const careActive = interaction.activeMode !== 'idle';
  const wanderPaused = reducedMotion || intent === 'sleep' || intent === 'dead' || careActive
    || oneShot.animName !== null || scripted.x !== null;
  const lastScriptedXRef = React.useRef<number | null>(null);
  if (scripted.x !== null) lastScriptedXRef.current = scripted.x;
  const mindLife = useRoomLife(homeBase.rooms[homeBase.activeRoom]!, currentRoom !== 'inside' || careActive || oneShot.animName !== null || reducedMotion, pet, dispatch, homeBase.activeRoom, undefined, learner);
  const size = roomSize(homeBase.rooms[homeBase.activeRoom]!.tier);
  const petGroundY = currentRoom === 'inside' ? 224 * (1 - (.34 + (mindLife.anchor.y + .5) / size.rows * .56)) : scene.groundY;
  const wander = useIdleWander(scene.walkBounds, wanderPaused || currentRoom === 'inside', lastScriptedXRef);
  const petX = currentRoom === 'inside' ? 28 + (mindLife.anchor.x + .5) / size.cols * 344 : scripted.x ?? wander.x;
  const facingLeft = currentRoom === 'inside' ? false : scripted.x !== null ? scripted.facingLeft : wander.facingLeft;
  const petXRef = React.useRef(petX);
  petXRef.current = petX;

  // Care-action watchers — walk to spot, play anim, walk back home.
  const lastFedAtRef = React.useRef(pet.timestamps.lastFedAt);
  const lastPlayedAtRef = React.useRef(pet.timestamps.lastPlayedAt);
  const lastCleanedAtRef = React.useRef(pet.timestamps.lastCleanedAt);

  const runActivity = React.useCallback(
    async (targetX: number, anim: 'eating' | 'happy' | 'being_washed', holdMs: number) => {
      const startX = petXRef.current;
      await scriptedMoveTo(startX, targetX);
      oneShotTrigger(anim, holdMs);
      await new Promise<void>((resolve) => setTimeout(resolve, holdMs));
      const { minX, maxX } = scene.walkBounds;
      const returnX = minX + Math.random() * (maxX - minX);
      await scriptedMoveTo(targetX, returnX);
      scriptedRelease();
    },
    [scriptedMoveTo, scriptedRelease, oneShotTrigger, scene.walkBounds],
  );

  React.useEffect(() => {
    if (currentRoom !== 'inside' && pet.timestamps.lastFedAt !== lastFedAtRef.current) {
      lastFedAtRef.current = pet.timestamps.lastFedAt;
      void runActivity(activitySpots.feed, 'eating', 3500);
    }
  }, [currentRoom, pet.timestamps.lastFedAt, runActivity, activitySpots.feed]);
  React.useEffect(() => {
    if (currentRoom !== 'inside' && pet.timestamps.lastPlayedAt && pet.timestamps.lastPlayedAt !== lastPlayedAtRef.current) {
      lastPlayedAtRef.current = pet.timestamps.lastPlayedAt;
      void runActivity(activitySpots.play, 'happy', 2500);
    }
  }, [currentRoom, pet.timestamps.lastPlayedAt, runActivity, activitySpots.play]);
  React.useEffect(() => {
    if (currentRoom !== 'inside' && pet.timestamps.lastCleanedAt !== lastCleanedAtRef.current) {
      lastCleanedAtRef.current = pet.timestamps.lastCleanedAt;
      void runActivity(activitySpots.clean, 'being_washed', 2800);
    }
  }, [currentRoom, pet.timestamps.lastCleanedAt, runActivity, activitySpots.clean]);

  // Hand interaction system
  const hand = useHandInteraction({
    scale,
    petX,
    groundY: petGroundY,
    petScale: scene.petScale ?? ANIMATION_DEFAULTS.scale,
  });

  // Keep hand mode in sync with engine state
  const { handMode, setHandMode } = hand;
  React.useEffect(() => {
    const mode = interaction.careGameActive ? 'idle' : interaction.activeMode;
    if (handMode !== mode) {
      setHandMode(mode);
    }
  }, [interaction.activeMode, interaction.careGameActive, handMode, setHandMode]);

  // Pet reaction state machine
  const reaction = usePetReaction(interaction, pet, hand.isOverPet);

  // Override animation priority:
  //   1. One-shot action (eating, happy, being_washed) — highest
  //   2. Scripted walking to/from an activity spot
  //   3. Active care touch (being_petted, being_washed, ...)
  //   4. Care mode selected but not touching — idle
  //   5. Default intent animation
  const displayAnimName = oneShot.animName
    ? oneShot.animName
    : scripted.walking || (currentRoom === 'inside' && !careActive && (mindLife.pet.path.length > 0 || mindLife.motion.moving)) || (!wanderPaused && wander.walking)
      ? 'walking'
      : reaction.reactionAnim
        ? resolveIntentAnimation(reaction.reactionAnim as PetIntent)
        : careActive
          ? 'idle'
          : currentRoom === 'inside' ? mindLife.pet.animation : animationName;

  // Interaction callbacks
  const handleInteract = useCallback((mode: typeof interaction.activeMode) => {
    dispatch({ type: 'START_PET_INTERACTION', mode });
  }, [dispatch]);
  const handleInteractEnd = useCallback(() => {
    dispatch({ type: 'END_PET_INTERACTION' });
  }, [dispatch]);

  const handleCareGameComplete = useCallback((quality: number) => {
    const mode = interaction.activeMode;
    if (mode !== 'idle') {
      dispatch({ type: 'CARE_GAME_COMPLETE', mode, quality });
    }
    dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  }, [interaction.activeMode, dispatch]);

  const handleCareGameCancel = useCallback(() => {
    dispatch({ type: 'END_PET_INTERACTION' });
    dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  }, [dispatch]);

  // Debug mode: press H to toggle UI visibility, D to toggle sprite debug overlay, I for interaction debug
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isDevModeEnabled()) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setDebugHideUI(prev => !prev);
      }
      if (e.key === 'd' || e.key === 'D') {
        setDebugSprite(prev => !prev);
      }
      if (e.key === 'i' || e.key === 'I') {
        setDebugInteraction(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const mailboxHasReward = useMemo(() => hasMailReward(mailbox), [mailbox]);
  const mailReward = useMemo(
    () => (mailboxHasReward ? getMailReward(mailbox) : null),
    [mailbox, mailboxHasReward],
  );

  const handleMailboxClick = useCallback(() => setShowMailbox(true), []);
  const handleMailboxClaim = useCallback(() => dispatch({ type: 'CLAIM_MAILBOX' }), [dispatch]);
  const handleMailboxClose = useCallback(() => setShowMailbox(false), []);

  return (
    <div ref={shell} className="home-shell pet-room-layout">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#28423c_0%,_#0f172a_75%)]" />
      <div className="home-heading"><span className="eyebrow">Auralith • A little world, all yours</span><h1>{currentRoom === 'inside' ? HOME_ROOMS.find(r => r.id === homeBase.activeRoom)!.name : 'A breath of adventure.'}</h1><p>{currentRoom === 'inside' ? 'Your furniture. Your colors. Your companion.' : 'Follow the breeze. See what you and your companion can discover.'}</p></div>
      <div ref={sceneViewport} className="pet-room-viewport"><div id="vpet-scene" className="home-world relative overflow-hidden" style={{ width: 400 * scale, height: 224 * scale }}>
      <div key={currentRoom} className="room-reveal absolute inset-0">
      {/* z-0→4: Layered scene (sky, strips, props, accents) */}
      {currentRoom === 'inside' ? <SavedHomeScene home={homeBase} dispatch={dispatch}/> : <SceneLayerRenderer scene={scene} scale={scale} />}

      {/* z-4: Ambient environmental life effects */}
      {currentRoom !== 'inside' && <EnvironmentalLife currentRoom={currentRoom} scale={scale} />}
      <WorldAtmosphere room={currentRoom} />
      {!careActive && <button className="house-entry-button" onClick={()=>dispatch({type:'HOME_OPEN'})}>{currentRoom==='inside'?'Explore my house →':'Enter my house →'}</button>}

      {/* z-10: Room decoration props */}
      {currentRoom !== 'inside' && <SceneProps props={room.props} />}

      {/* z-15: Interactive scene objects (hotspots) */}
      {currentRoom !== 'inside' && <InteractiveObjects
        currentRoom={currentRoom}
        hasMailboxReward={mailboxHasReward}
        scale={scale}
        dispatch={dispatch}
        onMailboxClick={handleMailboxClick}
      />}

      {/* z-20: Pet grounded on scene floor, idle-wandering */}
      <SceneStage movementMs={currentRoom==='inside'&&!reducedMotion?mindLife.motion.duration:undefined} groundY={petGroundY} scale={scale} petX={petX} facingLeft={facingLeft}
        shadow={scene.shadowConfig} ambientTint={scene.ambientTint} footEmbed={scene.footEmbed}>
        <PetSprite className={currentRoom === 'inside' && !careActive ? `hb-pose-${mindLife.anchor.pose} ${mindLife.motion.facingLeft?'hb-facing-left':''}` : undefined} speciesId={displaySpeciesId} animationName={currentRoom === 'inside' && !careActive && mindLife.anchor.pose === 'sitting' ? 'idle' : displayAnimName} intent={intent} needs={pet.needs}
          scale={(scene.petScale ?? ANIMATION_DEFAULTS.scale) * scale} debug={debugSprite}
          petX={petX} reactionPhase={reaction.phase}
          heldItemIcon={oneShot.animName === 'eating' ? lastFoodIcon ?? null : null}
          equippedCosmetics={equippedCosmetics} />
        {currentRoom === 'inside' && !careActive && mindLife.pet.book && <div className="hb-dashboard-book"><BookProp phase={mindLife.pet.book.phase}/></div>}
        {currentRoom === 'inside' && !careActive && <div className="dashboard-pet-thought" aria-live="polite" data-pet-intention={mindLife.decision?.id ?? 'settling'}>{mindLife.pet.bubble}</div>}
        {greeting > 0 && <div key={greeting} className="pet-greeting" aria-hidden="true"><span>♥</span><span>✦</span><span>♥</span></div>}
      </SceneStage>

      {currentRoom === 'inside' && <SavedHomeForeground home={homeBase} petY={mindLife.pet.y} restingId={mindLife.anchor.pose!=='standing'?mindLife.pet.objectId:undefined}/>}

      {/* z-21: Foreground accents (overlap pet feet for depth) */}
      {currentRoom !== 'inside' && <SceneForegroundAccents scene={scene} scale={scale} />}

      {/* z-23: Pet touch zone (gesture → interaction dispatcher). Pointer
           tracking is now handled globally by the useHandInteraction hook, so
           this component no longer attaches its own pointer handlers. */}
      <PetTouchZone
        petX={petX}
        groundY={petGroundY}
        scale={scale}
        petScale={scene.petScale ?? ANIMATION_DEFAULTS.scale}
        handMode={interaction.careGameActive ? 'idle' : interaction.activeMode}
        gesture={hand.gesture}
        isOverPet={hand.isOverPet}
        onInteract={handleInteract}
        onInteractEnd={handleInteractEnd}
      />

      {/* z-24: Floating hand cursor — position written directly to DOM via
           ref by the hook, so mouse moves don't trigger React re-renders. */}

      {/* z-25: Interaction VFX */}
      <InteractionVFX
        type={reaction.vfxType}
        mode={interaction.activeMode}
        petX={petX}
        groundY={petGroundY}
        scale={scale}
      />

      {/* z-26: Reaction text feedback */}
      <InteractionFeedback
        text={reaction.reactionText}
        petX={petX}
        groundY={petGroundY}
        scale={scale}
      />
      </div>
      </div>
      </div>
      <aside className="pet-room-sidebar" aria-label="Companion controls">
{!debugHideUI && (          <TopHUD pet={pet} playerTokens={playerTokens} mp={mp} mpLifetime={mpLifetime} mathBuffs={mathBuffs} showPower={showPower} />)}
      <section className="home-companion-card px-4 py-3 text-white" aria-label="Pet wellbeing">
        {/* The answer lives in the care panel: the room nav covers the bubble's space and the stage frame hides overlays. */}
        {currentRoom === 'inside' && !careActive && <PetInvite decision={mindLife.decision} bubble={mindLife.pet.bubble} accept={mindLife.together} later={mindLife.later} prompt/>}
        <div className="flex justify-between gap-2 text-xs text-slate-300"><span>Food {Math.round(pet.needs.hunger)}%</span><span>Joy {Math.round(pet.needs.happiness)}%</span><span>Clean {Math.round(pet.needs.cleanliness)}%</span></div>
        <div className="flex items-center justify-between gap-3 mt-2"><div className="min-w-0 flex-1">{nextGoal ?? <p className="text-sm">{dailyGoals.mathSolved < 5 ? `Today: solve ${5 - dailyGoals.mathSolved} more questions together.` : 'Nice practice! Ready for an adventure?'}</p>}</div><button className="min-h-11 px-3 rounded-lg bg-teal-900 text-teal-100 text-sm font-bold" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'math' })} aria-label="Study desk — Math Practice">Practice</button></div>
        <div className="home-quick-actions"><button onClick={onFeed}><img src="/assets/woodland-v1/icon-feed.png" alt="" />Feed</button><button disabled={intent === 'dead' || intent === 'sleep'} onClick={() => { oneShotTrigger('happy', 1600); setGreeting(n => n + 1); }}><img src="/assets/woodland-v1/icon-heart.png" alt="" />Say hello</button><button onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'pet_care' })}><img src="/assets/woodland-v1/icon-care.png" alt="" />Care</button><button disabled={playerTokens < 50} onClick={() => dispatch({ type: 'BOOST_MOOD' })}>Heal · 50</button></div>
        {isDevModeEnabled() && <MindInspector pet={pet} decision={mindLife.decision}/>}
      </section>
{!debugHideUI && (<>          <InteractionToolbar
            activeMode={interaction.activeMode}
            interaction={interaction}
            pet={pet}
            playerTokens={playerTokens}
            onSelectMode={(mode) => {
              if (mode === 'idle') {
                dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
              } else {
                dispatch({ type: 'START_PET_INTERACTION', mode });
              }
            }}
          />          <InfoDrawer pet={pet} dailyGoals={dailyGoals} lifetimeMathCorrect={lifetimeMathCorrect} /></>)}
      {/* Power Path strip — persistent slim progress chip */}
      {!debugHideUI && dailyQuests.length > 0 && (
        <div className="pet-room-quests">
          <PowerPathStrip dailyQuests={dailyQuests} />
        </div>
      )}
      </aside>
      <HandCursor handRef={hand.setHandEl} animState={hand.handAnimState} isOverPet={hand.isOverPet} active={!interaction.careGameActive && interaction.activeMode !== 'idle'} />


      {/* z-52: Care mini-game overlay */}
      <CareGameOverlay
        interaction={interaction}
        scale={scale}
        onComplete={handleCareGameComplete}
        onCancel={handleCareGameCancel}
      />

      {/* z-28: Atmosphere overlay (scanlines, grid) */}
      <SceneOverlay />

      {/* UI layer — hidden when debug mode active (press H) */}
      {!debugHideUI && (
        <>
          {/* z-30: Top HUD */}


          {/* z-35: Info drawer (collapsible status panel) */}


          {/* z-35→45: Room navigation arrows + dots */}
          <RoomNavigator currentRoom={currentRoom} dispatch={dispatch} />

          {/* z-42: Interaction toolbar (bottom, togglable) */}


        </>
      )}

      {/* z-60: Character picker (dev preview) */}
      {!debugHideUI && isDevModeEnabled() && (
        <CharacterPicker
          currentSpeciesId={displaySpeciesId}
          hasOverride={speciesOverride !== null}
          onSelect={setSpeciesOverride}
        />
      )}

      {/* z-100: Interaction debug panel (toggle with I key) */}
      {debugInteraction && (
        <InteractionDebug
          interaction={interaction}
          pet={pet}
          playerTokens={playerTokens}
          dispatch={dispatch}
          reactionPhase={reaction.phase}
        />
      )}

      {/* z-60: Mailbox popup (modal) */}
      {showMailbox && (
        <MailboxPopup
          reward={mailReward}
          onClaim={handleMailboxClaim}
          onClose={handleMailboxClose}
        />
      )}



      {/* z-60: Daily ritual modal — shown once per new day */}
      {showDailyRitual && (
        <DailyRitualCard
          loginStreak={loginStreak}
          dailyQuests={dailyQuests}
          mathBuffs={mathBuffs ?? { atk: 0, def: 0, hp: 0 }}
          onDismiss={() => dispatch({ type: 'DISMISS_DAILY_RITUAL' })}
          onChoose={(mode) => {
            if (mode === 'math') dispatch({ type: 'SET_SCREEN', screen: 'math' });
            else if (mode === 'momentum') dispatch({ type: 'SET_SCREEN', screen: 'momentum' });
            else dispatch({ type: 'SET_SCREEN', screen: 'number_merge' });
          }}
        />
      )}
    </div>
  );
};
