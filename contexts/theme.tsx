import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_settings';

interface ThemeSettings {
  isDarkMode: boolean;
  isSystemTheme: boolean;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [settings, setSettings] = useState<ThemeSettings>({
    isDarkMode: false,
    isSystemTheme: true,
  });

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    if (settings.isSystemTheme && systemColorScheme) {
      setSettings(prev => ({
        ...prev,
        isDarkMode: systemColorScheme === 'dark'
      }));
    }
  }, [systemColorScheme, settings.isSystemTheme]);

  async function loadThemeSettings() {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const settings: ThemeSettings = JSON.parse(stored);
        setSettings(settings);
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  }

  async function saveThemeSettings(newSettings: ThemeSettings) {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving theme settings:', error);
    }
  }

  async function toggleTheme() {
    const newSettings = {
      isDarkMode: !settings.isDarkMode,
      isSystemTheme: false,
    };
    await saveThemeSettings(newSettings);
  }

  async function setSystemTheme(useSystem: boolean) {
    const newSettings = {
      isDarkMode: useSystem ? systemColorScheme === 'dark' : settings.isDarkMode,
      isSystemTheme: useSystem,
    };
    await saveThemeSettings(newSettings);
  }

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode: settings.isDarkMode,
        toggleTheme,
        isSystemTheme: settings.isSystemTheme,
        setSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 