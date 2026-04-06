/**
 * DEV TEST FLOW — Pre-combat character picker.
 * Shows all registered playable species and lets the dev pick one for battle.
 *
 * TODO: Move pre-combat character selection into DevTools once multi-character testing panel exists.
 */
import React from 'react';
import { SPECIES_CONFIG } from '../../config/speciesConfig';
import { ASSETS } from '../../config/assetManifest';
import { SPECIES_MOVES } from '../../config/battleConfig';

interface DevCombatPickerProps {
  onSelect: (speciesId: string) => void;
  onCancel: () => void;
}

const allSpecies = Object.values(SPECIES_CONFIG);

export const DevCombatPicker: React.FC<DevCombatPickerProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* DEV badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase rounded">
            Dev Test
          </span>
        </div>
        <h2 className="text-lg font-black text-white mb-1">
          Choose Combat Character
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Which character do you want to use for this test battle?
        </p>

        <div className="space-y-2">
          {allSpecies.map((species) => {
            const portrait = ASSETS.petPortraits[species.id];
            const moves = SPECIES_MOVES[species.id] ?? SPECIES_MOVES.default;
            const hasCombatAnims = !!ASSETS.combatAnims[species.id];

            return (
              <button
                key={species.id}
                onClick={() => onSelect(species.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 transition-colors text-left"
              >
                {/* Portrait */}
                <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {portrait ? (
                    <img
                      src={portrait}
                      alt={species.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-2xl text-slate-500">?</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{species.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{species.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    STR {species.baseStats.strength} · SPD {species.baseStats.speed} · DEF {species.baseStats.defense}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {moves.map(m => m.name).join(', ')}
                  </div>
                  {!hasCombatAnims && (
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      ⚠ Missing combat animations
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <span className="text-slate-500 text-lg flex-shrink-0">→</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
