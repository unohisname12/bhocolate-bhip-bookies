export type SoundName = 'tap' | 'feed' | 'reward' | 'levelUp' | 'battleHit' | 'achievement' | 'error';

export const useSound = () => {
  const play = (sound: SoundName) => {
    if (import.meta.env.DEV) {
      console.debug('[Sound]', sound);
    }
    // Real audio files can be wired here in a future step
  };

  return { play };
};
