# Rooms, care feedback and display size — September 26, 2026

Installed in the local offline app and deployed to Cloudflare as `4e7e62dc-3c5a-4ae4-8da1-f3e53896ddf5`.

- Rooms open in a fitted detailed view. Real furniture previews provide direct room navigation. Room / Close-up / Whole house controls, remembered per-pet room and zoom, Center room, Find my pet and separate following.
- Wall frames, book ledges, kitchen utensils, bathroom towels, cups, light and window dust add architectural detail without adding purchased furniture or changing walkable tiles.
- Fullness and health meters show actual feeding results after the animation. Repeat feeding or Done; leaving a finished meal never cancels its benefits.
- All six care activities apply completed care automatically and show actual before/after changes. Escape after completion preserves care. House care meters show fullness, cleanliness, happiness and health.
- Small Aa button opens display-size settings: 100%, 115%, 130%, 150%. Enlarges controls and text across the app, persists per browser, supports keyboard and fullscreen. Hunt also has controls inside Menu; on narrow Hunt screens the extra floating button is hidden to keep the HUD clear.
- CSS viewport units and responsive media queries compensate for interface zoom so fullscreen games stay within the viewport. No global font-only scaling or permanent toolbar.

Validation: 1,405 unit tests passed; changed-file lint, offline/client builds, Worker types and deployment dry-run passed. Twelve new browser cases passed across room selection/zoom/reload, pet independence, repeated feeding, capped medicine, all six care activities, keyboard sizing, fullscreen Hunt and enlarged phone layouts. The phone feeding grid overflow found during review was fixed and its regression rechecked.

The local wrapper, origin and vpet_save_auto key remain unchanged. Private offline seed is excluded from the online build. Local rollback files: /home/dre/Games/V-Pet-Local/site-before-room-care-display-20260926. Classroom backup and synthetic live checks stay private. Screenshots: /home/dre/Pictures/V-Pet-Rooms-2026-09-26/.

Final regressions passed: care completion survives frequent parent renders; finished feeding and idle care leave without a cancellation warning; unfinished care warns and preserves earned possessions. Starting classroom care correctly opens the companion scene. Narrow feeding layouts scroll the completed meter into view. Synthetic live feeding, Momentum, house travel/save/reload and display sizing checks passed, with the temporary class removed. A fresh browser verified the final deployed entry and working display-size control.
