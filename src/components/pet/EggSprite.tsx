import React from 'react';
import { ASSETS } from '../../config/assetManifest';
import type { EggType } from '../../config/assetManifest';

interface EggSpriteProps {
  type: EggType;
  animationClass?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EggSprite: React.FC<EggSpriteProps> = ({
  type,
  animationClass = 'anim-wobble',
  size = 'md',
  className = '',
}) => {
  const eggAsset = ASSETS.eggs[type] || ASSETS.eggs.basic;
  
  const sizeClasses = {
    sm: 'w-24 h-32',
    md: 'w-32 h-48',
    lg: 'w-48 h-64',
  };

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* Shadow */}
      <div className="absolute -bottom-4 w-3/4 h-8 bg-black/40 blur-md rounded-[100%]" />
      
      {/* Sprite */}
      <img
        src={eggAsset.url}
        alt={eggAsset.alt}
        className={`object-contain drop-shadow-2xl z-10 ${animationClass} ${sizeClasses[size]} transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer`}
        style={{
          filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5))',
        }}
      />
    </div>
  );
};
