declare module 'expo-text-recognition' {
  export interface TextRecognitionResult {
    text: string;
    blocks?: Array<{
      text: string;
      frame?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  }

  export function recognizeAsync(imageUri: string): Promise<TextRecognitionResult>;
} 