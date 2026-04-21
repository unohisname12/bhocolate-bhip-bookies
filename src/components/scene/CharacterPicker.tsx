import React, { useState } from 'react';
import { SPECIES_CONFIG } from '../../config/speciesConfig';
import { ASSETS } from '../../config/assetManifest';

interface CharacterPickerProps {
  /** Current species being rendered (override or real pet.type). */
  currentSpeciesId: string;
  /** Called when the player picks a different species to preview. */
  onSelect: (speciesId: string | null) => void;
  /** Whether an override is currently active (shows "reset" affordance). */
  hasOverride: boolean;
}

/**
 * Dev overlay — floating button bottom-left that opens a grid of species
 * cards. Selecting a card swaps which species the scene renders. Does
 * not touch engine state — purely a visual preview tool.
 */
export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  currentSpeciesId, onSelect, hasOverride,
}) => {
  const [open, setOpen] = useState(false);

  const allSpecies = Object.values(SPECIES_CONFIG);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-4 left-4 z-[60] flex items-center gap-1 rounded-md bg-slate-800/90 px-3 py-1.5 text-xs font-mono text-white shadow-lg ring-1 ring-slate-600 hover:bg-slate-700"
      >
        <span aria-hidden>🐾</span>
        <span>{hasOverride ? `preview: ${currentSpeciesId}` : 'pick pet'}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-end justify-start bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[70vh] w-80 overflow-y-auto rounded-lg bg-slate-900/95 p-3 shadow-2xl ring-1 ring-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Preview Pet
              </h2>
              {hasOverride && (
                <button
                  type="button"
                  onClick={() => { onSelect(null); setOpen(false); }}
                  className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600"
                >
                  reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allSpecies.map((species) => {
                const portrait = ASSETS.petPortraits[species.id];
                const isActive = currentSpeciesId === species.id;
                return (
                  <button
                    key={species.id}
                    type="button"
                    onClick={() => { onSelect(species.id); setOpen(false); }}
                    className={`flex flex-col items-center rounded-md border p-2 text-left transition ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-950/50'
                        : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                    }`}
                  >
                    {portrait && (
                      <img
                        src={portrait}
                        alt={species.name}
                        className="mb-1 h-16 w-16"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    )}
                    <span className="w-full truncate text-xs font-bold text-white">
                      {species.name}
                    </span>
                    <span className="w-full truncate font-mono text-[9px] text-slate-500">
                      {species.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
