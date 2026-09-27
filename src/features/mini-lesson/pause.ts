// Transient UI state: never persisted and never changes a game's own pause setting.
const lessons = new Set<symbol>();
const listeners = new Set<() => void>();
export const miniLessonActive = () => lessons.size > 0;
export function subscribeMiniLesson(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function holdMiniLesson() {
  const token = Symbol();
  lessons.add(token);
  listeners.forEach(listener => listener());
  return () => { lessons.delete(token); listeners.forEach(listener => listener()); };
}
