import ExpoModulesCore
import Foundation
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

/// Native token-based selection + foreground shielding.
public class RTUScreenTimeModule: Module {
  private let center = AuthorizationCenter.shared
  private let store = ManagedSettingsStore()
  private let selectionKey = "rtu.selected-activities.v1"
  private let lastRequestKey = "rtu.last-shield-request.v1"

  private func readSelection() -> FamilyActivitySelection {
    guard let data = UserDefaults.standard.data(forKey: selectionKey),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return FamilyActivitySelection() }
    return selection
  }

  private func saveSelection(_ selection: FamilyActivitySelection) throws {
    let data = try JSONEncoder().encode(selection)
    // A changed picker selection invalidates the old shield token set.
    // The React Native reward engine decides if the new selection should be shielded.
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
    UserDefaults.standard.set(false, forKey: lastRequestKey)
    UserDefaults.standard.set(data, forKey: selectionKey)
  }

  private func authorization() -> String {
    switch center.authorizationStatus {
    case .approved: return "approved"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
  }

  private func selectionSummary() -> [String: Any] {
    let selection = readSelection()
    return [
      "authorization": authorization(),
      "appCount": selection.applicationTokens.count,
      "categoryCount": selection.categoryTokens.count,
      "domainCount": selection.webDomainTokens.count,
      // Last requested shield is diagnostic, NOT proof apps were actually blocked.
      "lastRequestedShielded": UserDefaults.standard.bool(forKey: lastRequestKey),
    ]
  }

  private func setShielded(_ shouldBlock: Bool) throws {
    // Do not expose the dangerous .all policy or arbitrary bundle-ID based targeting.
    guard !shouldBlock || center.authorizationStatus == .approved else {
      throw NSError(domain: "RTUScreenTime", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Screen Time authorization is required."])
    }
    let selected = readSelection()
    let count = selected.applicationTokens.count + selected.categoryTokens.count + selected.webDomainTokens.count
    if shouldBlock && count == 0 {
      throw NSError(domain: "RTUScreenTime", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Choose at least one app or website first."])
    }
    store.shield.applications = shouldBlock && !selected.applicationTokens.isEmpty ? selected.applicationTokens : nil
    store.shield.applicationCategories = shouldBlock && !selected.categoryTokens.isEmpty
      ? .specific(selected.categoryTokens) : nil
    store.shield.webDomains = shouldBlock && !selected.webDomainTokens.isEmpty ? selected.webDomainTokens : nil
    // Always clear category policy on unlock; never block all apps by accident.
    UserDefaults.standard.set(shouldBlock, forKey: lastRequestKey)
  }

  public func definition() -> ModuleDefinition {
    Name("RTUScreenTime")

    AsyncFunction("getStatus") { (promise: Promise) in
      promise.resolve(self.selectionSummary())
    }.runOnQueue(.main)

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      Task {
        do {
          try await self.center.requestAuthorization(for: .individual)
          promise.resolve(self.selectionSummary())
        } catch {
          promise.reject("ERR_AUTH", "Apple Screen Time authorization failed: \(error.localizedDescription)")
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("pickApps") { (promise: Promise) in
      guard self.center.authorizationStatus == .approved else {
        promise.reject("ERR_AUTH", "Please authorize Screen Time first.")
        return
      }
      guard let current = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_VIEW", "No active screen is available for Apple's app picker.")
        return
      }
      let picker = RTUScreenTimePicker(initial: self.readSelection()) { [weak current] choice in
        current?.dismiss(animated: true) {
          guard let choice else {
            promise.resolve(self.selectionSummary())
            return
          }
          do {
            try self.saveSelection(choice)
            promise.resolve(self.selectionSummary())
          } catch {
            promise.reject("ERR_SAVE", "Could not save Screen Time app selection: \(error.localizedDescription)")
          }
        }
      }
      let host = UIHostingController(rootView: picker)
      host.modalPresentationStyle = .fullScreen
      host.isModalInPresentation = true
      current.present(host, animated: true)
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
