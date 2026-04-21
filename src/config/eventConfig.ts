import type { SeasonalEvent } from '../types/event';

/**
 * Seasonal / holiday event calendar (Phase 4 foundation).
 * Events are *visible* on the Coming Soon screen from day 1 so kids
 * can see the full year's roadmap. EventSystem toggles them active
 * based on the current date.
 */

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'evt_spring_bloom',
    name: 'Spring Bloom',
    theme: 'spring',
    icon: '🌸',
    blurb: 'Flowers are blooming! Earn cherry-blossom cosmetics.',
    startDate: '2026-04-19',
    endDate: '2026-05-03',
    rewardPool: ['cos_cozy_cap', 'cos_heart_aura'],
  },
  {
    id: 'evt_summer_beach',
    name: 'Summer Beach Bash',
    theme: 'summer',
    icon: '🏖️',
    blurb: 'The beach is open! Earn beach-themed rewards.',
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    rewardPool: ['cos_sun_shades'],
  },
  {
    id: 'evt_autumn_harvest',
    name: 'Autumn Harvest',
    theme: 'autumn',
    icon: '🍂',
    blurb: 'Collect pumpkins, earn harvest titles.',
    startDate: '2026-10-15',
    endDate: '2026-10-31',
    rewardPool: ['cos_witch_hat'],
  },
  {
    id: 'evt_winter_festival',
    name: 'Winter Festival',
    theme: 'winter',
    icon: '❄️',
    blurb: 'Snow is falling. Rare Galaxy Aura available.',
    startDate: '2026-12-15',
    endDate: '2027-01-02',
    rewardPool: ['cos_galaxy_aura'],
  },
  {
    id: 'evt_anniversary',
    name: '1st Anniversary',
    theme: 'custom',
    icon: '🎂',
    blurb: 'One year of the Academy — exclusive founder cosmetics.',
    startDate: '2027-04-19',
    endDate: '2027-04-26',
    rewardPool: ['cos_season_crown'],
  },
];

export const findEvent = (id: string): SeasonalEvent | undefined =>
  SEASONAL_EVENTS.find((e) => e.id === id);

export const getActiveEvents = (now: Date = new Date()): SeasonalEvent[] => {
  const ymd = now.toISOString().slice(0, 10);
  return SEASONAL_EVENTS.filter((e) => ymd >= e.startDate && ymd <= e.endDate);
};
