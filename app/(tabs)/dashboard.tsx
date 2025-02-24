import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useReadingList } from '../../contexts/reading-list';
import { useAppLock } from '../../contexts/app-lock';
import { useTheme } from '../../contexts/theme';
import ReadingList from '../components/ReadingList';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const { books } = useReadingList();
  const { readingProgress, requiredMinutes } = useAppLock();
  const { isDarkMode } = useTheme();
  const remainingMinutes = Math.max(0, requiredMinutes - readingProgress);

  // Debug: Check what books are in storage
  useEffect(() => {
    async function checkStorage() {
      try {
        const stored = await AsyncStorage.getItem('@reading_list');
        console.log('Books in storage:', stored);
        console.log('Books in state:', books);
      } catch (error) {
        console.error('Error checking storage:', error);
      }
    }
    checkStorage();
  }, [books]);

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: isDarkMode ? '#000' : '#fff' }
      ]} 
      edges={['top']}
    >
      <View style={[
        styles.header,
        { 
          borderBottomColor: isDarkMode ? '#333' : '#eee',
          backgroundColor: isDarkMode ? '#1c1c1e' : '#fff'
        }
      ]}>
        <Text style={[
          styles.title,
          { color: isDarkMode ? '#fff' : '#000' }
        ]}>Dashboard</Text>
        <Link href="/settings" style={styles.settingsLink}>
          Settings
        </Link>
      </View>

      <ScrollView 
        style={[
          styles.content,
          { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }
        ]} 
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>Today's Reading Goal</Text>
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
        </View>

        <Link href="/(book)/scan" asChild>
          <Pressable style={styles.scanButton}>
            <Text style={styles.scanButtonText}>Scan Book</Text>
          </Pressable>
        </Link>

        <View style={[styles.section, styles.readingListSection]}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>My Reading List</Text>
          <ReadingList compact />
        </View>

        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>Locked Apps</Text>
          <Text style={[
            styles.emptyText,
            { color: isDarkMode ? '#999' : '#666' }
          ]}>No apps locked yet</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsLink: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  readingListSection: {
    flex: 1,
    minHeight: 200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
  },
}); 