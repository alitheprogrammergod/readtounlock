import ExpoModulesCore
import Foundation
import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

/// Native token-based shielding and system-assisted daily re-lock scheduling.
/// This module never accepts bundle IDs or application names from JavaScript.
public class RTUScreenTimeModule: Module {
  private let auth = AuthorizationCenter.shared
  private let store = ManagedSettingsStore()
  private let monitor = DeviceActivityCenter()
  private let group = "group.com.anonymous.readtounlock"
  private let selectionKey = "rtu.selected-activities.v1"
  private let enabledKey = "rtu.monitoring-enabled.v1"
  private let lastRequestKey = "rtu.last-shield-request.v1"
  private let lastCallbackKey = "rtu.last-monitor-callback.v1"
  private let activityName = DeviceActivityName("rtu.daily-relock.v1")

  private var shared: UserDefaults? { UserDefaults(suiteName: group) }

  private func requireShared() throws -> UserDefaults {
    guard let shared else {
      throw NSError(domain: "RTUScreenTime", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "App Group storage unavailable. Check iOS entitlements."])
    }
    return shared
  }

  private func readSelection() -> FamilyActivitySelection {
    // Preserve an existing Sprint 3 selection when the App Group entitlement is added.
    let data = shared?.data(forKey: selectionKey) ?? UserDefaults.standard.data(forKey: selectionKey)
    guard let data, let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return FamilyActivitySelection() }
    return selection
  }

  private func saveSelection(_ selection: FamilyActivitySelection) throws {
    let data = try JSONEncoder().encode(selection)
    let defaults = try requireShared()
    // Never leave old tokens shielded after a new picker choice.
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
    defaults.set(false, forKey: lastRequestKey)
    defaults.set(data, forKey: selectionKey)
  }

  private func authorization() -> String {
    switch auth.authorizationStatus {
    case .approved: return "approved"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
  }

  private func selectionSummary() -> [String: Any] {
    let picked = readSelection()
    let defaults = shared
    return [
      "authorization": authorization(),
      "appCount": picked.applicationTokens.count,
      "categoryCount": picked.categoryTokens.count,
      "domainCount": picked.webDomainTokens.count,
      "monitoringEnabled": defaults?.bool(forKey: enabledKey) ?? false,
      "dailyScheduleRegistered": monitor.activities.contains(activityName),
      "lastMonitorCallback": defaults?.double(forKey: lastCallbackKey) ?? 0,
      // Diagnostic only; NOT proof that shields worked on a device.
      "lastRequestedShielded": defaults?.bool(forKey: lastRequestKey) ?? false,
    ]
  }

  private func setShielded(_ shouldBlock: Bool) throws {
    if shouldBlock {
      guard auth.authorizationStatus == .approved else {
        throw NSError(domain: "RTUScreenTime", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Screen Time authorization is required."])
      }
      guard shared?.bool(forKey: enabledKey) == true else {
        throw NSError(domain: "RTUScreenTime", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Daily monitoring must be enabled before shielding."])
      }
    }
    let picked = readSelection()
    if shouldBlock && picked.applicationTokens.isEmpty &&
       picked.categoryTokens.isEmpty && picked.webDomainTokens.isEmpty {
      throw NSError(domain: "RTUScreenTime", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Use Apple's app picker first."])
    }
    store.shield.applications = shouldBlock && !picked.applicationTokens.isEmpty
      ? picked.applicationTokens : nil
    store.shield.applicationCategories = shouldBlock && !picked.categoryTokens.isEmpty
      ? .specific(picked.categoryTokens) : nil
    store.shield.webDomains = shouldBlock && !picked.webDomainTokens.isEmpty
      ? picked.webDomainTokens : nil
    shared?.set(shouldBlock, forKey: lastRequestKey)
  }

  /// Start the system schedule for the next 00:00 boundary.
  /// Any immediate shielding is handled by the V2 goal engine separately.
  private func setDailyMonitoring(_ enabled: Bool) throws {
    let defaults = try requireShared()
    if !enabled {
      // Persist disable *before* stopping, so a racing callback does not resheild.
      defaults.set(false, forKey: enabledKey)
      monitor.stopMonitoring([activityName])
      try setShielded(false)
      return
    }
    guard auth.authorizationStatus == .approved else {
      throw NSError(domain: "RTUScreenTime", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Authorize Screen Time before enabling daily re-locking."])
    }
    let picked = readSelection()
    guard !picked.applicationTokens.isEmpty || !picked.categoryTokens.isEmpty ||
          !picked.webDomainTokens.isEmpty else {
      throw NSError(domain: "RTUScreenTime", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "Choose at least one app or website."])
    }
    // Do not consume the user's consent until we know iOS accepted the schedule.
    if !monitor.activities.contains(activityName) {
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true
      )
      try monitor.startMonitoring(activityName, during: schedule)
    }
    // Copy legacy selection, if any, into the shared container for the extension.
    let data = try JSONEncoder().encode(picked)
    defaults.set(data, forKey: selectionKey)
    defaults.set(true, forKey: enabledKey)
  }

  public func definition() -> ModuleDefinition {
    Name("RTUScreenTime")

    AsyncFunction("getStatus") { (promise: Promise) in
      promise.resolve(self.selectionSummary())
    }.runOnQueue(.main)

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      Task {
        do {
          try await self.auth.requestAuthorization(for: .individual)
          promise.resolve(self.selectionSummary())
        } catch {
          promise.reject("ERR_AUTH", "Apple Screen Time authorization failed: \(error.localizedDescription)")
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("pickApps") { (promise: Promise) in
      guard self.auth.authorizationStatus == .approved else {
        promise.reject("ERR_AUTH", "Please authorize Screen Time first.")
        return
      }
      guard let current = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_VIEW", "No active screen is available for Apple's app picker.")
        return
      }
      let picker = RTUScreenTimePicker(initial: self.readSelection()) { [weak current] chosen in
        current?.dismiss(animated: true) {
          guard let chosen else {
            promise.resolve(self.selectionSummary())
            return
          }
          do {
            try self.saveSelection(chosen)
            promise.resolve(self.selectionSummary())
          } catch {
            promise.reject("ERR_SAVE", "Could not save Screen Time selection: \(error.localizedDescription)")
          }
        }
      }
      let host = UIHostingController(rootView: picker)
      host.modalPresentationStyle = .fullScreen
      host.isModalInPresentation = true
      current.present(host, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("setDailyMonitoring") { (enabled: Bool, promise: Promise) in
      do {
        try self.setDailyMonitoring(enabled)
        promise.resolve(self.selectionSummary())
      } catch {
        promise.reject("ERR_SCHEDULE", "Daily re-lock scheduling failed: \(error.localizedDescription)")
      }
    }.runOnQueue(.main)

    AsyncFunction("setShielded") { (enabled: Bool, promise: Promise) in
      do {
        try self.setShielded(enabled)
        promise.resolve(self.selectionSummary())
      } catch {
        promise.reject("ERR_SHIELD", "Screen Time shield request failed: \(error.localizedDescription)")
      }
    }.runOnQueue(.main)
  }
}
