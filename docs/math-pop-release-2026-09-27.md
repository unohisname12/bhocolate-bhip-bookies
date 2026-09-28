# Math Pop — connect, clear, and solve

Math Pop replaces the Math Stack entry in the Games/Play menu. It is a separate saved puzzle game; old Math Stack saves and their screen remain compatible.

Connect two to eight orthogonally neighboring tiles to build the target. Drag and release, tap tiles then press Pop chain, or select using the keyboard. The equation updates while selecting. Incorrect totals leave tiles and moves intact. Correct chains clear, refill through gravity, score points, and reuse the existing pet-growth/math reward pipeline.

Longer chains create rockets (3+ tiles) and bombs (5+). A rocket is also earned every three correct chains, so two-factor algebra boards can earn specials. Include a special in a later correct chain to clear its row or a 3×3 area. Other specials caught by a blast trigger too. Stars are never destroyed by blasts; clearing underneath brings them to the bottom.

Levels alternate between chain goals, cracking ice, and dropping a star. The first ice and star layouts have tested winning routes for all 16 trails. Later boards vary by seed. No timer; only correct pops spend a move. Restart, free number mixing, and a shown connection provide recovery. Mixing preserves obstacles, stars, special pieces, score and moves. Shown connections are recorded as supported practice. Won levels unlock the next level independently for each trail.

The 16 selectable K–9 trails cover counting dots, addition, subtraction, multiplication, division, eighths, decimals, signed numbers, ratios, percentages, equations, like terms, slope, factoring, exponents and functions. These are representative skill puzzles, not an entire grade curriculum. Choosing a trail does not change a teacher assignment. The companion is the player's earned pet.

Online commands validate the path and math on the server; the client cannot upload forged puzzle progress. Revision checks and request receipts protect concurrent saves and prevent duplicate rewards. Up to 20 correct chains per UTC day earn normal math rewards; scores and learning records continue beyond the cap. Progress is optional in old saves, with no new Math Pop database migration.

## Combined release and validation

The live site advanced during development. This release preserves baseline `30869c10-6c1b-4f5c-8cb1-2bc4915b7e44` from `/home/dre/Code/auralith-hunt-rework-20260927`: Rift Hunt rework, combat math/QTE, house and battle assets, practice exit fixes, safe reload and retained asset graphs. Those baseline files were preserved byte-for-byte outside the Math Pop integration points. Old hashed asset files were retained for already-open tabs.

- 1,517 unit tests across 112 files passed in the combined release.
- 768 generated starting boards checked across 16 trails, six levels and eight seeds; every board has a valid math chain.
- Introductory ice and star winning routes tested across every trail.
- Five browser tests passed: drag chains, specials, level transitions, wrong-answer recovery, keyboard, mobile tapping, reduced motion, Grade 9 and help.
- Classroom API/UI integration passed: launcher, correct reward, duplicate receipt, forged-save rejection, locked-level rejection, reload and hint evidence.
- Local installed launcher, correct pop and reload tested with zero browser errors.
- Live synthetic classroom completed all three introductory levels, earned exactly +18 MP, unlocked level 4 and preserved progress after reload. No browser runtime errors; synthetic records removed afterward.
- Production/offline builds, generated save schema, Worker types, targeted lint and diff checks passed.

Live version: `71cdc9db-909c-4c21-9ef9-eda34f1ffbe4`.
Screenshots: `/home/dre/Pictures/V-Pet-Math-Pop-2026-09-27/`.
Local backup: `/home/dre/Games/V-Pet-Local/site-before-math-pop-20260927`.
