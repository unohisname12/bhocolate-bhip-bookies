import { mkdirSync, writeFileSync } from 'node:fs';
// Original vector furniture: 24 silhouettes, nine illustrated collections.
const themes = [
 ['cottage','Cottage', '#bb8354','#f2d4a3','leaf'], ['coastal','Coastal','#5d9fba','#dbf0ef','wave'],
 ['starlight','Starlight','#666aaf','#ead598','star'], ['mushroom','Mushroom','#b95f56','#efe3b8','spots'],
 ['royal','Royal','#9470a8','#efcf7e','diamond'], ['candy','Candy shop','#db8ea9','#b9e2d2','heart'],
 ['arcade','Arcade','#536b91','#80e0cc','pixel'], ['botanical','Botanical','#648c67','#d7e5b0','leaf'],
 ['snowfall','Snowfall','#91b6c9','#edf4f6','snow'],
];
const types = [
 ['armchair','armchair','comfort',2,1,'rest'], ['sofa','sofa','comfort',3,1,'rest'], ['bed','pet bed','comfort',3,2,'rest'],
 ['stool','stool','comfort',1,1,'rest'], ['bench','bench','comfort',3,1,'rest'], ['ottoman','ottoman','comfort',2,1,'rest'],
 ['desk','writing desk','tables',3,1,'read'], ['table','dining table','tables',2,2], ['coffee','coffee table','tables',2,1],
 ['cabinet','cabinet','tables',2,1], ['bookcase','bookcase','tables',2,1,'read'], ['sideboard','sideboard','tables',3,1],
 ['lamp','floor lamp','lights',1,1,'light'], ['lantern','lantern','lights',1,1,'light'], ['hearth','fireplace','lights',2,1,'light'],
 ['planter','planter','nature',1,1,'water'], ['terrarium','terrarium','nature',2,1,'water'], ['flowers','flower cart','nature',2,1,'water'],
 ['clock','wall clock','wall',1,1], ['mirror','mirror','wall',1,1], ['shelf','wall shelf','wall',2,1,'read'],
 ['rug','woven rug','comfort',3,2], ['toybox','toy chest','treasures',2,1,'play'], ['music','music box','treasures',1,1,'play'],
];
const folder = 'public/assets/home-collections'; mkdirSync(folder,{recursive:true});
const entries=[];
for (const [theme,name,body,accent,motif] of themes) for (const [kind,label,category,width,height,interaction] of types) {
 const edge='#394a49', wood='#87634f';
 const rect=(x,y,w,h,fill=body,r=6)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
 const ellipse=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
 const path=(d,fill=body)=>`<path d="${d}" fill="${fill}"/>`;
 const legs=rect(32,80,10,55,wood,2)+rect(118,80,10,55,wood,2);
 const emblem={leaf:'<path d="M0 9Q-20-7 0-13Q20-7 0 9ZM0 9V-5"/>',wave:'<path d="M-17 0Q-9-13 0 0T17 0M-17 8Q-9-5 0 8T17 8" fill="none"/>',star:'<path d="m0-16 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z"/>',spots:'<circle cx="-9" cy="-5" r="5"/><circle cx="9" cy="5" r="6"/>',diamond:'<path d="m0-15 13 15L0 15-13 0Z"/>',heart:'<path d="M0 12C-30-4-10-22 0-8C10-22 30-4 0 12Z"/>',pixel:'<path d="M-12-12H0V0H12V12H0V0H-12Z"/>',snow:'<path d="M0-16V16M-14-8 14 8M-14 8 14-8" fill="none"/>'}[motif];
 const badge=(x,y,s=1,ink=accent)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="${ink}" stroke="${ink}" stroke-width="2">${emblem}</g>`;
 const panel=theme==='royal'||theme==='starlight' ? path('M25 75V42Q80-10 135 42V75Z') : rect(25,24,110,55,body,theme==='arcade'?2:18);
 const shapes={
 armchair:legs+panel+rect(25,76,110,42,accent,12)+rect(16,61,24,55)+rect(120,61,24,55)+badge(80,51),
 sofa:legs+panel+rect(20,75,120,40,accent,10)+path('M80 77V113','none')+rect(10,64,20,52)+rect(130,64,20,52)+badge(53,49,.7)+badge(107,49,.7),
 bed:legs+panel+rect(20,67,120,57,accent,9)+rect(32,71,45,19,'#fff4df',8)+rect(83,71,45,19,'#fff4df',8)+rect(20,99,120,26)+badge(80,40,.7),
 stool:legs+rect(40,71,80,24)+ellipse(80,72,46,18,accent)+badge(80,71,.65,body),
 bench:legs+rect(18,85,124,23,accent)+rect(24,44,112,30)+rect(25,66,8,30,wood)+rect(127,66,8,30,wood)+badge(80,59,.7),
 ottoman:rect(28,83,104,45)+ellipse(80,83,52,23,accent)+badge(80,83,.8,body),
 desk:legs+rect(23,72,114,13,accent)+rect(99,86,34,30)+ellipse(116,97,3,3,accent)+rect(32,62,35,10,'#fff4df')+badge(80,77,.4),
 table:legs+rect(45,70,8,47,wood)+rect(108,70,8,47,wood)+ellipse(80,68,64,30,body)+ellipse(80,65,57,23,accent)+badge(80,65,.8,body),
 coffee:rect(32,95,10,30,wood)+rect(118,95,10,30,wood)+rect(20,82,120,21)+ellipse(80,80,60,21,accent)+badge(80,80,.7,body),
 cabinet:legs+rect(28,25,104,98)+rect(36,36,40,75,accent)+rect(84,36,40,75,accent)+ellipse(68,76,3,3,body)+ellipse(92,76,3,3,body)+badge(55,58,.5),
 bookcase:legs+rect(24,18,112,111)+rect(33,29,94,88,'#594e4d',2)+[0,1,2].map(row=>[0,1,2,3,4].map((_,i)=>rect(38+i*17,34+row*27,12,21,(i+row)%2?accent:body,1)).join('')+rect(30,57+row*27,100,5,body,0)).join(''),
 sideboard:legs+rect(17,66,126,60)+rect(24,73,33,44,accent)+rect(63,73,33,44,accent)+rect(102,73,33,44,accent)+[40,80,120].map(x=>ellipse(x,93,3,3,body)).join('')+badge(80,54,.6),
 lamp:ellipse(80,129,27,8,body)+rect(75,60,10,66,wood)+path('M52 23H108L127 72H33Z',accent)+badge(80,46,.85,body),
 lantern:path('M62 35V18Q80 0 98 18V35','none')+rect(48,35,64,83)+rect(57,44,46,63,accent)+path('M80 49Q60 80 80 96Q101 80 80 49','#fff7c5')+rect(42,116,76,11),
 hearth:rect(22,45,116,82)+rect(37,65,86,62,'#493e49')+path('M49 123Q45 90 66 91Q63 68 80 77Q101 91 106 121Z',accent)+rect(14,37,132,17)+rect(15,123,130,12)+badge(80,47,.4),
 planter:path('M47 85H113L104 133H56Z')+rect(42,81,76,12,accent)+path('M80 84V33M80 61Q31 69 43 30Q77 30 80 61M80 51Q126 53 118 16Q81 19 80 51','#739c68')+badge(80,110,.65),
 terrarium:rect(31,119,98,15)+path('M33 118V55L80 18 127 55V118Z','#bfe1d9')+path('M33 55H127M80 18V118','none')+ellipse(79,111,39,9,'#779664')+path('M60 110V75M60 89Q40 92 46 71Q62 70 60 89M98 110V81M98 92Q116 88 111 72Q97 73 98 92','#659065')+badge(80,49,.6),
 flowers:ellipse(45,132,10,10,wood)+ellipse(116,132,10,10,wood)+rect(25,83,110,38)+rect(21,78,118,12,accent)+[45,80,112].map((x,i)=>path(`M${x} 82V${40+i*8}`,'none')+ellipse(x,41+i*8,17,13,accent)+ellipse(x,41+i*8,5,5,body)).join('')+badge(80,103,.7),
 clock:ellipse(80,76,52,56,body)+ellipse(80,76,42,46,accent)+path('M80 45V76L100 90','none')+ellipse(80,76,4,4,edge)+badge(80,108,.35),
 mirror:rect(44,122,72,9)+ellipse(80,72,47,59,body)+ellipse(80,72,37,49,'#cee5ea')+path('M62 92 96 44M72 100 99 62','none')+badge(80,20,.55),
 shelf:rect(22,94,116,13)+path('M35 107V128L57 107M125 107V128L103 107',body)+rect(30,55,17,39,accent)+rect(49,62,16,32)+rect(68,50,17,44,accent)+ellipse(109,79,16,15,body)+badge(109,78,.45),
 rug:ellipse(80,93,72,43,body)+ellipse(80,93,61,33,accent)+ellipse(80,93,48,25,body)+badge(80,93,1.3),
 toybox:rect(25,76,110,55)+path('M23 78V63Q80 27 137 63V78Z',accent)+rect(73,72,14,24,wood)+badge(50,105,.65)+badge(110,105,.65),
 music:rect(40,92,80,38)+ellipse(80,92,40,14,accent)+path('M80 89V37L108 30V62','none')+ellipse(69,85,12,8,body)+ellipse(97,62,12,8,body)+badge(80,116,.55),
 };
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="152" viewBox="0 0 160 152"><ellipse cx="80" cy="139" rx="57" ry="7" fill="#283d35" opacity=".12"/><g stroke="${edge}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${shapes[kind]}</g></svg>`;
 const id=`collection_${theme}_${kind}`; writeFileSync(`${folder}/${id}.svg`,svg);
 entries.push({id,name:`${name} ${label}`,description:`${name} collection · ${interaction==='rest'?'A cozy place for your pet to rest.':interaction==='read'?'A corner for stories and curious minds.':interaction==='water'?'A living detail to tend together.':interaction==='play'?'Something fun to explore together.':interaction==='light'?'Switch it on for a softer glow.':'Make it your own with a personal color finish.'}`,art:`/assets/house-v2/furniture/${id}.png`,category,set:name,cost:10+width*5+(kind==='hearth'?15:0),width,height,layer:category==='wall'?'wall':kind==='rug'?'floor':'furniture',...(interaction?{interaction}:{} )});
}
writeFileSync('src/features/home-base/furniture-collection.ts','// Generated by scripts/generate-home-furniture.mjs.\nexport default '+JSON.stringify(entries,null,2)+';\n');
console.log(`Created ${entries.length} original furniture designs.`);
