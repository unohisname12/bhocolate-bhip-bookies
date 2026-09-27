import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { getAllHelpConfigs } from '../../services/help/helpRegistry';
import type { HelpConfig, QuickRefEntry } from '../../types/help';

interface HelpPanelProps {
  encounteredFeatures: string[];
  onClose: () => void;
  onReplayTutorial: (featureId: string) => void;
  onReplayIntro: () => void;
}

const RefEntry: React.FC<{ entry: QuickRefEntry }> = ({ entry }) => (
  <div className="py-2">
    <div className="flex items-center gap-2 mb-1">
      {entry.icon && <img src={entry.icon} alt="" className="w-5 h-5 object-contain" />}
      <h4 className="text-sm font-bold text-slate-200">{entry.title}</h4>
    </div>
    <p className="text-xs text-slate-400 leading-relaxed">{entry.body}</p>
  </div>
);

const FeatureSection: React.FC<{
  config: HelpConfig;
  onReplay: () => void;
}> = ({ config, onReplay }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-700 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-slate-700/30 transition-colors rounded"
      >
        <div className="flex items-center gap-3">
          {config.icon && <img src={config.icon} alt="" className="w-6 h-6 object-contain" />}
          <span className="text-sm font-bold text-slate-100">{config.name}</span>
        </div>
        <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-2 pb-3">
          {config.quickRef.map((entry, i) => (
            <RefEntry key={i} entry={entry} />
          ))}
          {config.tutorial.length > 0 && (
            <button
              onClick={onReplay}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Replay tutorial
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const HelpPanel: React.FC<HelpPanelProps> = ({
  encounteredFeatures,
  onClose,
  onReplayTutorial,
  onReplayIntro,
}) => {
  const allConfigs = getAllHelpConfigs();
  // Only show features the player has encountered
  const visibleConfigs = allConfigs.filter((c) =>
    encounteredFeatures.includes(c.id),
  );

  return (
    <Modal isOpen onClose={onClose} title="Help">
          {/* Replay Intro — always available so players can re-watch the 5-beat tour */}
          <button
            onClick={onReplayIntro}
            className="w-full mb-3 flex items-center justify-between rounded bg-indigo-600/80 hover:bg-indigo-500 px-3 py-2 text-sm font-bold text-white transition-colors"
          >
            <span>Replay Intro Tutorial</span>
            <span className="text-xs opacity-80">▶</span>
          </button>

          {/* Content */}
          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            {visibleConfigs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No features encountered yet. Explore the game to unlock help topics!
              </p>
            ) : (
              visibleConfigs.map((config) => (
                <FeatureSection
                  key={config.id}
                  config={config}
                  onReplay={() => onReplayTutorial(config.id)}
                />
              ))
            )}
          </div>

    </Modal>
  );
};
