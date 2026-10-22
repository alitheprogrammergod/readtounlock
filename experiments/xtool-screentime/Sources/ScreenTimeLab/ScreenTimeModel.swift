import Foundation
import FamilyControls
import ManagedSettings
import SwiftUI

/// iOS-only proof of concept. Application selection is token-based to preserve privacy.
/// Nothing in this class automatically re-locks apps in the background.
@MainActor
final class ScreenTimeModel: ObservableObject {
    @Published var selection = FamilyActivitySelection()
    @Published var pickerVisible = false
    @Published private(set) var authorization = "Not requested"
    @Published private(set) var shieldApplied = false
    @Published private(set) var message = "Choose apps after authorizing Screen Time."

    private let authorizationCenter = AuthorizationCenter.shared
    private let shieldStore = ManagedSettingsStore()
    private let selectionKey = "rtu.screenTimeLab.selection.v1"

    init() {
        if let data = UserDefaults.standard.data(forKey: selectionKey),
           let saved = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
            selection = saved
        }
        refreshAuthorization()
    }

    var isAuthorized: Bool {
        authorizationCenter.authorizationStatus == .approved
    }

    var selectedAppCount: Int { selection.applicationTokens.count }
    var selectedCategoryCount: Int { selection.categoryTokens.count }

    func refreshAuthorization() {
        switch authorizationCenter.authorizationStatus {
        case .approved: authorization = "Authorized"
        case .denied: authorization = "Denied"
        case .notDetermined: authorization = "Not requested"
        @unknown default: authorization = "Unknown"
        }
    }

    func requestAuthorization() async {
        do {
            try await authorizationCenter.requestAuthorization(for: .individual)
            refreshAuthorization()
            message = isAuthorized ? "Authorized. Choose apps with Apple's picker." :
                "Authorization is not approved. Check Screen Time settings."
        } catch {
            refreshAuthorization()
            message = "Screen Time permission failed: \(error.localizedDescription)"
        }
    }

    func saveSelection() {
        do {
            let encoded = try PropertyListEncoder().encode(selection)
            UserDefaults.standard.set(encoded, forKey: selectionKey)
            message = "Saved \(selectedAppCount) apps and \(selectedCategoryCount) categories."
        } catch {
            message = "Could not save selection: \(error.localizedDescription)"
        }
    }

    func applyShields() {
        refreshAuthorization()
        guard isAuthorized else {
            message = "Authorize Screen Time before applying restrictions."
            return
        }
        guard selectedAppCount + selectedCategoryCount > 0 else {
            message = "Select at least one app or category first."
            return
        }

        saveSelection()
        // Shield only user-chosen app/category tokens, never all apps.
        shieldStore.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        shieldStore.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil : .specific(selection.categoryTokens)
        shieldApplied = true
        message = "Requested shields for chosen apps. Verify on the actual iPhone."
    }

    func simulateGoalCompleted() {
        // Demo only: this is not linked to a real reading session or background schedule.
        clearShields()
        message = "Demo goal completed. Shields removed; they will NOT auto-return."
    }

    func clearShields() {
        // Only reverse the restrictions that this standalone app controls.
        shieldStore.shield.applications = nil
        shieldStore.shield.applicationCategories = nil
        shieldApplied = false
        message = "Removed this prototype's app and category shields."
    }
}
