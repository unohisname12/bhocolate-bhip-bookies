import React, { useEffect } from 'react';
import { GameIcon } from './GameIcon';
import type { GameEngineAction } from '../../engine/core/ActionTypes';

interface Notification {
  id: string;
  message: string;
  icon: string;
  timestamp: number;
}

interface AchievementPopupProps {
  notifications: Notification[];
  dispatch: (action: GameEngineAction) => void;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({ notifications, dispatch }) => {
  const latest = notifications[notifications.length - 1];

  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'DISMISS_NOTIFICATION', id: latest.id });
    }, 3000);
    return () => clearTimeout(timer);
  }, [latest, dispatch]);

  if (!latest) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800 border border-yellow-500/50 rounded-2xl px-5 py-3 shadow-xl animate-fade-in max-w-xs">
      <GameIcon icon={latest.icon} size="w-7 h-7" className="text-2xl" />
      <p className="text-sm font-bold text-slate-100">{latest.message}</p>
    </div>
  );
};
