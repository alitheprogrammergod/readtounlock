import { View, Text, StyleSheet, Pressable, Image, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useReadingList } from '../../contexts/reading-list';
import { appManager } from '../../services/app-manager';
import { Ionicons } from '@expo/vector-icons';
import BookPlaceholder from '../components/BookPlaceholder';
import AsyncStorage from '@react-native-async-storage/async-storage';

const READING_SESSION_KEY = '@reading_session';

interface ReadingSession {
  bookId: string;
  startTime: string;
  elapsedTime: number;
}

export default function ReadScreen() {
  const { id } = useLocalSearchParams();
  const { books, updateProgress } = useReadingList();
  const book = books.find(b => b.id === id);
  
  const [isReading, setIsReading] = useState(false);
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
  }, [isReading, elapsedTime]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isReading) {
      interval = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Update reading progress every minute
          if (newTime % 60 === 0) {
            appManager.addReadingTime(1);
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReading]);

  const loadSession = async () => {
    try {
      const sessionJson = await AsyncStorage.getItem(READING_SESSION_KEY);
      if (sessionJson) {
        const session: ReadingSession = JSON.parse(sessionJson);
        if (session.bookId === id) {
          setElapsedTime(session.elapsedTime);
          setStartTime(new Date(session.startTime));
          setIsReading(true);
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
      };
      await AsyncStorage.setItem(READING_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving reading session:', error);
    }
  };

  const handleStartReading = useCallback(() => {
    setStartTime(new Date());
    setIsReading(true);
  }, []);

  const handleStopReading = useCallback(async () => {
    if (!book) return;
    setIsReading(false);
    setShowPagePrompt(true);
    setTempPage(currentPage.toString());
    
    // Clear the saved session
    await AsyncStorage.removeItem(READING_SESSION_KEY);
    
    // Scroll to the input after a short delay to ensure layout is complete
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      pageInputRef.current?.focus();
    }, 100);
  }, [book, currentPage]);

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

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Book not found</Text>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Reading Session</Text>
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
          <View style={styles.bookInfo}>
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
              <Text style={[styles.bookTitle, showPagePrompt && styles.bookTitleSmall]}>
                {book.title}
              </Text>
              {!showPagePrompt && (
                <Text style={styles.authors}>{book.authors.join(', ')}</Text>
              )}
            </View>
          </View>

          <View style={[styles.timerSection, showPagePrompt && styles.timerSectionSmall]}>
            <Text style={[styles.timerText, showPagePrompt && styles.timerTextSmall]}>
              {formatTime(elapsedTime)}
            </Text>
            <Text style={styles.timerLabel}>Time Reading</Text>
          </View>

          {!showPagePrompt ? (
            <View style={styles.pageSection}>
              <Text style={styles.pageLabel}>Starting Page</Text>
              <Text style={styles.pageNumber}>{currentPage}</Text>
              <Text style={styles.totalPages}>of {book.pageCount} pages</Text>
            </View>
          ) : (
            <View style={styles.pageSectionPrompt}>
              <Text style={styles.pageLabel}>What page did you reach?</Text>
              <TextInput
                ref={pageInputRef}
                style={styles.pageInput}
                value={tempPage}
                onChangeText={setTempPage}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleSaveSession}
              />
              <Text style={styles.totalPages}>of {book.pageCount} pages</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.button, 
              showPagePrompt ? styles.saveButton : (isReading ? styles.stopButton : styles.startButton)
            ]}
            onPress={showPagePrompt ? handleSaveSession : (isReading ? handleStopReading : handleStartReading)}
          >
            <Text style={styles.buttonText}>
              {showPagePrompt ? 'Save Session' : (isReading ? 'Stop Reading' : 'Start Reading')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 10,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 100 : 20,
  },
  bookInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 15,
  },
  coverImageSmall: {
    width: 80,
    height: 120,
    marginBottom: 10,
  },
  bookDetails: {
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  bookTitleSmall: {
    fontSize: 16,
    marginBottom: 0,
  },
  authors: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerSectionSmall: {
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerTextSmall: {
    fontSize: 36,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  pageSection: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  pageSectionPrompt: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
  },
  pageLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  pageNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pageInput: {
    fontSize: 24,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
    textAlign: 'center',
  },
  totalPages: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 