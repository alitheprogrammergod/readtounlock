import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingUnlockController } from '../services/reading-unlock-controller';
import { createUnlockState, getUnlockStatus, type UnlockStatus } from '../services/reading-unlock-engine';
import { iosScreenTime, type ScreenTimeStatus } from '../services/ios-screen-time';

const GOAL_KEY = '@rtu_v2_goal_minutes';
const ONBOARDING_KEY = '@rtu_v2_onboarded';
const BLOCKING_ENABLED_KEY = '@rtu_v2_ios_blocking_enabled';
const DEFAULT_MINUTES = 15;
const clock = { now: () => new Date() };
const nativeShield = {
  applyBlockedApps: async (appIds: string[]) => {
    // Only opaque-token selections already persisted by Apple's picker can be shielded.
    // The string in the V2 controller is a sentinel, never an iOS bundle identifier.
    await iosScreenTime.setShielded(appIds.includes('ios-screen-time-selection'));
  },
};
const INITIAL_SCREEN_TIME: ScreenTimeStatus | null = null;
const hasSelection = (status: ScreenTimeStatus | null) =>
  !!status && status.appCount + status.categoryCount + status.domainCount > 0;
type RewardsContextValue = {
  ready: boolean;
  onboarded: boolean;
  goalMinutes: number;
  status: UnlockStatus;
  selectedApps: string[];
  error: string | null;
  blockerAvailable: boolean;
  screenTimeStatus: ScreenTimeStatus | null;
  requestIosPermission: () => Promise<void>;
  pickIosApps: () => Promise<void>;
  disableIosBlocking: () => Promise<void>;
  finishOnboarding: (minutes: number, apps: string[]) => Promise<void>;
  setGoalMinutes: (minutes: number) => Promise<void>;
  setSelectedApps: (apps: string[]) => Promise<void>;
  recordReading: (sessionId: string, sessionDay: string, totalSeconds: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const initialStatus = getUnlockStatus(createUnlockState(new Date()), new Date(), {
  mode: 'daily', requiredSeconds: DEFAULT_MINUTES * 60,
});
const RewardsContext = createContext<RewardsContextValue | undefined>(undefined);

function validateMinutes(minutes: number) {
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 240) {
    throw new Error('Choose a reading goal between 1 and 240 minutes.');
  }
}

export function ReadingRewardsProvider({ children }: { children: React.ReactNode }) {
  const controllerRef = useRef<ReadingUnlockController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new ReadingUnlockController(
      AsyncStorage, nativeShield, clock, { mode: 'daily', requiredSeconds: DEFAULT_MINUTES * 60 }
    );
  }
  const controller = controllerRef.current;
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [goalMinutes, setGoalState] = useState(DEFAULT_MINUTES);
  const [status, setStatus] = useState<UnlockStatus>(initialStatus);
  const [selectedApps, setApps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [screenTimeStatus, setScreenTimeStatus] = useState<ScreenTimeStatus | null>(INITIAL_SCREEN_TIME);
  const [blockingEnabled, setBlockingEnabled] = useState(true);

  // Each startup/focus re-checks actual Apple authorization; never trust a cached
  // permission bit left behind by a previous app installation or grant.
  const reconcileNative = useCallback(async (): Promise<UnlockStatus> => {
    const native = await iosScreenTime.getStatus();
    setScreenTimeStatus(native);
    const enabled = (await AsyncStorage.getItem(BLOCKING_ENABLED_KEY)) !== 'false';
    setBlockingEnabled(enabled);
    const usable = enabled && !!native && native.authorization === 'approved' && hasSelection(native);
    if (!usable) {
      const next = await controller.setPermission(false);
      setStatus(next);
      return next;
    }
    // React Native must not see Apple's private tokens. The native module owns them.
    await controller.setPermission(false);
    await controller.selectApps(['ios-screen-time-selection']);
    const next = await controller.setPermission(true);
    setStatus(next);
    setApps(['iOS Screen Time selection']);
    return next;
  }, [controller]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [savedMinutes, savedOnboarded] = await Promise.all([
          AsyncStorage.getItem(GOAL_KEY), AsyncStorage.getItem(ONBOARDING_KEY),
        ]);
        const parsed = savedMinutes === null ? DEFAULT_MINUTES : Number(savedMinutes);
        const minutes = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 240 ? parsed : DEFAULT_MINUTES;
        // Prevent an old cached permission from applying a shield before authorization
        // is checked. Disabled clients can still keep tracking reading progress.
        await controller.setPermission(false);
        await controller.setPolicy({ mode: 'daily', requiredSeconds: minutes * 60 });
        await controller.initialize();
        const next = await reconcileNative();
        const apps = await controller.getSelectedApps();
        if (!active) return;
        setStatus(next);
        setApps(apps);
        setGoalState(minutes);
        setOnboarded(savedOnboarded === 'true');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load reading progress.');
      } finally {
        if (active) setReady(true);
      }
    }
    load();
    return () => { active = false; };
  }, [controller, reconcileNative]);

  const refresh = useCallback(async () => {
    // Sync authorization and shield policy when the app resumes / screens focus.
    const next = await reconcileNative();
    setStatus(next);
  }, [reconcileNative]);

  const setGoalMinutes = useCallback(async (minutes: number) => {
    validateMinutes(minutes);
    await controller.setPolicy({ mode: 'daily', requiredSeconds: minutes * 60 });
    await AsyncStorage.setItem(GOAL_KEY, String(minutes));
    setGoalState(minutes);
    await refresh();
  }, [controller, refresh]);

  const setSelectedApps = useCallback(async (apps: string[]) => {
    // Names chosen during onboarding are preference labels only, not shield tokens.
    if (hasSelection(screenTimeStatus) && screenTimeStatus?.authorization === 'approved') {
      throw new Error("Use Apple's app picker to change actual iOS restrictions.");
    }
    const result = await controller.selectApps(apps);
    setStatus(result);
    setApps(await controller.getSelectedApps());
  }, [controller, screenTimeStatus]);

  const requestIosPermission = useCallback(async () => {
    setError(null);
    await iosScreenTime.requestAuthorization();
    await reconcileNative();
  }, [reconcileNative]);

  const pickIosApps = useCallback(async () => {
    setError(null);
    const native = await iosScreenTime.pickApps();
    setScreenTimeStatus(native);
    if (native.authorization === 'approved' && hasSelection(native)) {
      await AsyncStorage.setItem(BLOCKING_ENABLED_KEY, 'true');
      setBlockingEnabled(true);
      await controller.setPermission(false);
      await controller.selectApps(['ios-screen-time-selection']);
      const result = await controller.setPermission(true);
      setStatus(result);
      setApps(['iOS Screen Time selection']);
    } else {
      await controller.setPermission(false);
      await controller.selectApps([]);
      setStatus(await controller.sync());
      setApps([]);
    }
  }, [controller]);

  const disableIosBlocking = useCallback(async () => {
    // User-controlled emergency bypass, never silently revoke their permission.
    await AsyncStorage.setItem(BLOCKING_ENABLED_KEY, 'false');
    setBlockingEnabled(false);
    await iosScreenTime.setShielded(false);
    await controller.setPermission(false);
    setStatus(await controller.sync());
    setScreenTimeStatus(await iosScreenTime.getStatus());
  }, [controller]);

  const finishOnboarding = useCallback(async (minutes: number, apps: string[]) => {
    await setGoalMinutes(minutes);
    await setSelectedApps(apps);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboarded(true);
  }, [setGoalMinutes, setSelectedApps]);

  const recordReading = useCallback(async (sessionId: string, sessionDay: string, seconds: number) => {
    const result = await controller.recordReading(sessionId, sessionDay, seconds);
    setStatus(result);
  }, [controller]);

  return (
    <RewardsContext.Provider value={{
      ready, onboarded, goalMinutes, status, selectedApps, error,
      blockerAvailable: blockingEnabled && iosScreenTime.isInstalled() &&
        screenTimeStatus?.authorization === 'approved' && hasSelection(screenTimeStatus) && status.permissionGranted,
      screenTimeStatus, requestIosPermission, pickIosApps, disableIosBlocking,
      finishOnboarding, setGoalMinutes, setSelectedApps, recordReading, refresh,
    }}>
      {children}
    </RewardsContext.Provider>
  );
}

export function useReadingRewards(): RewardsContextValue {
  const context = useContext(RewardsContext);
  if (!context) throw new Error('useReadingRewards must be used inside ReadingRewardsProvider');
  return context;
}
