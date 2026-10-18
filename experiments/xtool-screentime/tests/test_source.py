import pathlib
import plistlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Sources" / "ScreenTimeLab"
MODEL = (SOURCE / "ScreenTimeModel.swift").read_text()
UI = (SOURCE / "ContentView.swift").read_text()
CONFIG = (ROOT / "xtool.yml").read_text()


class PrototypeSourceChecks(unittest.TestCase):
    def test_package_declares_ios_product(self):
        package = (ROOT / "Package.swift").read_text()
        self.assertIn(".iOS(.v17)", package)
        self.assertIn('name: "ScreenTimeLab"', package)

    def test_has_family_controls_entitlement_request(self):
        with (ROOT / "App.entitlements").open("rb") as f:
            entitlements = plistlib.load(f)
        self.assertIs(entitlements["com.apple.developer.family-controls"], True)
        self.assertIn("entitlementsPath: App.entitlements", CONFIG)

    def test_only_token_based_restrictions(self):
        self.assertIn("selection.applicationTokens", MODEL)
        self.assertIn("selection.categoryTokens", MODEL)
        self.assertNotIn("bundleIdentifier:", MODEL)
        self.assertNotIn("ActivityCategoryPolicy.all", MODEL)
        self.assertNotIn("applicationCategories = .all", MODEL)

    def test_picker_and_permission_prompt(self):
        self.assertIn(".familyActivityPicker(", UI)
        self.assertIn("requestAuthorization(for: .individual)", MODEL)

    def test_manual_undo_is_present(self):
        self.assertIn("func clearShields()", MODEL)
        self.assertIn("shieldStore.shield.applications = nil", MODEL)
        self.assertIn("shieldStore.shield.applicationCategories = nil", MODEL)
        self.assertIn("Manually remove restrictions", UI)

    def test_no_claim_of_auto_relocking(self):
        self.assertIn("will NOT auto-return", MODEL)
        self.assertIn("no automatic re-locking", UI)

    def test_info_plist(self):
        with (ROOT / "Info.plist").open("rb") as f:
            info = plistlib.load(f)
        self.assertEqual(info["CFBundleDisplayName"], "RTU Screen Time Lab")

    def test_source_layout_and_bundle_id(self):
        self.assertTrue((SOURCE / "ScreenTimeLabApp.swift").exists())
        self.assertIn("bundleID: com.alitheprogrammergod.readtounlock.screentimelab", CONFIG)


if __name__ == "__main__":
    unittest.main()
