# Reconciled V-Pet release — September 26, 2026

Combines the deployed feeding, Number Merge, Momentum Power Clash and capture animations with the unpublished living house, detailed Hunt pets and compact HUD, beacon spark checks, new props, and visibility-aware polling.

Compared main source, offline source, and the exact current capture release. Shared offline house and Hunt UI are present in this release. Offline bootstrap, private seed and /game.html launcher remain offline-only. Local progress was not imported into classroom saves.

Review fixed recovery of pre-update persisted Hunt rooms, refreshed owned-pet stage/grade on lobby reconnect, and removed an invalid test-only reference to the validator's undeclared errors property.

Validation: 1,404 unit tests initially passed; 47 Hunt tests including a new legacy-room regression and 2 strict house-save tests passed after fixes. Production build and Worker types passed. Changed-file lint passed. Full lint still has 40 existing errors and 2 warnings outside changed release runtime files. House browser flows (2), cloud save/re-login (1), and Momentum capture checks (19) passed. Vite fixture runs reported font allow-list warnings because node_modules is symlinked; production build emits same-origin font files.

Release is isolated from the dirty development tree. Classroom export taken privately before deployment. No database migration or real learner save replacement is required. Live verification uses a disposable synthetic classroom.

## Published and verified

Cloudflare version: `491cb510-4c8d-4ac0-b091-85e2a698ea0c`. Live HTML references the exact tested build asset. HTTP 200 verified. All 15 Hunt browser tests passed, including five-client play, authentication, ownership, rematch, rival full round, guide videos and beacon spark interaction; total affected browser checks: 37.

Production checks passed: feeding animation and exactly one saved food charge; Power Clash action and AI turn saved/reloaded; guide video playback and phone fit; living-house pet traveled to kitchen and its location persisted through reload; actual Momentum capture animation resolved; Hunt loaded the owned pet, advanced its timer and opened its menu. No runtime errors. Synthetic classroom removed after checks.

Source pushed to `release/vpet-reconciled-20260926` on GitHub. This is a release branch, not a merge into main. Existing offline progress and real learner saves were not imported or replaced.
