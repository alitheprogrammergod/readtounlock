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
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppLock } from '../../contexts/app-lock';
import { useTheme } from '../../contexts/theme';
import { appManager } from '../../services/app-manager';

export default function AppLockScreen() {
  const {
    apps,
    toggleAppLock,
    requiredMinutes,
    setRequiredMinutes,
    readingProgress,
  } = useAppLock();
  const { isDarkMode } = useTheme();

  const [hasPermissions, setHasPermissions] = useState(false);
  const [isCustomTimeModalVisible, setCustomTimeModalVisible] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');

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

  function handleUpdateMinutes(minutes: number) {
    if (minutes >= 0) {
      setRequiredMinutes(minutes);
    }
  }

  function handleHelp() {
    Alert.alert(
      'How App Locking Works',
      'Set how many minutes you need to read to unlock your apps. ' +
      'This time requirement applies to all locked apps. Once you reach your reading goal, all apps will unlock.\n\n' +
      'Tips:\n' +
      '• Start with short reading goals (15-30 minutes)\n' +
      '• Lock distracting apps first\n' +
      '• Reading progress resets daily',
      [{ text: 'Got it!' }]
    );
  }

  function handleCustomTime() {
    setCustomTimeInput(requiredMinutes.toString());
    setCustomTimeModalVisible(true);
  }

  function handleSetCustomTime() {
    const minutes = parseInt(customTimeInput || '0', 10);
    if (!isNaN(minutes) && minutes >= 0) {
      handleUpdateMinutes(minutes);
      setCustomTimeModalVisible(false);
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid number of minutes.');
    }
  }

  const remainingMinutes = Math.max(0, requiredMinutes - readingProgress);
  const hasLockedApps = apps.some(app => app.isLocked);

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }
    ]}>
      <ScrollView style={styles.scrollView}>
        <View style={[
          styles.header,
          { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }
        ]}>
          <Text style={[
            styles.title,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>Lock Apps</Text>
          <Pressable onPress={handleHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
          </Pressable>
        </View>

        <View style={[
          styles.statsContainer,
          { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
        ]}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statLabel,
              { color: isDarkMode ? '#999' : '#666' }
            ]}>Reading Progress</Text>
            <Text style={styles.statValue}>{readingProgress} min</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.statLabel,
              { color: isDarkMode ? '#999' : '#666' }
            ]}>Remaining</Text>
            <Text style={styles.statValue}>{remainingMinutes} min</Text>
          </View>
        </View>

        {hasLockedApps && (
          <View style={[
            styles.timeRequirementContainer,
            { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
          ]}>
            <Text style={[
              styles.timeRequirementLabel,
              { color: isDarkMode ? '#fff' : '#000' }
            ]}>Reading Time Required</Text>
            <View style={styles.timeControl}>
              <Text style={[
                styles.timeValue,
                { color: isDarkMode ? '#fff' : '#000' }
              ]}>{requiredMinutes} min</Text>
            </View>
            <Pressable
              onPress={handleCustomTime}
              style={[styles.timeButton, styles.customTimeButton]}
            >
              <Text style={styles.timeButtonText}>Set Custom Time</Text>
            </Pressable>
          </View>
        )}

        <Text style={[
          styles.description,
          { color: isDarkMode ? '#999' : '#666' }
        ]}>
          Lock apps and set a reading requirement. All apps will unlock when you complete your reading goal.
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

        <View style={[
          styles.appList,
          { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }
        ]}>
          {apps.map((app) => (
            <View key={app.id} style={[
              styles.appItem,
              { borderBottomColor: isDarkMode ? '#333' : '#eee' }
            ]}>
              <View style={styles.appInfo}>
                <Ionicons 
                  name={app.icon as any} 
                  size={24} 
                  color={isDarkMode ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.appName,
                  { color: isDarkMode ? '#fff' : '#000' }
                ]}>{app.name}</Text>
              </View>
              
              <Switch
                value={app.isLocked}
                onValueChange={() => handleToggleLock(app.id)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={app.isLocked ? '#007AFF' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={isCustomTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomTimeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[
            styles.modalContent,
            { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }
          ]}>
            <Text style={[
              styles.modalTitle,
              { color: isDarkMode ? '#fff' : '#000' }
            ]}>Set Custom Time</Text>
            <TextInput
              style={[
                styles.timeInput,
                { 
                  borderColor: isDarkMode ? '#333' : '#ddd',
                  backgroundColor: isDarkMode ? '#000' : '#fff',
                  color: isDarkMode ? '#fff' : '#000'
                }
              ]}
              keyboardType="numeric"
              value={customTimeInput}
              onChangeText={setCustomTimeInput}
              placeholder="Enter minutes"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setCustomTimeModalVisible(false)}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: isDarkMode ? '#333' : '#f8f9fa' }
                ]}
              >
                <Text style={[
                  styles.cancelButtonText,
                  { color: isDarkMode ? '#fff' : '#666' }
                ]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSetCustomTime}
                style={[styles.modalButton, styles.setButton]}
              >
                <Text style={styles.setButtonText}>Set</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  timeRequirementContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  timeRequirementLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeControl: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  timeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customTimeButton: {
    marginTop: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  setButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  setButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
}); 