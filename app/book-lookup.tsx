import { View, Text, StyleSheet, Pressable, Image, TextInput, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

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
  const [isbn, setIsbn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);

  async function handleLookup() {
    if (!isbn.trim()) {
      setError('Please enter an ISBN');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBookDetails(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn.trim()}`
      );
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        setError('No book found with this ISBN');
        return;
      }

      const book = data.items[0].volumeInfo;
      setBookDetails({
        title: book.title,
        authors: book.authors || [],
        description: book.description || 'No description available',
        pageCount: book.pageCount || 0,
        coverUrl: book.imageLinks?.thumbnail || '',
        publisher: book.publisher || 'Unknown publisher',
        publishedDate: book.publishedDate || 'Unknown date',
      });
    } catch (error) {
      console.error('Error fetching book details:', error);
      setError('Failed to fetch book details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Book Lookup</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter ISBN (e.g., 9780307474278)"
            value={isbn}
            onChangeText={setIsbn}
            keyboardType="numeric"
            maxLength={13}
          />
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLookup}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Searching...' : 'Look Up Book'}
            </Text>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching for book...</Text>
          </View>
        )}

        {bookDetails && (
          <View style={styles.bookDetails}>
            {bookDetails.coverUrl ? (
              <Image
                source={{ uri: bookDetails.coverUrl }}
                style={styles.coverImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noCover}>
                <Text style={styles.noCoverText}>No cover available</Text>
              </View>
            )}
            <View style={styles.detailsText}>
              <Text style={styles.bookTitle}>{bookDetails.title}</Text>
              <Text style={styles.authors}>
                By {bookDetails.authors.join(', ') || 'Unknown Author'}
              </Text>
              <Text style={styles.publisher}>
                {bookDetails.publisher} ({bookDetails.publishedDate})
              </Text>
              <Text style={styles.pageCount}>{bookDetails.pageCount} pages</Text>
              <Text style={styles.description} numberOfLines={4}>
                {bookDetails.description}
              </Text>
            </View>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  bookDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },
  coverImage: {
    width: '100%',
    height: 200,
    marginBottom: 15,
  },
  noCover: {
    width: '100%',
    height: 200,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  noCoverText: {
    color: '#666',
    fontSize: 14,
  },
  detailsText: {
    gap: 8,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  authors: {
    fontSize: 16,
    color: '#666',
  },
  publisher: {
    fontSize: 14,
    color: '#666',
  },
  pageCount: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
}); 