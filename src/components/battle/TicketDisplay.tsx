import React from 'react';
import type { BattleTicketState } from '../../types/battleTicket';
import { PVP_CONFIG } from '../../config/pvpConfig';

interface TicketDisplayProps {
  ticketState: BattleTicketState;
}

export const TicketDisplay: React.FC<TicketDisplayProps> = ({ ticketState }) => {
  const count = ticketState.tickets.length;
  const usedToday = ticketState.todayUsed;
  const maxDaily = PVP_CONFIG.maxTicketsUsedPerDay;
  const remaining = maxDaily - usedToday;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700">
      <img src="/assets/generated/final/icon_ticket.png" alt="ticket" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-100">
          {count} ticket{count !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-400">
          {remaining} battle{remaining !== 1 ? 's' : ''} left today
        </span>
      </div>
    </div>
  );
};
