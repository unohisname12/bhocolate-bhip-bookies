export function FurnitureMoment({kind}:{kind?:string}){
 if(!kind)return null;
 return <div className={`lh-furniture-moment moment-${kind}`} aria-hidden="true">
 {kind==='read'&&<svg viewBox="0 0 40 24"><path d="M20 5L2 1V18L20 23L38 18V1Z" fill="#f4dfac" stroke="#715037" strokeWidth="2"/><path d="M20 5V23M6 6L15 8M6 10L15 12M25 8L34 6M25 12L34 10" stroke="#ae9066"/></svg>}
 {kind==='water'&&<><svg viewBox="0 0 40 32"><path d="M8 12H25V29H8ZM25 15L39 6L39 12L25 23" fill="#7daca0" stroke="#385e57" strokeWidth="2"/><path d="M8 15C-3 6 -3 29 8 24" fill="none" stroke="#a7c6b5" strokeWidth="3"/></svg><i/><i/><i/></>}
 {kind==='play'&&<span className="lh-play-ball"/>}
 {kind==='brush'&&<span className="lh-mirror-spark">✦</span>}
 {kind==='light'&&<span className="lh-warm-glow"/>}
 </div>;
}
