import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameEngineAction } from '../engine/core/ActionTypes';
import { useRoomPetController } from '../hooks/useRoomPetController';
import {
  INTERACTION_POINTS,
  nearestInteraction,
  OBJECT_COLLIDERS,
  FLOOR_RECT,
  type InteractionPoint,
} from '../config/warmRoomLayout';
import { AccessoryLayer } from '../components/pet/AccessoryLayer';
import { CareGameOverlay } from '../components/care-games/CareGameOverlay';
import { findCosmetic } from '../config/cosmeticConfig';
import type { CosmeticSlot, CosmeticState } from '../types/cosmetic';
import type { InteractionState } from '../types/interaction';

interface WarmHomeSceneReviewProps {
  dispatch: (action: GameEngineAction) => void;
  petSpriteSrc?: string;
  debugOverlay?: boolean;
  equippedCosmetics?: Partial<Record<CosmeticSlot, string | null>>;
  interaction?: InteractionState;
  cosmetics?: CosmeticState;
  petId?: string;
}

const ASSET_BASE = '/assets/generated/final/environment/indoor/warm';
const PROPS_BASE = `${ASSET_BASE}/props`;
const ICON_BASE = '/assets/generated/final';

export const WarmHomeSceneReview: React.FC<WarmHomeSceneReviewProps> = ({
  dispatch,
  petSpriteSrc = '/assets/pets/blue-koala/portrait.png',
  debugOverlay = false,
  equippedCosmetics,
  interaction,
  cosmetics,
  petId,
}) => {
  const goHome = () => dispatch({ type: 'SET_SCREEN', screen: 'home' });
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const careActive = !!interaction?.careGameActive;
  const { pose, moveTo, walkToInteraction } = useRoomPetController({
    wander: true,
    paused: careActive,
  });

  // In-scene radial care menu — opens when the player taps the pet.
  const [radialOpen, setRadialOpen] = useState(false);
  const openRadial = useCallback(() => {
    if (!careActive) setRadialOpen(true);
  }, [careActive]);
  const closeRadial = useCallback(() => setRadialOpen(false), []);
  const handleRadialPick = useCallback(
    (mode: 'pet' | 'wash' | 'brush' | 'comfort' | 'train' | 'play') => {
      closeRadial();
      dispatch({ type: 'SET_HAND_MODE', mode });
      dispatch({ type: 'START_PET_INTERACTION', mode });
    },
    [dispatch, closeRadial]
  );

  // Reward state — shown after a successful care mini-game (quality ≥ 0.7).
  // Preview previews a cosmetic on the pet; Equip swaps it in via dispatch.
  const [rewardCosmeticId, setRewardCosmeticId] = useState<string | null>(null);
  const rewardCosmetic = rewardCosmeticId ? findCosmetic(rewardCosmeticId) : null;
  const previewedCosmetics = useMemo<
    Partial<Record<CosmeticSlot, string | null>> | undefined
  >(() => {
    if (!rewardCosmetic) return equippedCosmetics;
    return { ...(equippedCosmetics ?? {}), [rewardCosmetic.slot]: rewardCosmetic.id };
  }, [equippedCosmetics, rewardCosmetic]);

  const pickRewardCosmetic = useCallback((): string | null => {
    if (!cosmetics || !equippedCosmetics) return null;
    // Prefer an owned-but-not-equipped cosmetic the player has on hand.
    const equippedIds = new Set(
      Object.values(equippedCosmetics).filter(Boolean) as string[]
    );
    const candidates = cosmetics.owned
      .map((e) => findCosmetic(e.cosmeticId))
      .filter((c): c is NonNullable<typeof c> => !!c && !equippedIds.has(c.id));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }, [cosmetics, equippedCosmetics]);

  const handleCareGameComplete = useCallback(
    (quality: number) => {
      const mode = interaction?.activeMode ?? 'idle';
      if (mode !== 'idle') {
        dispatch({ type: 'CARE_GAME_COMPLETE', mode, quality });
      }
      dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
      if (quality >= 0.7) {
        const pick = pickRewardCosmetic();
        if (pick) setRewardCosmeticId(pick);
      }
    },
    [interaction?.activeMode, dispatch, pickRewardCosmetic]
  );

  const handleCareGameCancel = useCallback(() => {
    dispatch({ type: 'END_PET_INTERACTION' });
    dispatch({ type: 'SET_HAND_MODE', mode: 'idle' });
  }, [dispatch]);

  const handleEquipReward = useCallback(() => {
    if (!rewardCosmeticId || !petId) return;
    dispatch({ type: 'EQUIP_COSMETIC', petId, cosmeticId: rewardCosmeticId });
    setRewardCosmeticId(null);
  }, [rewardCosmeticId, petId, dispatch]);

  const handleDismissReward = useCallback(() => setRewardCosmeticId(null), []);

  // Auto-dismiss the reward card after 8s if the player doesn't act.
  useEffect(() => {
    if (!rewardCosmeticId) return;
    const t = window.setTimeout(() => setRewardCosmeticId(null), 8000);
    return () => window.clearTimeout(t);
  }, [rewardCosmeticId]);

  const handleFloorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = 100 - ((e.clientY - rect.top) / rect.height) * 100;
      moveTo(xPct, yPct);
    },
    [moveTo]
  );

  const handleObjectClick = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const point = INTERACTION_POINTS.find((p) => p.id === id);
      if (!point) return;
      walkToInteraction(id, point.anchor);
    },
    [walkToInteraction]
  );

  const activeInteraction: InteractionPoint | null = useMemo(() => {
    if (pose.interactionId) {
      return INTERACTION_POINTS.find((p) => p.id === pose.interactionId) ?? null;
    }
    if (pose.state === 'idle') return nearestInteraction(pose.x, pose.y);
    return null;
  }, [pose.x, pose.y, pose.state, pose.interactionId]);

  // Invisible floor click surface — only the walkable area receives taps.
  // Using a polygon/rect limits the floor to its true extent so clicks on
  // the wall zone don't route to moveTo.
  const floorSurfaceStyle: React.CSSProperties = {
    left: `${FLOOR_RECT.xMin}%`,
    right: `${100 - FLOOR_RECT.xMax}%`,
    bottom: `${FLOOR_RECT.yMin - 4}%`,
    top: `${100 - FLOOR_RECT.yMax - 4}%`,
    zIndex: 12,
    cursor: 'pointer',
  };

  return (
    <div
      ref={sceneRef}
      className="fixed inset-0 overflow-hidden bg-wood-900 select-none"
      data-testid="warm-home-scene-review"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ========= LAYER 1: BACK WALL + FLOOR ========= */}
      <div
        className="absolute inset-x-0 top-0 pixelated"
        style={{
          height: '58%',
          backgroundImage: `url(${ASSET_BASE}/wall_panel_warm.png)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '64px 64px',
          imageRendering: 'pixelated',
          zIndex: 1,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 pixelated"
        style={{
          height: '42%',
          backgroundImage: `url(${ASSET_BASE}/floor_warm.png)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '64px 64px',
          imageRendering: 'pixelated',
          zIndex: 1,
        }}
        aria-hidden
      />

      {/* ========= LAYER 2: WALL-MOUNTED DECOR ========= */}
      <div
        className="absolute inset-x-0 top-0 pixelated"
        style={{
          height: '24px',
          backgroundImage: `url(${PROPS_BASE}/prop_ceiling_beam.png)`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: '64px 24px',
          imageRendering: 'pixelated',
          zIndex: 4,
        }}
        aria-hidden
      />

      {/* Sconces — moved down to mantle height so they sit beside the fireplace
          as proper room lighting, not crammed under the HUD. */}
      <img
        src={`${PROPS_BASE}/prop_wall_sconce.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '4%',
          top: '22%',
          width: '32px',
          height: '48px',
          imageRendering: 'pixelated',
          zIndex: 4,
        }}
      />
      <img
        src={`${PROPS_BASE}/prop_wall_sconce.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          right: '4%',
          top: '22%',
          width: '32px',
          height: '48px',
          imageRendering: 'pixelated',
          zIndex: 4,
          transform: 'scaleX(-1)',
        }}
      />

      <img
        src={`${PROPS_BASE}/prop_window.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          right: '4%',
          top: '10%',
          width: '72px',
          height: '72px',
          imageRendering: 'pixelated',
          zIndex: 4,
        }}
      />

      {/* Painting on left wall above bookshelf — balances window on right */}
      <img
        src={`${PROPS_BASE}/prop_painting.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '5%',
          top: '10%',
          width: '64px',
          height: '56px',
          imageRendering: 'pixelated',
          zIndex: 4,
        }}
      />

      {/* ========= LAYER 3: WALL/FLOOR SEAM + BASEBOARD ========= */}
      <div
        className="absolute inset-x-0"
        style={{ top: '58%', height: '3px', background: '#0a0604', zIndex: 3 }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0"
        style={{
          top: '58%',
          marginTop: '3px',
          height: '14px',
          background: 'linear-gradient(180deg,#5a3a1a 0%,#3a2415 40%,#1a0e06 100%)',
          borderTop: '1px solid #8b5a2b',
          borderBottom: '1px solid #000',
          zIndex: 3,
        }}
        aria-hidden
      />

      {/* ========= LAYER 4: FIREPLACE (focal) — clickable ========= */}
      <button
        type="button"
        data-obj="fireplace"
        aria-label="Warm by the fireplace"
        onClick={handleObjectClick('fireplace')}
        className="absolute pixelated p-0 m-0 border-0 bg-transparent"
        style={{
          left: '50%',
          top: '20%',
          width: '144px',
          height: '144px',
          transform: 'translateX(-50%)',
          imageRendering: 'pixelated',
          zIndex: 5,
          cursor: 'pointer',
        }}
      >
        <img
          src={`${ASSET_BASE}/fireplace_warm_trimmed.png`}
          alt=""
          aria-hidden
          className="pixelated block"
          style={{ width: '144px', height: '144px', imageRendering: 'pixelated' }}
        />
      </button>

      <img
        src={`${PROPS_BASE}/prop_mantle_clock.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '50%',
          top: '18.5%',
          width: '36px',
          height: '36px',
          transform: 'translateX(-50%)',
          imageRendering: 'pixelated',
          zIndex: 6,
        }}
      />
      <img
        src={`${PROPS_BASE}/prop_candle.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '50%',
          marginLeft: '-62px',
          top: '17%',
          width: '28px',
          height: '40px',
          imageRendering: 'pixelated',
          zIndex: 6,
          animation: 'vpetCandleStep 1.4s ease-in-out infinite',
          animationPlayState: careActive ? 'paused' : 'running',
        }}
      />
      <img
        src={`${PROPS_BASE}/prop_candle.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '50%',
          marginLeft: '34px',
          top: '17%',
          width: '28px',
          height: '40px',
          imageRendering: 'pixelated',
          zIndex: 6,
          animation: 'vpetCandleStep 1.9s ease-in-out infinite',
        }}
      />

      {/* ========= LAYER 5: LEFT GROUP — bookshelf + hearth tools ========= */}
      <button
        type="button"
        data-obj="bookshelf"
        aria-label="Read at the bookshelf"
        onClick={handleObjectClick('bookshelf')}
        className="absolute pixelated p-0 m-0 border-0 bg-transparent"
        style={{
          left: '3%',
          bottom: '40%',
          width: '96px',
          height: '144px',
          imageRendering: 'pixelated',
          zIndex: 4,
          cursor: 'pointer',
        }}
      >
        <img
          src={`${PROPS_BASE}/prop_bookshelf.png`}
          alt=""
          aria-hidden
          className="pixelated block"
          style={{ width: '96px', height: '144px', imageRendering: 'pixelated' }}
        />
      </button>

      {/* Log pile — tucked just to the left of the fireplace base (hearth companion) */}
      <img
        src={`${PROPS_BASE}/prop_log_pile.png`}
        alt=""
        aria-hidden
        className="absolute pixelated"
        style={{
          left: '26%',
          bottom: '22%',
          width: '56px',
          height: '38px',
          imageRendering: 'pixelated',
          zIndex: 7,
        }}
      />

      {/* ========= LAYER 6: RIGHT GROUP — stool + plant ========= */}
      <button
        type="button"
        data-obj="stool"
        aria-label="Sit on the stool"
        onClick={handleObjectClick('stool')}
        className="absolute pixelated p-0 m-0 border-0 bg-transparent"
        style={{
          right: '22%',
          bottom: '22%',
          width: '40px',
          height: '40px',
          imageRendering: 'pixelated',
          zIndex: 7,
          cursor: 'pointer',
        }}
      >
        <img
          src={`${PROPS_BASE}/prop_stool.png`}
          alt=""
          aria-hidden
          className="pixelated block"
          style={{ width: '40px', height: '40px', imageRendering: 'pixelated' }}
        />
      </button>
      <button
        type="button"
        data-obj="plant"
        aria-label="Inspect the plant"
        onClick={handleObjectClick('plant')}
        className="absolute pixelated p-0 m-0 border-0 bg-transparent"
        style={{
          right: '4%',
          bottom: '24%',
          width: '48px',
          height: '60px',
          imageRendering: 'pixelated',
          zIndex: 7,
          cursor: 'pointer',
        }}
      >
        <img
          src={`${PROPS_BASE}/prop_plant_pot.png`}
          alt=""
          aria-hidden
          className="pixelated block"
          style={{ width: '48px', height: '60px', imageRendering: 'pixelated' }}
        />
      </button>

      {/* ========= LAYER 7: LIGHTING — fire glow on floor + window rim ========= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 260px 180px at 50% 38%, rgba(251,191,36,0.22), transparent 65%)',
          mixBlendMode: 'screen',
          zIndex: 8,
        }}
        aria-hidden
      />
      {/* Warm patch on the floor directly in front of the fireplace */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          bottom: '6%',
          width: '220px',
          height: '70px',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse 110px 35px at 50% 50%, rgba(251,146,60,0.28), transparent 75%)',
          mixBlendMode: 'screen',
          zIndex: 8,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 140px 180px at 92% 20%, rgba(147,197,253,0.16), transparent 60%)',
          mixBlendMode: 'screen',
          zIndex: 8,
        }}
        aria-hidden
      />

      {/* ========= LAYER 8: FLOOR CLICK SURFACE (invisible, above floor, below pet) ========= */}
      <div
        aria-hidden
        onClick={handleFloorClick}
        className="absolute"
        style={floorSurfaceStyle}
      />

      {/* ========= LAYER 9: INTERACTION INDICATOR ========= */}
      {activeInteraction && (
        <InteractionHint point={activeInteraction} active={pose.state === 'interacting'} />
      )}

      {/* ========= LAYER 10: PET + CONTACT SHADOW ========= */}
      <Pet
        x={pose.x}
        y={pose.y}
        state={pose.state}
        facing={pose.facing}
        interactionId={pose.interactionId}
        src={petSpriteSrc}
        equippedCosmetics={previewedCosmetics}
        paused={careActive}
      />

      {/* Pet tap-zone — opens radial care menu. Sits above floor-click surface. */}
      {!careActive && (
        <button
          type="button"
          aria-label="Interact with pet"
          data-testid="warm-pet-tap"
          onClick={(e) => {
            e.stopPropagation();
            openRadial();
          }}
          className="absolute"
          style={{
            left: `${pose.x}%`,
            bottom: `${pose.y}%`,
            width: '72px',
            height: '96px',
            transform: 'translate(-50%, 0)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            zIndex: 16,
          }}
        />
      )}

      {/* Radial care menu — 6 actions circling the pet. */}
      {radialOpen && !careActive && (
        <RadialCareMenu
          anchorX={pose.x}
          anchorY={pose.y}
          onPick={handleRadialPick}
          onDismiss={closeRadial}
        />
      )}

      {/* Reward card — post-care cosmetic preview + one-tap equip */}
      {rewardCosmetic && (
        <RewardCard
          cosmetic={rewardCosmetic}
          onEquip={handleEquipReward}
          onDismiss={handleDismissReward}
        />
      )}

      {/* Dim overlay + care mini-game when active */}
      {careActive && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 15 }}
        />
      )}
      {interaction && (
        <CareGameOverlay
          interaction={interaction}
          scale={1}
          onComplete={handleCareGameComplete}
          onCancel={handleCareGameCancel}
        />
      )}

      {/* ========= LAYER 11: VIGNETTE ========= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 500px 700px at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
          zIndex: 14,
        }}
        aria-hidden
      />

      {/* ========= LAYER 12: UI ========= */}
      <div data-ui onClick={(e) => e.stopPropagation()}>
        <WarmTopHUD />
        <WarmHotbar />
        <button
          type="button"
          onClick={goHome}
          data-testid="warm-preview-back"
          className="absolute top-3 right-3 z-50 font-sans font-black tracking-[0.1em] uppercase text-wood-50 bg-wood-800 border-2 border-wood-600 rounded-xl px-3 py-1.5 text-xs shadow-btnSecondary hover:brightness-110 active:translate-y-1 active:shadow-none transition-transform"
        >
          ← Back
        </button>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 font-sans text-[9px] uppercase tracking-[0.1em] text-wood-300/60 pointer-events-none z-50"
        style={{ bottom: '2px' }}
        aria-hidden
      >
        Warm scene · Phase C
      </div>

      {debugOverlay && <DebugOverlay />}
    </div>
  );
};

// --------------------------------------------------------------------------
// PET — sprite-sheet animated (idle / walking / interaction-specific),
// foot anchor aligns to ground, flat pixel contact shadow under feet.
// --------------------------------------------------------------------------
const PET_SHEETS: Record<string, { url: string; duration: number }> = {
  idle: { url: '/assets/pets/blue-koala/mood/idle-sheet.png',   duration: 2400 },
  walk: { url: '/assets/pets/blue-koala/walking/sheet.png',     duration: 720  },
  warm: { url: '/assets/pets/blue-koala/mood/drink-sheet.png',  duration: 1800 },
  read: { url: '/assets/pets/blue-koala/eating/sheet.png',      duration: 1800 },
};

function pickSheet(
  state: 'idle' | 'walking' | 'interacting',
  interactionId: string | null
): { url: string; duration: number } {
  if (state === 'walking') return PET_SHEETS.walk;
  if (state === 'interacting') {
    if (interactionId === 'fireplace') return PET_SHEETS.warm;
    if (interactionId === 'bookshelf') return PET_SHEETS.read;
  }
  return PET_SHEETS.idle;
}

interface PetProps {
  x: number;
  y: number;
  state: 'idle' | 'walking' | 'interacting';
  facing: 'left' | 'right';
  interactionId: string | null;
  src: string; // kept for API compat; sheets drive visuals
  equippedCosmetics?: Partial<Record<CosmeticSlot, string | null>>;
  paused?: boolean;
}

const PET_SCALE = 0.875; // 128 native → 112 rendered

const Pet: React.FC<PetProps> = ({ x, y, state, facing, interactionId, equippedCosmetics, paused }) => {
  const sheet = pickSheet(state, interactionId);
  const scaleX = facing === 'left' ? -1 : 1;
  // 16 frames of 128x128 rendered at 112x112 → bg-size 1792x112.
  // vpetSheet16 shifts 0 → -1792 in 16 discrete steps over `duration`.
  const sheetWidth = 16 * 112;

  return (
    <div
      className="absolute pointer-events-none"
      data-testid="warm-pet"
      data-pet-state={state}
      data-pet-x={x.toFixed(1)}
      data-pet-y={y.toFixed(1)}
      data-pet-facing={facing}
      data-pet-iid={interactionId ?? ''}
      style={{
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translateX(-50%)',
        zIndex: 13,
        transition: 'none',
        width: '112px',
        height: '78px',
      }}
    >
      {/* 112×112 relative frame; the sprite has 34px of transparent bottom
          padding so we pull the frame up by -34px so the pet's feet align
          with the container bottom. AccessoryLayer positions relative to
          this frame's center, matching PetSprite's layering convention. */}
      <div
        className="relative"
        style={{ width: '112px', height: '112px', marginBottom: '-34px' }}
      >
        {equippedCosmetics && (
          <AccessoryLayer equipped={equippedCosmetics} scale={PET_SCALE} behind />
        )}
        <div
          aria-label="Pet"
          className="pixelated block absolute inset-0"
          style={{
            backgroundImage: `url(${sheet.url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${sheetWidth}px 112px`,
            backgroundPosition: '0 0',
            imageRendering: 'pixelated',
            animation: `vpetSheet16 ${sheet.duration}ms steps(16) infinite`,
            animationPlayState: paused ? 'paused' : 'running',
            transform: `scaleX(${scaleX})`,
          }}
        />
        {equippedCosmetics && (
          <AccessoryLayer equipped={equippedCosmetics} scale={PET_SCALE} />
        )}
      </div>
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '0px',
          width: '48px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
        }}
      />
    </div>
  );
};

// --------------------------------------------------------------------------
// RADIAL CARE MENU — 6 care actions circling the pet. Tap one to START.
// --------------------------------------------------------------------------
type RadialMode = 'pet' | 'wash' | 'brush' | 'comfort' | 'train' | 'play';
interface RadialEntry {
  mode: RadialMode;
  icon: string;
  label: string;
}
const RADIAL_ENTRIES: RadialEntry[] = [
  { mode: 'pet',     icon: '🤚', label: 'Pet' },
  { mode: 'wash',    icon: '🫧', label: 'Wash' },
  { mode: 'brush',   icon: '🪮', label: 'Brush' },
  { mode: 'comfort', icon: '💖', label: 'Comfort' },
  { mode: 'train',   icon: '🎯', label: 'Train' },
  { mode: 'play',    icon: '🎾', label: 'Play' },
];
interface RadialCareMenuProps {
  anchorX: number;
  anchorY: number;
  onPick: (mode: RadialMode) => void;
  onDismiss: () => void;
}
const RadialCareMenu: React.FC<RadialCareMenuProps> = ({ anchorX, anchorY, onPick, onDismiss }) => {
  const radius = 72;
  return (
    <>
      {/* Click-outside scrim to dismiss */}
      <div
        aria-hidden
        onClick={onDismiss}
        className="absolute inset-0"
        style={{ zIndex: 40, background: 'rgba(0,0,0,0.25)' }}
      />
      <div
        className="absolute pointer-events-none"
        data-testid="warm-radial-menu"
        style={{
          left: `${anchorX}%`,
          bottom: `${anchorY + 6}%`,
          transform: 'translate(-50%, 50%)',
          width: '1px',
          height: '1px',
          zIndex: 41,
        }}
      >
        {RADIAL_ENTRIES.map((entry, i) => {
          // Distribute across the upper arc (−180° → 0°) so buttons sit ABOVE
          // the pet and don't get buried by the floor/hotbar.
          const angle = Math.PI + (Math.PI * i) / (RADIAL_ENTRIES.length - 1);
          const dx = Math.cos(angle) * radius;
          const dy = Math.sin(angle) * radius;
          return (
            <button
              key={entry.mode}
              type="button"
              data-testid={`warm-radial-${entry.mode}`}
              onClick={(e) => {
                e.stopPropagation();
                onPick(entry.mode);
              }}
              className="absolute pointer-events-auto flex flex-col items-center justify-center rounded-full"
              style={{
                left: `${dx}px`,
                top: `${-dy}px`,
                transform: 'translate(-50%, -50%)',
                width: '48px',
                height: '48px',
                background: 'linear-gradient(180deg,#8b5a2b 0%,#3a2415 100%)',
                border: '2px solid #fbbf24',
                boxShadow: '0 2px 0 #1a0e06, 0 0 12px rgba(251,191,36,0.35)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{entry.icon}</span>
              <span
                className="font-black uppercase text-[7px] tracking-wider leading-none mt-0.5"
                style={{ color: '#fde68a', textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}
              >
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

// --------------------------------------------------------------------------
// REWARD CARD — post-care cosmetic preview with one-tap equip.
// --------------------------------------------------------------------------
interface RewardCardProps {
  cosmetic: { id: string; name: string; icon: string; rarity: string; slot: string };
  onEquip: () => void;
  onDismiss: () => void;
}
const RARITY_TINT: Record<string, string> = {
  common: '#cbd5e1',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};
const RewardCard: React.FC<RewardCardProps> = ({ cosmetic, onEquip, onDismiss }) => {
  const tint = RARITY_TINT[cosmetic.rarity] ?? '#cbd5e1';
  const isImg = cosmetic.icon.startsWith('/');
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
      data-testid="warm-reward-card"
      style={{ bottom: '58px', zIndex: 45 }}
    >
      <div
        className="rounded-xl px-3 py-2 flex items-center gap-3"
        style={{
          background: 'linear-gradient(180deg,#2a1a0d 0%,#1a0e06 100%)',
          border: `2px solid ${tint}`,
          boxShadow: `0 4px 0 #0a0604, 0 0 18px ${tint}66`,
          minWidth: '220px',
        }}
      >
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            width: 36,
            height: 36,
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${tint}`,
          }}
        >
          {isImg ? (
            <img
              src={cosmetic.icon}
              alt=""
              style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
            />
          ) : (
            <span style={{ fontSize: 22, lineHeight: 1 }}>{cosmetic.icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-black uppercase text-[9px] tracking-[0.15em] leading-none"
            style={{ color: tint }}
          >
            {cosmetic.rarity} {cosmetic.slot}
          </div>
          <div
            className="font-black uppercase text-[12px] leading-tight text-wood-50 mt-0.5"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}
          >
            {cosmetic.name}
          </div>
        </div>
        <button
          type="button"
          data-testid="warm-reward-equip"
          onClick={onEquip}
          className="font-sans font-black uppercase tracking-[0.1em] text-[10px] px-2 py-1 rounded-md"
          style={{
            color: '#0a0604',
            background: `linear-gradient(180deg,${tint},${tint}aa)`,
            border: '1px solid rgba(0,0,0,0.6)',
            boxShadow: '0 2px 0 rgba(0,0,0,0.6)',
          }}
        >
          Equip
        </button>
        <button
          type="button"
          data-testid="warm-reward-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="font-sans font-black text-[11px] w-5 h-5 leading-none rounded-md"
          style={{
            color: '#fde68a',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// INTERACTION HINT — label bubble above the object the pet is interacting with.
// --------------------------------------------------------------------------
interface HintProps {
  point: InteractionPoint;
  active: boolean;
}
const InteractionHint: React.FC<HintProps> = ({ point, active }) => {
  return (
    <div
      className="absolute pointer-events-none"
      data-testid={`interaction-hint-${point.id}`}
      data-active={active ? '1' : '0'}
      style={{
        left: `${point.anchor.x}%`,
        bottom: `${point.anchor.y + 12}%`,
        transform: 'translateX(-50%)',
        zIndex: 13,
      }}
    >
      <div
        className="font-sans font-black uppercase text-[9px] tracking-[0.15em] px-2 py-0.5 rounded-md"
        style={{
          color: active ? '#0a0604' : '#fde68a',
          background: active
            ? 'linear-gradient(180deg,#fde68a,#fbbf24)'
            : 'linear-gradient(180deg,#4a2f1a,#2a1a0d)',
          border: '1px solid #8b5a2b',
          boxShadow:
            '0 2px 0 #1a0e06, inset 0 1px 0 rgba(255,255,255,0.2)',
          textShadow: active ? 'none' : '0 1px 0 rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        {active ? `· ${point.label} ·` : point.label}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// DEBUG OVERLAY — shows floor rect + collider boxes + interaction radii.
// Toggle via prop for visual verification of the room model.
// --------------------------------------------------------------------------
const DebugOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }} aria-hidden>
      <div
        className="absolute border border-green-400/60"
        style={{
          left: `${FLOOR_RECT.xMin}%`,
          right: `${100 - FLOOR_RECT.xMax}%`,
          bottom: `${FLOOR_RECT.yMin}%`,
          top: `${100 - FLOOR_RECT.yMax}%`,
          background: 'rgba(34,197,94,0.05)',
        }}
      />
      {OBJECT_COLLIDERS.map((c) => (
        <div
          key={c.id}
          className="absolute border border-red-400/70"
          style={{
            left: `${c.rect.xMin}%`,
            right: `${100 - c.rect.xMax}%`,
            bottom: `${c.rect.yMin}%`,
            top: `${100 - c.rect.yMax}%`,
            background: 'rgba(239,68,68,0.08)',
          }}
        />
      ))}
      {INTERACTION_POINTS.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full border border-sky-300/80"
          style={{
            left: `${p.anchor.x}%`,
            bottom: `${p.anchor.y}%`,
            width: '6px',
            height: '6px',
            transform: 'translate(-50%, 50%)',
            background: '#38bdf8',
          }}
        />
      ))}
    </div>
  );
};

// --------------------------------------------------------------------------
// WARM TOP HUD — pet identity, stat bars, currencies. Pure visual (no state).
// --------------------------------------------------------------------------
const WarmTopHUD: React.FC = () => {
  const bar = (value: number, gradient: string) => (
    <div
      className="relative h-[6px] rounded-full overflow-hidden"
      style={{
        width: '54px',
        background: 'rgba(40,26,16,0.85)',
        border: '1px solid rgba(0,0,0,0.5)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
      }}
    >
      <div
        className="h-full"
        style={{
          width: `${value}%`,
          background: gradient,
          boxShadow: '0 0 6px rgba(251,191,36,0.3)',
        }}
      />
    </div>
  );

  return (
    <div
      className="absolute top-2 left-2 right-[90px] z-40 flex items-center gap-2"
      data-testid="warm-top-hud"
    >
      <div
        className="pixelated flex items-center justify-center rounded-lg"
        style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(180deg,#6b4423 0%,#3a2415 100%)',
          border: '2px solid #8b5a2b',
          boxShadow: '0 2px 0 #2a1a0d, inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <img
          src="/assets/pets/blue-koala/portrait.png"
          alt=""
          style={{ width: '30px', height: '30px', imageRendering: 'pixelated' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-black uppercase tracking-wider text-wood-50 text-[13px] leading-none"
            style={{ textShadow: '0 2px 0 rgba(0,0,0,0.8)' }}
          >
            Koala
          </span>
          <span
            className="font-bold text-[10px] leading-none"
            style={{ color: '#fbbf24', textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}
          >
            Lv.5
          </span>
          <span
            className="font-bold uppercase text-[8px] tracking-[0.15em] leading-none text-wood-300"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.8)' }}
          >
            · happy
          </span>
        </div>
        <div className="flex gap-1 mt-1">
          {bar(82, 'linear-gradient(90deg,#ef4444,#f87171)')}
          {bar(64, 'linear-gradient(90deg,#f97316,#fbbf24)')}
        </div>
        <div className="flex gap-1 mt-1">
          {bar(91, 'linear-gradient(90deg,#ec4899,#f472b6)')}
          {bar(48, 'linear-gradient(90deg,#f59e0b,#fde68a)')}
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// WARM HOTBAR — 7 pixel-beveled wood buttons. Pure visual (no dispatch).
// --------------------------------------------------------------------------
const WarmHotbar: React.FC = () => {
  const actions: Array<{ icon: string; label: string; badge?: string }> = [
    { icon: `${ICON_BASE}/icon_hunger.png`, label: 'Feed', badge: '5' },
    { icon: `${ICON_BASE}/item_teddy_bear.png`, label: 'Play', badge: '4' },
    { icon: `${ICON_BASE}/icon_clean.png`, label: 'Clean', badge: '3' },
    { icon: `${ICON_BASE}/item_pill.png`, label: 'Heal', badge: '8' },
    { icon: `${ICON_BASE}/icon_energy.png`, label: 'Train' },
    { icon: `${ICON_BASE}/effect_hit.png`, label: 'Battle' },
    { icon: `${ICON_BASE}/reward_coin_stack.png`, label: 'Shop' },
  ];

  return (
    <div
      className="absolute bottom-2 inset-x-0 z-40 flex justify-center pointer-events-none"
      data-testid="warm-hotbar"
    >
      <div
        className="pointer-events-auto rounded-2xl px-2 py-1.5 flex items-center gap-1"
        style={{
          background: 'linear-gradient(180deg,#4a2f1a 0%,#2a1a0d 100%)',
          border: '2px solid #8b5a2b',
          boxShadow:
            '0 4px 0 #1a0e06, 0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            className="relative flex flex-col items-center justify-center w-[40px] h-[42px] rounded-md active:translate-y-px transition-transform"
            style={{
              background: 'linear-gradient(180deg,#8b5a2b 0%,#5a3a1a 100%)',
              border: '1px solid #3a2415',
              boxShadow:
                '0 2px 0 #1a0e06, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.3)',
            }}
          >
            <img
              src={a.icon}
              alt={a.label}
              style={{
                width: '20px',
                height: '20px',
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.7))',
              }}
            />
            <span
              className="font-black uppercase text-[6px] tracking-wider mt-0.5 leading-none"
              style={{
                color: '#fde68a',
                textShadow: '0 1px 0 rgba(0,0,0,0.8)',
              }}
            >
              {a.label}
            </span>
            {a.badge && (
              <span
                className="absolute -top-1.5 -right-1 text-[8px] font-black rounded-md px-1 min-w-[14px] text-center leading-[13px]"
                style={{
                  color: '#fef3c7',
                  background: 'linear-gradient(180deg,#7f1d1d,#450a0a)',
                  border: '1px solid #fbbf24',
                  textShadow: '0 0 4px rgba(251,191,36,0.5)',
                }}
              >
                {a.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
