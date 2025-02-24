import React, { useState, useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useReadingList } from '../../contexts/reading-list';

type ScanMode = 'photo' | 'barcode';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// Valid ISBN formats
const ISBN_REGEX = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

interface BookDetails {
  title: string;
  authors: string[];
  description: string;
  pageCount: number;
  coverUrl: string;
  publisher: string;
  publishedDate: string;
}

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo: {
      title: string;
      authors?: string[];
      description?: string;
      pageCount?: number;
      imageLinks?: {
        thumbnail?: string;
      };
      publisher?: string;
      publishedDate?: string;
    };
  }>;
}

export default function ScanScreen() {
  const { addBook, isInReadingList } = useReadingList();
  const [type, setType] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('photo');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);

  useEffect(() => {
    requestPermission();
    setIsScanning(false);
    setScannedData(null);
    setScanAttempts(0);

    // Cleanup timeouts on unmount
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsScanning(false);
    setScannedData(null);
    setScanAttempts(0);
  }, [scanMode]);

  const handleBarCodeScanned = async ({ type, data: scannedCode }: { type: string; data: string }) => {
    if (isScanning) {
      console.log('Already scanning, ignoring barcode');
      return;
    }

    try {
      setIsScanning(true);
      console.log('Starting barcode scan process');

      const cleanedData: string = scannedCode.replace(/[^0-9X]/g, '');

      if (!ISBN_REGEX.test(cleanedData)) {
        console.log('Invalid ISBN format:', cleanedData);
        setScanAttempts(prev => prev + 1);
        if (scanAttempts > 5) {
          alert('Having trouble scanning? Make sure the barcode is clear and well-lit.');
          setScanAttempts(0);
        }
        setIsScanning(false);
        return;
      }

      setScannedData(cleanedData);
      console.log('Valid ISBN found:', cleanedData);

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanedData}`
      );
      const bookData: GoogleBooksResponse = await response.json();

      if (!bookData.items || bookData.items.length === 0) {
        throw new Error('No book found with this ISBN');
      }

      const book = bookData.items[0].volumeInfo;
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
      console.error('Error processing barcode:', error);
      alert(error instanceof Error ? error.message : 'Failed to process barcode. Please try again.');
      setIsScanning(false);
      setScannedData(null);
    }
  };

  // Update the CameraView props to properly handle scanning state
  const handleBarcodeScanned = scanMode === 'barcode' ? handleBarCodeScanned : undefined;

  async function handleAddToReadingList() {
    if (!bookDetails) return;

    try {
      await addBook({
        isbn: scannedData || '',
        title: bookDetails.title,
        authors: bookDetails.authors,
        description: bookDetails.description,
        pageCount: bookDetails.pageCount,
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
            text: 'Scan Another',
            onPress: () => {
              setBookDetails(null);
              setIsScanning(false);
              setScannedData(null);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add book to reading list. Please try again.');
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.permissionText}>We need your permission to show the camera</Text>
          <Pressable 
            style={styles.button}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
          <Pressable 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>
          {bookDetails ? 'Book Details' : (scanMode === 'photo' ? 'Take Book Photo' : 'Scan Book Barcode')}
        </Text>
        {bookDetails && (
          <Pressable 
            onPress={() => {
              setBookDetails(null);
              setIsScanning(false);
              setScannedData(null);
            }} 
            style={styles.resetButton}
          >
            <Text style={styles.backText}>Scan Again</Text>
          </Pressable>
        )}
      </View>

      {bookDetails ? (
        <ScrollView style={styles.bookDetailsContainer}>
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
              <Text style={styles.description}>{bookDetails.description}</Text>
            </View>
            {scannedData && isInReadingList(scannedData) ? (
              <View style={styles.alreadyAddedContainer}>
                <Text style={styles.alreadyAddedText}>
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
            <Pressable
              style={[styles.button, styles.scanAgainButton]}
              onPress={() => {
                setBookDetails(null);
                setIsScanning(false);
                setScannedData(null);
              }}
            >
              <Text style={styles.buttonText}>Scan Another Book</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.cameraContainer}>
            <CameraView 
              ref={cameraRef}
              style={styles.camera} 
              facing={type}
              onMountError={(error: Error) => {
                console.error("Camera mount error:", error);
              }}
              onBarcodeScanned={!isScanning ? handleBarcodeScanned : undefined}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "isbn13", "isbn10"],
              }}
            >
              {scanMode === 'barcode' && (
                <View style={styles.overlay}>
                  <View style={styles.scanArea}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                    {isScanning && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4ae24a" />
                        {scannedData && (
                          <Text style={styles.successText}>ISBN Found!</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.scanText}>
                    {isScanning 
                      ? (scannedData ? 'ISBN Found!' : 'Processing ISBN...') 
                      : 'Align ISBN barcode within frame'}
                  </Text>
                  <Text style={styles.scanSubText}>
                    {isScanning 
                      ? (scannedData ? 'Loading book details...' : 'Please wait...') 
                      : 'Usually found on the back cover'}
                  </Text>
                  {scanAttempts > 2 && !isScanning && (
                    <Text style={styles.helpText}>
                      Tip: Make sure the barcode is well-lit and not blurry
                    </Text>
                  )}
                </View>
              )}
              {scanMode === 'photo' && (
                <View style={styles.instructions}>
                  <Text style={styles.instructionsText}>
                    Take a clear photo of your book
                  </Text>
                </View>
              )}
            </CameraView>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.modeButton]}
              onPress={() => setScanMode(mode => mode === 'photo' ? 'barcode' : 'photo')}
            >
              <Text style={styles.buttonText}>
                Switch to {scanMode === 'photo' ? 'Barcode' : 'Photo'}
              </Text>
            </Pressable>
            {scanMode === 'photo' && (
              <>
                <Pressable
                  style={styles.button}
                  onPress={() => setType(type === 'back' ? 'front' : 'back')}
                >
                  <Text style={styles.buttonText}>Flip Camera</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.captureButton]}
                  onPress={async () => {
                    if (cameraRef.current) {
                      const photo = await cameraRef.current.takePictureAsync({
                        quality: 0.8,
                      });
                      setPhoto(photo.uri);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Take Photo</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  backButton: {
    marginRight: 10,
  },
  backText: {
    fontSize: 16,
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4ae24a',
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4ae24a',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4ae24a',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4ae24a',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#000',
    gap: 10,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  modeButton: {
    backgroundColor: '#9c27b0',
  },
  captureButton: {
    backgroundColor: '#e24a4a',
  },
  retakeButton: {
    backgroundColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#4ae24a',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  instructionsText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanSubText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  successText: {
    color: '#4ae24a',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  helpText: {
    color: '#ffd700',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  bookDetailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bookDetails: {
    padding: 20,
  },
  coverImage: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  noCover: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noCoverText: {
    color: '#666',
    fontSize: 16,
  },
  detailsText: {
    gap: 10,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  authors: {
    fontSize: 18,
    color: '#666',
  },
  publisher: {
    fontSize: 16,
    color: '#666',
  },
  pageCount: {
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 20,
  },
  resetButton: {
    marginLeft: 'auto',
  },
  alreadyAddedContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  alreadyAddedText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  viewListButton: {
    backgroundColor: '#4a90e2',
  },
  scanAgainButton: {
    backgroundColor: '#666',
    marginTop: 10,
  },
}); 