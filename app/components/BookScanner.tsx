import { StyleSheet, View } from 'react-native';
import { Camera } from 'expo-camera';
import { useEffect, useRef } from 'react';

interface BookScannerProps {
  onCameraReady?: () => void;
  style?: any;
}

type CameraInstance = any;

export default function BookScanner({ onCameraReady, style }: BookScannerProps) {
  const cameraRef = useRef<CameraInstance>(null);

  useEffect(() => {
    // Any camera setup logic can go here
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type="back"
        onCameraReady={onCameraReady}
        ratio="16:9"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  camera: {
    flex: 1,
  },
}); 