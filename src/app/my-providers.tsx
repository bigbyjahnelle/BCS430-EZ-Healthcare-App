import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMobileSession } from '../screens/MedicationsScreen';

type Provider = { id: string; name: string | null; role: string };

export default function MyProvidersScreen() {
    const router = useRouter();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [message, setMessage] = useState('Loading providers…');
    const [needsConnection, setNeedsConnection] = useState(false);

    useFocusEffect(useCallback(() => {
        const { apiUrl, token } = getMobileSession();
        setProviders([]);
        setNeedsConnection(!token);
        if (!token) {
            setMessage('Connect to Epic in Medications to view your providers.');
            return;
        }

        setMessage('Loading providers…');
        const controller = new AbortController();
        let active = true;
        const timeout = setTimeout(() => controller.abort(), 15000);

        async function load() {
            try {
                const response = await fetch(`${apiUrl}/api/mobile/providers`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!active) return;
                if (response.status === 401) {
                    setNeedsConnection(true);
                    setMessage('Your Epic session expired. Reconnect in Medications.');
                    return;
                }
                if (!response.ok) throw new Error('Provider request failed');
                const data: { providers: Provider[] } = await response.json();
                if (!active) return;
                if (!Array.isArray(data.providers)) throw new Error('Invalid provider list');
                setProviders(data.providers);
                setMessage(data.providers.length ? '' : 'No providers were listed on the medication orders retrieved.');
            } catch {
                if (active) setMessage('Could not load providers. Go back and try again.');
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
    }, []));

    return (
        <SafeAreaView style={styles.screen}>
            <Stack.Screen options={{ title: 'My Providers', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.body}>Prescribing providers linked to your Epic sandbox medication records.</Text>
                {message ? <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text> : null}
                {needsConnection ? (
                    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push('/medications')}>
                        <Text style={styles.buttonText}>Go to Medications</Text>
                    </Pressable>
                ) : null}
                {providers.map((provider) => (
                    <View key={provider.id} style={styles.card}>
                        <Text accessibilityRole="header" style={styles.name}>
                            {provider.name || 'Prescribing provider — name unavailable'}
                        </Text>
                        {provider.name ? <Text style={styles.body}>{provider.role}</Text> : null}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8F3' },
    content: { padding: 20, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
    body: { fontSize: 18, color: '#0B2236' },
    card: { backgroundColor: '#FFFFFF', borderColor: '#DDE4E2', borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
    name: { fontSize: 20, fontWeight: '700', color: '#0B2236' },
    button: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#17618E' },
    buttonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
