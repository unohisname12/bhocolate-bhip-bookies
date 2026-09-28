# Cloudflare request budget — September 27, 2026

The email reset (September 28 00:00 UTC / September 27 5 PM PDT) had already occurred when checked at approximately 00:39 UTC. Cloudflare account GraphQL workersInvocationsAdaptive reported 968 Auralith requests and 39 Bremerton requests since reset, with zero Worker errors. These analytics are a snapshot, not a guarantee of future usage or exact billing totals.

Auralith hourly requests decreased from 5,657 at 22:00 UTC to 1,176 at 23:00 UTC following the earlier polling fixes. Old open tabs still need saving and refreshing to load the idle/visibility-aware polling helper.

Additional fix: changed assets.run_worker_first from true to ["/*", "!/assets/*"]. Public JS, CSS, sprites, fonts and other game assets now use direct static asset serving. HTML, all APIs and multiplayer routes retain Worker routing, security headers and authentication. public/_headers preserves the security policy on direct asset responses. No billing plan was changed.

Preserved the concurrently published teacher-boss release f1586a89-4b4c-4881-a326-23d3adba05ed, including its exact built files and retained historical chunks. Earlier Math Pop release was superseded before deployment, so its source was reconciled with the new live baseline first.

Validation: Wrangler dry run and Worker TypeScript passed. Local HTML, JS bytes, security headers and unauthenticated session/Hunt API responses passed. Direct asset _headers were checked on local HTTP to distinguish static serving from the Worker response. Live HTML and JS bytes match the latest teacher-boss build; health endpoint returned 200, session returned authenticated-only 401, and security headers passed. Deployment: 93146344-d16a-4791-9888-b63f621ea5d0.

Sources: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ and https://developers.cloudflare.com/workers/platform/limits/
