import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type Photo } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';

export default function ScanScreen() {
  const [type, setType] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestPermission();
  }, []);

  async function handleCapture() {
    if (!cameraRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setPhoto(null);

      // Capture the image
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      
      setPhoto(photo);
      console.log('Photo captured:', photo.uri);
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsScanning(false);
    }
  }

  if (!permission) {
    // Camera permissions are still loading
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
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

  function toggleCameraType() {
    setType(current => (
      current === 'back' ? 'front' : 'back'
    ));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Scan Book</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.cameraContainer}>
          {photo ? (
            <Image 
              source={{ uri: photo.uri }} 
              style={styles.camera}
              resizeMode="contain"
            />
          ) : (
            <CameraView 
              ref={cameraRef}
              style={styles.camera} 
              facing={type}
              onMountError={(error: Error) => {
                console.error("Camera mount error:", error);
              }}
            >
              <View style={styles.cameraControls}>
                <Pressable style={styles.flipButton} onPress={toggleCameraType}>
                  <Text style={styles.flipText}>Flip Camera</Text>
                </Pressable>
              </View>
            </CameraView>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable 
            style={[styles.button, isScanning && styles.buttonDisabled]} 
            onPress={photo ? () => setPhoto(null) : handleCapture}
            disabled={isScanning}
          >
            <Text style={styles.buttonText}>
              {isScanning ? 'Processing...' : photo ? 'Retake Photo' : 'Capture Page'}
            </Text>
          </Pressable>
          {photo && (
            <Pressable 
              style={[styles.button, styles.confirmButton]} 
              onPress={() => {
                // TODO: Implement text recognition
                console.log('Processing photo:', photo.uri);
              }}
            >
              <Text style={styles.buttonText}>Process Text</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to scan:</Text>
          <Text style={styles.instructionText}>
            1. Point camera at a book page{'\n'}
            2. Ensure good lighting{'\n'}
            3. Hold steady and tap 'Capture Page'{'\n'}
            4. Review the photo and process text
          </Text>
        </View>
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
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 20,
  },
  flipButton: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 15,
    borderRadius: 8,
  },
  flipText: {
    fontSize: 16,
    color: 'white',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  instructions: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
}); 