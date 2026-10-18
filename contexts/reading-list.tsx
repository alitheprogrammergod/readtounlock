import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyBookSession } from '../services/book-progress';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  authors: string[];
  description: string;
  pageCount: number;
  coverUrl: string;
  publisher: string;
  publishedDate: string;
  progress: {
    currentPage: number;
    lastReadAt: string | null;
    totalTimeRead: number; // in minutes
  };
}

interface ReadingListContextType {
  books: Book[];
  addBook: (book: Omit<Book, 'id' | 'progress'>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  updateProgress: (id: string, currentPage: number, timeRead: number) => Promise<void>;
  isInReadingList: (isbn: string) => boolean;
}

const ReadingListContext = createContext<ReadingListContextType | undefined>(undefined);

const STORAGE_KEY = '@reading_list';

export function ReadingListProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load books when the provider mounts
  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      console.log('Loading books from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedBooks = JSON.parse(stored);
        console.log('Loaded books:', parsedBooks);
        setBooks(parsedBooks);
      } else {
        console.log('No books found in storage');
        setBooks([]);
      }
    } catch (error) {
      console.error('Error loading reading list:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveBooks(newBooks: Book[]) {
    try {
      console.log('Saving books:', newBooks);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBooks));
      setBooks(newBooks);
      console.log('Books saved successfully');
    } catch (error) {
      console.error('Error saving reading list:', error);
      throw error; // Propagate error to handle it in the UI
    }
  }

  async function addBook(bookData: Omit<Book, 'id' | 'progress'>) {
    console.log('Adding book:', bookData);
    const newBook: Book = {
      ...bookData,
      id: Date.now().toString(),
      progress: {
        currentPage: 0,
        lastReadAt: null,
        totalTimeRead: 0,
      },
    };

    const newBooks = [...books, newBook];
    await saveBooks(newBooks);
  }

  async function removeBook(id: string) {
    console.log('Removing book:', id);
    const newBooks = books.filter(book => book.id !== id);
    await saveBooks(newBooks);
  }

  async function updateProgress(id: string, currentPage: number, timeRead: number, sessionId?: string) {
    const newBooks = books.map(book => book.id === id
      ? { ...book, progress: applyBookSession(book.progress, book.pageCount, currentPage, timeRead, sessionId) }
      : book
    );
    await saveBooks(newBooks);
  }

  function isInReadingList(isbn: string) {
    return books.some(book => book.isbn === isbn);
  }

  if (isLoading) {
    return null; // Or return a loading spinner
  }

  return (
    <ReadingListContext.Provider
      value={{
        books,
        addBook,
        removeBook,
        updateProgress,
        isInReadingList,
      }}
    >
      {children}
    </ReadingListContext.Provider>
  );
}

export function useReadingList() {
  const context = useContext(ReadingListContext);
  if (context === undefined) {
    throw new Error('useReadingList must be used within a ReadingListProvider');
  }
  return context;
} 