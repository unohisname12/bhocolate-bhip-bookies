/** Stops are registered to the painted roads; saved gameplay node IDs never change. */
export const TOWN_ART = '/assets/delivery-v2/woodland-city.png';
export const VAN_ART = '/assets/delivery-v2/parcel-vans.png';
export type WorldPoint = { x: number; y: number };
const STOPS: WorldPoint[] = [
  {x:22,y:27},{x:50,y:27},{x:82,y:27},
  {x:22,y:54},{x:50,y:54},{x:82,y:54},
  {x:32.6,y:73},{x:65.5,y:77},{x:65.5,y:68},
];
export const worldPoint = (node: number) => STOPS[node] ?? STOPS[4];
export const buildingPoint = (node: number) => ({ x: [21,49,82][node%3], y: [15,41,68][Math.floor(node/3)] });
export const CREW_COLORS = ['#ffb65f', '#6ed7e8', '#b8a0ff', '#f5e987', '#96dcaa', '#ef9fce', '#b6c3da', '#ffa994', '#d4d48a', '#98c6f1'];
/** Route through real intersections rather than cutting through buildings. */
export function streetRoute(from: number, to: number): WorldPoint[] {
  const a=worldPoint(from),b=worldPoint(to);
  if(from===to)return[a];
  const roads=[32.6,65.5];
  let best:WorldPoint[]=[];let distance=Infinity;
  for(const ax of roads)for(const bx of roads){
    const ay=a.y>54?54:a.y,by=b.y>54?54:b.y;
    const route=[a,{x:ax,y:a.y},{x:ax,y:ay},{x:ax,y:by},{x:bx,y:by},{x:bx,y:b.y},b]
      .filter((p,i,points)=>i===0||p.x!==points[i-1].x||p.y!==points[i-1].y);
    // Bottom stops sit on vertical streets; no horizontal travel across the harbor.
    if(a.y>54&&ax!==a.x||b.y>54&&bx!==b.x)continue;
    const cost=route.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-route[i].x)+Math.abs(p.y-route[i].y),0);
    if(cost<distance){distance=cost;best=route;}
  }
  if(a.y===b.y&&(a.y===27||a.y===54))return[a,b];
  return best;
}
