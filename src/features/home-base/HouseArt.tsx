import { useId } from 'react';
const pieces = { stairs: '14 68 48 54', 'stairs-east':'14 68 48 54', 'door-left':'14 9 48 93', wall:'14 9 48 93', floor:'14 87 48 35', roof:'0 65 76 67' };
export type HousePiece = keyof typeof pieces;
/** PixelLab exports share a padded canvas; SVG viewports use the supplied piece bounds without resampling. */
export function HouseArt({piece,className=''}:{piece:HousePiece;className?:string}) {
 return <svg className={`house-pixel-art ${className}`} viewBox={pieces[piece]} preserveAspectRatio="none" aria-hidden="true"><image href={`/assets/house-v1/${piece}.png`} width="76" height="132"/></svg>;
}
export function HouseTexture({piece}:{piece:'floor'|'wall'}) {
 const id=useId(),height=piece==='floor'?70:186;
 return <svg className={`house-texture house-texture-${piece}`} width="100%" height="100%" aria-hidden="true"><defs><pattern id={id} width="96" height={height} patternUnits="userSpaceOnUse"><svg viewBox={pieces[piece]} width="96" height={height} preserveAspectRatio="none"><image href={`/assets/house-v1/${piece}.png`} width="76" height="132"/></svg></pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`}/></svg>;
}
