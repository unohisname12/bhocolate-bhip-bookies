export const SIZE=6;
export const TRAILS=[
 {id:'count',grade:0,name:'Little Sparks',skill:'Count and combine',op:'+'},
 {id:'add',grade:1,name:'Make Ten',skill:'Addition',op:'+'},
 {id:'subtract',grade:2,name:'Minus Magic',skill:'Subtraction',op:'−'},
 {id:'multiply',grade:3,name:'Times Together',skill:'Multiplication',op:'×'},
 {id:'divide',grade:4,name:'Divide & Shine',skill:'Division',op:'÷'},
 {id:'fraction',grade:5,name:'Fraction Fizz',skill:'Fractions',op:'+'},
 {id:'decimal',grade:5,name:'Decimal Drops',skill:'Decimals',op:'+'},
 {id:'signed',grade:6,name:'Positive & Negative',skill:'Signed numbers',op:'+'},
 {id:'ratio',grade:6,name:'Color Balance',skill:'Ratios',op:':'},
 {id:'percent',grade:7,name:'Percent Party',skill:'Percentages',op:'+'},
 {id:'equation',grade:7,name:'Find the Mystery',skill:'Equations',op:'+'},
 {id:'terms',grade:8,name:'Like-Term Links',skill:'Like terms',op:'+'},
 {id:'slope',grade:8,name:'Slope Sparks',skill:'Rise and run',op:'+'},
 {id:'factor',grade:9,name:'Factor Fireworks',skill:'Quadratic factoring',op:'×'},
 {id:'powers',grade:9,name:'Power Party',skill:'Exponents',op:'×'},
 {id:'functions',grade:9,name:'Function Fizz',skill:'Function evaluation',op:'+'},
] as const;
export type Trail=typeof TRAILS[number]['id'];
export const trail=(id:Trail)=>TRAILS.find(t=>t.id===id)!;
export type Tile={id:number;n:number;ice:boolean;power:'rocket'|'bomb'|null;star:boolean};
export type PopRun={id:string;trail:Trail;level:number;seed:number;serial:number;board:Tile[];revision:number;turn:number;score:number;chains:number;ice:number;stars:number;moves:number;status:'playing'|'won'|'lost';message:string;burst:number[];hint:number[];lastEquation:string};
export type Goal={target:number;denominator:number;title:string;rule:string;solution:number[];pool:number[]};
const hash=(v:number)=>{let x=v|0;x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;};
export function goal(r:Pick<PopRun,'trail'|'level'>):Goal{
 const target=r.trail==='count'?Math.min(9,4+r.level):r.trail==='add'?Math.min(20,8+2*r.level):10;
 let g:Goal={target,denominator:1,title:`Make ${target}`,rule:'Connect neighboring numbers that add up to the target.',solution:[2,3,target-5],pool:Array.from({length:Math.max(4,target-1)},(_,i)=>i+1)};
 switch(r.trail){
 case 'count':g.solution=[1,2,target-3];break;
 case 'subtract':g={...g,target:4,title:'Make 4 with subtraction',rule:'Start with a number, then subtract each next tile. Order matters.',solution:[10,2,4],pool:[1,2,3,4,5,6,8,10,12]};break;
 case 'multiply':g={...g,target:12,title:'Multiply to make 12',rule:'Multiply the connected numbers together.',solution:[2,2,3],pool:[1,2,3,4,6]};break;
 case 'divide':g={...g,target:2,title:'Divide to make 2',rule:'Divide from left to right. For example: 16 ÷ 2 ÷ 4 = 2.',solution:[16,2,4],pool:[2,4,8,16,32]};break;
 case 'fraction':g={...g,target:8,denominator:8,title:'Make 1 whole',rule:'Add eighths. Eight eighths make one whole.',solution:[2,2,4],pool:[1,2,3,4,5,6,7]};break;
 case 'decimal':g={...g,target:10,denominator:10,title:'Make 1.0',rule:'Add decimal tiles. Ten tenths make one whole.',solution:[2,3,5],pool:[1,2,3,4,5,6,7,8,9]};break;
 case 'signed':g={...g,target:4,title:'Make +4',rule:'Add positive and negative numbers. Opposite values cancel.',solution:[6,-3,1],pool:[-5,-3,-2,-1,1,2,3,4,5,6,8]};break;
 case 'ratio':g={...g,target:1,title:'1 red : 2 blue',rule:'Connect twice as many blue tiles as red tiles. Letters also identify the colors.',solution:[1,2,2],pool:[1,2,2]};break;
 case 'percent':g={...g,target:50,title:'Build 50%',rule:'Combine percentage parts to make half of a whole.',solution:[10,15,25],pool:[5,10,15,20,25,30,40]};break;
 case 'equation':g={...g,target:8,title:'x + 3 = 11. Make x.',rule:'Find the missing value, then connect numbers with that total.',solution:[2,2,4],pool:[1,2,3,4,5,6,7]};break;
 case 'terms':g={...g,target:5,title:'Make 5x',rule:'Add the coefficients of matching x terms.',solution:[1,1,3],pool:[-2,-1,1,2,3,4,5]};break;
 case 'slope':g={...g,target:1,title:'Build slope 1',rule:'Each tile is one step right. Total rise ÷ number of tiles must equal 1.',solution:[0,1,2],pool:[-1,0,1,2,3]};break;
 case 'factor':g={...g,target:6,title:'Factor x² + 5x + 6',rule:'Connect two factors whose constants add to 5 and multiply to 6.',solution:[2,3],pool:[1,2,3,4,5]};break;
 case 'powers':g={...g,target:16,title:'Make 2⁴',rule:'2⁴ means 2 × 2 × 2 × 2. Connect factors that make that value.',solution:[2,2,4],pool:[1,2,4,8]};break;
 case 'functions':g={...g,target:11,title:'f(x) = 2x + 3. Make f(4).',rule:'Substitute 4 for x, then build the output by adding tiles.',solution:[2,4,5],pool:[1,2,3,4,5,6,7,8,9]};break;
 }
 return g;
}
export const adjacent=(a:number,b:number)=>Math.abs(a%SIZE-b%SIZE)+Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE))===1;
export function validPath(r:PopRun,path:number[]){return path.length>=2&&path.length<=8&&new Set(path).size===path.length&&path.every((i,k)=>Number.isInteger(i)&&i>=0&&i<36&&!r.board[i].star&&(!k||adjacent(i,path[k-1])));}
export function tileLabel(r:Pick<PopRun,'trail'|'level'>,n:number){const g=goal(r);return r.trail==='ratio'?(n===1?'R':'B'):r.trail==='factor'?`x+${n}`:r.trail==='terms'?`${n===1?'':n===-1?'−':n}x`:r.trail==='percent'?`${n}%`:g.denominator===8?`${n}/8`:g.denominator===10?(n/10).toFixed(1):String(n);}
export function evaluate(r:PopRun,path:number[]){
 const g=goal(r),ns=path.map(i=>r.board[i].n);let n=0,d=1;
 if(r.trail==='multiply'||r.trail==='powers')n=ns.reduce((a,b)=>a*b,1);
 else if(r.trail==='divide'){n=ns[0]??0;d=ns.slice(1).reduce((a,b)=>a*b,1);}
 else if(r.trail==='subtract')n=ns.slice(1).reduce((a,b)=>a-b,ns[0]??0);
 else n=ns.reduce((a,b)=>a+b,0);
 let correct=n===g.target*d;
 let result=g.denominator===8?`${n}/8`:g.denominator===10?(n/10).toFixed(1):d!==1?`${n}/${d}`:String(n);
 if(r.trail==='ratio'){const red=ns.filter(v=>v===1).length,blue=ns.length-red;correct=red>0&&blue===red*2;result=`${red} red : ${blue} blue`;}
 if(r.trail==='factor'){correct=ns.length===2&&ns[0]+ns[1]===5&&ns[0]*ns[1]===6;result=ns.length===2?`x² + ${ns[0]+ns[1]}x + ${ns[0]*ns[1]}`:'Choose two factors';}
 if(r.trail==='slope'){correct=n===ns.length;result=`rise ${n} / run ${ns.length}`;}
 if(r.trail==='terms')result=`${n}x`;
 if(r.trail==='percent')result=`${n}%`;
 const expression=r.trail==='ratio'?result:ns.map(v=>r.trail==='factor'?`(${tileLabel(r,v)})`:tileLabel(r,v)).join(` ${trail(r.trail).op} `)+` = ${result}`;
 return{correct:validPath(r,path)&&correct,result,expression};
}
function nextTile(r:PopRun):Tile{const pool=goal(r).pool;r.serial++;return{id:r.serial,n:pool[hash(r.seed+r.serial*71)%pool.length],ice:false,power:null,star:false};}
export function findChain(r:PopRun):number[]{
 const g=goal(r),op=r.trail;
 const check=(path:number[])=>{const ns=path.map(i=>r.board[i].n);if(op==='factor')return ns.length===2&&ns[0]+ns[1]===5&&ns[0]*ns[1]===6;if(op==='ratio'){const red=ns.filter(n=>n===1).length;return red>0&&ns.length===red*3;}if(op==='divide')return ns[0]===g.target*ns.slice(1).reduce((a,b)=>a*b,1);if(op==='subtract')return ns.slice(1).reduce((a,b)=>a-b,ns[0])===g.target;const n=ns.reduce((a,b)=>op==='multiply'||op==='powers'?a*b:a+b,op==='multiply'||op==='powers'?1:0);return n===(op==='slope'?ns.length:g.target);};
 const positiveSum=['count','add','fraction','decimal','percent','equation','functions'].includes(op);
 const visit=(path:number[]):number[]=>{if(path.length>=2&&check(path))return path;if(path.length>=6||op==='factor'&&path.length>=2||positiveSum&&path.reduce((s,i)=>s+r.board[i].n,0)>=g.target)return[];const last=path[path.length-1];for(const i of [last+1,last-1,last+6,last-6])if(i>=0&&i<36&&adjacent(last,i)&&!path.includes(i)&&!r.board[i].star){const found=visit([...path,i]);if(found.length)return found;}return[];};
 const star=r.board.findIndex(t=>t.star);const order=Array.from({length:36},(_,i)=>i).sort((a,b)=>{const weight=(i:number)=>r.board[i].ice?100:star>=0&&i%6===star%6&&i>star?90+i:0;return weight(b)-weight(a);});for(const i of order)if(!r.board[i].star){const p=visit([i]);if(p.length)return p;}return[];
}
/** Repair a dead board without changing obstacles, stars or specials. */
export function ensureChain(r:PopRun){if(findChain(r).length)return false;const solution=goal(r).solution;for(let row=0;row<6;row++)for(let col=0;col<=6-solution.length;col++){const ids=solution.map((_,j)=>row*6+col+j);if(ids.every(i=>!r.board[i].star)){ids.forEach((i,j)=>{r.board[i].n=solution[j];});return true;}}return false;}
export const objective=(r:Pick<PopRun,'level'>)=>r.level%3===1?'chains':r.level%3===2?'ice':'stars';
export const needed=(r:Pick<PopRun,'level'>)=>objective(r)==='chains'?3:objective(r)==='ice'?6:1;
export function startPop(id:string,skill:Trail,level:number,seed:number):PopRun{
 const r:PopRun={id,trail:skill,level,seed,serial:0,board:[],revision:0,turn:0,score:0,chains:0,ice:0,stars:0,moves:objective({level})==='chains'?6:12,status:'playing',message:'Connect neighboring tiles. Release to pop a correct chain.',burst:[],hint:[],lastEquation:''};
 r.board=Array.from({length:36},()=>nextTile(r));const solution=goal(r).solution;solution.forEach((n,i)=>{r.board[i].n=n;});
 if(skill==='add'&&level===1){[6,4].forEach((n,i)=>r.board[i].n=n);[2,3,5].forEach((n,i)=>r.board[6+i].n=n);}
 if(objective(r)==='ice'){for(const i of [0,1,6,7,12,13])r.board[i].ice=true;if(level===2)for(let row=0;row<3;row++)solution.forEach((n,j)=>r.board[row*6+j].n=n);}
 if(objective(r)==='stars'){const index=level===3?15:3;r.board[index].star=true;r.board[index].ice=false;if(level===3)for(let row=3;row<6;row++)solution.forEach((n,j)=>r.board[row*6+3+j].n=n);}
 return r;
}
export function popChain(run:PopRun,path:number[]){
 if(run.status!=='playing')throw new Error('Start the next level or retry this one.');
 if(!validPath(run,path))throw new Error('Connect 2–8 neighboring tiles without repeating a tile.');
 const r=structuredClone(run),calculation=evaluate(r,path);r.revision++;r.hint=[];r.burst=[];
 if(!calculation.correct){r.message=`Your chain makes ${calculation.result}. Try another connection. No move lost.`;return{run:r,solved:false};}
 const clear=new Set(path),queue=[...path];
 for(let k=0;k<queue.length;k++){const i=queue[k],tile=r.board[i];if(!tile.power)continue;const area=tile.power==='rocket'?Array.from({length:6},(_,x)=>Math.floor(i/6)*6+x):Array.from({length:36},(_,n)=>n).filter(j=>Math.abs(j%6-i%6)<=1&&Math.abs(Math.floor(j/6)-Math.floor(i/6))<=1);for(const j of area)if(!r.board[j].star&&!clear.has(j)){clear.add(j);queue.push(j);}}
 r.ice+=Array.from(clear).filter(i=>r.board[i].ice).length;r.burst=Array.from(clear);r.turn++;r.chains++;r.moves--;r.lastEquation=calculation.expression;r.score+=path.length*50+(clear.size-path.length)*25+(path.length>=3?100:0);
 for(let col=0;col<6;col++){let remaining=Array.from({length:6},(_,row)=>row*6+col).filter(i=>!clear.has(i)).map(i=>r.board[i]);if(remaining[remaining.length-1]?.star){remaining=remaining.slice(0,-1);r.stars++;}while(remaining.length<6)remaining.unshift(nextTile(r));for(let row=0;row<6;row++)r.board[row*6+col]=remaining[row];}
 const power=path.length>=5?'bomb':path.length>=3||r.chains%3===0?'rocket':null;if(power){const i=path[path.length-1];if(!r.board[i].star)r.board[i].power=power;}
 const progress=objective(r)==='chains'?r.chains:objective(r)==='ice'?r.ice:r.stars;
 if(progress>=needed(r)){r.status='won';r.message='Level cleared! Brilliant connections.';}
 else if(r.moves===0){r.status='lost';r.message='Out of moves. Try this puzzle again—you keep your earned rewards.';}
 else{const repaired=ensureChain(r);r.message=`${power==='bomb'?'Bomb created!':power==='rocket'?'Rocket created!':'Nice pop!'} ${clear.size} tiles cleared.${repaired?' Fresh numbers opened a new connection.':''}`;}
 return{run:r,solved:true};
}

export function mixPop(run:PopRun){const r=structuredClone(run);r.revision++;r.burst=[];r.hint=[];r.seed=hash(r.seed+r.revision);const pool=goal(r).pool;for(const t of r.board)if(!t.star)t.n=pool[hash(r.seed+t.id)%pool.length];ensureChain(r);r.message='Fresh numbers! Ice, stars, specials and moves stay in place.';return r;}
