import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppLock } from '../../contexts/app-lock';
import { appManager } from '../../services/app-manager';

export default function AppLockScreen() {
  const {
    apps,
    toggleAppLock,
    updateRequiredMinutes,
    totalRequiredMinutes,
    readingProgress,
  } = useAppLock();

  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const hasAllPermissions = await appManager.checkPermissions();
    setHasPermissions(hasAllPermissions);
    
    if (!hasAllPermissions && Platform.OS === 'android') {
      Alert.alert(
        'Permissions Required',
        'Read to Unlock needs accessibility and usage stats permissions to monitor and block apps.',
        [
          {
            text: 'Grant Permissions',
            onPress: requestPermissions,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  }

  async function requestPermissions() {
    await appManager.requestPermissions();
    await checkPermissions();
  }

  async function handleToggleLock(id: string) {
    if (!hasPermissions && Platform.OS === 'android') {
      Alert.alert(
        'Permissions Required',
        'Please grant the required permissions to lock apps.',
        [
          {
            text: 'Grant Permissions',
            onPress: requestPermissions,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    await toggleAppLock(id);
  }

  function handleUpdateMinutes(id: string, minutes: number) {
    if (minutes >= 0) {
      updateRequiredMinutes(id, minutes);
    }
  }

  function handleHelp() {
    Alert.alert(
      'How App Locking Works',
      'Select apps to lock and set how many minutes you need to read to unlock them. ' +
      'The app will monitor your reading time and automatically unlock apps when you reach your goals.\n\n' +
      'Tips:\n' +
      '• Start with short reading goals (15-30 minutes)\n' +
      '• Lock distracting apps first\n' +
      '• Reading progress resets daily',
      [{ text: 'Got it!' }]
    );
  }

  const remainingMinutes = Math.max(0, totalRequiredMinutes - readingProgress);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Lock Apps</Text>
          <Pressable onPress={handleHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Reading Progress</Text>
            <Text style={styles.statValue}>{readingProgress} min</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={styles.statValue}>{remainingMinutes} min</Text>
          </View>
        </View>

        <Text style={styles.description}>
          Lock apps and set reading requirements. Apps will unlock automatically when you meet your reading goals.
        </Text>

        {!hasPermissions && Platform.OS === 'android' && (
          <View style={styles.permissionWarning}>
            <Ionicons name="warning-outline" size={24} color="#FFA500" />
            <Text style={styles.permissionText}>
              Additional permissions are required to lock apps.{' '}
              <Text style={styles.permissionButton} onPress={requestPermissions}>
                Grant Permissions
              </Text>
            </Text>
          </View>
        )}

        <View style={styles.appList}>
          {apps.map((app) => (
            <View key={app.id} style={styles.appItem}>
              <View style={styles.appInfo}>
                <Ionicons name={app.icon as any} size={24} color="#666" />
                <Text style={styles.appName}>{app.name}</Text>
              </View>
              
              <View style={styles.appControls}>
                <View style={styles.minutesControl}>
                  <Pressable
                    onPress={() => handleUpdateMinutes(app.id, app.requiredMinutes - 15)}
                    style={styles.minutesButton}
                  >
                    <Text style={styles.minutesButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.minutes}>{app.requiredMinutes}m</Text>
                  <Pressable
                    onPress={() => handleUpdateMinutes(app.id, app.requiredMinutes + 15)}
                    style={styles.minutesButton}
                  >
                    <Text style={styles.minutesButtonText}>+</Text>
                  </Pressable>
                </View>
                
                <Switch
                  value={app.isLocked}
                  onValueChange={() => handleToggleLock(app.id)}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={app.isLocked ? '#007AFF' : '#f4f3f4'}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  helpButton: {
    padding: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  permissionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  permissionButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  appList: {
    paddingHorizontal: 16,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    marginLeft: 12,
    fontSize: 16,
  },
  appControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minutesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  minutesButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minutesButtonText: {
    fontSize: 16,
    color: '#666',
  },
  minutes: {
    marginHorizontal: 8,
    fontSize: 16,
    minWidth: 35,
    textAlign: 'center',
  },
}); 