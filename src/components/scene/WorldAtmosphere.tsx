import type { CSSProperties } from 'react';
import type { RoomId } from '../../types/room';

/** Deterministic, decorative particles; no random work or React updates per frame. */
export function WorldAtmosphere({ room }: { room: RoomId }) {
  return <div className={`world-atmosphere ${room}`} aria-hidden="true">
    <div className="world-lightbeam" />
    {Array.from({ length: 12 }, (_, i) => <i key={i} className="world-mote" style={{ left: `${8 + (i * 29) % 86}%`, top: `${18 + (i * 13) % 60}%`, '--delay': `${-i * 1.7}s`, '--duration': `${5 + i % 5}s` } as CSSProperties} />)}
    {room === 'inside' && <div className="hearth-embers">{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ left: `${i * 18}%`, animationDelay: `${-i * 0.6}s` }} />)}</div>}
    {room === 'outside' && <><span className="passing-cloud cloud-one" /><span className="passing-cloud cloud-two" /></>}
  </div>;
}
