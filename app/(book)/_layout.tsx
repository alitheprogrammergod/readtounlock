import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="lookup" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="scan" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="read" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 