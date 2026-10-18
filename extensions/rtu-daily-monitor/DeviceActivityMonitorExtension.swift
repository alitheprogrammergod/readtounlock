import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

/// Invoked by iOS DeviceActivity, independently of React Native / app process.
/// Only the tokens explicitly chosen by the user can be restricted.
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  private let store = ManagedSettingsStore()
  private let suiteName = "group.com.anonymous.readtounlock"
  private let selectionKey = "rtu.selected-activities.v1"
  private let monitoringKey = "rtu.monitoring-enabled.v1"
  private let shieldRequestKey = "rtu.last-shield-request.v1"
  private let activityName = DeviceActivityName("rtu.daily-relock.v1")

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    guard activity == activityName,
          let shared = UserDefaults(suiteName: suiteName),
          shared.bool(forKey: monitoringKey),
          AuthorizationCenter.shared.authorizationStatus == .approved,
          let encoded = shared.data(forKey: selectionKey),
          let selected = try? JSONDecoder().decode(FamilyActivitySelection.self, from: encoded)
    else { return }

    let count = selected.applicationTokens.count + selected.categoryTokens.count + selected.webDomainTokens.count
    guard count > 0 else { return }

    store.shield.applications = selected.applicationTokens.isEmpty ? nil : selected.applicationTokens
    store.shield.applicationCategories = selected.categoryTokens.isEmpty
      ? nil : .specific(selected.categoryTokens)
    store.shield.webDomains = selected.webDomainTokens.isEmpty ? nil : selected.webDomainTokens
    shared.set(true, forKey: shieldRequestKey)
    shared.set(Date().timeIntervalSince1970, forKey: "rtu.last-monitor-callback.v1")
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    // Keep the chosen shields in place until the user completes today's reading goal.
    // Do not remove restrictions at 23:59, which could expose apps before midnight.
  }
}
