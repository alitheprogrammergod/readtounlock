import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Request permissions
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }

    this.isInitialized = true;
  }

  public async scheduleUnlockNotification(appName: string): Promise<void> {
    await this.initialize();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'App Unlocked! 🎉',
        body: `Great job reading! ${appName} is now unlocked.`,
        data: { type: 'unlock', appName },
      },
      trigger: null, // Send immediately
    });
  }

  public async scheduleGoalCompletedNotification(minutes: number): Promise<void> {
    await this.initialize();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reading Goal Achieved! 📚',
        body: `Congratulations! You've read for ${minutes} minutes today.`,
        data: { type: 'goal', minutes },
      },
      trigger: null,
    });
  }

  public async scheduleReminderNotification(remainingMinutes: number): Promise<void> {
    await this.initialize();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep Reading! 📖',
        body: `Just ${remainingMinutes} more minutes of reading to unlock your apps.`,
        data: { type: 'reminder', remainingMinutes },
      },
      trigger: null,
    });
  }
}

export const notificationService = NotificationService.getInstance(); 