import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingRewards } from '../../contexts/reading-rewards';

const APPS = ['Instagram', 'YouTube', 'TikTok', 'Snapchat', 'Facebook', 'X'];
const GOALS = [5, 10, 15, 20, 30, 45, 60];

export default function DistractionsScreen() {
  const { status, goalMinutes, selectedApps, blockerAvailable, setGoalMinutes, setSelectedApps } = useReadingRewards();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeGoal = async (minutes: number) => {
    if (saving) return;
    setSaving(true); setError(null);
    try { await setGoalMinutes(minutes); } catch(e) { setError(e instanceof Error ? e.message : 'Could not save goal'); }
    finally { setSaving(false); }
  };
  const toggle = async (name: string) => {
    if (saving) return;
    const apps = selectedApps.includes(name) ? selectedApps.filter(a => a !== name) : [...selectedApps, name];
    setSaving(true); setError(null);
    try { await setSelectedApps(apps); } catch(e) { setError(e instanceof Error ? e.message : 'Could not save app selection'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Focus settings</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>App blocking isn't active yet</Text>
        <Text style={styles.noticeBody}>You can save your distractions and build your reading habit now. We are still repairing the native iPhone blocker. Your selected apps remain accessible.</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Daily reading goal</Text>
        <Text style={styles.description}>Reading progress: {Math.floor(status.readingSeconds / 60)} of {goalMinutes} minutes</Text>
        <View style={styles.wrap}>
          {GOALS.map(m => <Pressable key={m} disabled={saving} accessibilityRole="button"
            onPress={() => changeGoal(m)} style={[styles.chip, goalMinutes === m && styles.selected]}>
            <Text style={[styles.chipText,goalMinutes === m && styles.selectedText]}>{m} min</Text>
          </Pressable>)}
        </View>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Apps I'd like to use less</Text>
        <Text style={styles.description}>Choose as many as you like. These are preferences, not working locks.</Text>
        {APPS.map(name => <Pressable key={name} disabled={saving} accessibilityRole="checkbox"
          accessibilityState={{checked:selectedApps.includes(name)}} onPress={() => toggle(name)} style={styles.item}>
          <Text style={styles.itemText}>{name}</Text>
          <Text style={styles.check}>{selectedApps.includes(name) ? '☑' : '□'}</Text>
        </Pressable>)}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.footer}>{blockerAvailable ? 'Native app restrictions are available.' : 'Native restriction support requires a future update and device testing.'}</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:20,gap:17,paddingBottom:50},
  title:{fontSize:27,fontWeight:'800',color:'#152744'},
  notice:{padding:17,backgroundColor:'#FFF2DF',borderRadius:15,gap:7},
  noticeTitle:{fontWeight:'800',fontSize:17,color:'#83510E'},
  noticeBody:{fontSize:14,lineHeight:22,color:'#664F32'},
  panel:{padding:18,backgroundColor:'#fff',borderRadius:16,gap:14},
  panelTitle:{fontSize:19,fontWeight:'800',color:'#152744'},description:{color:'#66758C',fontSize:14,lineHeight:21},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
  chip:{paddingVertical:10,paddingHorizontal:14,backgroundColor:'#F1F4FA',borderRadius:10},
  selected:{backgroundColor:'#275EC8'},chipText:{fontWeight:'700',color:'#3E516D'},selectedText:{color:'#fff'},
  item:{paddingVertical:15,borderBottomWidth:1,borderBottomColor:'#EDF0F5',flexDirection:'row',justifyContent:'space-between'},
  itemText:{fontSize:16,color:'#263852'},check:{fontSize:23,color:'#2C61C6'},
  error:{color:'#B42318'},footer:{color:'#72809A',fontSize:12,lineHeight:18}
});
