# xtool Screen Time Lab (iOS experiment)

A **standalone SwiftUI prototype**, isolated from Read to Unlock V2's Expo/React Native app. It is not a production app and does **not** automatically block social apps until real iPhone testing confirms it.

## What is implemented
1. Request **individual** Family Controls authorization.
2. Let the user choose installed applications/categories with Apple's **FamilyActivityPicker** (privacy-preserving tokens, not guessed bundle IDs).
3. Save the selection locally.
4. Ask **ManagedSettingsStore** to apply shields only to the selected tokens.
5. Remove the shields when the user taps **Simulate reading goal complete**.
6. Remove the shields manually with a safety button.

**No real reading verification, timer-to-unlock integration, background re-locking, or native React Native bridge exists in this experiment.**

## Why xtool may not be able to run this yet
xtool supports SwiftPM iOS apps without Xcode on Linux/WSL. However, the currently inspected xtool source ([supportedTypes](https://github.com/xtool-org/xtool/blob/main/Sources/XKit/Model/Entitlements/EntitlementTypes.swift) and [capability mapping](https://github.com/xtool-org/xtool/blob/main/Sources/XKit/DeveloperServices/App%20IDs/Entitlements/DeveloperServicesCapability.swift)) does **not** list the Family Controls entitlement/capability mapping. Its official [entitlement guide](https://xtool.sh/documentation/xtool/control/) cautions that unsupported entitlements may require additional xtool development.

The `App.entitlements` file specifies `com.apple.developer.family-controls=true` for documentation and potential provisioning, but **requesting it in code or in a plist does not grant it**. Apple must allow the entitlement in your signing profile for the device. Distribution needs Apple's additional Family Controls approval, separately for Screen Time API app extensions.

**Do not try to bypass or patch entitlement checks.** If xtool errors during signing/provisioning, stop and record the message. A supported alternative for the existing Expo project is **Expo EAS Build** once valid Apple credentials are available.

## Windows setup (manual, when ready)
Follow [xtool Linux/Windows installation](https://xtool.sh/documentation/xtool/installation-linux/). You'll need:
- Windows 11 + WSL2/Ubuntu (USB passthrough configured for your iPhone), or a compatible Linux machine;
- A supported Swift toolchain and xtool;
- Apple's Xcode archive for Swift iOS SDK extraction (download requires Apple ID);
- An Apple ID for xtool authentication;
- A physical iPhone with Developer Mode enabled, USB pairing, and *valid Family Controls provisioning*.

Avoid sharing Apple IDs, passwords, 2FA codes, developer certificates or signing profiles in GitHub or chat.

Run inside WSL/Ubuntu (after xtool setup):
```bash
cd experiments/xtool-screentime
xtool setup
xtool dev
```
**Expected blocker:** xtool may not support signing/provisioning Family Controls. A free Apple account may be insufficient. You cannot conclude Screen Time works just because Swift source parses or an app installs.

## Source-only checks
From the repository root:
```bash
swift package dump-package --package-path experiments/xtool-screentime
swiftc -frontend -parse experiments/xtool-screentime/Sources/ScreenTimeLab/*.swift
python3 -m unittest discover -s experiments/xtool-screentime/tests -v
```
These checks do not compile/link Apple frameworks, produce an IPA, sign it, or exercise Screen Time APIs. CI reports only **source and configuration validity**.

## Manual on-device test checklist (when provisioning is working)
- [ ] Permission denied: picker and apply actions unavailable
- [ ] Permission granted: Apple's native FamilyActivityPicker appears
- [ ] Select *one nonessential app* (e.g. Instagram); do **not** select all apps
- [ ] Apply: selected app shows the iOS shield; unselected apps remain usable
- [ ] Simulate reading goal: shield disappears for selected app
- [ ] Apply again: shield returns
- [ ] Manually remove shields and ensure access is restored
- [ ] Restart the prototype; app choices are restored
- [ ] Verify exactly what happens if authorization is revoked in iPhone settings

Do not set restrictions for critical apps used for communication, emergencies, or account recovery during early tests. The experiment only works in the foreground and lacks automatic recovery or relocking.

## Next engineering step
Once provisioning is proven, develop the **native iOS bridge and reliable native DeviceActivity scheduling** for automatic re-locking. The existing V2 app uses Expo/React Native and cannot consume this SwiftPM standalone project directly.
