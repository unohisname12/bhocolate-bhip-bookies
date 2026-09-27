# Math Stack playability upgrade

The original game asked players to choose a shape, choose a value for every block, fill an eight-cell row and make its total match a problem. That combination obscured the next move and reset the board after every puzzle.

The default **Stack & solve** mode now asks one question and offers three answer pieces. Choose the answer, tap the board or use arrows to aim, rotate, then drop. Correct answers add a piece to a persistent stack; full rows clear and compact. Incorrect answers return the piece without changing the board or paying a reward. There is no timer. Twelve correct answers finish an adventure, with score, row bonuses, progress stars and a victory screen.

Kindergarten counts visible blocks, varying from 3 to 10. Grade 1 practices addition within 20. All 18 existing K–9 trails have shuffled answer choices, including symbolic factoring/like-term answers. These remain representative skills, not a complete curriculum. The player’s earned pet supplies feedback. No new pet selection, account, currency or migration is required.

Guidance changes from “choose” to “aim and drop,” answer pieces show their shape, landing outlines show placement, and controls work with touch or a Chromebook keyboard. Layout is responsive, selected answers have explicit high contrast, and celebrations respect reduced motion. A fresh-board control keeps earned score and progress. The old row puzzle modes remain available; existing saved boards can still be resumed. On reopening an old mode, the mode chooser introduces the new default without erasing that save.

Online answers are checked against server-generated choices. Existing revision/receipt controls, the 20-reward daily cap and protected save checkpoints remain in effect.

Validation:
- 1,457 unit tests across 106 files passed.
- Seven browser tests passed, covering new-mode wrong/correct answers, reload, counting, mobile, Grade 9, and legacy modes.
- Classroom integration passed for authoritative answers, reward receipts, protected checkpoints and new-mode reload.
- Full live twelve-question adventure completed with row clears, +24 MP, a mid-game reload and victory; synthetic classroom removed afterward.
- Installed local copy verified through the real launcher, including aiming and selected-answer contrast.
- Production/offline builds, Worker types, targeted lint and diff checks passed.

Live Worker: `617f2c3f-2ada-4f46-bbff-1b382b6cf083`.
Screenshots: `/home/dre/Pictures/V-Pet-Math-Stack-Upgrade-2026-09-27/`.
Offline backup: `/home/dre/Games/V-Pet-Local/site-before-math-stack-upgrade-20260927`.
