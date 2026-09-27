export const WEATHER = ['clear', 'cloudy', 'rain', 'wind', 'snow', 'mist'] as const;
export type Weather = typeof WEATHER[number];
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Phase = 'dawn' | 'day' | 'sunset' | 'night';
export type Preferences = { clock: 'local' | 'story'; hemisphere: 'north' | 'south'; preview?: Weather; until?: number; volume: number };
export type Environment = { weather: Weather; season: Season; phase: Phase; hour: number; night: boolean; moon: string; temperature: number; wind: number; key: string; moment: string; forecast: { at: number; weather: Weather }[]; preview: boolean };
export const DEFAULTS: Preferences = { clock: 'local', hemisphere: 'north', volume: .3 };
export const LABELS: Record<Weather, string> = { clear: 'Clear skies', cloudy: 'Clouds drifting', rain: 'Gentle rain', wind: 'Breezy', snow: 'Soft snowfall', mist: 'Morning mist' };
export const ICONS: Record<Weather, string> = { clear: '☀', cloudy: '☁', rain: '☂', wind: '≋', snow: '❄', mist: '〰' };
const SLOT = 20 * 60 * 1000;
function hash(n: number) { let x = n | 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0; }
export function preferences(value: unknown): Preferences {
 const p = value && typeof value === 'object' ? value as Partial<Preferences> : {};
 return { clock: p.clock === 'story' ? 'story' : 'local', hemisphere: p.hemisphere === 'south' ? 'south' : 'north', volume: typeof p.volume === 'number' && Number.isFinite(p.volume) ? Math.max(0, Math.min(.6, p.volume)) : .3, ...(WEATHER.includes(p.preview!) && Number.isFinite(p.until) ? {preview: p.preview, until: p.until} : {}) };
}
export function seasonAt(date: Date, hemisphere: Preferences['hemisphere']): Season {
 const n = Math.floor(((date.getMonth() + (hemisphere === 'south' ? 6 : 0) + 10) % 12) / 3);
 return (['spring', 'summer', 'autumn', 'winter'] as const)[n];
}
function sky(slot: number, season: Season): Weather {
 const sets: Record<Season, Weather[]> = { spring: ['clear','clear','cloudy','rain','rain','wind','mist'], summer: ['clear','clear','clear','cloudy','rain','wind'], autumn: ['clear','cloudy','cloudy','rain','wind','wind','mist'], winter: ['clear','cloudy','snow','snow','wind','mist'] };
 const choices = sets[season]; return choices[hash(slot + season.length * 97) % choices.length];
}
export function environmentAt(now: number, p: Preferences = DEFAULTS): Environment {
 const date = new Date(now), season = seasonAt(date, p.hemisphere), slot = Math.floor(now / SLOT);
 const hour = p.clock === 'story' ? ((now % (24 * 60 * 1000)) / 60000) : date.getHours() + date.getMinutes() / 60;
 const phase: Phase = hour < 5 || hour >= 20 ? 'night' : hour < 8 ? 'dawn' : hour < 17 ? 'day' : 'sunset';
 const preview = !!p.preview && !!p.until && p.until > now && p.until <= now + 16 * 60000;
 const weather = preview ? p.preview! : sky(slot, season);
 const moon = ['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'][Math.floor((((now / 86400000 - 10962.76) % 29.53059 + 29.53059) % 29.53059) / 29.53059 * 8)];
 const previous = sky(slot - 1, season);
 const moment = weather === 'clear' && previous === 'rain' && phase !== 'night' ? 'A rainbow after the rain' : weather === 'snow' ? 'Snowflakes gathering on the sill' : weather === 'rain' ? 'Raindrops tapping on the windows' : weather === 'wind' ? season === 'autumn' ? 'Golden leaves on the breeze' : 'Leaves dancing outside' : weather === 'mist' ? 'The garden wrapped in a soft blanket of mist' : phase === 'night' ? season === 'summer' ? 'Fireflies keeping the stars company' : 'A quiet sky full of stars' : phase === 'dawn' ? 'The birds are waking up' : phase === 'sunset' ? 'Long golden shadows and a sleepy garden' : season === 'spring' ? 'Petals drifting past the windows' : 'Cloud shadows moving across the garden';
 return {weather, season, phase, hour, night: phase === 'night', moon, preview, key: `${slot}:${weather}:${phase}`, temperature: ({spring:16,summer:26,autumn:13,winter:2}[season]) + (hash(slot) % 5) - 2 - (phase === 'night' ? 5 : 0), wind: weather === 'wind' ? 22 : weather === 'rain' ? 12 : 3 + hash(slot) % 6, moment, forecast: Array.from({length:3}, (_,i)=>({at:(slot+i+1)*SLOT,weather:sky(slot+i+1,season)}))};
}
export function weatherInterest(kind: string | undefined, e?: Environment): number {
 if (!e) return 0;
 if (kind === 'rest' && (e.night || e.weather === 'snow')) return 18;
 if ((kind === 'read' || kind === 'light') && ['rain','mist','snow'].includes(e.weather)) return 16;
 if ((kind === 'water' || kind === 'play') && e.weather === 'clear' && !e.night) return 12;
 return 0;
}
export function reaction(e: Environment): [string,string] {
 if (e.weather === 'rain') return ['Listening to the rain','Pitter-patter! It feels extra cozy in here.'];
 if (e.weather === 'snow') return ['Watching the snowflakes','Every little snowflake is different. Look at that one!'];
 if (e.weather === 'wind') return ['Watching the leaves dance','The leaves are having their own dance party!'];
 if (e.weather === 'mist') return ['Peeking into the mist','The garden looks like a cloud. We’re warm in here.'];
 if (e.night) return ['Looking for stars','A little starlight, and my favorite company.'];
 if (e.phase === 'dawn') return ['Listening for morning birds','Good morning, little birds!'];
 return ['Enjoying the changing sky','Let’s watch the clouds for a little while.'];
}
