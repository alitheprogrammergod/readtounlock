const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const cfg = JSON.parse(read('app.json')).expo;
const targets = cfg.extra?.eas?.build?.experimental?.ios?.appExtensions;
const bundle = 'com.anonymous.readtounlock.daily-monitor';
const group = 'group.com.anonymous.readtounlock';
assert(cfg.plugins.includes('./plugins/withDailyMonitor'));
assert(cfg.ios.entitlements['com.apple.security.application-groups'].includes(group));
assert(Array.isArray(targets));
const ext = targets.find(t => t.targetName === 'RTUDailyMonitor' && t.bundleIdentifier === bundle);
assert(ext,'EAS signing needs the extension declaration');
assert(ext.entitlements['com.apple.developer.family-controls'] === true);
assert(ext.entitlements['com.apple.security.application-groups'].includes(group));
const swift = read('extensions/rtu-daily-monitor/DeviceActivityMonitorExtension.swift');
const native = read('modules/rtu-screen-time/ios/RTUScreenTimeModule.swift');
const ui = read('contexts/reading-rewards.tsx');
const plugin = read('plugins/withDailyMonitor.js');
const info = read('extensions/rtu-daily-monitor/Info.plist');
assert(info.includes('com.apple.deviceactivity.monitor-extension'));
assert(info.includes('$(PRODUCT_MODULE_NAME).DeviceActivityMonitorExtension'));
assert(swift.includes('override func intervalDidStart(for activity: DeviceActivityName)'));
assert(swift.includes('shared.bool(forKey: monitoringKey)'));
assert(swift.includes('store.shield.applications ='));
assert(!/store\.shield\.applicationCategories\s*=\s*\.all\b/.test(swift));
assert(native.includes('AsyncFunction("setDailyMonitoring")'));
assert(native.includes('monitor.startMonitoring(activityName, during: schedule)'));
assert(native.includes('monitor.stopMonitoring([activityName])'));
assert(native.includes('defaults.set(false, forKey: enabledKey)'));
assert(native.includes('defaults.set(true, forKey: enabledKey)'));
assert(native.includes('UserDefaults(suiteName: group)'));
assert(ui.includes('iosScreenTime.setDailyMonitoring(false)'));
assert(ui.includes('iosScreenTime.setDailyMonitoring(true)'));
assert(plugin.includes("project.addTarget(TARGET, 'app_extension'"));
console.log('PASS: extension point, app group, EAS signing metadata, daily callback, schedule and user opt-out');

if (process.argv.includes('--generated')) {
  const ios = path.join(root,'ios');
  const dirs = fs.readdirSync(ios).filter(x=>x.endsWith('.xcodeproj'));
  assert(dirs.length===1,'Expo must generate exactly one iOS Xcode project');
  const pbx = path.join(ios,dirs[0],'project.pbxproj');
  const proj = require('xcode').project(pbx);
  proj.parseSync();
  const n = Object.values(proj.pbxNativeTargetSection()).filter(x=>x && typeof x==='object' && x.name === '"RTUDailyMonitor"');
  assert(n.length===1, 'Exactly one native extension target must be created');
  const target = n[0];
  const configs = Object.values(proj.pbxXCBuildConfigurationSection())
    .filter(x=>x && x.buildSettings && String(x.buildSettings.PRODUCT_NAME||'').includes('RTUDailyMonitor'));
  assert(configs.length>=2,'Extension requires Debug and Release build settings');
  for(const x of configs) {
    const b=x.buildSettings;
    assert(String(b.CODE_SIGN_ENTITLEMENTS).includes('RTUDailyMonitor.entitlements'));
    assert(String(b.INFOPLIST_FILE).includes('Info.plist'));
    assert(String(b.PRODUCT_BUNDLE_IDENTIFIER).includes(bundle));
  }
  const copyPhases=Object.values(proj.hash.project.objects.PBXCopyFilesBuildPhase || {}).filter(x=>x && typeof x==='object');
  assert(copyPhases.some(x => String(x.dstSubfolderSpec)==='13'), 'Host must embed extension into PlugIns');
  const dir=path.join(ios,'RTUDailyMonitor');
  for(const name of ['DeviceActivityMonitorExtension.swift','Info.plist','RTUDailyMonitor.entitlements']) {
    assert(fs.existsSync(path.join(dir,name)), 'Missing extension file '+name);
  }
  console.log('PASS: Expo prebuild generated an embedded iOS target, source files and signing settings');
}
