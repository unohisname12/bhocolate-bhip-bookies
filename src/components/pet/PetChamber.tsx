import React from 'react';
import { ASSETS } from '../../config/assetManifest';

interface PetChamberProps {
  children: React.ReactNode;
  variant?: 'incubator' | 'chamber';
  className?: string;
}

export const PetChamber: React.FC<PetChamberProps> = ({ 
  children, 
  variant = 'chamber',
  className = '' 
}) => {
  const bgStyle = variant === 'incubator' 
    ? ASSETS.backgrounds.incubator 
    : ASSETS.backgrounds.chamber;

  return (
    <div className={`relative w-full max-w-sm aspect-[4/3] mx-auto mt-4 mb-3 ${className}`}>
      {/* Background layer */}
      <div 
        className="absolute inset-0 rounded-[2rem] border-8 border-slate-700 shadow-2xl overflow-hidden"
        style={{ background: bgStyle }}
      >
        {/* Ambient effects layer */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] anim-glow mix-blend-overlay" />
        
        {/* Floor/Base layer */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-slate-900/80 to-transparent" />
        
        {/* Grid lines (sci-fi feel) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />

        {/* Centerpiece container */}
        <div className="absolute inset-0 flex items-end justify-center pb-[15%]">
          {children}
        </div>
        
        {/* FX Overlay layer (e.g., scanlines) */}
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-10 bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.5)_2px,rgba(0,0,0,0.5)_4px)]" />
      </div>
      
      {/* Hardware detailing frame */}
      <div className="absolute -inset-2 pointer-events-none rounded-[2.5rem] border-4 border-slate-600/50 flex justify-between items-center px-4">
         <div className="w-2 h-16 bg-slate-500 rounded-full" />
         <div className="w-2 h-16 bg-slate-500 rounded-full" />
      </div>
    </div>
  );
};
