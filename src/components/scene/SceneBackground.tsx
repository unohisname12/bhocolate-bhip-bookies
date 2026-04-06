import React from 'react';

interface SceneBackgroundProps {
  background: string;
  floorGradient: string;
  backgroundImage?: string;
}

export const SceneBackground: React.FC<SceneBackgroundProps> = ({ background, floorGradient, backgroundImage }) => {
  if (backgroundImage) {
    return (
      <>
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
        {/* Ground-line darkening strip — enhances contrast where pet stands */}
        <div
          className="absolute inset-x-0 z-[3] pointer-events-none"
          style={{
            bottom: 55,
            height: 24,
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.12) 60%, rgba(0,0,0,0.18) 100%)',
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Main background */}
      <div
        className="absolute inset-0 z-0"
        style={{ background }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 z-[1] opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(100, 150, 255, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Floor gradient */}
      <div
        className={`absolute inset-x-0 bottom-0 h-2/5 z-[2] bg-gradient-to-t ${floorGradient} pointer-events-none`}
      />

      {/* Ground-line darkening strip */}
      <div
        className="absolute inset-x-0 z-[3] pointer-events-none"
        style={{
          bottom: 55,
          height: 24,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.22) 100%)',
        }}
      />
    </>
  );
};
