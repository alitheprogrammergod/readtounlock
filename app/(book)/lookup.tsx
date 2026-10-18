import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useReadingList } from '../../contexts/reading-list';
import { useTheme } from '../../contexts/theme';

interface BookDetails {
  title: string;
  authors: string[];
  description: string;
  pageCount: number;
  coverUrl: string;
  publisher: string;
  publishedDate: string;
}

export default function BookLookupScreen() {
  const { addBook, isInReadingList } = useReadingList();
  const [isbn, setIsbn] = useState('');
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPageCountModal, setShowPageCountModal] = useState(false);
  const [manualPageCount, setManualPageCount] = useState('');
  const { isDarkMode } = useTheme();

  async function handleLookup() {
    if (!isbn) {
      Alert.alert('Error', 'Please enter an ISBN');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('No book found with this ISBN');
      }

      const book = data.items[0].volumeInfo;
      const details = {
        title: book.title,
        authors: book.authors || [],
        description: book.description || 'No description available',
        pageCount: book.pageCount || 0,
        coverUrl: book.imageLinks?.thumbnail || '',
        publisher: book.publisher || 'Unknown publisher',
        publishedDate: book.publishedDate || 'Unknown date',
      };

      setBookDetails(details);
      
      // Show page count modal if pageCount is 0
      if (details.pageCount === 0) {
        setShowPageCountModal(true);
      }

    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to look up book');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddToReadingList() {
    if (!bookDetails) return;

    try {
      const finalPageCount = bookDetails.pageCount === 0 ? parseInt(manualPageCount) || 0 : bookDetails.pageCount;
      
      await addBook({
        isbn,
        title: bookDetails.title,
        authors: bookDetails.authors,
        description: bookDetails.description,
        pageCount: finalPageCount,
        coverUrl: bookDetails.coverUrl,
        publisher: bookDetails.publisher,
        publishedDate: bookDetails.publishedDate,
      });

      Alert.alert(
        'Success',
        'Book added to your reading list!',
        [
          {
            text: 'View Reading List',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
          {
            text: 'Add Another',
            onPress: () => {
              setBookDetails(null);
              setIsbn('');
              setManualPageCount('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add book to reading list');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDarkMode ? '#000' : '#fff',
              color: isDarkMode ? '#fff' : '#000',
              borderColor: isDarkMode ? '#333' : '#ddd'
            }
          ]}
          placeholder="Enter ISBN"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={isbn}
          onChangeText={setIsbn}
          keyboardType="numeric"
          autoFocus
        />
        <Pressable
          style={[styles.button, styles.lookupButton]}
          onPress={handleLookup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Looking up...' : 'Look up Book'}
          </Text>
        </Pressable>
      </View>

      {bookDetails && (
        <View style={styles.bookDetails}>
          <Text style={[
            styles.bookTitle,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            {bookDetails.title}
          </Text>
          <Text style={[
            styles.authors,
            { color: isDarkMode ? '#ccc' : '#666' }
          ]}>
            By {bookDetails.authors.join(', ') || 'Unknown Author'}
          </Text>
          <Text style={[
            styles.publisher,
            { color: isDarkMode ? '#ccc' : '#666' }
          ]}>
            {bookDetails.publisher} ({bookDetails.publishedDate})
          </Text>
          <Text style={[
            styles.pageCount,
            { color: isDarkMode ? '#ccc' : '#666' }
          ]}>
            {bookDetails.pageCount === 0 ? 'Page count not available' : `${bookDetails.pageCount} pages`}
            {bookDetails.pageCount === 0 && (
              <Text style={styles.pageCountNote}> (you'll be asked to enter it manually)</Text>
            )}
          </Text>
          <Text style={[
            styles.description,
            { color: isDarkMode ? '#ccc' : '#666' }
          ]}>
            {bookDetails.description}
          </Text>

          {isInReadingList(isbn) ? (
            <View style={styles.alreadyAddedContainer}>
              <Text style={[
                styles.alreadyAddedText,
                { color: isDarkMode ? '#ccc' : '#666' }
              ]}>
                This book is already in your reading list
              </Text>
              <Pressable
                style={[styles.button, styles.viewListButton]}
                onPress={() => router.replace('/(tabs)/dashboard')}
              >
                <Text style={styles.buttonText}>View Reading List</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={handleAddToReadingList}
            >
              <Text style={styles.buttonText}>Add to Reading List</Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal
        visible={showPageCountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPageCountModal(false)}
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
            ]}>Enter Page Count</Text>
            <Text style={[
              styles.modalSubtitle,
              { color: isDarkMode ? '#999' : '#666' }
            ]}>
              The page count wasn't available. Please enter it manually:
            </Text>
            <TextInput
              style={[
                styles.pageInput,
                { 
                  borderColor: isDarkMode ? '#333' : '#ddd',
                  backgroundColor: isDarkMode ? '#000' : '#fff',
                  color: isDarkMode ? '#fff' : '#000'
                }
              ]}
              keyboardType="numeric"
              value={manualPageCount}
              onChangeText={setManualPageCount}
              placeholder="Enter number of pages"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowPageCountModal(false)}
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
                onPress={() => {
                  const pages = parseInt(manualPageCount);
                  if (pages > 0) {
                    setBookDetails(prev => prev ? {
                      ...prev,
                      pageCount: pages
                    } : null);
                    setShowPageCountModal(false);
                  } else {
                    Alert.alert('Invalid Input', 'Please enter a valid number of pages.');
                  }
                }}
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
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  lookupButton: {
    backgroundColor: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#34C759',
    marginTop: 16,
  },
  viewListButton: {
    backgroundColor: '#007AFF',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bookDetails: {
    marginTop: 16,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  authors: {
    fontSize: 16,
    marginBottom: 4,
  },
  publisher: {
    fontSize: 14,
    marginBottom: 4,
  },
  pageCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  alreadyAddedContainer: {
    marginTop: 16,
  },
  alreadyAddedText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  pageInput: {
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
  pageCountNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
}); 