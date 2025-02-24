import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useReadingList } from '../../contexts/reading-list';
import ReadingList from '../components/ReadingList';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const { books } = useReadingList();
  const totalMinutesRead = books?.reduce((total, book) => total + book.progress.totalTimeRead, 0) || 0;
  const dailyGoalMinutes = 30; // TODO: Make this configurable

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Link href="/settings" style={styles.settingsLink}>
          Settings
        </Link>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Reading Goal</Text>
          <Text style={styles.goalText}>
            {totalMinutesRead} / {dailyGoalMinutes} minutes
          </Text>
        </View>

        <Link href="/(book)/scan" asChild>
          <Pressable style={styles.scanButton}>
            <Text style={styles.scanButtonText}>Scan Book</Text>
          </Pressable>
        </Link>

        <View style={[styles.section, styles.readingListSection]}>
          <Text style={styles.sectionTitle}>My Reading List</Text>
          <ReadingList compact />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locked Apps</Text>
          <Text style={styles.emptyText}>No apps locked yet</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    minHeight: 200, // Ensure there's space for the reading list
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  goalText: {
    fontSize: 24,
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
    color: '#666',
    fontSize: 14,
  },
}); 