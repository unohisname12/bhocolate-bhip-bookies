import type { RoomLife } from './roomLife';
/** A small vector prop, separate from species sheets, so every pet can hold it. */
export function BookProp({phase}:{phase:NonNullable<RoomLife['book']>['phase']}) {
  return <svg className="hb-book-prop" data-book-phase={phase} viewBox="0 0 60 40" role="img" aria-label={phase==='read'?'Pet reading an open book':phase==='take'?'Pet taking a book from the shelf':'Pet returning the book'}>
    <path d="M3 7 Q18 2 30 10 Q42 2 57 7 L57 35 Q43 30 30 37 Q17 30 3 35Z" fill="#365d78" stroke="#223e52" strokeWidth="2"/>
    <path d="M7 5 Q20 2 30 10 L30 33 Q19 27 7 31Z M53 5 Q40 2 30 10 L30 33 Q41 27 53 31Z" fill="#fff3c8"/>
    <path d="M12 12L24 15M12 18L24 21M36 15L48 12M36 21L48 18" stroke="#b1a080" strokeWidth="2"/>
    <path className="hb-book-page" d="M30 10 Q40 2 53 5L53 31Q41 27 30 33Z" fill="#fffae5" opacity=".85"/>
  </svg>;
}
