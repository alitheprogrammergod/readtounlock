import { View, Text, StyleSheet, Pressable, Switch, TextInput, Modal, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../contexts/theme';
import { useAppLock } from '../contexts/app-lock';
import { Ionicons } from '@expo/vector-icons';

interface SettingItemProps {
  title: string;
  description?: string;
  isSwitch?: boolean;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
}

function SettingItem({ title, description, isSwitch, value, onValueChange, onPress }: SettingItemProps) {
  const { isDarkMode } = useTheme();
  
  return (
    <Pressable 
      style={[
        styles.settingItem,
        { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }
      ]}
      onPress={onPress}
    >
      <View style={styles.settingText}>
        <Text style={[
          styles.settingTitle,
          { color: isDarkMode ? '#fff' : '#000' }
        ]}>
          {title}
        </Text>
        {description && (
          <Text style={[
            styles.settingDescription,
            { color: isDarkMode ? '#999' : '#666' }
          ]}>
            {description}
          </Text>
        )}
      </View>
      {isSwitch && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#007AFF' : '#f4f3f4'}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { requiredMinutes, setRequiredMinutes } = useAppLock();
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [timeInput, setTimeInput] = useState(requiredMinutes.toString());

  const handleSaveTime = () => {
    const minutes = parseInt(timeInput);
    if (!isNaN(minutes) && minutes >= 0) {
      setRequiredMinutes(minutes);
      setTimeModalVisible(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out Read to Unlock - an app that helps you build a daily reading habit! 📚 Earn your screen time by reading books. Download now: [App Store/Play Store Link]',
        title: 'Read to Unlock - Build Your Reading Habit',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }
    ]}>
      <View style={[
        styles.header,
        { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }
      ]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color="#007AFF" 
          />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={[
          styles.title,
          { color: isDarkMode ? '#fff' : '#000' }
        ]}>
          Settings
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            Reading Goals
          </Text>
          <SettingItem
            title="Daily Reading Goal"
            description={`Set your daily reading target (${requiredMinutes} minutes)`}
            onPress={() => setTimeModalVisible(true)}
          />
          <SettingItem
            title="Notifications"
            description="Receive reminders to read"
            isSwitch
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>

        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            App Settings
          </Text>
          <SettingItem
            title="Dark Mode"
            description="Switch between light and dark theme"
            isSwitch
            value={isDarkMode}
            onValueChange={toggleTheme}
          />
        </View>

        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            Social
          </Text>
          <SettingItem
            title="Refer a Friend"
            description="Share the app with friends and family"
            onPress={handleShare}
          />
        </View>

        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            About
          </Text>
          <SettingItem
            title="Version"
            description="1.0.0"
          />
        </View>
      </View>

      <Modal
        visible={isTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
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
            ]}>Set Daily Reading Goal</Text>
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
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="Enter minutes"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setTimeModalVisible(false)}
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
                onPress={handleSaveTime}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: -4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
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