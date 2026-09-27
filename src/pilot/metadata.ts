import type { LearningSettings } from '../services/game/curriculum';
export interface ClassroomMetadata {
  alias: string; assignment: string; learning: LearningSettings; settingsVersion: number;
  nicknameVersion: number; nicknameAt: number;
  nicknameRequest: { request_id: string; proposed: string; status: 'pending' | 'approved' | 'declined' } | null;
  petNames?: PetNameRow[]; typedPetNames?: boolean;
}
export interface PetNameRow { pet_id: string; approved: string | null; proposed: string | null; request_id: string | null; status: 'pending' | 'approved' | 'declined' | null }
export function validatePetName(value: unknown): string {
  try { return validateNickname(value); }
  catch (e) { throw new Error((e as Error).message.replace(/classroom nickname|nickname/g, 'pet name').replace('Enter a pet name.', 'Type a pet name.')); }
}
export function validateNickname(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a nickname.');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/.test(name)) throw new Error('Use 2–24 letters, numbers, spaces, dots, underscores or hyphens. Use a nickname, never a real name.');
  if (/\b(admin|teacher|moderator|fuck|shit|bitch|nigger|nigga|sex|porn)\b/i.test(name)) throw new Error('Choose a different classroom nickname.');
  return name;
}
