import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingList } from '../../contexts/reading-list';
import { Ionicons } from '@expo/vector-icons';
import BookPlaceholder from '../components/BookPlaceholder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useReadingRewards } from '../../contexts/reading-rewards';
import { dayKeyAt } from '../../services/reading-unlock-engine';
import { useTheme } from '../../contexts/theme';

const READING_SESSION_KEY = '@reading_session_v2';
interface ReadingSession {
  bookId: string;
  sessionId: string;
  sessionDay: string;
  elapsedTime: number;
  isPaused: boolean;
}

export default function ReadScreen() {
  const { id } = useLocalSearchParams();
  const { books, updateProgress } = useReadingList();
  const { recordReading } = useReadingRewards();
  const { isDarkMode } = useTheme();
  const book = books.find(b => b.id === id);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savingRef = useRef(false);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(book?.progress.currentPage || 0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionDay, setSessionDay] = useState<string | null>(null);
  const [showPagePrompt, setShowPagePrompt] = useState(false);
  const [tempPage, setTempPage] = useState('');
  const pageInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Restore a previous, paused session. Never count wall time spent outside the app.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const json = await AsyncStorage.getItem(READING_SESSION_KEY);
        if (!json) return;
        const saved: ReadingSession = JSON.parse(json);
        if (active && saved.bookId === id && saved.sessionId && Number.isSafeInteger(saved.elapsedTime)) {
          setSessionId(saved.sessionId);
          setSessionDay(saved.sessionDay);
          setElapsedTime(Math.max(0, saved.elapsedTime));
          setIsReading(false);
          setIsPaused(true);
        }
      } catch(e) { console.warn('Could not restore reading session', e); }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const persist = useCallback(async (seconds: number, paused: boolean) => {
    if (!sessionId || !sessionDay) return;
    const saved: ReadingSession = {bookId: String(id), sessionId, sessionDay,
      elapsedTime: seconds, isPaused: paused};
    await AsyncStorage.setItem(READING_SESSION_KEY, JSON.stringify(saved));
  }, [id, sessionId, sessionDay]);

  useEffect(() => {
    // Save a checkpoint every five seconds, including when paused.
    if (sessionId && (elapsedTime % 5 === 0 || isPaused)) {
      persist(elapsedTime, isPaused).catch(console.warn);
    }
  }, [elapsedTime, isPaused, sessionId, persist]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (isReading && !isPaused && !showPagePrompt) {
      intervalRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isReading, isPaused, showPagePrompt]);

  const handleStartReading = useCallback(() => {
    const now = new Date();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSessionId(`${now.getTime()}-${Math.random().toString(36).slice(2)}`);
    setSessionDay(dayKeyAt(now));
    setElapsedTime(0);
    setIsReading(true);
    setIsPaused(false);
  }, []);

  const handlePauseReading = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(true);
    try { await persist(elapsedTime, true); }
    catch(e) { console.warn('Could not save paused session', e); }
  }, [elapsedTime, persist]);

  const handleResumeReading = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsReading(true);
    setIsPaused(false);
  }, []);

  const handleStopReading = useCallback(async () => {
    if (!book) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsReading(false);
    setIsPaused(true);
    setShowPagePrompt(true);
    setTempPage(currentPage.toString());
    try { await persist(elapsedTime, true); }
    catch(e) { console.warn('Could not save stopped session', e); }
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      pageInputRef.current?.focus();
    }, 100);
  }, [book, currentPage, elapsedTime, persist]);

  const handleSaveSession = useCallback(async () => {
    if (!book || !sessionId || !sessionDay || savingRef.current) return;
    const finalPage = Number(tempPage);
    if (!Number.isSafeInteger(finalPage) ||
        finalPage < book.progress.currentPage || finalPage > book.pageCount) {
      Alert.alert('Check the page number', `Enter a page from ${book.progress.currentPage} to ${book.pageCount}.`);
      return;
    }
    if (dayKeyAt(new Date()) !== sessionDay) {
      Alert.alert('Session crossed midnight', 'Finish and save your reading on the same day to receive today's credit.');
      return;
    }
    savingRef.current = true;
    try {
      // The V2 engine deduplicates cumulative reading credit using sessionId.
      await recordReading(sessionId, sessionDay, elapsedTime);
      await updateProgress(book.id, finalPage, Math.floor(elapsedTime / 60), sessionId);
      await AsyncStorage.removeItem(READING_SESSION_KEY);
      Alert.alert('Reading saved', `You read for ${Math.floor(elapsedTime / 60)} minutes and reached page ${finalPage}.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Save failed', 'Your session is still saved. Please try again.');
    } finally { savingRef.current = false; }
  }, [book, sessionId, sessionDay, tempPage, elapsedTime, recordReading, updateProgress]);

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

            {isReading && !isPaused && (
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