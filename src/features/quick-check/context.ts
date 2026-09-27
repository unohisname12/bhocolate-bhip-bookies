import { createContext, useContext } from 'react';

// Classroom shell supplies the gate; standalone saves do not call classroom APIs.
// onReady runs when a check that blocked this start is finished, so the learner lands in the game.
export const GameCheckContext = createContext<(activity: string, onReady?: () => void) => Promise<boolean>>(async () => true);
export const useGameCheck = () => useContext(GameCheckContext);
