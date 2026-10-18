import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useReadingRewards } from '../contexts/reading-rewards';

export default function EntryScreen() {
  const { ready, onboarded, error } = useReadingRewards();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  if (error) return <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}><Text>{error}</Text></View>;
  return <Redirect href={onboarded ? '/(tabs)/dashboard' : '/onboarding'} />;
}
