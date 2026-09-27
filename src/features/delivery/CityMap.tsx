import { usePageVisible } from '../../hooks/usePageVisible';
import { crewLabel } from './model';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { PetSprite } from '../../components/pet/PetSprite';
import { ActivePetContext } from '../../components/ActivePetContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { nodes, PLACES, value, slot, preview, type Order, type City } from './model';
import { CREW_COLORS, TOWN_ART, VAN_ART, worldPoint, buildingPoint, streetRoute, type WorldPoint } from './world';

function routeDirection(from: WorldPoint, to: WorldPoint) {
  return to.y !== from.y ? to.y > from.y ? 'south' : 'north' : to.x >= from.x ? 'east' : 'west';
}
export const CityMap = memo(function CityMap({ city, selected, select, me, order }: { city: City; selected: number; select: (n: number) => void; me: string; order: Order }) {
  const [follow, setFollow] = useState(me), [beat, setBeat] = useState(0), [zoom, setZoom] = useState(false), [tour, setTour] = useState(0);
  const viewport = useRef<HTMLDivElement>(null), world = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion(), visible = usePageVisible();
  const tripKey = `${city.id}:${city.round}:${tour}`;
  const player = city.players.find(p => p.id === me);
  const planned = player ? streetRoute(slot(city,preview(city,player,order).from), slot(city,selected)) : [];
  const routePoints = planned.map(p => `${p.x},${p.y}`).join(' ');
  useEffect(() => {
    if (reduced || !visible) return;
    let n = 0;
    const timer = setInterval(() => { n++; setBeat(n); if (n >= 6) clearInterval(timer); }, 1050);
    return () => clearInterval(timer);
  }, [tripKey, reduced, visible]);
  const frame = reduced ? 6 : beat;
  useEffect(() => {
    if (!zoom || !viewport.current || !world.current) return;
    const crew = city.players.find(p => p.id === follow);
    if (!crew) return;
    const trip = city.trips.find(t => t.id === follow);
    const route = trip ? streetRoute(trip.worldFrom??slot(city,trip.from),trip.worldTo??slot(city,trip.to)) : [worldPoint(slot(city,crew.node))];
    const p = frame>=route.length?worldPoint(slot(city,crew.node)):route[Math.min(frame, route.length - 1)];
    viewport.current.scrollTo({ left: world.current.clientWidth * p.x / 100 - viewport.current.clientWidth / 2, top: world.current.clientHeight * p.y / 100 - viewport.current.clientHeight / 2, behavior: reduced ? 'instant' : 'smooth' });
  }, [frame, follow, zoom, city.players, city.trips, city, reduced]);
  return <section className="delivery-map-wrap" aria-label="Delivery city">
    <div className="delivery-map-tools"><div><span className="world-live-dot"/><strong>WOODLAND CITY</strong><small>{city.rules.format === 'duel' ? '6 delivery stops · head-to-head' : '9 delivery stops · open for business'}</small></div><div className="world-controls"><label><span className="sr-only">Follow crew</span><select value={follow} onChange={e => { setFollow(e.target.value); setZoom(true); }}>{city.players.map(p => <option key={p.id} value={p.id}>Follow {crewLabel(p)}</option>)}</select></label><button aria-pressed={zoom} onClick={() => setZoom(v => !v)}>{zoom ? 'Full town' : 'Zoom in'}</button>{city.trips.length > 0 && <button onClick={() => { setBeat(0); setTour(v => v + 1); }}>Replay deliveries</button>}</div></div>
    <div className={`world-viewport ${zoom ? 'is-zoomed' : ''}`} ref={viewport} tabIndex={0} aria-label="Town map. Tap a numbered building to choose your delivery; zoom in to explore.">
      <div ref={world} className="delivery-world">
        <img className="town-art" src={TOWN_ART} alt="Pixel-art Woodland City with a bakery, school, homes, café, parcel depot, pet park, market, harbor and observatory connected by streets." draggable={false}/>
        {nodes(city).map((place,i)=>{
          const source=buildingPoint(i),target=buildingPoint(slot(city,i));
          return <div key={place.name} className={`town-parcel ${slot(city,i)!==i?'warped-parcel':''}`} data-parcel={place.name} data-world-slot={slot(city,i)} style={{left:`${target.x-13}%`,top:`${target.y-10}%`,backgroundImage:`url(${TOWN_ART})`,backgroundPosition:`${(source.x-13)/74*100}% ${(source.y-10)/80*100}%`}} aria-hidden="true"/>;
        })}
        {city.event?.kind==='ambush'&&<div className="world-ambush" style={{left:`${worldPoint(slot(city,city.event.a)).x}%`,top:`${worldPoint(slot(city,city.event.a)).y}%`}}>AMBUSH</div>}
        <svg className="world-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={routePoints} className="route-shadow"/><polyline points={routePoints} className="route-dashes"/>{planned.map((p,i) => { return <rect key={i} x={p.x - .45} y={p.y - .45} width=".9" height=".9" className="route-node"/>; })}</svg>
        {nodes(city).map((place, i) => { const p = buildingPoint(slot(city,i)); return <button key={place.name} data-slot={slot(city,i)} className={`city-place ${selected === i ? 'selected' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => select(i)} aria-pressed={selected === i} aria-label={`Deliver to ${place.name} · ${value(city,i)} base points`}><span className="place-number">{String(i + 1).padStart(2,'0')}</span><span className="place-label">{place.name}</span><span className="place-value">{value(city,i)} {city.rules.market?'¢':'pts'}</span></button>; })}
        {!city.bridge && city.closed >= 0 && <div className="world-roadwork" style={{ left: `${worldPoint(slot(city,city.closed)).x + 3}%`, top: `${worldPoint(slot(city,city.closed)).y}%` }} aria-label={`Roadwork at ${PLACES[city.closed].name}`}><i/><span>ROADWORK</span></div>}
        {city.players.filter(p => p.joined).map((p, i) => {
          const trip = city.trips.find(t => t.id === p.id), route = trip ? streetRoute(trip.worldFrom??slot(city,trip.from),trip.worldTo??slot(city,trip.to)) : [worldPoint(slot(city,p.node))];
          const routeIndex = Math.min(frame, route.length - 1), point = frame>=route.length?worldPoint(slot(city,p.node)):route[routeIndex];
          const node = trip && frame < route.length - 1 ? trip.from : p.node;
          const previous = route[Math.max(0,routeIndex - 1)];
          const direction = routeDirection(previous, point), arrived = !!trip && frame >= route.length-1;
          const botSpecies = ['koala_sprite','moss_turtle','luna_owl','ember_fox'][i % 4];
          return <div key={p.id} data-node={node} className={`city-car vehicle-${trip?.tool??'van'} ${follow === p.id ? 'following' : ''} ${arrived ? 'has-delivered' : ''} facing-${direction}`} style={{ left: `${point.x + (i % 3 - 1) * .85}%`, top: `${point.y + Math.floor(i / 3) * .65}%`, '--crew-color': CREW_COLORS[i], '--van-art': `url(${VAN_ART})` } as CSSProperties} aria-label={`${p.alias} driving to ${PLACES[p.node].name}`}>
            <div className="van-sprite"/><div className="car-pet"><ActivePetContext.Provider value={null}>{p.pet || p.bot ? <PetSprite speciesId={p.pet?.speciesId ?? botSpecies} stage={p.pet?.stage ?? 'baby'} animationName="idle" scale={0.29}/> : <img src="/assets/companions-v1/koala_sprite-egg.png" alt="Your egg rides along"/>}</ActivePetContext.Provider></div>
            <small>{crewLabel(p)}{p.id === me ? ' · YOU' : ''}</small>{arrived && <span className="delivery-pop">{trip.points>=0?'+':''}{trip.points}</span>}
          </div>;
        })}
      </div>
    </div>
    <div className="world-location-bar"><span><b>{String(selected + 1).padStart(2,'0')}</b> {PLACES[selected]?.name}</span><span>{city.event?.kind==='shift'?'Portal plots moved · recheck your route':'Swipe to explore · tap a building'}</span></div>
  </section>;
});
