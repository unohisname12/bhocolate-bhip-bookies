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
import { getRoomConfig } from '../../config/roomConfig';
import { getSceneConfig } from '../../config/sceneConfig';
import { useSceneScale } from '../../hooks/useSceneScale';
import { useIdleWander } from '../../hooks/useIdleWander';
import { getPetIntent, resolveIntentAnimation } from '../../engine/systems/PetIntentSystem';
import { ANIMATION_DEFAULTS } from '../../config/gameConfig';
import type { Pet } from '../../types';
import type { RoomId } from '../../types/room';
import type { DailyGoals, MailboxState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface GameSceneShellProps {
  pet: Pet;
  currentRoom: RoomId;
  playerTokens: number;
  mp: number;
  mpLifetime: number;
  dailyGoals: DailyGoals;
  ticketCount: number;
  mailbox: MailboxState;
  dispatch: (action: GameEngineAction) => void;
  onFeed: () => void;
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
  dailyGoals,
  ticketCount,
  mailbox,
  dispatch,
  onFeed,
}) => {
  const room = getRoomConfig(currentRoom);
  const scene = getSceneConfig(currentRoom);
  const scale = useSceneScale();
  const [showMailbox, setShowMailbox] = useState(false);
  const [debugHideUI, setDebugHideUI] = useState(false);
  const [debugSprite, setDebugSprite] = useState(false);

  // Derive intent-driven animation
  const intent = getPetIntent(pet);
  const animationName = resolveIntentAnimation(intent);

  // Idle wander — pauses when sleeping or dead
  const wanderPaused = intent === 'sleep' || intent === 'dead';
  const { x: petX, facingLeft } = useIdleWander(scene.walkBounds, wanderPaused);

  // Debug mode: press H to toggle UI visibility, D to toggle sprite debug overlay
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setDebugHideUI(prev => !prev);
      }
      if (e.key === 'd' || e.key === 'D') {
        setDebugSprite(prev => !prev);
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
        <PetSprite speciesId={pet.type} animationName={animationName} intent={intent} needs={pet.needs}
          scale={scene.petScale ?? ANIMATION_DEFAULTS.scale} debug={debugSprite} />
      </SceneStage>

      {/* z-21: Foreground accents (overlap pet feet for depth) */}
      <SceneForegroundAccents scene={scene} scale={scale} />

      {/* z-28: Atmosphere overlay (scanlines, grid) */}
      <SceneOverlay />

      {/* UI layer — hidden when debug mode active (press H) */}
      {!debugHideUI && (
        <>
          {/* z-30: Top HUD */}
          <TopHUD pet={pet} playerTokens={playerTokens} mp={mp} mpLifetime={mpLifetime} />

          {/* z-35: Info drawer (collapsible status panel) */}
          <InfoDrawer pet={pet} dailyGoals={dailyGoals} />

          {/* z-35→45: Room navigation arrows + dots */}
          <RoomNavigator currentRoom={currentRoom} dispatch={dispatch} />

          {/* z-40: Right side panel (replaces bottom hotbar) */}
          <RightSidePanel
            currentRoom={currentRoom}
            pet={pet}
            ticketCount={ticketCount}
            onFeed={onFeed}
            onPlay={() => dispatch({ type: 'PLAY_PET' })}
            onHeal={() => dispatch({ type: 'BOOST_MOOD' })}
            onClean={() => dispatch({ type: 'CLEAN_PET' })}
            onTrain={() => dispatch({ type: 'SET_SCREEN', screen: 'math' })}
            onShop={() => dispatch({ type: 'SET_SCREEN', screen: 'shop' })}
            onBattle={() => dispatch({ type: 'START_BATTLE' })}
            onArena={() => dispatch({ type: 'SET_SCREEN', screen: 'class_roster' })}
            onNumberMerge={() => dispatch({ type: 'SET_SCREEN', screen: 'number_merge' })}
            onDungeon={() => dispatch({ type: 'SET_SCREEN', screen: 'run_start' })}
          />
        </>
      )}

      {/* z-60: Mailbox popup (modal) */}
      {showMailbox && (
        <MailboxPopup
          reward={mailReward}
          onClaim={handleMailboxClaim}
          onClose={handleMailboxClose}
        />
      )}
    </div>
  );
};
