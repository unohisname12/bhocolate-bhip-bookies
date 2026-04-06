/** Earned through math + pet care. Consumed to initiate a PvP battle. */
export interface BattleTicket {
  id: string;
  earnedAt: number;
  source: 'math' | 'care' | 'daily_goal' | 'login_streak';
}

export interface BattleTicketState {
  tickets: BattleTicket[];
  maxTickets: number;
  todayEarned: number;
  todayUsed: number;
  mathForNextTicket: number;
  careActionsToday: { fed: boolean; cleaned: boolean; played: boolean };
}
