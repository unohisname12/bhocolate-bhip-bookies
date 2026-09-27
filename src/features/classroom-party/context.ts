import { createContext, useContext } from 'react';
import type { ArcadeGame } from '../arcade/model';
export const PartyContext = createContext<((game?: ArcadeGame) => void) | null>(null);
export const useClassroomParty = () => useContext(PartyContext);
