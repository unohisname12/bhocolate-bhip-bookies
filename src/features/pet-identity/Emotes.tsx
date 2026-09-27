import { useEffect, useState } from 'react';
import { EMOTES, EMOTE_LABELS, type Emote } from './model';
import './emotes.css';

// Server time only orders reactions; a stale one from before this page opened is not replayed.
export function EmoteBubble({ emote, at }: { emote: Emote; at: number }) {
  const [shown, setShown] = useState(() => Math.abs(Date.now() - at) < 10000);
  useEffect(() => { if (!shown) return; const t = setTimeout(() => setShown(false), 4000); return () => clearTimeout(t); }, [shown]);
  return shown ? <span className="emote-bubble" role="status">{EMOTE_LABELS[emote].icon} {EMOTE_LABELS[emote].text}</span> : null;
}

export function EmoteBar({ disabled, send }: { disabled: boolean; send: (emote: Emote) => void }) {
  return <div className="emote-bar" role="group" aria-label="Send a reaction">{EMOTES.map(e =>
    <button key={e} type="button" disabled={disabled} title={EMOTE_LABELS[e].text} aria-label={`React: ${EMOTE_LABELS[e].text}`} onClick={() => send(e)}>{EMOTE_LABELS[e].icon}</button>)}</div>;
}
