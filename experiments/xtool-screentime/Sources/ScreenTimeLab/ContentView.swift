import FamilyControls
import SwiftUI

struct ContentView: View {
    @StateObject private var model = ScreenTimeModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Screen Time Lab")
                        .font(.largeTitle.bold())
                    Text("An isolated Read to Unlock experiment. It does not use your main app's reading progress.")
                        .foregroundStyle(.secondary)

                    GroupBox("1 · Permission") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Status: \(model.authorization)")
                            Button("Request Screen Time permission") {
                                Task { await model.requestAuthorization() }
                            }
                            Button("Refresh permission status") {
                                model.refreshAuthorization()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }

                    GroupBox("2 · Choose distractions") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Selected apps: \(model.selectedAppCount)")
                            Text("Selected categories: \(model.selectedCategoryCount)")
                            Button("Open Apple's app picker") {
                                model.pickerVisible = true
                            }
                            .disabled(!model.isAuthorized)
                            Button("Save selection") {
                                model.saveSelection()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }

                    GroupBox("3 · Test selected-app shields") {
                        VStack(alignment: .leading, spacing: 12) {
                            Button("Apply shields to selected apps") {
                                model.applyShields()
                            }
                            .disabled(!model.isAuthorized || model.selectedAppCount + model.selectedCategoryCount == 0)
                            Button("Simulate reading goal complete · unlock") {
                                model.simulateGoalCompleted()
                            }
                            .disabled(!model.shieldApplied)
                            Button("Manually remove restrictions") {
                                model.clearShields()
                            }
                            .tint(.orange)
                            Text("Important: this demo has no automatic re-locking and no verified reading timer.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }

                    Text(model.message)
                        .font(.callout)
                        .accessibilityIdentifier("resultMessage")
                    Text("Actual shields require a correctly signed Family Controls entitlement. Testing is blocked until device provisioning succeeds.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(20)
            }
            .navigationTitle("Read to Unlock")
            .familyActivityPicker(isPresented: $model.pickerVisible, selection: $model.selection)
        }
    }
}
