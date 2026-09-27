import type { CSSProperties } from 'react';
import { isAdjacent } from './game';
import type { NumberMergeBoard as BoardState, NumberMergePosition } from './types';

interface NumberMergeBoardProps {
  board: BoardState;
  selected: NumberMergePosition | null;
  unstableCells: NumberMergePosition[];
  lastCreatedTileId: string | null;
  petBonusTileId: string | null;
  lastOverseerPositions: NumberMergePosition[];
  onTileActivate: (position: NumberMergePosition) => void;
  onArrowMerge: (position: NumberMergePosition) => void;
}
const DIRECTIONS = [
  { label: 'Up', glyph: '↑', row: -1, col: 0 },
  { label: 'Left', glyph: '←', row: 0, col: -1 },
  { label: 'Down', glyph: '↓', row: 1, col: 0 },
  { label: 'Right', glyph: '→', row: 0, col: 1 },
];
const includesPosition = (positions: NumberMergePosition[], p: NumberMergePosition) => positions.some(v => v.row === p.row && v.col === p.col);
const tones = ['amber','teal','blue','violet','rose','mint'];

export function NumberMergeBoard({board,selected,unstableCells,lastCreatedTileId,petBonusTileId,lastOverseerPositions,onTileActivate,onArrowMerge}: NumberMergeBoardProps) {
  const selectedTile = selected ? board[selected.row]?.[selected.col] : null;
  const canTarget = (p: NumberMergePosition) => {
    if(p.row < 0 || p.col < 0 || p.row >= board.length || p.col >= board[0].length) return false;
    const tile=board[p.row][p.col];
    return tile === null || (tile.kind !== 'broken' && (tile.kind !== 'corrupt' || tile.lockedTurns === 0));
  };
  return <>
    <div className="nm-board-rim"><div className="nm-board" role="group" aria-label="Number tiles">
      {board.flatMap((row,r)=>row.map((tile,c)=>{
        const position={row:r,col:c},active=selected?.row===r&&selected?.col===c;
        const target=!!selected&&!active&&isAdjacent(selected,position)&&canTarget(position);
        const selectable=tile?.kind==='number'||target;
        const unstable=includesPosition(unstableCells,position),hit=includesPosition(lastOverseerPositions,position);
        const tone=tile?.kind==='number'?tones[Math.min(5,Math.max(0,tile.value-1))]:'dark';
        return <div key={`${r}-${c}`} role={selectable?'button':undefined} tabIndex={selectable?0:-1} aria-pressed={selectable?active:undefined}
          aria-label={`${tile?.kind==='number'?tile.value:tile?.kind==='corrupt'?(tile.lockedTurns?'Sealed corruption':'Corruption'):tile?.kind==='broken'?'Broken cell':'Empty space'}, row ${r+1}, column ${c+1}${target?', available move':''}`}
          data-row={r} data-col={c} data-value={tile?.kind==='number'?tile.value:undefined}
          className={`nm-tile nm-tile-${tone} ${tile?'nm-occupied':'nm-empty'} ${active?'nm-selected':''} ${target?'nm-available':''} ${unstable?'nm-unstable':''} ${hit?'nm-hit':''} ${tile?.id===lastCreatedTileId?'nm-created':''}`}
          style={{'--tile-delay':`${(r+c)*22}ms`} as CSSProperties}
          onClick={()=>selectable&&onTileActivate(position)} onKeyDown={event=>{
            if(selectable&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onTileActivate(position);}
          }}>
          {tile?.kind==='number' ? <><span className="nm-tile-facets" aria-hidden="true"/><span className={`nm-tile-value ${tile.value>=100?'nm-small-value':''}`}>{tile.value}</span><span className="nm-tile-rune" aria-hidden="true">◇</span>{tile.id===petBonusTileId&&<span className="nm-paw-bonus">+1</span>}</> : tile?.kind==='corrupt' ? <><span className="nm-corrupt-eye" aria-hidden="true">◉</span><small>{tile.lockedTurns?'Sealed':'Corrupt'}</small></> : tile?.kind==='broken' ? <><span className="nm-broken-glyph" aria-hidden="true">╱</span><small>Broken</small></> : <span className="nm-space-mark" aria-hidden="true">{unstable?'!':target?'+':'·'}</span>}
        </div>;
      }))}
    </div></div>
    <div className={`nm-movebar ${selected?'nm-movebar-active':''}`}>
      <p>{selectedTile?.kind==='number'?<><strong>{selectedTile.value}</strong><span>selected · choose a neighbor</span></>:<><span className="nm-keycap">↵</span><span>Select a tile to begin</span></>}</p>
      <div aria-label="Merge directions">{DIRECTIONS.map(d=>{const target=selected?{row:selected.row+d.row,col:selected.col+d.col}:null;return <button key={d.label} aria-label={`Merge ${d.label}`} disabled={!target||!canTarget(target)} onClick={()=>target&&onArrowMerge(target)}>{d.glyph}</button>;})}</div>
    </div>
  </>;
}
