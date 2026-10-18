import React from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, Switch, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/theme';
import { useReadingRewards } from '../contexts/reading-rewards';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { goalMinutes, status } = useReadingRewards();
  const shareProgress = async () => {
    try {
      const minutes = Math.floor(status.readingSeconds / 60);
      await Share.share({ message: `I'm building a reading habit with Read to Unlock! Today I've read ${minutes} minutes toward my ${goalMinutes}-minute goal. 📚` });
    } catch (e) { Alert.alert('Sharing unavailable', 'Please try again later.'); }
  };
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.link}>‹ Back</Text></Pressable>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.panel}>
        <Text style={styles.section}>Reading</Text>
        <Link href="/(tabs)/app-lock" style={styles.link}>Reading goal: {goalMinutes} minutes · Change goal</Link>
        <Text style={styles.muted}>Today: {Math.floor(status.readingSeconds / 60)} minutes recorded</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.section}>Appearance</Text>
        <View style={styles.row}><Text style={styles.label}>Dark mode</Text>
          <Switch accessibilityLabel="Dark mode" value={isDarkMode} onValueChange={toggleTheme} /></View>
      </View>
      <View style={styles.panel}>
        <Text style={styles.section}>Sharing</Text>
        <Pressable onPress={shareProgress}><Text style={styles.link}>Share my reading progress</Text></Pressable>
        <Text style={styles.muted}>Friend invitations and download links will be added when we launch. This currently shares only your reading progress.</Text>
      </View>
      <Text style={styles.muted}>Read to Unlock V2 · Early development build</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:22,gap:18,paddingBottom:48},
  title:{fontSize:29,fontWeight:'800',color:'#192C46'},
  panel:{padding:18,borderRadius:16,backgroundColor:'#fff',gap:15},
  section:{fontSize:19,fontWeight:'700',color:'#192C46'},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  label:{fontSize:16,color:'#283B56'},muted:{color:'#708097',fontSize:13,lineHeight:20},
  link:{color:'#2C62C9',fontWeight:'700',fontSize:15}
});
