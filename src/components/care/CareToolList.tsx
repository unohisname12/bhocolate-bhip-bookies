import React from 'react';
import { CARE_TOOL_ITEMS } from '../../config/careToolConfig';
import type { Inventory } from '../../types/inventory';
import type { InteractionState } from '../../types/interaction';

interface CareToolListProps {
  inventory: Inventory;
  interaction: InteractionState;
  onGoToShop: () => void;
}

export const CareToolList: React.FC<CareToolListProps> = ({ inventory, interaction, onGoToShop }) => {
  const ownedIds = new Set(inventory.items.map(i => i.itemId));
  const ownedTools = CARE_TOOL_ITEMS.filter(t => ownedIds.has(t.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
          Care Tools
        </h3>
        <button
          onClick={onGoToShop}
          className="text-[10px] font-bold text-purple-300 hover:text-purple-100 transition-colors"
        >
          Shop &rarr;
        </button>
      </div>

      {ownedTools.length === 0 ? (
        <p className="text-[10px] text-slate-500 italic">
          No care tools yet. Visit the shop!
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {ownedTools.map(tool => {
            const tierLabel = tool.toolType === 'upgrade' && tool.upgradeTier != null
              ? `T${tool.upgradeTier}`
              : '';
            const isActive = tool.toolType === 'unlock'
              ? interaction.unlockedTools.includes(tool.targetMode)
              : interaction.equippedToolTiers[tool.targetMode] >= (tool.upgradeTier ?? 0);

            return (
              <div
                key={tool.id}
                className="flex items-center gap-2 px-2 py-1 rounded-lg"
                style={{
                  background: 'rgba(30,25,55,0.5)',
                  border: '1px solid rgba(60,50,100,0.2)',
                }}
              >
                <img
                  src={tool.icon}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-[10px] font-bold text-slate-200 flex-1">
                  {tool.name}
                </span>
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    background: isActive ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.15)',
                    color: isActive ? '#4ade80' : '#94a3b8',
                  }}
                >
                  {tool.targetMode} {tierLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
