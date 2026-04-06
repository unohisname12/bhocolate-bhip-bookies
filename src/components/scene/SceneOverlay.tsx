import React from 'react';
import { Z } from '../../config/zBands';

/**
 * Atmospheric overlay — scanlines and subtle grid effects (extracted from PetChamber).
 * Sits above the scene content but below the UI. pointer-events-none.
 */
export const SceneOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: Z.OVERLAY }}>
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
    </div>
  );
};
