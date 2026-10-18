# Sprint 4 — Native daily re-lock extension (not yet device verified)

## Purpose

A React Native timer cannot reliably restart app blocking while iOS suspends or kills Read to Unlock.
Sprint 4 adds an **actual DeviceActivityMonitor app extension** scheduled by the native iOS module.
At the start of the next local day, Apple's system is requested to run
`intervalDidStart(for:)` in a separate process and re-apply only the apps and categories
the user selected with FamilyActivityPicker.

## Native parts

- `extensions/rtu-daily-monitor/DeviceActivityMonitorExtension.swift` — system monitor callback.
- `modules/rtu-screen-time/ios/RTUScreenTimeModule.swift` — native schedule registration,
  App Group persistence, user opt-out and foreground shields.
- `plugins/withDailyMonitor.js` — adds app extension target and embeds it during Expo CNG.
- `app.json` — app group entitlements for both targets and EAS signing metadata.
- `contexts/reading-rewards.tsx` — schedules monitoring when the user opts in and has
  Screen Time authorization; emergency disable stops it.
- GitHub Actions validates the generated Xcode target on an unsigned prebuild.

## Exact runtime behavior

When a user selects apps in Apple's picker:
1. Tokens are stored in the `group.com.anonymous.readtounlock` App Group.
2. Native `DeviceActivityCenter` is configured for a repeating daily interval,
   00:00–23:59 (local calendar time).
3. The V2 daily reward engine requests shielding now if today's reading goal is incomplete.
4. After the goal is completed, the main app removes those shields.
5. At the next day's start, the *extension* requests the selected shields again,
   provided native monitoring remains opted in and Apple authorization is still approved.
6. If the user chooses **Emergency: turn off app restrictions**, the native App Group opt-in
   is cleared *before* stopping the schedule and clearing shields.

The native extension never sees the user's books or private application identities.
It only accesses opaque Apple tokens and the monitoring opt-in flag.

## Developer setup before on-device testing

Apple needs separate identifiers/provisioning profiles for:

- Main app: `com.anonymous.readtounlock`
- Extension: `com.anonymous.readtounlock.daily-monitor`
- Shared App Group: `group.com.anonymous.readtounlock`

Both targets require the Family Controls capability; both require the App Group entitlement.
Apple may require explicit Family Controls distribution entitlement approval.
The current bundle IDs are provisional and should be finalized before release.
The user does not yet have a paid Apple Developer membership.

After enrolling, set up Apple credentials in EAS and run:

```sh
npm ci
npx expo prebuild --platform ios --no-install  # inspect generated project, don't commit ios/
eas build --platform ios --profile development
```

## Known limitations and testing

- **No real signed iOS build or physical-device test has occurred.** Source syntax and
  generated-target structure cannot prove Apple's callback fires as expected.
- Apple's Device Activity extension callbacks can be delayed or missed; the app
  also refreshes and reapplies policy on foreground as recovery.
- There is a one-minute gap between a 23:59 end and the next 00:00 start; the extension
  does not clear shields at interval end.
- Timing and timezone changes, OS reboot, permissions revocation, screen time state,
  changes to app selections and app deletion need device QA.
- The V2 reward engine's timed unlock mode is not used here; the extension implements
  next-day **daily** re-lock only.
- Read to Unlock cannot force Apple to run its extension at an exact wall-clock time.
  Do not market it as guaranteed until tests establish practical reliability.

## CI commands

```sh
npm ci
npx tsc --noEmit
swiftc -frontend -parse extensions/rtu-daily-monitor/DeviceActivityMonitorExtension.swift
node scripts/check-daily-monitor.cjs
npx expo prebuild --platform ios --no-install
node scripts/check-daily-monitor.cjs --generated
```

No App Store / TestFlight release is made by this sprint.

## Authoritative references
- Apple's Family Controls documentation:
  https://developer.apple.com/documentation/xcode/configuring-family-controls
- Apple's DeviceActivityMonitor:
  https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor
- Apple's valid extension point identifier:
  https://developer.apple.com/forums/thread/819904
- Expo EAS extension metadata:
  https://docs.expo.dev/build-reference/app-extensions/
