import type { GameEngineAction } from '../engine/core/ActionTypes';
import { createContext, useContext } from 'react';
import { DEFAULT_LEARNING } from '../services/game/curriculum';
export const LearningActionContext = createContext<(action: GameEngineAction) => void>(() => {});
export const LearningContext = createContext(DEFAULT_LEARNING);
export const useLearningSettings = () => useContext(LearningContext);

export const SkillReviewContext = createContext<import('../types/woodland').SkillReview[]>([]);
