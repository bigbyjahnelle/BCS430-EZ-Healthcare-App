import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataMode, getDataMode, selectDataMode } from '../services/dataMode';

export default function WelcomeScreen() {
    const router = useRouter();
    const [choice, setChoice] = useState<DataMode>(getDataMode());
    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Image source={require('../../assets/images/ez-logo.png')} style={styles.logo}
                       resizeMode="contain" accessibilityLabel="EZ Healthcare" />
                <Text style={styles.title} accessibilityRole="header">Welcome to EZ Healthcare</Text>
                <Text style={styles.body}>Choose your data source. Both modes use the same screens.</Text>
                <View accessibilityRole="radiogroup" style={styles.choices}>
                    {(['sample', 'api'] as const).map((value) => (
                        <Pressable key={value} accessibilityRole="radio"
                                   accessibilityState={{ checked: choice === value }}
                                   onPress={() => setChoice(value)}
                                   style={[styles.card, choice === value && styles.selected]}>
                            <Text style={styles.cardTitle}>{choice === value ? '● ' : '○ '}{value === 'sample' ? 'Sample Data Mode' : 'API Mode'}</Text>
                            <Text style={styles.body}>{value === 'sample'
                                ? 'Fictional records from our local database. No Epic sign-in needed.'
                                : 'Request records from Epic’s sandbox. Epic sign-in and internet access are required.'}</Text>
                        </Pressable>
                    ))}
                </View>
                <Pressable style={styles.button} accessibilityRole="button" onPress={() => {
                    selectDataMode(choice);
                    router.replace('/home');
                }}><Text style={styles.buttonText}>Continue</Text></Pressable>
                <Text style={styles.body}>Both modes are for testing. Changing modes clears the app’s current connection.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8F3' },
    content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20, width: '100%', maxWidth: 540, alignSelf: 'center' },
    logo: { width: 150, height: 150, alignSelf: 'center' },
    title: { fontSize: 30, fontWeight: '800', color: '#17618E', textAlign: 'center' },
    body: { fontSize: 18, color: '#44525A', lineHeight: 26 },
    choices: { gap: 16 },
    card: { padding: 20, gap: 10, borderRadius: 20, borderWidth: 2, borderColor: '#DDE4E2', backgroundColor: '#FFFFFF' },
    selected: { borderColor: '#008060', backgroundColor: '#E4F2EC' },
    cardTitle: { fontSize: 22, fontWeight: '700', color: '#0B2236' },
    button: { minHeight: 56, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#17618E' },
    buttonText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
});