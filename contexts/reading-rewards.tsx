import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingUnlockController } from '../services/reading-unlock-controller';
import { createUnlockState, getUnlockStatus, type UnlockStatus } from '../services/reading-unlock-engine';

const GOAL_KEY = '@rtu_v2_goal_minutes';
const ONBOARDING_KEY = '@rtu_v2_onboarded';
const DEFAULT_MINUTES = 15;
const clock = { now: () => new Date() };
// Native shields aren't ready yet. Never claim that selected apps are actually blocked.
const unavailableShield = {
  applyBlockedApps: async (_apps: string[]) => {
    throw new Error('Native app blocking is not available in this build.');
  },
};
type RewardsContextValue = {
  ready: boolean;
  onboarded: boolean;
  goalMinutes: number;
  status: UnlockStatus;
  selectedApps: string[];
  error: string | null;
  blockerAvailable: boolean;
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
      AsyncStorage, unavailableShield, clock, { mode: 'daily', requiredSeconds: DEFAULT_MINUTES * 60 }
    );
  }
  const controller = controllerRef.current;
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [goalMinutes, setGoalState] = useState(DEFAULT_MINUTES);
  const [status, setStatus] = useState<UnlockStatus>(initialStatus);
  const [selectedApps, setApps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [savedMinutes, savedOnboarded] = await Promise.all([
          AsyncStorage.getItem(GOAL_KEY), AsyncStorage.getItem(ONBOARDING_KEY),
        ]);
        const parsed = savedMinutes === null ? DEFAULT_MINUTES : Number(savedMinutes);
        const minutes = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 240 ? parsed : DEFAULT_MINUTES;
        await controller.setPolicy({ mode: 'daily', requiredSeconds: minutes * 60 });
        const result = await controller.initialize();
        if (!active) return;
        setStatus(result);
        setApps((await controller.getSelectedApps()));
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
  }, [controller]);

  const refresh = useCallback(async () => {
    const result = await controller.sync();
    setStatus(result);
    setApps(await controller.getSelectedApps());
  }, [controller]);

  const setGoalMinutes = useCallback(async (minutes: number) => {
    validateMinutes(minutes);
    await controller.setPolicy({ mode: 'daily', requiredSeconds: minutes * 60 });
    await AsyncStorage.setItem(GOAL_KEY, String(minutes));
    setGoalState(minutes);
    await refresh();
  }, [controller, refresh]);

  const setSelectedApps = useCallback(async (apps: string[]) => {
    const result = await controller.selectApps(apps);
    setStatus(result);
    setApps(await controller.getSelectedApps());
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
      ready, onboarded, goalMinutes, status, selectedApps, error, blockerAvailable: false,
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
