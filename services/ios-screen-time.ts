import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type ScreenTimeStatus = {
  authorization: 'approved' | 'denied' | 'notDetermined' | 'unknown';
  appCount: number;
  categoryCount: number;
  domainCount: number;
  /** Native system call was requested, NOT a verified lock state. */
  lastRequestedShielded: boolean;
};
type NativeScreenTime = {
  getStatus(): Promise<ScreenTimeStatus>;
  requestAuthorization(): Promise<ScreenTimeStatus>;
  pickApps(): Promise<ScreenTimeStatus>;
  setShielded(enabled: boolean): Promise<ScreenTimeStatus>;
};

// Apple frameworks are unavailable in Expo Go, Android, web and development builds
// that haven't been compiled with the local RTUScreenTime native Expo module.
const nativeModule = Platform.OS === 'ios' && Constants.appOwnership !== 'expo'
  ? requireOptionalNativeModule<NativeScreenTime>('RTUScreenTime')
  : null;

export const iosScreenTime = {
  isInstalled: (): boolean => nativeModule !== null,
  getStatus: async (): Promise<ScreenTimeStatus | null> => nativeModule ? nativeModule.getStatus() : null,
  requestAuthorization: async (): Promise<ScreenTimeStatus> => {
    if (!nativeModule) throw new Error('iOS Screen Time is unavailable in this build.');
    return nativeModule.requestAuthorization();
  },
  pickApps: async (): Promise<ScreenTimeStatus> => {
    if (!nativeModule) throw new Error('Use a signed iOS development build to select apps.');
    return nativeModule.pickApps();
  },
  setShielded: async (enabled: boolean): Promise<void> => {
    if (!nativeModule) throw new Error('Native Screen Time module is missing.');
    await nativeModule.setShielded(enabled);
  },
};
