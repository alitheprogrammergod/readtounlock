import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { useReadingList } from '../../contexts/reading-list';
import { useReadingRewards } from '../../contexts/reading-rewards';
import ReadingList from '../components/ReadingList';

export default function DashboardScreen() {
  const { books } = useReadingList();
  const { status, goalMinutes, selectedApps, blockerAvailable, refresh } = useReadingRewards();
  useFocusEffect(useCallback(() => { refresh().catch(console.warn); }, [refresh]));
  const minutesRead = Math.floor(status.readingSeconds / 60);
  const remaining = Math.ceil(status.secondsRemaining / 60);
  const progress = Math.min(100, Math.floor((status.readingSeconds / (goalMinutes * 60)) * 100));

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View><Text style={styles.kicker}>READ TO UNLOCK</Text><Text style={styles.title}>Your reading today</Text></View>
        <Link href="/settings" style={styles.link}>Settings</Link>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroCaption}>{status.unlocked ? 'Daily goal complete 🎉' : 'Today’s progress'}</Text>
        <Text style={styles.heroNumber}>{minutesRead} <Text style={styles.unit}>/ {goalMinutes} min</Text></Text>
        <View style={styles.track}><View style={[styles.fill, {width: `${progress}%`}]} /></View>
        <Text style={styles.heroDetail}>{status.unlocked
          ? 'Nice work. Your reading goal is complete.'
          : `${remaining} more minute${remaining === 1 ? '' : 's'} to finish your goal.`}</Text>
        <Text style={styles.disclaimer}>{blockerAvailable
          ? 'Native shield requests connected. Verify on an iPhone; background re-locking is not yet implemented.'
          : 'Reading tracking is active. iPhone app blocking needs Screen Time setup and device verification.'}</Text>
      </View>

      <Link href="/(book)/scan" asChild><Pressable style={styles.cta}><Text style={styles.ctaText}>+ Scan a book</Text></Pressable></Link>
      <Link href="/(book)/lookup" asChild><Pressable style={styles.outline}><Text style={styles.outlineText}>Enter a book ISBN</Text></Pressable></Link>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>My books</Text><Text style={styles.muted}>{books.length} saved</Text></View>
        <ReadingList compact />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Distraction list</Text><Link href="/(tabs)/app-lock" style={styles.link}>Edit</Link></View>
        <Text style={styles.muted}>{selectedApps.length
          ? selectedApps.join(', ')
          : 'None selected yet. Choose the apps you want to cut back on.'}</Text>
        {!blockerAvailable && <Text style={styles.notice}>Choose apps using Apple Screen Time in Focus settings. Preferences alone do not restrict apps.</Text>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:16,paddingBottom:50},
  heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginVertical:12},
  kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:'#5270B6'},
  title:{fontSize:25,fontWeight:'800',color:'#14253D',marginTop:6},
  link:{fontSize:14,color:'#2E63CE',fontWeight:'700'},
  hero:{backgroundColor:'#1F4085',padding:24,borderRadius:22,gap:13},
  heroCaption:{color:'#D8E5FF',fontWeight:'600',fontSize:15},heroNumber:{color:'#fff',fontSize:40,fontWeight:'800'},
  unit:{fontSize:18,fontWeight:'500',color:'#D8E5FF'},
  track:{height:10,backgroundColor:'#5470A9',borderRadius:9,overflow:'hidden'},
  fill:{backgroundColor:'#87DFAF',height:'100%',borderRadius:9},
  heroDetail:{color:'#fff',fontSize:15,fontWeight:'600'},
  disclaimer:{color:'#D8E5FF',fontSize:12,lineHeight:17},
  cta:{backgroundColor:'#2862C9',padding:16,borderRadius:13,alignItems:'center'},
  ctaText:{color:'#fff',fontWeight:'800',fontSize:16},
  outline:{borderWidth:1,borderColor:'#2862C9',padding:15,borderRadius:13,alignItems:'center'},
  outlineText:{color:'#2862C9',fontWeight:'700'},
  section:{backgroundColor:'#fff',padding:17,borderRadius:17,gap:12,minHeight:60},
  sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  sectionTitle:{fontSize:19,fontWeight:'800',color:'#14253D'},
  muted:{color:'#66768B',lineHeight:21,fontSize:14},
  notice:{color:'#805F2F',backgroundColor:'#FFF6E8',padding:12,borderRadius:10,lineHeight:19,fontSize:13},
});
