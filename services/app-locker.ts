import { NativeModules, Platform } from 'react-native';

interface AppLockerInterface {
  isAccessibilityServiceEnabled(): Promise<boolean>;
  isUsageStatsPermissionGranted(): Promise<boolean>;
  requestUsageStatsPermission(): Promise<void>;
  requestAccessibilityService(): Promise<void>;
  isAppRunning(packageName: string): Promise<boolean>;
  blockApp(packageName: string): Promise<void>;
  unblockApp(packageName: string): Promise<void>;
  getRunningApps(): Promise<string[]>;
}

const { AppLocker } = NativeModules;

class AppLockerService implements AppLockerInterface {
  private static instance: AppLockerService;

  private constructor() {}

  public static getInstance(): AppLockerService {
    if (!AppLockerService.instance) {
      AppLockerService.instance = new AppLockerService();
    }
    return AppLockerService.instance;
  }

  async isAccessibilityServiceEnabled(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return AppLocker.isAccessibilityServiceEnabled();
    }
    return false;
  }

  async isUsageStatsPermissionGranted(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return AppLocker.isUsageStatsPermissionGranted();
    }
    return false;
  }

  async requestUsageStatsPermission(): Promise<void> {
    if (Platform.OS === 'android') {
      await AppLocker.requestUsageStatsPermission();
    }
  }

  async requestAccessibilityService(): Promise<void> {
    if (Platform.OS === 'android') {
      await AppLocker.requestAccessibilityService();
    }
  }

  async isAppRunning(packageName: string): Promise<boolean> {
    if (Platform.OS === 'android') {
      return AppLocker.isAppRunning(packageName);
    }
    return false;
  }

  async blockApp(packageName: string): Promise<void> {
    if (Platform.OS === 'android') {
      await AppLocker.blockApp(packageName);
    }
  }

  async unblockApp(packageName: string): Promise<void> {
    if (Platform.OS === 'android') {
      await AppLocker.unblockApp(packageName);
    }
  }

  async getRunningApps(): Promise<string[]> {
    if (Platform.OS === 'android') {
      return AppLocker.getRunningApps();
    }
    return [];
  }
}

export const appLocker = AppLockerService.getInstance(); 