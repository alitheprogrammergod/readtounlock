import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BookPlaceholderProps {
  width?: number;
  height?: number;
}

export default function BookPlaceholder({ width = 80, height = 120 }: BookPlaceholderProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Ionicons name="book-outline" size={32} color="#999" />
      <Text style={styles.text}>No Cover</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  text: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
}); 