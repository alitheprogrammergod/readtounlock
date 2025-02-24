import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

extension DeviceActivityName {
  static let daily = Self("daily")
}

@objc(FamilyControlsModule)
class FamilyControlsModule: NSObject {
  private let store = ManagedSettingsStore()
  private let center = AuthorizationCenter.shared
  private let deviceActivityCenter = DeviceActivityCenter()
  private var monitoringSchedule: DeviceActivitySchedule?
  private var requiredReadingMinutes: Int = 30 // Default reading time requirement
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc(checkAuthorization:rejecter:)
  func checkAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let status = center.authorizationStatus
    switch status {
    case .notDetermined:
      resolve("notDetermined")
    case .denied:
      resolve("denied")
    case .approved:
      resolve("approved")
    @unknown default:
      resolve("denied")
    }
  }
  
  @objc(requestAuthorization:rejecter:)
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        try await center.requestAuthorization(for: .individual)
        resolve("approved")
      } catch {
        reject("ERROR", "Failed to request authorization", error)
      }
    }
  }
  
  @objc(setAppRestrictions:minutes:resolver:rejecter:)
  func setAppRestrictions(_ bundleIds: [String], minutes: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Update required reading time
    requiredReadingMinutes = minutes.intValue
    
    // Set app restrictions
    let applications = Set(bundleIds.map { ApplicationToken(bundleIdentifier: $0) })
    store.shield.applications = applications
    store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.all
    
    // Set up monitoring schedule for the entire day
    let schedule = DeviceActivitySchedule(
      intervalStart: DateComponents(hour: 0, minute: 0),
      intervalEnd: DateComponents(hour: 23, minute: 59),
      repeats: true
    )
    monitoringSchedule = schedule
    
    do {
      try deviceActivityCenter.startMonitoring(
        .daily,
        during: schedule
      )
      resolve(nil)
    } catch {
      reject("ERROR", "Failed to start monitoring", error)
    }
  }
  
  @objc(removeAppRestrictions:resolver:rejecter:)
  func removeAppRestrictions(_ bundleIds: [String], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    store.shield.applications = []
    store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.none
    deviceActivityCenter.stopMonitoring([.daily])
    resolve(nil)
  }
  
  @objc(getRestrictedApps:rejecter:)
  func getRestrictedApps(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let apps = store.shield.applications?.map { $0.bundleIdentifier } ?? []
    resolve([
      "apps": apps,
      "requiredMinutes": requiredReadingMinutes
    ])
  }
  
  @objc(getAvailableApps:rejecter:)
  func getAvailableApps(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        let selection = try await FamilyActivitySelection.shared
        let apps = selection.applicationTokens.map { token -> [String: Any] in
          return [
            "bundleIdentifier": token.bundleIdentifier,
            "displayName": token.localizedDisplayName ?? token.bundleIdentifier
          ]
        }
        resolve(apps)
      } catch {
        reject("ERROR", "Failed to get available apps", error)
      }
    }
  }
  
  @objc(updateReadingTime:resolver:rejecter:)
  func updateReadingTime(_ minutes: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    requiredReadingMinutes = minutes.intValue
    resolve(nil)
  }
  
  @objc(getRequiredReadingTime:rejecter:)
  func getRequiredReadingTime(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(requiredReadingMinutes)
  }
  
  @objc(setShieldRestrictions:resolver:rejecter:)
  func setShieldRestrictions(_ options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let shield = store.shield
    
    if let webDomains = options["webDomains"] as? [String] {
      shield.webDomains = Set(webDomains.map { WebDomainToken(domain: $0) })
    }
    
    if let categories = options["categories"] as? [String] {
      shield.applicationCategories = Set(categories.map { ActivityCategoryToken(category: $0) })
    }
    
    resolve(nil)
  }
} 