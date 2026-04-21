import type { FoodItem, Pet } from '../../types';
import type { ScreenName } from '../../types/session';
import type { RoomId } from '../../types/room';
import type { TraceTier } from '../../types/trace';
import type { DevToolsAction } from '../../devtools/devToolsActions';
import type { FlashChoice, FusionTarget, MomentumDifficulty } from '../../types/momentum';
import type { HandMode } from '../../types/interaction';
import type { CosmeticSlot } from '../../types/cosmetic';

export type GameEngineAction =
  | { type: 'START_ENGINE' }
  | { type: 'STOP_ENGINE' }
  | { type: 'PAUSE_ENGINE' }
  | { type: 'RESUME_ENGINE' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'ENTER_TEST_MODE' }
  | { type: 'EXIT_TEST_MODE' }
  | { type: 'RESET_TEST_STATE' }
  | { type: 'SET_SCREEN'; screen: ScreenName }
  | { type: 'SET_PET_STATE'; pet: Pet | null }
  | { type: 'SET_EGG'; egg: import('../../types').Egg | null }
  | { type: 'SET_PLAYER'; player: import('../../types').PlayerProfile }
  | { type: 'SET_SESSION'; session: import('../../types').SessionState }
  | { type: 'SET_PET_ANIM'; animationName: string }
  | { type: 'NEXT_FRAME' }
  | { type: 'TOGGLE_AUTOPLAY' }
  | { type: 'FEED_PET'; food: FoodItem }
  | { type: 'CLEAN_PET' }
  | { type: 'PLAY_PET' }
  | { type: 'BOOST_MOOD' }
  | { type: 'TAP_EGG' }
  | { type: 'HATCH_EGG' }
  | { type: 'AWARD_TOKENS'; amount: number }
  | { type: 'SOLVE_MATH'; difficulty: number; correct: boolean; reward: number }
  | { type: 'USE_HINT' }
  | { type: 'PURCHASE_ITEM'; itemId: string; tokenCost: number; coinCost: number }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'EVOLVE_PET' }
  | { type: 'ADD_XP'; amount: number }
  | { type: 'PLACE_ROOM_ITEM'; itemId: string; position: { x: number; y: number } }
  | { type: 'REMOVE_ROOM_ITEM'; itemId: string }
  | { type: 'CHANGE_BACKGROUND'; backgroundId: string }
  | { type: 'CHANGE_ROOM'; roomId: RoomId }
  | { type: 'LOG_EVENT'; eventType: string; payload?: Record<string, unknown> }
  | { type: 'DISMISS_NOTIFICATION'; id: string }
  | { type: 'CHECK_LOGIN_STREAK' }
  | { type: 'CHECK_DAILY_GOALS' }
  | { type: 'START_BATTLE' }
  | { type: 'START_BATTLE_WITH_CHARACTER'; speciesId: string }
  | { type: 'RESOLVE_WARMUP'; correct: boolean; skipped?: boolean }
  | { type: 'PLAYER_MOVE'; moveId: string }
  | { type: 'MATH_BONUS_CORRECT' }
  | { type: 'END_BATTLE' }
  | { type: 'FLEE_BATTLE' }
  // Classroom PvP
  | { type: 'GENERATE_CLASSROOM' }
  | { type: 'REFRESH_CLASSMATES' }
  | { type: 'SELECT_OPPONENT'; opponentId: string }
  | { type: 'CLEAR_OPPONENT_SELECTION' }
  | { type: 'START_PVP_BATTLE'; opponentId: string }
  | { type: 'END_PVP_BATTLE' }
  | { type: 'EARN_TICKET'; source: 'math' | 'care' | 'daily_goal' | 'login_streak' }
  | { type: 'RESET_DAILY_TICKETS' }
  | { type: 'PLACE_TROPHY'; trophyId: string; position: { x: number; y: number } }
  | { type: 'REMOVE_TROPHY'; trophyId: string }
  // Mailbox
  | { type: 'CLAIM_MAILBOX' }
  // Combat actions
  | { type: 'PLAYER_FOCUS' }
  | { type: 'PLAYER_DEFEND_ACTION' }
  | { type: 'PLAYER_FLEE_ATTEMPT' }
  // Trace events
  | { type: 'TRACE_MATH_COMPLETE'; tier: TraceTier }
  | { type: 'TRACE_SHIELD_COMPLETE'; tier: TraceTier; damageToRestore: number }
  | { type: 'TRACE_RUNE_COMPLETE'; tier: TraceTier }
  | { type: 'TRACE_EVENT_FAILED' }
  // Combat Feel — Collapse trace
  | { type: 'COLLAPSE_TRACE_COMPLETE'; tier: TraceTier }
  // Momentum Board
  | { type: 'START_MOMENTUM'; difficulty?: MomentumDifficulty }
  | { type: 'MOMENTUM_SET_DIFFICULTY'; difficulty: MomentumDifficulty }
  | { type: 'MOMENTUM_SELECT_PIECE'; pieceId: string }
  | { type: 'MOMENTUM_DESELECT_PIECE' }
  | { type: 'MOMENTUM_EXECUTE_MOVE'; moveIndex: number }
  | { type: 'MOMENTUM_SKIP_TURN' }
  | { type: 'MOMENTUM_FLASH_CHOICE'; choice: FlashChoice; fusionTarget?: FusionTarget }
  | { type: 'MOMENTUM_ANIMATION_DONE' }
  | { type: 'MOMENTUM_AI_EXECUTE' }
  | { type: 'END_MOMENTUM' }
  // Help system
  | { type: 'HELP_START_TUTORIAL'; featureId: string }
  | { type: 'HELP_ADVANCE_STEP'; featureId: string; stepId: string }
  | { type: 'HELP_COMPLETE_TUTORIAL'; featureId: string }
  | { type: 'HELP_SKIP_TUTORIAL'; featureId: string }
  | { type: 'HELP_ENCOUNTER_FEATURE'; featureId: string }
  | { type: 'HELP_SHOW_HINT'; hintId: string }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SHOW_ONBOARDING' }
  | { type: 'DISMISS_DAILY_RITUAL' }
  | { type: 'SHOW_DAILY_RITUAL' }
  // Roguelike Run
  | { type: 'START_RUN' }
  | { type: 'SELECT_RUN_ENCOUNTER' }
  | { type: 'START_RUN_BATTLE' }
  | { type: 'RUN_ENCOUNTER_VICTORY' }
  | { type: 'RUN_ENCOUNTER_DEFEAT' }
  | { type: 'SELECT_RUN_REWARD'; rewardId: string }
  | { type: 'END_RUN' }
  | { type: 'SELECT_MAP_NODE'; nodeId: string }
  | { type: 'REST_LIGHT' }
  | { type: 'REST_STABILIZE' }
  | { type: 'REST_FORTIFY' }
  | { type: 'EVENT_CHOOSE'; choiceIndex: number }
  // Pet interaction system
  | { type: 'SET_HAND_MODE'; mode: HandMode }
  | { type: 'START_PET_INTERACTION'; mode: HandMode }
  | { type: 'END_PET_INTERACTION' }
  | { type: 'UNLOCK_INTERACTION'; mode: HandMode }
  | { type: 'UPGRADE_TOOL_TIER'; mode: HandMode; tier: number }
  | { type: 'CARE_GAME_COMPLETE'; mode: HandMode; quality: number }
  // Quests
  | { type: 'REFRESH_QUESTS' }
  | { type: 'CLAIM_QUEST'; templateId: string }
  // Season Pass
  | { type: 'CLAIM_SEASON_TIER'; tier: number }
  // Gacha / Cosmetics
  | { type: 'GACHA_PULL' }
  | { type: 'GACHA_CRAFT'; craftId: string }
  | { type: 'EQUIP_COSMETIC'; petId: string; cosmeticId: string | null }
  | { type: 'UNEQUIP_COSMETIC_SLOT'; petId: string; slot: CosmeticSlot }
  // Power Forge (MP sink)
  | { type: 'BUY_FORGE_UPGRADE'; upgradeId: import('../../config/powerForgeConfig').PowerForgeUpgradeId }
  // Dex (phase 2 foundation)
  | { type: 'DEX_MARK_SEEN'; speciesId: string }
  | { type: 'DEX_MARK_OWNED'; speciesId: string }
  | DevToolsAction
  ;
