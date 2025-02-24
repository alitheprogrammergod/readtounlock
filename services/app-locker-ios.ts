import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const { FamilyControlsModule } = NativeModules;

const isExpoGo = Constants.appOwnership === 'expo';

interface FamilyControlsInterface {
  checkAuthorization(): Promise<string>;
  requestAuthorization(): Promise<string>;
  setAppRestrictions(bundleIds: string[]): Promise<void>;
  removeAppRestrictions(bundleIds: string[]): Promise<void>;
  getRestrictedApps(): Promise<string[]>;
}

type AuthorizationStatus = 'notDetermined' | 'denied' | 'approved';

class AppLockerIOSService {
  private static instance: AppLockerIOSService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AppLockerIOSService {
    if (!AppLockerIOSService.instance) {
      AppLockerIOSService.instance = new AppLockerIOSService();
    }
    return AppLockerIOSService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || Platform.OS !== 'ios') return;
    
    try {
      if (isExpoGo) {
        console.log('Running in Expo Go - FamilyControls not available');
        return;
      }

      const status = await FamilyControlsModule?.checkAuthorization();
      if (status === 'notDetermined') {
        await this.requestAuthorization();
      }
      this.isInitialized = true;
    } catch (error) {
      console.log('FamilyControls not available in this environment');
    }
  }

  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'ios' || isExpoGo) return false;
    
    try {
      const status = await FamilyControlsModule?.requestAuthorization();
      return status === 'approved';
    } catch (error) {
      console.log('FamilyControls authorization not available');
      return false;
    }
  }

  async isAuthorized(): Promise<boolean> {
    if (Platform.OS !== 'ios' || isExpoGo) return false;
    
    try {
      const status = await FamilyControlsModule?.checkAuthorization();
      return status === 'approved';
    } catch (error) {
      console.log('FamilyControls authorization check not available');
      return false;
    }
  }

  async setAppRestrictions(bundleIds: string[]): Promise<void> {
    if (Platform.OS !== 'ios' || isExpoGo) return;
    
    try {
      await this.initialize();
      await FamilyControlsModule?.setAppRestrictions(bundleIds);
    } catch (error) {
      console.log('FamilyControls restrictions not available');
    }
  }

  async removeAppRestrictions(bundleIds: string[]): Promise<void> {
    if (Platform.OS !== 'ios' || isExpoGo) return;
    
    try {
      await this.initialize();
      await FamilyControlsModule?.removeAppRestrictions(bundleIds);
    } catch (error) {
      console.log('FamilyControls restrictions removal not available');
    }
  }

  async getRestrictedApps(): Promise<string[]> {
    if (Platform.OS !== 'ios' || isExpoGo) return [];
    
    try {
      await this.initialize();
      return await FamilyControlsModule?.getRestrictedApps() || [];
    } catch (error) {
      console.log('FamilyControls app list not available');
      return [];
    }
  }
}

export const appLockerIOS = AppLockerIOSService.getInstance(); 