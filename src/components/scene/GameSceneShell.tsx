import React, { useState, useCallback, useMemo } from 'react';
import { SceneLayerRenderer, SceneForegroundAccents } from './SceneLayerRenderer';
import { SceneProps } from './SceneProps';
import { SceneStage } from './SceneStage';
import { SceneOverlay } from './SceneOverlay';
import { TopHUD } from './TopHUD';
import { InfoDrawer } from './InfoDrawer';
import { RightSidePanel } from './RightSidePanel';
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

interface GameSceneShellProps {
  pet: Pet;
  currentRoom: RoomId;
  playerTokens: number;
  mp: number;
  mpLifetime: number;
  mathBuffs?: MathBuffs;
  dailyGoals: DailyGoals;
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
  currentRoom,
  playerTokens,
  mp,
  mpLifetime,
  mathBuffs,
  dailyGoals,
  ticketCount,
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
  const scale = useSceneScale();
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
  const wanderPaused = intent === 'sleep' || intent === 'dead' || careActive
    || oneShot.animName !== null || scripted.x !== null;
  const lastScriptedXRef = React.useRef<number | null>(null);
  if (scripted.x !== null) lastScriptedXRef.current = scripted.x;
  const wander = useIdleWander(scene.walkBounds, wanderPaused, lastScriptedXRef);
  const petX = scripted.x ?? wander.x;
  const facingLeft = scripted.x !== null ? scripted.facingLeft : wander.facingLeft;
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
    if (pet.timestamps.lastFedAt !== lastFedAtRef.current) {
      lastFedAtRef.current = pet.timestamps.lastFedAt;
      void runActivity(activitySpots.feed, 'eating', 3500);
    }
  }, [pet.timestamps.lastFedAt, runActivity, activitySpots.feed]);
  React.useEffect(() => {
    if (pet.timestamps.lastPlayedAt && pet.timestamps.lastPlayedAt !== lastPlayedAtRef.current) {
      lastPlayedAtRef.current = pet.timestamps.lastPlayedAt;
      void runActivity(activitySpots.play, 'happy', 2500);
    }
  }, [pet.timestamps.lastPlayedAt, runActivity, activitySpots.play]);
  React.useEffect(() => {
    if (pet.timestamps.lastCleanedAt !== lastCleanedAtRef.current) {
      lastCleanedAtRef.current = pet.timestamps.lastCleanedAt;
      void runActivity(activitySpots.clean, 'being_washed', 2800);
    }
  }, [pet.timestamps.lastCleanedAt, runActivity, activitySpots.clean]);

  // Hand interaction system
  const hand = useHandInteraction({
    scale,
    petX,
    groundY: scene.groundY,
    petScale: scene.petScale ?? ANIMATION_DEFAULTS.scale,
  });

  // Keep hand mode in sync with engine state
  React.useEffect(() => {
    if (hand.handMode !== interaction.activeMode) {
      hand.setHandMode(interaction.activeMode);
    }
  }, [interaction.activeMode, hand.handMode, hand.setHandMode]);

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
    : scripted.walking
      ? 'walking'
      : reaction.reactionAnim
        ? resolveIntentAnimation(reaction.reactionAnim as PetIntent)
        : careActive
          ? 'idle'
          : animationName;

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
    <div className="fixed inset-0 overflow-hidden bg-slate-900">
      {/* z-0→4: Layered scene (sky, strips, props, accents) */}
      <SceneLayerRenderer scene={scene} scale={scale} />

      {/* z-4: Ambient environmental life effects */}
      <EnvironmentalLife currentRoom={currentRoom} scale={scale} />

      {/* z-10: Room decoration props */}
      <SceneProps props={room.props} />

      {/* z-15: Interactive scene objects (hotspots) */}
      <InteractiveObjects
        currentRoom={currentRoom}
        hasMailboxReward={mailboxHasReward}
        scale={scale}
        dispatch={dispatch}
        onMailboxClick={handleMailboxClick}
      />

      {/* z-20: Pet grounded on scene floor, idle-wandering */}
      <SceneStage groundY={scene.groundY} scale={scale} petX={petX} facingLeft={facingLeft}
        shadow={scene.shadowConfig} ambientTint={scene.ambientTint} footEmbed={scene.footEmbed}>
        <PetSprite speciesId={displaySpeciesId} animationName={displayAnimName} intent={intent} needs={pet.needs}
          scale={scene.petScale ?? ANIMATION_DEFAULTS.scale} debug={debugSprite}
          petX={petX} reactionPhase={reaction.phase}
          heldItemIcon={oneShot.animName === 'eating' ? lastFoodIcon ?? null : null}
          equippedCosmetics={equippedCosmetics} />
      </SceneStage>

      {/* z-21: Foreground accents (overlap pet feet for depth) */}
      <SceneForegroundAccents scene={scene} scale={scale} />

      {/* z-23: Pet touch zone (gesture → interaction dispatcher). Pointer
           tracking is now handled globally by the useHandInteraction hook, so
           this component no longer attaches its own pointer handlers. */}
      <PetTouchZone
        petX={petX}
        groundY={scene.groundY}
        scale={scale}
        petScale={scene.petScale ?? ANIMATION_DEFAULTS.scale}
        handMode={interaction.activeMode}
        gesture={hand.gesture}
        isOverPet={hand.isOverPet}
        onInteract={handleInteract}
        onInteractEnd={handleInteractEnd}
      />

      {/* z-24: Floating hand cursor — position written directly to DOM via
           ref by the hook, so mouse moves don't trigger React re-renders. */}
      <HandCursor
        handRef={hand.setHandEl}
        animState={hand.handAnimState}
        isOverPet={hand.isOverPet}
        active={interaction.activeMode !== 'idle'}
      />

      {/* z-25: Interaction VFX */}
      <InteractionVFX
        type={reaction.vfxType}
        mode={interaction.activeMode}
        petX={petX}
        groundY={scene.groundY}
        scale={scale}
      />

      {/* z-26: Reaction text feedback */}
      <InteractionFeedback
        text={reaction.reactionText}
        petX={petX}
        groundY={scene.groundY}
        scale={scale}
      />

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
          <TopHUD pet={pet} playerTokens={playerTokens} mp={mp} mpLifetime={mpLifetime} mathBuffs={mathBuffs} />

          {/* z-35: Info drawer (collapsible status panel) */}
          <InfoDrawer pet={pet} dailyGoals={dailyGoals} />

          {/* z-35→45: Room navigation arrows + dots */}
          <RoomNavigator currentRoom={currentRoom} dispatch={dispatch} />

          {/* z-42: Interaction toolbar (bottom, togglable) */}
          <InteractionToolbar
            activeMode={interaction.activeMode}
            interaction={interaction}
            pet={pet}
            playerTokens={playerTokens}
            onSelectMode={(mode) => {
              if (mode === 'idle') {
                dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
              } else {
                dispatch({ type: 'SET_HAND_MODE', mode });
              }
            }}
          />

          {/* z-40: Right side panel (replaces bottom hotbar) */}
          <RightSidePanel
            currentRoom={currentRoom}
            pet={pet}
            ticketCount={ticketCount}
            onFeed={onFeed}
            onHeal={() => dispatch({ type: 'BOOST_MOOD' })}
            onTrain={() => dispatch({ type: 'SET_SCREEN', screen: 'math' })}
            onShop={() => dispatch({ type: 'SET_SCREEN', screen: 'shop' })}
            onBattle={() => dispatch({ type: 'START_BATTLE' })}
            onArena={() => dispatch({ type: 'SET_SCREEN', screen: 'class_roster' })}
            onNumberMerge={() => dispatch({ type: 'SET_SCREEN', screen: 'number_merge' })}
            onMomentum={() => dispatch({ type: 'START_MOMENTUM' })}
            onCatchMath={() => dispatch({ type: 'SET_SCREEN', screen: 'catch_math' })}
            onDungeon={() => dispatch({ type: 'SET_SCREEN', screen: 'run_start' })}
            onCare={() => dispatch({ type: 'SET_SCREEN', screen: 'pet_care' })}
          />
        </>
      )}

      {/* z-60: Character picker (dev preview) */}
      {!debugHideUI && (
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

      {/* Power Path strip — persistent slim progress chip */}
      {!debugHideUI && dailyQuests.length > 0 && (
        <div className="fixed top-16 right-3 z-30 w-[200px] pointer-events-auto">
          <PowerPathStrip dailyQuests={dailyQuests} />
        </div>
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
