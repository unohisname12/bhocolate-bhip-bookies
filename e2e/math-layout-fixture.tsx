import {createRoot} from 'react-dom/client';
import {MathScreen} from '../src/screens/MathScreen';
import '../src/index.css';
import '../src/pilot/pilot.css';
import '../src/features/student-navigation/student-navigation.css';
const noop=()=>{};
export function Fixture(){
 return <div className="pilot-student"><header className="pilot-savebar" style={{height:80}}><span>Mr Dre<span role="status">Saved online</span></span><span>Account & help</span></header><nav className="student-nav" aria-label="Student menus">{['Home','My Pet','Games','Together','Rewards'].map(label=><button key={label}>{label}</button>)}</nav><div className="student-activity-bar"><button>← Home</button><strong>Math Practice</strong><span>Game time 0:00 · 0/5 solved</span></div><MathScreen speciesId="subtrak" dispatch={noop} onExit={noop} checkpoint={{completed:location.search.includes('finish')?4:0,correct:null,problem:{id:'layout-question',context:'practice',question:'72 − 14 = ?',answer:58,difficulty:1,reward:10,hint:'Subtract 10, then subtract 4.',explanation:['Start with 72.','Subtract 10 to get 62.','Subtract 4 to get 58.']}}}/></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
