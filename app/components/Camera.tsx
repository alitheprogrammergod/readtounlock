import React from 'react';
import { CameraView } from 'expo-camera';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface CameraProps {
  style?: StyleProp<ViewStyle>;
  type?: 'front' | 'back';
}

const Camera = React.forwardRef<React.ElementRef<typeof CameraView>, CameraProps>(({type='back',style}, ref) =>
  <CameraView facing={type} ref={ref} style={[styles.camera, style]} />
);

const styles = StyleSheet.create({ camera: { flex: 1 } });
export { Camera };
