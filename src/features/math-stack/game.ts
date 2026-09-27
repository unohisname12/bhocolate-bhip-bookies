import {SHAPES,WIDTH,HEIGHT,track,type Track,type Kind} from './catalog';
export type Cell={n:number;x:number;color:number};
export type Question={prompt:string;hint:string;explanation:string;target:number;constant:number;denominator:number;kind:Kind;palette:Cell[]};
export type Run={id:string;track:Track;mode:'learn'|'arcade';seed:number;level:number;round:number;score:number;combo:number;cleared:number;drops:number;mistakes:number;helped:boolean;status:'playing'|'won'|'blocked';board:(Cell|null)[][];previous:(Cell|null)[][]|null;message:string;lastClear:string;revision:number};
export function hash(n:number){let x=n|0;x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;}
const cell=(n:number,x=0,color=0):Cell=>({n,x,color});
export function question(r:Pick<Run,'track'|'seed'|'round'|'level'>):Question{
 const k=hash(r.seed+r.round*73+r.level*19),a=1+k%3,b=1+(k>>>3)%(r.track==='add'?2:3),total=4*(a+b),t=track(r.track);
 let prompt='',hint='',explanation='',target=total,constant=0,denominator=1,palette=[cell(0),cell(a),cell(b),cell(a+1),cell(b+2)];
 switch(r.track){
 case 'bonds':target=8;palette=[cell(0),cell(1),cell(2)];prompt='Make 8. Fill a row with blocks that add up to 8.';hint='Eight blocks worth 1 each make 8.';break;
 case 'add':prompt=`${4*a} + ${4*b} = ?`;hint=`Count four ${a} blocks and four ${b} blocks. Add the two groups.`;break;
 case 'subtract':prompt=`${total+4*a} − ${4*a} = ?`;hint='Find the difference before choosing your block values.';break;
 case 'multiply':prompt=`4 × ${a+b} = ?`;hint=`Think of four groups of ${a+b}. Each shape has four blocks.`;break;
 case 'divide':prompt=`${total*(a+1)} ÷ ${a+1} = ?`;hint=`Split ${total*(a+1)} into ${a+1} equal groups.`;break;
 case 'fraction':denominator=8;prompt=`${4*a}/8 + ${4*b}/8 = ?`;hint='These pieces are eighths. Add numerators; keep the denominator 8.';break;
 case 'decimal':denominator=10;prompt=`${(4*a/10).toFixed(1)} + ${(4*b/10).toFixed(1)} = ?`;hint='Every block value is measured in tenths.';break;
 case 'signed':target=4*(a-b);palette=[cell(0),cell(a),cell(-b),cell(-a),cell(b)];prompt=`${4*a} + (−${4*b}) = ?`;hint='Opposite values cancel. Keep track of the sign.';break;
 case 'ratio':target=1+k%7;constant=8-target;palette=[cell(0),cell(1),cell(2),cell(3),cell(4)];prompt=`Build red : blue = ${target} : ${constant}.`;hint='Count individual colors, not whole shapes. Each tray label tells you the red blocks in that piece.';break;
 case 'percent':prompt=`Find 25% of ${total*4}.`;hint='25% is one quarter. Divide the whole amount by 4.';break;
 case 'equation':prompt=`${a+1}x − ${b} = ${total*(a+1)-b}. Build x.`;hint=`Add ${b} to both sides, then divide by ${a+1}.`;break;
 case 'slope':target=4*a;constant=8;palette=[cell(0),cell(a),cell(a+1),cell(-1)];prompt=`Build a path with slope ${a}/2.`;hint='Every block runs 1 right. Eight blocks run 8. Total rise ÷ 8 must match the slope.';break;
 case 'functions':prompt=`f(x) = 4x + ${4*b}. Build f(${a}).`;hint=`Replace x with ${a}, multiply first, then add.`;break;
 case 'terms':target=4*a;constant=4*b;palette=[cell(0,a),cell(b),cell(0,1),cell(-1),cell(1)];prompt=`Simplify ${2*a}x + ${2*b} + ${2*a}x + ${2*b}.`;hint='Add x coefficients together. Add constants separately.';break;
 case 'factor':target=a+b;constant=a*b;palette=[cell(1),cell(2),cell(3),cell(4),cell(-1)];prompt=`Factor x² + ${target}x + ${constant}.`;hint=`Choose a and b so a + b = ${target} and a × b = ${constant}. Each half-row must repeat its own value.`;explanation=`(x + ${a})(x + ${b}) = x² + (${a} + ${b})x + ${a}×${b} = x² + ${target}x + ${constant}.`;break;
 case 'systems':prompt=`x + y = ${total+b}; x − y = ${total-b}. Build x.`;hint='Add the equations. The y terms cancel, leaving 2x. Then divide by 2.';explanation=`2x = ${2*total}, so x = ${total}. Then y = ${b}; both equations check.`;break;
 case 'inequality':prompt=`${a+1}x + ${b} < ${(total+1)*(a+1)+b}. Build the greatest integer x.`;hint=`Subtract ${b}, then divide by positive ${a+1}. A strict inequality does not include the boundary.`;explanation=`x < ${total+1}. The greatest integer solution is ${total}.`;break;
 case 'exponents':target=2**(3+k%3);palette=[cell(0),cell(target/8),cell(1),cell(2),cell(4)];prompt=`Evaluate 2${['³','⁴','⁵'][k%3]}.`;hint='An exponent counts repeated multiplication, not addition.';break;
 }
 palette=palette.filter((v,i,all)=>all.findIndex(o=>o.n===v.n&&o.x===v.x)===i);
 if(!explanation)explanation=t.kind==='ratio'?`${target} red and ${constant} blue makes ${target}:${constant}.`:t.kind==='slope'?`Rise ${target} ÷ run 8 = slope ${a}/2.`:t.kind==='terms'?`${target}x + ${constant}: like terms combine, unlike terms stay separate.`:`${prompt.replace(/ = \?|\. Build x\.|Build f\(.*?\)\./g,'')} → ${denominator===1?target:r.track==='decimal'?(target/10).toFixed(1):`${target}/8`}.`;
 return {prompt,hint,explanation,target,constant,denominator,kind:t.kind,palette};
}
export const emptyBoard=()=>(Array.from({length:HEIGHT},()=>Array<Cell|null>(WIDTH).fill(null)));
export function startRun(id:string,skill:Track,mode:Run['mode'],level:number,seed:number):Run{return{id,track:skill,mode,level,seed,round:0,score:0,combo:0,cleared:0,drops:0,mistakes:0,helped:false,status:'playing',board:emptyBoard(),previous:null,message:'Choose a shape and its block value. Build a correct full row.',lastClear:'',revision:0};}
export function shape(r:Run,tray:number){const seed=hash(r.seed+r.round*11+r.drops*7);return r.mode==='arcade'?(seed+tray)%7:tray===0?0:1+(seed+tray-1)%6;}
export function piece(r:Run,tray:number,rotation:number,value:number){
 const q=question(r),v=q.palette[value];if(!v)throw new Error('Choose a block value.');
 let points:{x:number;y:number;v:Cell}[]=SHAPES[shape(r,tray)].map(([x,y],i)=>({x,y,v:q.kind==='ratio'?cell(0,0,i<v.n?1:2):{...v}}));
 for(let n=0;n<rotation;n++){points=points.map(p=>({...p,x:-p.y,y:p.x}));const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));points=points.map(p=>({...p,x:p.x-minX,y:p.y-minY}));}return points;
}
export function fits(r:Run,points:ReturnType<typeof piece>,x:number,y:number){return points.every(p=>x+p.x>=0&&x+p.x<WIDTH&&y+p.y<HEIGHT&&(y+p.y<0||!r.board[y+p.y][x+p.x]));}
export function landing(r:Run,tray:number,rotation:number,value:number,x:number){const points=piece(r,tray,rotation,value);if(!fits(r,points,x,0))return -1;let y=0;while(fits(r,points,x,y+1))y++;return y;}
export function totals(row:(Cell|null)[]){return row.reduce((s,c)=>({n:s.n+(c?.n??0),x:s.x+(c?.x??0),red:s.red+Number(c?.color===1),blue:s.blue+Number(c?.color===2)}),{n:0,x:0,red:0,blue:0});}
export function correct(row:(Cell|null)[],q:Question){
 if(row.length!==WIDTH||row.some(c=>!c))return false;const sum=totals(row);
 if(q.kind==='ratio')return sum.red===q.target&&sum.blue===q.constant;
 if(q.kind==='terms')return sum.x===q.target&&sum.n===q.constant;
 if(q.kind==='factor'){const left=row.slice(0,4),right=row.slice(4),a=left[0]!.n,b=right[0]!.n;return left.every(v=>v!.n===a)&&right.every(v=>v!.n===b)&&a+b===q.target&&a*b===q.constant;}
 return sum.n===q.target;
}
export function label(c:Cell,q:Question){return c.color?c.color===1?'R':'B':c.x?`${c.x===1?'':c.x===-1?'-':c.x}x`:q.denominator===8?`${c.n}/8`:q.denominator===10?(c.n/10).toFixed(1):String(c.n);}
export function describe(row:(Cell|null)[],q:Question){const s=totals(row);return q.kind==='ratio'?`${s.red} red : ${s.blue} blue`:q.kind==='terms'?`${s.x}x + ${s.n}`:q.kind==='slope'?`rise ${s.n} / run ${row.filter(Boolean).length}`:q.kind==='factor'?'Left: (x + a) · Right: (x + b)':q.denominator===8?`${s.n}/8`:(s.n/q.denominator).toLocaleString();}
export type Drop={tray:number;rotation:number;value:number;x:number};
export function drop(run:Run,move:Drop):{run:Run;solved:boolean;wrong:boolean}{
 const r=structuredClone(run);if(r.status!=='playing')throw new Error('Start or resume a board first.');
 const q=question(r),ps=piece(r,move.tray,move.rotation,move.value),y=landing(r,move.tray,move.rotation,move.value,move.x);r.revision++;
 if(y<0){r.status='blocked';r.message='No room for that piece. Undo your last placement or start a fresh board.';return{run:r,solved:false,wrong:false};}
 const before=structuredClone(r.board);for(const p of ps)r.board[y+p.y][move.x+p.x]=p.v;
 const full=r.board.filter(row=>row.every(Boolean)),solved=full.filter(row=>correct(row,q));
 if(full.length>solved.length){r.board=before;r.mistakes++;r.combo=0;r.message=`That row makes ${describe(full.find(row=>!correct(row,q))!,q)}. Check the goal and try another value or position. Your piece was returned.`;return{run:r,solved:false,wrong:true};}
 r.drops++;r.previous=before;
 if(solved.length){r.cleared+=solved.length;r.combo++;r.score+=100*solved.length+25*Math.min(r.combo,8);r.round++;r.board=emptyBoard();r.previous=null;r.lastClear=q.explanation;r.message=`Puzzle cleared! ${q.explanation} A new board is ready.`;r.helped=false;if(r.round>=5){r.status='won';r.message='Five puzzles solved! Your pet is cheering for you.';}}
 else r.message='Placed! Fill a full row that satisfies the goal.';
 return{run:r,solved:solved.length>0,wrong:false};
}
