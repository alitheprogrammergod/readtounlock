import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useReadingRewards } from '../contexts/reading-rewards';

const APPS = ['Instagram', 'YouTube', 'TikTok', 'Snapchat', 'Facebook', 'X'];
const GOALS = [10, 15, 30];

export default function OnboardingScreen() {
  const { ready, onboarded, finishOnboarding, error: loadError } = useReadingRewards();
  const [step, setStep] = useState(0);
  const [minutes, setMinutes] = useState(15);
  const [apps, setApps] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) => setApps(prev =>
    prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]);

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await finishOnboarding(minutes, apps);
      router.replace('/(tabs)/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Setup failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (!ready) return <SafeAreaView style={styles.center}><ActivityIndicator /></SafeAreaView>;
  if (loadError) return <SafeAreaView style={styles.center}><Text>{loadError}</Text></SafeAreaView>;
  if (onboarded) {
    // Returning users should normally be redirected by the home route.
    return <SafeAreaView style={styles.center}>
      <Pressable onPress={() => router.replace('/(tabs)/dashboard')}><Text style={styles.primaryText}>Go to dashboard</Text></Pressable>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>READ TO UNLOCK · {step + 1} OF 3</Text>
      <Text style={styles.title}>{step === 0 ? 'Read more. Scroll less.' : step === 1 ? 'Set your reading goal' : 'Choose your distractions'}</Text>
      <Text style={styles.description}>{step === 0
        ? 'Build a reading habit before spending your time scrolling. Setup takes less than a minute.'
        : step === 1 ? 'How many minutes would you like to read each day? You can change this later.'
        : 'Choose apps you'd like to use less. On iPhone, you'll select the actual restricted apps using Apple's private picker in Focus settings.'}</Text>

      {step === 0 && <View style={styles.panel}>
        <Text style={styles.panelTitle}>What you can do today</Text>
        <Text style={styles.line}>• Scan a book barcode or add a book manually.</Text>
        <Text style={styles.line}>• Track reading sessions and build daily progress.</Text>
        <Text style={styles.line}>• Finish reading goals and see your achievements.</Text>
      </View>}

      {step === 1 && GOALS.map(value =>
        <Pressable key={value} accessibilityRole="button" onPress={() => setMinutes(value)}
          style={[styles.choice, minutes === value && styles.choiceActive]}>
          <Text style={styles.choiceText}>{value} minutes a day</Text>
          <Text style={styles.choiceHint}>{minutes === value ? 'Selected ✓' : 'Choose'}</Text>
        </Pressable>
      )}

      {step === 2 && <>
        {APPS.map(name => <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked: apps.includes(name) }}
          onPress={() => toggle(name)} style={[styles.choice, apps.includes(name) && styles.choiceActive]}>
          <Text style={styles.choiceText}>{name}</Text>
          <Text style={styles.choiceHint}>{apps.includes(name) ? '✓' : '+'}</Text>
        </Pressable>)}
        <View style={styles.warning}>
          <Text style={styles.warningText}>These are preferences only. After setup, open Focus Settings to grant iPhone Screen Time permission and choose apps. Restrictions must still be tested on a device.</Text>
        </View>
      </>}

      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.footer}>
        {step > 0 && <Pressable style={styles.secondary} onPress={() => setStep(step - 1)}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>}
        <Pressable disabled={submitting} style={styles.primary} onPress={step === 2 ? finish : () => setStep(step + 1)}>
          <Text style={styles.primaryText}>{submitting ? 'Saving…' : step === 2 ? 'Finish setup' : 'Continue'}</Text>
        </Pressable>
      </View>
      {step === 2 && <Text style={styles.help}>No account or camera permission is needed to finish setup.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F7F8FC'}, center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  content:{flexGrow:1,padding:24,gap:16,justifyContent:'center'},
  kicker:{color:'#36569D',fontSize:12,fontWeight:'700',letterSpacing:1},
  title:{fontWeight:'800',fontSize:32,color:'#18243B'},
  description:{fontSize:16,lineHeight:24,color:'#52617C'},
  panel:{backgroundColor:'#fff',borderRadius:18,padding:22,gap:12},
  panelTitle:{fontSize:18,fontWeight:'700',color:'#17233A'},
  line:{fontSize:15,color:'#52617C'},
  choice:{padding:17,backgroundColor:'#fff',borderRadius:13,borderWidth:2,borderColor:'#E5E9F1',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  choiceActive:{borderColor:'#3267CC',backgroundColor:'#EBF2FF'},
  choiceText:{fontSize:17,fontWeight:'600',color:'#18243B'},
  choiceHint:{fontSize:13,color:'#3267CC'},
  warning:{backgroundColor:'#FFF7E7',padding:15,borderRadius:12},
  warningText:{color:'#725521',lineHeight:20},
  footer:{flexDirection:'row',gap:12,marginTop:15},
  primary:{backgroundColor:'#285ECD',padding:16,borderRadius:12,alignItems:'center',flex:1},
  primaryText:{color:'#fff',fontWeight:'700',fontSize:16},
  secondary:{backgroundColor:'#E3E9F5',padding:16,borderRadius:12},
  secondaryText:{color:'#253A65',fontWeight:'700'},
  error:{color:'#B42318'},help:{textAlign:'center',fontSize:12,color:'#68778E'},
});
