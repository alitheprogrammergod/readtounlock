# Read to Unlock V2 — Sprint 2 implementation notes

## What changed
- A no-account, three-step onboarding: welcome, daily reading goal, distraction preferences.
- Saved daily-goal preferences and distraction lists using AsyncStorage.
- Dashboard and Focus tab now use Sprint 1 reading-reward state rather than the legacy disconnected counter.
- Reading sessions restore paused after restarting and only award reading credit after a completed save.
- Session IDs deduplicate repeated reward checkpoints and book progress submissions.
- Existing book scan and ISBN entry flows remain available.
- Three additional regression tests for duplicate book credits, page validation, and goal changes.

## What still needs to be done
**Native app blocking is NOT operational in this sprint.** We deliberately do not request Screen Time permission or call the original broken native APIs. The UI tells users that selected distractions are preferences only, not enforced restrictions. Implement Apple's FamilyActivityPicker using tokens, real shields, permission handling and reliable background relocking; add Android native services separately.

Reading time is self-reported via the active session timer; it does not prove a page was read. Background/phone suspension and midnight-crossing sessions require further device validation. Friends/invites, PDF/notes OCR and subscriptions are not yet implemented.

## How to test
1. New install: welcome -> 15 min goal -> select Instagram/YouTube -> finish -> dashboard.
2. Kill/relaunch: onboarding is skipped and chosen goal and apps persist.
3. Add a book by barcode or manual ISBN; open its reading session.
4. Start -> pause -> resume -> stop -> enter current page -> save; dashboard gains minutes.
5. Repeat Save or reopen the session: reward and book totals must not double.
6. Adjust goal in Focus settings; existing reading credit remains.
7. Midnight: daily progress resets, preferences remain.
8. Verify warning: users must not be told they have actually blocked Instagram.

## Automated tests
```sh
npm ci
npx tsc -p tsconfig.v2-core.json
node --test tests/reading-unlock.test.cjs
```
The GitHub Actions workflow performs these checks on the development branch/PR. Real React Native builds and device-blocking tests remain outstanding.
