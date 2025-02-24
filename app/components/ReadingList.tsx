import { View, Text, StyleSheet, Image, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useReadingList, type Book } from '../../contexts/reading-list';
import BookPlaceholder from './BookPlaceholder';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { router } from 'expo-router';

function BookCard({ book, onRemove }: { book: Book; onRemove: (id: string) => void }) {
  const progress = Math.round((book.progress.currentPage / book.pageCount) * 100);
  
  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Book Options',
      `"${book.title}" by ${book.authors.join(', ')}`,
      [
        {
          text: 'Remove from List',
          onPress: () => {
            Alert.alert(
              'Remove Book',
              'Are you sure you want to remove this book from your reading list?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => onRemove(book.id)
                }
              ]
            );
          },
          style: 'destructive'
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [book, onRemove]);

  const handlePress = useCallback(() => {
    handleLongPress();
  }, [handleLongPress]);
  
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.bookCard,
        pressed && styles.bookCardPressed
      ]}
      onLongPress={handleLongPress}
      onPress={handlePress}
      delayLongPress={500}
    >
      {book.coverUrl ? (
        <Image 
          source={{ uri: book.coverUrl }} 
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <BookPlaceholder />
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.authors} numberOfLines={1}>
          {book.authors.join(', ')}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {book.progress.currentPage} / {book.pageCount} pages
          </Text>
        </View>
        {book.progress.lastReadAt && (
          <Text style={styles.lastRead}>
            Last read: {new Date(book.progress.lastReadAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.iconContainer}>
        <Ionicons name="ellipsis-vertical" size={20} color="#999" />
      </View>
    </Pressable>
  );
}

interface ReadingListProps {
  compact?: boolean;
}

export default function ReadingList({ compact }: ReadingListProps) {
  const { books, removeBook } = useReadingList();

  console.log('ReadingList render - books:', books); // Debug log

  if (!books) {
    return (
      <View style={[styles.emptyContainer, compact && styles.emptyContainerCompact]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={[styles.emptyContainer, compact && styles.emptyContainerCompact]}>
        <Ionicons name="book-outline" size={compact ? 32 : 48} color="#999" style={styles.emptyIcon} />
        <Text style={[styles.emptyText, compact && styles.emptyTextCompact]}>
          No books in your reading list yet
        </Text>
        <Text style={[styles.emptySubtext, compact && styles.emptySubtextCompact]}>
          Scan a book or enter its ISBN to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {books.map(book => (
        <BookCard 
          key={book.id} 
          book={book} 
          onRemove={removeBook}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookCardPressed: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  coverImage: {
    width: 80,
    height: 120,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  authors: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  lastRead: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
  },
  emptyContainerCompact: {
    padding: 16,
    minHeight: 120,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptyTextCompact: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtextCompact: {
    fontSize: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
}); 