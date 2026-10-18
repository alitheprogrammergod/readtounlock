import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useReadingRewards } from '../../contexts/reading-rewards';
import { iosScreenTime } from '../../services/ios-screen-time';

const WISHLIST = ['Instagram', 'YouTube', 'TikTok', 'Snapchat', 'Facebook', 'X'];
const GOALS = [5, 10, 15, 20, 30, 45, 60];

export default function DistractionsScreen() {
  const { status, goalMinutes, selectedApps, blockerAvailable, screenTimeStatus,
    setGoalMinutes, setSelectedApps, requestIosPermission, pickIosApps, disableIosBlocking, refresh } = useReadingRewards();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { refresh().catch(console.warn); }, [refresh]));

  async function run(action: () => Promise<void>) {
    if (saving) return;
    setSaving(true); setError(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setSaving(false); }
  }
  const totalPicked = (screenTimeStatus?.appCount ?? 0) +
    (screenTimeStatus?.categoryCount ?? 0) + (screenTimeStatus?.domainCount ?? 0);
  const isIos = Platform.OS === 'ios';
  const nativeInstalled = iosScreenTime.isInstalled();

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Focus settings</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Your daily reading goal</Text>
        <Text style={styles.description}>Today: {Math.floor(status.readingSeconds / 60)} of {goalMinutes} minutes</Text>
        <View style={styles.wrap}>{GOALS.map(m => <Pressable key={m}
          disabled={saving} onPress={() => run(() => setGoalMinutes(m))}
          style={[styles.chip, goalMinutes === m && styles.selected]}>
          <Text style={[styles.chipText,goalMinutes === m && styles.selectedText]}>{m} min</Text>
        </Pressable>)}</View>
      </View>

      {isIos && nativeInstalled ? <View style={styles.panel}>
        <Text style={styles.panelTitle}>iPhone Screen Time</Text>
        <Text style={styles.description}>Apple permission: {screenTimeStatus?.authorization ?? 'Checking…'}</Text>
        <Text style={styles.description}>Chosen in Apple's private picker: {totalPicked} items</Text>
        <Text style={styles.warning}>
          Experimental integration. App shielding must be checked on a real iPhone. Automatic re-locking at midnight is not implemented yet.
        </Text>
        {screenTimeStatus?.authorization !== 'approved' &&
          <Pressable disabled={saving} style={styles.button} onPress={() => run(requestIosPermission)}>
            <Text style={styles.buttonText}>1. Grant Screen Time permission</Text>
          </Pressable>}
        <Pressable disabled={saving || screenTimeStatus?.authorization !== 'approved'}
          style={styles.button} onPress={() => run(pickIosApps)}>
          <Text style={styles.buttonText}>2. Choose apps with Apple's picker</Text>
        </Pressable>
        {blockerAvailable && <Text style={styles.confirmation}>Shield policy is connected to your reading goal. Test actual access on your device.</Text>}
        {totalPicked > 0 &&
          <Pressable disabled={saving} style={styles.danger} onPress={() =>
            Alert.alert('Turn off restrictions?', 'This removes this app’s Screen Time shields until you choose apps again.', [
              { text:'Cancel',style:'cancel' },
              { text:'Turn off',style:'destructive',onPress:()=>run(disableIosBlocking) },
            ])}>
            <Text style={styles.dangerText}>Emergency: turn off app restrictions</Text>
          </Pressable>}
      </View> : <View style={styles.panel}>
        <Text style={styles.panelTitle}>Distraction preferences</Text>
        <Text style={styles.warning}>{isIos
          ? 'Apple Screen Time is unavailable in this build. Expo Go cannot restrict other apps.'
          : 'App blocking is not supported in this Android/web build yet. Preferences do not restrict other apps.'}</Text>
        <Text style={styles.description}>Save a wish list of apps you'd like to use less:</Text>
        {WISHLIST.map(name => <Pressable key={name} disabled={saving}
          accessibilityRole="checkbox" accessibilityState={{checked:selectedApps.includes(name)}}
          onPress={() => run(() => setSelectedApps(selectedApps.includes(name)
            ? selectedApps.filter(a=>a!==name) : [...selectedApps,name]))}
          style={styles.item}>
          <Text style={styles.itemText}>{name}</Text>
          <Text style={styles.check}>{selectedApps.includes(name) ? '☑' : '□'}</Text>
        </Pressable>)}
      </View>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.footer}>Read to Unlock V2 · Development build · No verified device blocking yet</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:17,paddingBottom:55},
  title:{fontSize:27,fontWeight:'800',color:'#152744'},
  panel:{padding:18,backgroundColor:'#fff',borderRadius:16,gap:14},
  panelTitle:{fontSize:19,fontWeight:'800',color:'#152744'},description:{color:'#66758C',fontSize:14,lineHeight:21},
  warning:{color:'#805F2F',backgroundColor:'#FFF6E8',padding:12,borderRadius:10,lineHeight:19,fontSize:13},
  confirmation:{color:'#286547',backgroundColor:'#EDF9F0',padding:12,borderRadius:10,lineHeight:19},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingVertical:10,paddingHorizontal:14,backgroundColor:'#F1F4FA',borderRadius:10},
  selected:{backgroundColor:'#275EC8'},chipText:{fontWeight:'700',color:'#3E516D'},selectedText:{color:'#fff'},
  item:{paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#EDF0F5',flexDirection:'row',justifyContent:'space-between'},
  itemText:{fontSize:16,color:'#263852'},check:{fontSize:23,color:'#2C61C6'},
  button:{backgroundColor:'#2862C9',padding:15,borderRadius:12,alignItems:'center'},buttonText:{fontSize:14,color:'#fff',fontWeight:'700'},
  danger:{borderColor:'#BB4141',borderWidth:1,padding:15,borderRadius:12,alignItems:'center'},
  dangerText:{fontSize:14,color:'#A22F2F',fontWeight:'700'},
  error:{color:'#B42318'},footer:{color:'#72809A',fontSize:12,lineHeight:18}
});
