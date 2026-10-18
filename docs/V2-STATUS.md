# Read to Unlock V2 — Sprint 1

This is an additive reading-rewards engine on a separate development branch.

## Included
- Daily-goal and earned-screen-time state machine.
- Idempotent cumulative reading-session credit.
- AsyncStorage-compatible controller with serial updates and native shield adapter interface.
- Tests for goals, expiration, permissions, duplicate credits, midnight resets, serialization, failures and 30,000 randomized events.

## Important limitations
- **Not integrated into existing reading screens**; no user experience changes yet.
- **Does not yet block real apps.** Native iOS FamilyControls needs repair and on-device verification; Android implementation is missing.
- Expired unlocks won't reapply restrictions in the background until a native scheduler is added.
- This engine takes reported duration and does not verify actual reading.
- Friends, onboarding, sharing, PDF scanning and subscriptions are not included.

## Test locally
```sh
npm ci
npx tsc -p tsconfig.v2-core.json
node --test tests/reading-unlock.test.cjs
```
