import { Camera as ExpoCamera } from 'expo-camera';
import React from 'react';
import { StyleSheet } from 'react-native';

interface CameraProps {
  style?: any;
  type?: 'front' | 'back';
  ref?: React.RefObject<any>;
}

const Camera = React.forwardRef<any, CameraProps>((props, ref) => {
  return (
    <ExpoCamera
      {...props}
      ref={ref}
      style={[styles.camera, props.style]}
    />
  );
});

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
});

export { Camera }; 