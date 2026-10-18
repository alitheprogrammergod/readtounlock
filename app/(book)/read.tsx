import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingList } from '../../contexts/reading-list';
import { appManager } from '../../services/app-manager';
import { Ionicons } from '@expo/vector-icons';
import BookPlaceholder from '../components/BookPlaceholder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppLock } from '../../contexts/app-lock';
import { useTheme } from '../../contexts/theme';

const READING_SESSION_KEY = '@reading_session';

interface ReadingSession {
  bookId: string;
  startTime: string;
  elapsedTime: number;
  isPaused: boolean;
}

export default function ReadScreen() {
  const { id } = useLocalSearchParams();
  const { books, updateProgress } = useReadingList();
  const { addReadingTime } = useAppLock();
  const { isDarkMode } = useTheme();
  const book = books.find(b => b.id === id);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(book?.progress.currentPage || 0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showPagePrompt, setShowPagePrompt] = useState(false);
  const [tempPage, setTempPage] = useState('');
  const pageInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load saved session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Save session when unmounting or navigating away
  useEffect(() => {
    return () => {
      if (isReading) {
        saveSession();
      }
    };
  }, [isReading]);

  // Timer effect
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start a new interval if we're reading and not paused
    if (isReading && !isPaused && startTime) {
      console.log('Starting timer...');
      intervalRef.current = setInterval(() => {
        console.log('Timer tick');
        setElapsedTime(prev => {
          const newTime = prev + 1;
          if (newTime % 60 === 0) {
            appManager.addReadingTime(1);
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        console.log('Cleaning up timer');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isReading, isPaused, startTime]);

  const loadSession = async () => {
    try {
      const sessionJson = await AsyncStorage.getItem(READING_SESSION_KEY);
      if (sessionJson) {
        const session: ReadingSession = JSON.parse(sessionJson);
        if (session.bookId === id) {
          setElapsedTime(session.elapsedTime);
          setStartTime(new Date(session.startTime));
          setIsReading(false);
          setIsPaused(true);
        }
      }
    } catch (error) {
      console.error('Error loading reading session:', error);
    }
  };

  const saveSession = async () => {
    if (!startTime) return;
    
    try {
      const session: ReadingSession = {
        bookId: id as string,
        startTime: startTime.toISOString(),
        elapsedTime,
        isPaused,
      };
      await AsyncStorage.setItem(READING_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving reading session:', error);
    }
  };

  const handleStartReading = useCallback(() => {
    console.log('Starting reading session');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStartTime(new Date());
    setIsReading(true);
    setIsPaused(false);
  }, []);

  const handlePauseReading = useCallback(async () => {
    console.log('Pausing reading session');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(true);
  }, []);

  const handleResumeReading = useCallback(() => {
    console.log('Resuming reading session');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!startTime) {
      setStartTime(new Date());
    }
    setIsPaused(false);
  }, [startTime]);

  const handleStopReading = useCallback(async () => {
    if (!book) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsReading(false);
    setIsPaused(false);
    setShowPagePrompt(true);
    setTempPage(currentPage.toString());
    
    await AsyncStorage.removeItem(READING_SESSION_KEY);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      pageInputRef.current?.focus();
    }, 100);

    // Save progress
    if (elapsedTime > 0) {
      const minutes = Math.floor(elapsedTime / 60);
      await updateProgress(book.id, book.progress.currentPage, minutes);
      await addReadingTime(minutes);
    }
  }, [book, currentPage, elapsedTime, updateProgress, addReadingTime]);

  const handleSaveSession = useCallback(async () => {
    if (!book) return;
    
    const finalPage = parseInt(tempPage) || currentPage;
    const timeRead = Math.floor(elapsedTime / 60); // Convert seconds to minutes

    try {
      await updateProgress(book.id, finalPage, timeRead);
      Alert.alert(
        'Reading Session Complete',
        `You read for ${timeRead} minutes and reached page ${finalPage}!`,
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save reading progress');
    }
  }, [book, tempPage, currentPage, elapsedTime, updateProgress]);

  // Calculate progress percentage
  const progressPercentage = book ? (currentPage / book.pageCount) * 100 : 0;
  const CIRCLE_LENGTH = 280; // Circumference of progress circle
  const CIRCLE_RADIUS = CIRCLE_LENGTH / (2 * Math.PI);

  if (!book) {
    return (
      <SafeAreaView style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#000' : '#fff' }
      ]}>
        <Text style={[
          styles.errorText,
          { color: isDarkMode ? '#fff' : '#000' }
        ]}>Book not found</Text>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#000' : '#fff' }
    ]}>
      <View style={[
        styles.header,
        { borderBottomColor: isDarkMode ? '#333' : '#eee' }
      ]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color="#007AFF" 
          />
          <Text style={[
            styles.backText,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>Back</Text>
        </Pressable>
        <Text style={[
          styles.title,
          { color: isDarkMode ? '#fff' : '#000' }
        ]}>Reading Session</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[
            styles.bookInfo,
            { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
          ]}>
            {book.coverUrl ? (
              <Image 
                source={{ uri: book.coverUrl }} 
                style={[styles.coverImage, showPagePrompt && styles.coverImageSmall]}
                resizeMode="cover"
              />
            ) : (
              <BookPlaceholder 
                width={showPagePrompt ? 80 : 120} 
                height={showPagePrompt ? 120 : 180} 
              />
            )}
            <View style={styles.bookDetails}>
              <Text style={[
                styles.bookTitle,
                { color: isDarkMode ? '#fff' : '#000' }
              ]} numberOfLines={2}>
                {book.title}
              </Text>
              {!showPagePrompt && (
                <Text style={[
                  styles.bookAuthor,
                  { color: isDarkMode ? '#999' : '#666' }
                ]} numberOfLines={1}>{book.authors.join(', ')}</Text>
              )}
            </View>
          </View>

          <View style={[
            styles.timerContainer,
            { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
          ]}>
            <Text style={[
              styles.timerLabel,
              { color: isDarkMode ? '#999' : '#666' }
            ]}>Reading Time</Text>
            <Text style={[
              styles.timer,
              { color: isDarkMode ? '#fff' : '#000' }
            ]}>{formatTime(elapsedTime)}</Text>
          </View>

          {!showPagePrompt ? (
            <View style={[
              styles.progressContainer,
              { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
            ]}>
              <Text style={[
                styles.progressLabel,
                { color: isDarkMode ? '#999' : '#666' }
              ]}>Current Progress</Text>
              <Text style={[
                styles.progressText,
                { color: isDarkMode ? '#fff' : '#000' }
              ]}>
                Page {currentPage} of {book.pageCount}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
            </View>
          ) : (
            <View style={[
              styles.pageSectionPrompt,
              { backgroundColor: isDarkMode ? '#1c1c1e' : '#f8f9fa' }
            ]}>
              <Text style={[
                styles.pageLabel,
                { color: isDarkMode ? '#fff' : '#000' }
              ]}>What page did you reach?</Text>
              <TextInput
                ref={pageInputRef}
                style={[
                  styles.pageInput,
                  {
                    borderColor: isDarkMode ? '#007AFF' : '#007AFF',
                    backgroundColor: isDarkMode ? '#000' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                  }
                ]}
                value={tempPage}
                onChangeText={setTempPage}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleSaveSession}
              />
              <Text style={[
                styles.totalPages,
                { color: isDarkMode ? '#999' : '#666' }
              ]}>of {book.pageCount} pages</Text>
              
              <View style={styles.pageInputButtons}>
                <Pressable 
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowPagePrompt(false);
                    setTempPage(currentPage.toString());
                  }}
                >
                  <Text style={[styles.buttonText, { color: isDarkMode ? '#fff' : '#000' }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveSession}
                >
                  <Text style={styles.buttonText}>Save Progress</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.controls}>
            {!isReading && !isPaused && (
              <Pressable 
                style={[styles.button, styles.startButton]}
                onPress={handleStartReading}
              >
                <Text style={styles.buttonText}>Start Reading</Text>
              </Pressable>
            )}

            {isReading && (
              <>
                <Pressable 
                  style={[styles.button, styles.pauseButton]}
                  onPress={handlePauseReading}
                >
                  <Text style={styles.buttonText}>Pause Reading</Text>
                </Pressable>
                <Pressable 
                  style={[styles.button, styles.stopButton]}
                  onPress={handleStopReading}
                >
                  <Text style={styles.buttonText}>Stop Reading</Text>
                </Pressable>
              </>
            )}

            {isPaused && (
              <>
                <Pressable 
                  style={[styles.button, styles.resumeButton]}
                  onPress={handleResumeReading}
                >
                  <Text style={styles.buttonText}>Resume Reading</Text>
                </Pressable>
                <Pressable 
                  style={[styles.button, styles.stopButton]}
                  onPress={handleStopReading}
                >
                  <Text style={styles.buttonText}>Stop Reading</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 100 : 24,
  },
  bookInfo: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  coverImage: {
    width: 140,
    height: 210,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coverImageSmall: {
    width: 100,
    height: 150,
    marginBottom: 16,
  },
  bookDetails: {
    alignItems: 'center',
    width: '100%',
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  bookAuthor: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  timerLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  timer: {
    fontSize: 56,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  controls: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#fff',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  pauseButton: {
    backgroundColor: '#FF9500',
  },
  resumeButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  pageSectionPrompt: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    padding: 24,
    borderRadius: 16,
  },
  pageLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  pageInput: {
    fontSize: 28,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 120,
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  totalPages: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 16,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 1.5,
    width: '100%',
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  pageInputButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
}); 