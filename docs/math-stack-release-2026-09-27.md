# Math Stack — 2026-09-27

A new falling-block math puzzle game, accessible through Games → Math Stack online and Play → Math Stack in the installed offline copy. Kindergarten and Grade 1 have dedicated shortcuts. Choosing a practice trail does not change the teacher-assigned grade.

## Play

Move and rotate tetrominoes, select their block values, and complete an eight-cell row that satisfies the displayed math goal. Incorrect complete rows return the piece and explain the mismatch. Each adventure contains five puzzles; a correct row clears the puzzle board for the next question. Learn & build is untimed; Falling challenge adds descending pieces, with pause and touch/keyboard controls. Undo affects only the latest unsolved placement.

The 18 trails cover representative skills from Kindergarten counting through Grade 9: addition, subtraction, multiplication, division, fractions, decimals, integers, ratios, percentages, equations, slope, functions, like terms, factoring, systems, inequalities and powers. This is a skill collection, not a complete K–9 curriculum. Math is solved using actual block placements, with exact fractional units, individual ratio colors and separate algebra coefficients. Animated worked examples show two-piece solutions and mark the attempt as supported practice.

The companion is the learner’s earned pet. Existing math rewards and learning evidence are reused. Up to 20 correctly solved puzzles per UTC day receive rewards; practice and scores continue afterward. Online placements and rewards are computed by the server, with revisions and idempotent receipts. Student save uploads cannot forge Math Stack progress. Old saves remain compatible; no database migration is required.

## Verification

- Production build, generated strict save validator, Worker type checks and targeted lint passed.
- 3,600 generated puzzles (18 trails × 40 seeds × 5 rounds) verified solvable.
- Full suite: 1,452 passed; one existing Pet Hunt simulation hit its 5-second timeout during concurrent work. Its isolated rerun passed all 13 tests in 3.44 seconds. Total current suite: 1,453 tests.
- Four browser tests passed: beginner play/save/reward, Grade 9 worked example, phone/reduced motion, falling/pause.
- Classroom integration passed: launcher, authoritative moves, duplicate reward receipt, forged-save rejection, Grade 9 evidence, saved UI.
- Live synthetic classroom: Grade 1 game, Kindergarten solve/+2 MP, partial-board reload, Grade 9 example, earned pet and zero browser runtime errors. Synthetic records removed afterward.
- Installed offline copy: Grade 1 launched through Play; partial board survived reload with zero browser runtime errors. Launcher and existing saves preserved.

Live Worker version: `7487a4f6-56ba-4a3a-8ba3-9266fb335763`.
Screenshots: `/home/dre/Pictures/V-Pet-Math-Stack-2026-09-27/`.
Local backup: `/home/dre/Games/V-Pet-Local/site-before-math-stack-20260927`.
