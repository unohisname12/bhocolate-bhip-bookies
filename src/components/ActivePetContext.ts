import { createContext } from 'react';
import type { Pet } from '../types/pet';
export const ActivePetContext = createContext<Pet | null>(null);
