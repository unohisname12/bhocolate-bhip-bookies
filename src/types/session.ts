export type ScreenName = 'incubation' | 'home' | 'math' | 'feeding' | 'shop' | 'battle' | 'test' | 'class_roster' | 'challenger_preview' | 'match_result' | 'asset_review' | 'animation_review' | 'momentum' | 'number_merge' | 'run_start' | 'run_encounter' | 'run_reward' | 'run_over' | 'run_map' | 'run_rest' | 'run_event' | 'pet_care' | 'quest_log' | 'season_pass' | 'gacha' | 'coming_soon' | 'warm_preview' | 'power_forge' | 'catch_math';

export type EggInteractionState = {
  isTapped: boolean;
  wobbleBoost: boolean;
  incubationProgress: number;
};

export type SessionState = {
  currentQuestion: MathQuestion | null;
  rewardPopup: RewardPopup | null;
  activeModal: string | null;
  eggInteractionState: EggInteractionState | null;
};

export type MathQuestion = {
  id: string;
  question: string;
  answer: number;
  difficulty: number;
  reward: number;
};

export type RewardPopup = {
  type: 'energy' | 'currency';
  amount: number;
  emoji: string;
};
