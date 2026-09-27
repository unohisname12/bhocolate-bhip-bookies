# Living weather — September 27, 2026

The house now has its own offline-capable environment. This is clearly labelled in-game weather, not a real-world forecast or location service.

- Deterministic 20-minute weather periods and three upcoming forecasts: clear, clouds, rain, wind, snow and mist, with seasonal weights.
- Local-clock dawn, daytime, sunset and night, or a 24-minute story day. Calendar seasons with northern/southern selection and an approximate lunar phase.
- Pixel-art sky vignette, passing birds/clouds, post-rain rainbow, seasonal outdoor particles, nighttime glimmers, animated window rain/snow and gentle interior tinting. Outdoor precipitation is masked away from room interiors and corridors.
- A compact expandable weather card, in-game temperature/breeze, 15-minute sky previews and automatic return to the forecast. Preferences are device-local and tolerate unavailable/corrupt storage.
- Quiet generated rain/wind and bird/cricket-like sounds, muted by default, adjustable ambient volume. Audio contexts are closed on unmount/hidden tab; visual effects pause when hidden or while caring for the pet. Reduced-motion settings disable decorative animation.
- Pet responses and activity preferences: cozy books/lights in wet weather, rest at night, plants/play in clear skies. Reactions have a three-minute cooldown and wait until the pet is free. Invitations, shared play, sleep and urgent needs retain priority. No weather penalties, passive care rewards, currency changes or save-schema additions.

## Preserved work

This release starts from Pet Battle commit 24a9fed and incorporates the newer local room paintings, furniture art, camera improvements and pet-mind house integration. The room renderer and its decorator share the same art. Old furniture placements remain saved. Battle progression and classroom endpoints are unchanged.

Source changes were synchronized into the main and offline working copies. Original house sources: `/home/dre/Code/.living-weather-source-backup-20260927`. Installed site rollback: `/home/dre/Games/V-Pet-Local/site-before-weather-20260927`. No real browser storage or classroom saves were replaced.

## Checks

- 1,443 unit tests passed in 104 files, including weather determinism/forecast, seasons, preview expiry, invalid preferences, pet priority and unchanged care/currency.
- Two weather browser scenarios passed: desktop preferences/reload/sound and phone/reduced motion. Two existing house regressions passed: physical invitations/reload and phone furniture/care/decorator navigation.
- Client and Worker types passed; changed weather/behavior code lint passed. Production and offline builds completed.
- Installed local build verified Captain Waffles, rain preview, reload and sound controls with no runtime errors.

Live version: `64524332-e079-4a2a-aab3-dc9292054e8a`.
Screenshots: `/home/dre/Pictures/V-Pet-Weather-2026-09-27/`.

Live synthetic classroom also passed weather selection/reload, Pet Battle purchase receipts, saved builds/turns, playable video, classmate duel and teacher controls with zero browser runtime errors. Synthetic records were removed afterward.
