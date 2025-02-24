import React, { createContext, useContext, useEffect, useState } from 'react';
import { appManager, InstalledApp } from '../services/app-manager';
import { notificationService } from '../services/notifications';

export interface AppLockItem extends InstalledApp {
  isLocked: boolean;
  requiredMinutes: number;
}

interface AppLockContextType {
  apps: AppLockItem[];
  toggleAppLock: (id: string) => Promise<void>;
  updateRequiredMinutes: (id: string, minutes: number) => Promise<void>;
  isAppLocked: (id: string) => boolean;
  getRequiredMinutes: (id: string) => number;
  totalRequiredMinutes: number;
  readingProgress: number;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

const STORAGE_KEY = '@app_locks_v2';

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<AppLockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);

  // Load installed apps and their lock status
  useEffect(() => {
    loadApps();
    // Set up an interval to update reading progress
    const interval = setInterval(updateReadingProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  async function loadApps() {
    try {
      console.log('Loading installed apps...');
      const installedApps = await appManager.getInstalledApps();
      const appsWithLockStatus = installedApps.map((app: InstalledApp) => ({
        ...app,
        isLocked: appManager.isAppLocked(app.packageName),
        requiredMinutes: 30, // Default value
      }));
      setApps(appsWithLockStatus);
      updateReadingProgress();
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateReadingProgress() {
    const progress = appManager.getTotalReadingMinutesToday();
    setReadingProgress(progress);
  }

  async function toggleAppLock(id: string) {
    const app = apps.find(a => a.id === id);
    if (!app) return;

    const newApps = apps.map(a => {
      if (a.id === id) {
        const newLockStatus = !a.isLocked;
        if (newLockStatus) {
          appManager.lockApp(a.packageName);
        } else {
          appManager.unlockApp(a.packageName, a.name);
        }
        return { ...a, isLocked: newLockStatus };
      }
      return a;
    });

    setApps(newApps);
  }

  async function updateRequiredMinutes(id: string, minutes: number) {
    const newApps = apps.map(app =>
      app.id === id ? { ...app, requiredMinutes: minutes } : app
    );
    setApps(newApps);
  }

  function isAppLocked(id: string): boolean {
    const app = apps.find(a => a.id === id);
    return app?.isLocked || false;
  }

  function getRequiredMinutes(id: string): number {
    const app = apps.find(a => a.id === id);
    return app?.requiredMinutes || 0;
  }

  const totalRequiredMinutes = apps
    .filter(app => app.isLocked)
    .reduce((total, app) => total + app.requiredMinutes, 0);

  if (isLoading) {
    return null;
  }

  return (
    <AppLockContext.Provider
      value={{
        apps,
        toggleAppLock,
        updateRequiredMinutes,
        isAppLocked,
        getRequiredMinutes,
        totalRequiredMinutes,
        readingProgress,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (context === undefined) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
} 