import SwiftUI
import FamilyControls

/// Presented only after Apple approves individual Screen Time authorization.
/// The picker returns opaque tokens. No bundle IDs or app names are exposed to JS.
struct RTUScreenTimePicker: View {
  @State private var choice: FamilyActivitySelection
  let done: (FamilyActivitySelection?) -> Void

  init(initial: FamilyActivitySelection, done: @escaping (FamilyActivitySelection?) -> Void) {
    _choice = State(initialValue: initial)
    self.done = done
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $choice)
        .navigationTitle("Choose distracting apps")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { done(nil) }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Save") { done(choice) }
          }
        }
    }
  }
}
