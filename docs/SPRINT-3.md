# Sprint 3 — Native iPhone Screen Time bridge (draft)

## What this branch adds

The Read to Unlock V2 React Native app now has a **local iOS Expo module**, `modules/rtu-screen-time`:

- Request individual Screen Time / FamilyControls authorization.
- Present Apple's `FamilyActivityPicker` natively (React Native receives only counts, never identity-revealing tokens).
- Save opaque application, category and website tokens in device-local UserDefaults.
- Apply or remove only the selected `ManagedSettingsStore` shields.
- Integrate iOS permission/selection with V2's reading reward controller: a completed **daily** goal requests removal of selected shields; when the app is active and today's goal is incomplete, the controller can request applying shields.
- Explicit emergency disable is persistent until the user reconfigures Apple app selection.
- On Android, Expo Go, and builds without the module, track reading without claiming restrictions exist.

## Why the old ios folder was deleted on this development branch

The old tracked `ios/` directory contained only parts of an iOS project, not an `.xcodeproj`. It contained invalid Family Controls code and CocoaPods framework declarations. **EAS Build skips Prebuild if `ios/` exists**, so those files prevented generating a complete native app. They are still available untouched in `backup/v1-working-features`.

V2 now ignores `ios/` and `android/`, preserving the local custom native code in the Expo module under `modules/`. Expo's documented CNG approach generates native projects when a build runs. `app.json` already requests the Family Controls entitlement, but that is NOT a grant from Apple.

## Automated checks

```bash
npm ci
npx tsc -p tsconfig.v2-core.json
node --test tests/reading-unlock.test.cjs
npx tsc --noEmit
node scripts/check-screen-time-integration.cjs
swiftc -frontend -parse modules/rtu-screen-time/ios/*.swift
npx expo-modules-autolinking resolve --platform ios
```

GitHub CI parses Swift syntax and checks autolinking, **but does not link iOS frameworks, run Xcode, or install the app**. Build success is not proven until signed iOS compilation.

## Real-device readiness

1. Join the Apple Developer Program when ready to build and provision on device. A Family Controls entitlement may require separate approval for distribution.
2. Configure valid iOS signing, then use `eas build --platform ios --profile development` from the repository root. No Mac ownership is required because EAS uses hosted macOS builders.
3. Open Focus settings on a physical iPhone, request Screen Time authorization, choose one nonessential app, and test shield/unshield.
4. Verify denying/revoking permissions, device reboot, app restart, daily rollover and the emergency disable.
5. **Do not publish or market as a working app blocker yet.**

## Known limitations

- **No DeviceActivityMonitor extension has been created**, so overnight/expired reward re-locking is NOT reliable when the app is terminated/backgrounded. The app attempts to reapply restrictions when opened.
- Shield calls have not been compiled against a current iOS SDK or tested with a signed entitlement. Apple's authorization/profile and platform APIs may require corrections.
- The first screen collects *preference names*, but only the native picker creates actual iPhone restriction targets. Those names are never interpreted as iOS bundle IDs.
- The app's reading timer itself doesn't verify that pages were actually read; existing timed screen-time reward mode is not exposed in Sprint 3.
- Older unused `services/app-locker-ios.ts` still references the legacy bridge and should be removed/replaced if touched elsewhere.
- This is a draft PR; keep the backup branch unchanged.

## API references
- Apple: https://developer.apple.com/documentation/familycontrols/familyactivitypicker
- Expo: https://docs.expo.dev/modules/get-started/
- Expo CNG: https://docs.expo.dev/workflow/continuous-native-generation/
