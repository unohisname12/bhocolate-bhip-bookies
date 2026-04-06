export type GameEventType =
  | 'egg_tapped'
  | 'pet_hatched'
  | 'pet_fed'
  | 'pet_cleaned'
  | 'pet_played_with'
  | 'pet_healed'
  | 'math_solved'
  | 'battle_won'
  | 'battle_lost'
  | 'item_purchased'
  | 'pet_evolved'
  | 'pvp_battle_won'
  | 'pvp_battle_lost'
  | 'ticket_earned'
  | 'ticket_used'
  | 'trophy_earned';

export type GameEvent = {
  id: string;
  type: GameEventType;
  playerId: string;
  petId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
};