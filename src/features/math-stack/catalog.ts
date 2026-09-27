export const TRACKS = [
 {id:'bonds',grade:0,name:'Number Garden',skill:'Counting & number bonds',kind:'sum',detail:'Build the target with counting blocks.'},
 {id:'add',grade:1,name:'Addition Falls',skill:'Addition',kind:'sum',detail:'Add the block values to answer the question.'},
 {id:'subtract',grade:2,name:'Difference Dock',skill:'Subtraction',kind:'sum',detail:'Find the difference, then build that total.'},
 {id:'multiply',grade:3,name:'Product Works',skill:'Multiplication',kind:'sum',detail:'Work out the product. Build it from groups of blocks.'},
 {id:'divide',grade:4,name:'Division Depot',skill:'Division',kind:'sum',detail:'Find the size of each equal group.'},
 {id:'fraction',grade:5,name:'Fraction Grove',skill:'Fractions',kind:'fraction',detail:'Combine fractional blocks using equal-sized units.'},
 {id:'decimal',grade:5,name:'Decimal Drops',skill:'Decimals',kind:'fraction',detail:'Tenths add together to build an exact decimal.'},
 {id:'signed',grade:6,name:'Integer Ice',skill:'Signed numbers',kind:'sum',detail:'Positive and negative block values balance each other.'},
 {id:'ratio',grade:6,name:'Ratio River',skill:'Ratios',kind:'ratio',detail:'Build the red-to-blue ratio across a full row.'},
 {id:'percent',grade:7,name:'Percent Plaza',skill:'Percentages',kind:'sum',detail:'Calculate the part, then assemble its value.'},
 {id:'equation',grade:7,name:'Equation Tower',skill:'Linear equations',kind:'sum',detail:'Solve for x. The row total must equal x.'},
 {id:'slope',grade:8,name:'Slope Skyline',skill:'Slope',kind:'slope',detail:'Each block is one step right. Its value is the rise.'},
 {id:'functions',grade:8,name:'Function Factory',skill:'Functions',kind:'sum',detail:'Find the output of the function, then build it.'},
 {id:'terms',grade:9,name:'Expression Forge',skill:'Like terms',kind:'terms',detail:'Collect x terms and constants separately.'},
 {id:'factor',grade:9,name:'Factor Factory',skill:'Quadratic factoring',kind:'factor',detail:'Build two factors: left four blocks choose a; right four choose b.'},
 {id:'systems',grade:9,name:'Twin Towers',skill:'Systems of equations',kind:'sum',detail:'Two equations, one shared x. Build the value that fits both.'},
 {id:'inequality',grade:9,name:'Boundary Blocks',skill:'Inequalities',kind:'sum',detail:'Find the greatest integer allowed by the inequality.'},
 {id:'exponents',grade:9,name:'Power Peaks',skill:'Exponents',kind:'sum',detail:'Evaluate powers and assemble the result.'},
] as const;
export type Track = typeof TRACKS[number]['id'];
export type Kind = typeof TRACKS[number]['kind'];
export const track = (id:Track)=>TRACKS.find(t=>t.id===id)!;
export const SHAPES = [ [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]], [[0,0],[0,1],[1,1],[2,1]], [[2,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]], [[0,0],[1,0],[1,1],[2,1]] ] as const;
export const SHAPE_NAMES=['I','O','T','L','J','S','Z'];
export const WIDTH=8, HEIGHT=12;
