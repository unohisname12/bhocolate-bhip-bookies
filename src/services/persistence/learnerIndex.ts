export interface LearnerProfile { id: string; label: string }
export interface LearnerIndex { activeId: string; profiles: LearnerProfile[]; error?: string }
const KEY = 'vpet_learners_v1';
export const learnerSlot = (id: string) => id === 'default' ? 'auto' : `learner_${id}`;
export function readLearnerIndex(): LearnerIndex {
  const fallback = { activeId: 'default', profiles: [{ id: 'default', label: 'Learner 1' }] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as LearnerIndex;
    if (!Array.isArray(parsed.profiles) || !parsed.profiles.length || parsed.profiles.some(p => !p || !/^[a-zA-Z0-9_-]+$/.test(p.id) || typeof p.label !== 'string' || !p.label.trim())
      || new Set(parsed.profiles.map(p => p.id)).size !== parsed.profiles.length || !parsed.profiles.some(p => p.id === parsed.activeId)) throw new Error('Invalid learner index');
    return parsed;
  } catch { return { ...fallback, error: 'The learner list could not be read. Original saves are preserved; do not clear browser storage.' }; }
}
export function writeLearnerIndex(index: LearnerIndex): void {
  const value = JSON.stringify(index);
  localStorage.setItem(KEY, value);
  if (localStorage.getItem(KEY) !== value) throw new Error('Learner selection could not be saved.');
}
export const activeLearnerSlot = () => {
  const index = readLearnerIndex();
  if (index.error) throw new Error(index.error);
  return learnerSlot(index.activeId);
};
