// iOS CNG config plugin for Apple's Device Activity Monitor extension.
// This adds an app extension target to the Xcode project Expo generates on EAS.
// Compatible with Expo SDK 52's @expo/config-plugins via expo/config-plugins.
const { withXcodeProject } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const TARGET = 'RTUDailyMonitor';
const FILE = 'DeviceActivityMonitorExtension.swift';
const GROUP = 'group.com.anonymous.readtounlock';

module.exports = function withDailyMonitor(config) {
  return withXcodeProject(config, async config => {
    const iosRoot = config.modRequest.platformProjectRoot;
    const root = config.modRequest.projectRoot;
    const targetBundleId = (config.ios && config.ios.bundleIdentifier
      ? config.ios.bundleIdentifier : 'com.anonymous.readtounlock') + '.daily-monitor';
    const src = path.join(root, 'extensions', 'rtu-daily-monitor');
    const dest = path.join(iosRoot, TARGET);
    await fs.mkdir(dest, { recursive: true });
    for (const item of [FILE, 'Info.plist', TARGET + '.entitlements']) {
      await fs.copyFile(path.join(src, item), path.join(dest, item));
    }

    const project = config.modResults;
    const objects = project.hash.project.objects;
    const existing = Object.entries(objects.PBXNativeTarget || {})
      .find(([key, value]) => !key.endsWith('_comment') &&
        value && String(value.name || '').replaceAll('"','') === TARGET);
    if (existing) return config;

    // The node-xcode app_extension target type configures the host's PlugIns
    // copy phase and build dependency. Seed empty sections for fresh Expo projects.
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
    const target = project.addTarget(TARGET, 'app_extension', TARGET, targetBundleId);
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

    const groupUUID = project.pbxCreateGroup(TARGET, TARGET);
    const main = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(groupUUID, main);
    project.addFile(TARGET + '/Info.plist', groupUUID);
    project.addFile(TARGET + '/' + TARGET + '.entitlements', groupUUID);
    project.addSourceFile(TARGET + '/' + FILE, { target: target.uuid }, groupUUID);

    const configs = project.pbxXCBuildConfigurationSection();
    for (const value of Object.values(configs)) {
      if (!value || !value.buildSettings) continue;
      const b = value.buildSettings;
      const name = String(b.PRODUCT_NAME || '').replaceAll('"', '');
      if (name !== TARGET) continue;
      b.SWIFT_VERSION = '5.0';
      b.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
      b.TARGETED_DEVICE_FAMILY = '"1,2"';
      b.CODE_SIGN_STYLE = 'Automatic';
      b.INFOPLIST_FILE = '"' + TARGET + '/Info.plist"';
      b.CODE_SIGN_ENTITLEMENTS = '"' + TARGET + '/' + TARGET + '.entitlements"';
      b.PRODUCT_BUNDLE_IDENTIFIER = '"' + targetBundleId + '"';
      b.CURRENT_PROJECT_VERSION = '"1"';
      b.MARKETING_VERSION = '"' + (config.version || '1.0.0') + '"';
      b.SKIP_INSTALL = 'YES';
      b.GENERATE_INFOPLIST_FILE = 'NO';
      b.APPLICATION_EXTENSION_API_ONLY = 'YES';
    }
    if (!project.pbxNativeTargetSection() ||
        !Object.values(project.pbxNativeTargetSection()).some(x => x && typeof x === 'object' &&
          String(x.name || '').includes(TARGET))) {
      throw new Error('RTUDailyMonitor Xcode target creation failed');
    }
    return config;
  });
};
