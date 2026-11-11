import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMobileSession } from '../screens/MedicationsScreen';

type Vital = { id: string; name: string; value: string; recordedAt: string | null };

export default function MyHealthScreen() {
    const router = useRouter();
    const [readings, setReadings] = useState<Vital[]>([]);
    const [message, setMessage] = useState('Loading vital signs…');
    const [connect, setConnect] = useState(false);
    const [canRetry, setCanRetry] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useFocusEffect(useCallback(() => {
        const { apiUrl, token } = getMobileSession();
        setReadings([]);
        setConnect(!token);
        setCanRetry(false);
        if (!token) {
            setMessage('Connect to Epic in Medications to view your vital signs.');
            return;
        }
        setMessage('Loading vital signs…');
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        async function load() {
            try {
                const response = await fetch(`${apiUrl}/api/mobile/vitals`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!active) return;
                if (response.status === 401) {
                    setConnect(true);
                    setMessage('Your Epic connection expired. Reconnect in Medications.');
                    return;
                }
                if (!response.ok) throw new Error('Vitals request failed');
                const data = await response.json();
                if (!active) return;
                if (data.status !== 'ok' || !Array.isArray(data.readings)) {
                    setCanRetry(true);
                    setMessage('Epic vital signs are temporarily unavailable.');
                    return;
                }
                setReadings(data.readings);
                setMessage(data.hasMore
                    ? 'Showing readings from the first page Epic returned.'
                    : data.readings.length ? '' : 'No vital sign readings were available to display.');
            } catch {
                if (active) {
                    setCanRetry(true);
                    setMessage('Epic vital signs are temporarily unavailable.');
                }
            } finally {
                clearTimeout(timeout);
            }
        }

        void load();
        return () => {
            active = false;
            clearTimeout(timeout);
            controller.abort();
        };
    }, [attempt]));

    return (
        <SafeAreaView style={styles.screen}>
            <Stack.Screen options={{ title: 'My Health', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text accessibilityRole="header" style={styles.title}>My Vitals</Text>
                <Text style={styles.body}>Readings from Epic’s sandbox. Test data only.</Text>
                {message ? <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text> : null}
                {connect ? (
                    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push('/medications')}>
                        <Text style={styles.buttonText}>Go to Medications</Text>
                    </Pressable>
                ) : null}
                {canRetry ? (
                    <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
                        setCanRetry(false);
                        setAttempt((value) => value + 1);
                    }}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                ) : null}
                {readings.map((vital) => (
                    <View key={vital.id} style={styles.card}>
                        <Text style={styles.name}>{vital.name}</Text>
                        <Text style={styles.body}>{vital.value}</Text>
                        <Text style={styles.body}>Recorded: {vital.recordedAt?.slice(0, 10) || 'Date unavailable'}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8F3' },
    content: { padding: 20, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
    title: { fontSize: 28, fontWeight: '800', color: '#0B2236' },
    body: { fontSize: 18, color: '#0B2236' },
    card: { backgroundColor: '#FFFFFF', borderColor: '#DDE4E2', borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
    name: { fontSize: 20, fontWeight: '700', color: '#0B2236' },
    button: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#17618E' },
    buttonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
