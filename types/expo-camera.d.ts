declare module 'expo-camera' {
  import { ViewProps } from 'react-native';
  import React from 'react';
  
  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
    canAskAgain?: boolean;
  }

  export interface BarCodeScannerSettings {
    barcodeTypes?: string[];
    interval?: number;  // Scanning interval in milliseconds
  }

  export interface BarCodeScannerResult {
    type: string;
    data: string;
  }

  export interface CameraViewProps extends ViewProps {
    facing?: 'front' | 'back';
    onMountError?: (error: Error) => void;
    onBarcodeScanned?: (result: BarCodeScannerResult) => void;
    barcodeScannerSettings?: BarCodeScannerSettings;
  }

  export interface PhotoOptions {
    quality?: number;
    base64?: boolean;
    exif?: boolean;
  }

  export interface Photo {
    uri: string;
    width: number;
    height: number;
    base64?: string;
    exif?: any;
  }

  export class CameraView extends React.Component<CameraViewProps> {
    takePictureAsync(options?: PhotoOptions): Promise<Photo>;
  }
  
  export function useCameraPermissions(): [
    PermissionResponse | null,
    () => Promise<PermissionResponse>
  ];

  export interface CameraProps extends ViewProps {
    type?: 'front' | 'back';
    ratio?: string;
    onCameraReady?: () => void;
    useCamera2Api?: boolean;
    ref?: React.RefObject<any>;
  }

  export class Camera extends React.Component<CameraProps> {
    static Constants: {
      Type: {
        front: 'front';
        back: 'back';
      };
    };

    static requestCameraPermissionsAsync(): Promise<PermissionResponse>;
    static getCameraPermissionsAsync(): Promise<PermissionResponse>;

    takePictureAsync(options?: PhotoOptions): Promise<Photo>;
  }

  export { Camera };
} 