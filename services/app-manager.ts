import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notifications';
import { appLocker } from './app-locker';
import { appLockerIOS } from './app-locker-ios';

export interface InstalledApp {
  id: string;
  packageName: string; // Android package name or iOS bundle ID
  name: string;
  icon: string;
}

const LOCKED_APPS_KEY = '@locked_apps';
const READING_PROGRESS_KEY = '@reading_progress';
const LAST_NOTIFICATION_KEY = '@last_notification';

interface ReadingProgress {
  totalMinutesToday: number;
  lastUpdated: string;
}

interface LastNotification {
  type: 'unlock' | 'goal' | 'reminder';
  timestamp: string;
}

class AppManager {
  private static instance: AppManager;
  private lockedApps: Set<string> = new Set();
  private readingProgress: ReadingProgress = {
    totalMinutesToday: 0,
    lastUpdated: new Date().toISOString(),
  };
  private lastNotification: LastNotification | null = null;
  private isInitialized = false;

  private constructor() {
    this.loadState();
  }

  public static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  private async loadState() {
    try {
      // Load locked apps
      const lockedAppsJson = await AsyncStorage.getItem(LOCKED_APPS_KEY);
      if (lockedAppsJson) {
        const lockedAppsArray = JSON.parse(lockedAppsJson);
        this.lockedApps = new Set(lockedAppsArray);
        
        // Re-apply locks after loading
        if (Platform.OS === 'android') {
          for (const packageName of this.lockedApps) {
            await appLocker.blockApp(packageName);
          }
        }
      }

      // Load reading progress
      const progressJson = await AsyncStorage.getItem(READING_PROGRESS_KEY);
      if (progressJson) {
        this.readingProgress = JSON.parse(progressJson);
        this.checkAndResetDailyProgress();
      }

      // Load last notification
      const lastNotificationJson = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
      if (lastNotificationJson) {
        this.lastNotification = JSON.parse(lastNotificationJson);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error loading app manager state:', error);
    }
  }

  private async saveState() {
    try {
      await AsyncStorage.setItem(LOCKED_APPS_KEY, JSON.stringify(Array.from(this.lockedApps)));
      await AsyncStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(this.readingProgress));
      if (this.lastNotification) {
        await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, JSON.stringify(this.lastNotification));
      }
    } catch (error) {
      console.error('Error saving app manager state:', error);
    }
  }

  private checkAndResetDailyProgress() {
    const lastUpdated = new Date(this.readingProgress.lastUpdated);
    const now = new Date();
    const isNewDay = lastUpdated.getDate() !== now.getDate() ||
                    lastUpdated.getMonth() !== now.getMonth() ||
                    lastUpdated.getFullYear() !== now.getFullYear();

    if (isNewDay) {
      this.readingProgress = {
        totalMinutesToday: 0,
        lastUpdated: now.toISOString(),
      };
      this.lastNotification = null;
      this.saveState();
    }
  }

  private shouldSendNotification(type: 'unlock' | 'goal' | 'reminder'): boolean {
    if (!this.lastNotification) return true;
    
    const lastTime = new Date(this.lastNotification.timestamp);
    const now = new Date();
    const hoursSinceLastNotification = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
    
    if (this.lastNotification.type !== type) return true;
    if (type === 'reminder' && hoursSinceLastNotification >= 1) return true;
    if (hoursSinceLastNotification >= 0.5) return true; // 30 minutes between notifications
    
    return false;
  }

  private async updateLastNotification(type: 'unlock' | 'goal' | 'reminder') {
    this.lastNotification = {
      type,
      timestamp: new Date().toISOString(),
    };
    await this.saveState();
  }

  public async lockApp(packageName: string): Promise<void> {
    this.lockedApps.add(packageName);
    if (Platform.OS === 'android') {
      await appLocker.blockApp(packageName);
    } else if (Platform.OS === 'ios') {
      await appLockerIOS.setAppRestrictions([packageName]);
    }
    await this.saveState();
  }

  public async unlockApp(packageName: string, appName: string): Promise<void> {
    this.lockedApps.delete(packageName);
    if (Platform.OS === 'android') {
      await appLocker.unblockApp(packageName);
    } else if (Platform.OS === 'ios') {
      await appLockerIOS.removeAppRestrictions([packageName]);
    }
    await this.saveState();

    if (this.shouldSendNotification('unlock')) {
      await notificationService.scheduleUnlockNotification(appName);
      await this.updateLastNotification('unlock');
    }
  }

  public isAppLocked(packageName: string): boolean {
    return this.lockedApps.has(packageName);
  }

  public async addReadingTime(minutes: number): Promise<void> {
    this.checkAndResetDailyProgress();
    const previousTotal = this.readingProgress.totalMinutesToday;
    this.readingProgress.totalMinutesToday += minutes;
    this.readingProgress.lastUpdated = new Date().toISOString();
    await this.saveState();

    // Check if we should send a goal notification
    if (previousTotal < 30 && this.readingProgress.totalMinutesToday >= 30) {
      if (this.shouldSendNotification('goal')) {
        await notificationService.scheduleGoalCompletedNotification(this.readingProgress.totalMinutesToday);
        await this.updateLastNotification('goal');
      }
    }

    // Check if we should send a reminder
    const remainingApps = Array.from(this.lockedApps).length;
    if (remainingApps > 0 && this.shouldSendNotification('reminder')) {
      await notificationService.scheduleReminderNotification(remainingApps * 30 - this.readingProgress.totalMinutesToday);
      await this.updateLastNotification('reminder');
    }
  }

  public getTotalReadingMinutesToday(): number {
    this.checkAndResetDailyProgress();
    return this.readingProgress.totalMinutesToday;
  }

  public async getInstalledApps(): Promise<InstalledApp[]> {
    // For Android, get the list of running apps and filter social media apps
    if (Platform.OS === 'android') {
      const runningApps = await appLocker.getRunningApps();
      const socialMediaApps = [
        { id: 'com.instagram.android', packageName: 'com.instagram.android', name: 'Instagram', icon: 'logo-instagram' },
        { id: 'com.facebook.katana', packageName: 'com.facebook.katana', name: 'Facebook', icon: 'logo-facebook' },
        { id: 'com.twitter.android', packageName: 'com.twitter.android', name: 'Twitter', icon: 'logo-twitter' },
        { id: 'com.tiktok.android', packageName: 'com.tiktok.android', name: 'TikTok', icon: 'logo-tiktok' },
        { id: 'com.google.android.youtube', packageName: 'com.google.android.youtube', name: 'YouTube', icon: 'logo-youtube' },
      ];
      return socialMediaApps.filter(app => runningApps.includes(app.packageName));
    }

    // For iOS, return the list of common social media apps
    return [
      { id: 'com.instagram.ios', packageName: 'com.instagram.ios', name: 'Instagram', icon: 'logo-instagram' },
      { id: 'com.facebook.Facebook', packageName: 'com.facebook.Facebook', name: 'Facebook', icon: 'logo-facebook' },
      { id: 'com.atebits.Tweetie2', packageName: 'com.atebits.Tweetie2', name: 'Twitter', icon: 'logo-twitter' },
      { id: 'com.zhiliaoapp.musically', packageName: 'com.zhiliaoapp.musically', name: 'TikTok', icon: 'logo-tiktok' },
      { id: 'com.google.ios.youtube', packageName: 'com.google.ios.youtube', name: 'YouTube', icon: 'logo-youtube' },
      { id: 'com.burbn.instagram', packageName: 'com.burbn.instagram', name: 'Instagram', icon: 'logo-instagram' },
      { id: 'com.apple.mobilesafari', packageName: 'com.apple.mobilesafari', name: 'Safari', icon: 'globe' },
    ];
  }

  public async checkPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const hasAccessibility = await appLocker.isAccessibilityServiceEnabled();
      const hasUsageStats = await appLocker.isUsageStatsPermissionGranted();
      return hasAccessibility && hasUsageStats;
    } else if (Platform.OS === 'ios') {
      return await appLockerIOS.isAuthorized();
    }
    return true;
  }

  public async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      await appLocker.requestUsageStatsPermission();
      await appLocker.requestAccessibilityService();
    } else if (Platform.OS === 'ios') {
      await appLockerIOS.requestAuthorization();
    }
  }
}

export const appManager = AppManager.getInstance(); 