import type { usePlayTime } from './usePlayTime';
import './play-time.css';

type Play = ReturnType<typeof usePlayTime>;
const clock = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function PlayTimeChip({ play, card = false }: { play: Play; card?: boolean }) {
  const v = play.view;
  if (!v?.enabled) return null;
  const earn = `${play.progress}/${v.questionsPerRound} solved toward +${v.minutesPerRound} min`;
  if (!card) return <span className="play-time-chip" role="status" aria-live="off">Game time {clock(play.balanceMs)} · {earn}</span>;
  return <section className="play-time-card" aria-label="My game time">
    <div><strong>{v.mathOnly ? 'Math time right now' : `Game time: ${clock(play.balanceMs)}`}</strong>
      <p>{v.mathOnly ? 'Your teacher paused games for now. Your saved minutes are waiting.' : `Solve ${v.questionsPerRound} math questions to earn ${v.minutesPerRound} minutes — hints are OK. Math inside Café, Shellguard, and Delivery counts too. ${v.mode === 'class' ? `In class you can hold up to ${v.capMinutes} minutes, and they end when class does.` : `At home you can save up to ${v.capMinutes} minutes.`} Math games like Math Practice, Catch Math, and Number Merge never use your time.`}</p>
      <p>{earn}</p></div>
  </section>;
}

export function EarnTimePrompt({ play, inGame, onMath, onHome, onClose }: { play: Play; inGame: boolean; onMath: () => void; onHome: () => void; onClose?: () => void }) {
  const v = play.view;
  return <div className="play-time-overlay" role="dialog" aria-modal="true" aria-labelledby="earn-time-title"><div className="play-time-panel">
    <h2 id="earn-time-title">{v?.mathOnly ? 'Math time' : inGame ? 'Game time is up' : 'Earn game time first'}</h2>
    <p>{v?.mathOnly ? 'Your teacher paused games for now. Your saved minutes are safe.' : `Solve ${v?.questionsPerRound ?? 5} math questions to earn ${v?.minutesPerRound ?? 15} more minutes. Hints are OK. ${inGame ? 'Your game is paused and saved.' : ''}`}</p>
    {v && !v.mathOnly && <p>{play.progress}/{v.questionsPerRound} solved toward your next {v.minutesPerRound} minutes.</p>}
    {v && !v.mathOnly && v.floorAvailable && <p>Stuck? Use the help in Math Practice, then try a new question. That earns {v.floorMinutes} minutes once today.</p>}
    <div><button className="student-primary" onClick={onMath}>Go to Math Practice</button><button onClick={onHome}>Home</button>{onClose && <button onClick={onClose}>Close</button>}</div>
  </div></div>;
}
