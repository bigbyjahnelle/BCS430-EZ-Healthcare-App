import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from '../components/PageBackground';
import { Card, FONT, INK, PrimaryButton, ScreenHeader } from '../components/ScreenParts';
import { modeLabel, useDataMode } from '../services/dataMode';
import { getMobileSession } from '../screens/MedicationsScreen';

type Provider = { id: string; name: string | null; role: string };

export default function MyProvidersScreen() {
    const router = useRouter();
    const mode = useDataMode();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [message, setMessage] = useState('Loading providers…');
    const [needsConnection, setNeedsConnection] = useState(false);

    useFocusEffect(useCallback(() => {
        const { apiUrl, token, mode: selectedMode } = getMobileSession();
        setProviders([]);
        setNeedsConnection(selectedMode === 'api' && !token);
        if (selectedMode === 'api' && !token) {
            setMessage('Connect to Epic in Medications to view your providers.');
            return;
        }

        setMessage('Loading providers…');
        const controller = new AbortController();
        let active = true;
        const timeout = setTimeout(() => controller.abort(), 15000);

        async function load() {
            try {
                const response = await fetch(`${apiUrl}/api/${selectedMode === 'sample' ? 'sample' : 'mobile'}/providers`, {
                    headers: selectedMode === 'api' ? { Authorization: `Bearer ${token}` } : {},
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
    }, [mode]));

    return (
        <PageBackground>
            <SafeAreaView style={styles.screen}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <ScreenHeader title="My Providers" />
                    <Text style={styles.body}>{modeLabel(mode)}. Prescribing providers linked to the displayed records.</Text>
                    {message ? <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text> : null}
                    {needsConnection ? (
                        <PrimaryButton label="Go to Medications" onPress={() => router.push('/medications')} />
                    ) : null}
                    {providers.map((provider) => (
                        <Card key={provider.id} style={styles.cardGap}>
                            <Text accessibilityRole="header" style={styles.name}>
                                {provider.name || 'Prescribing provider — name unavailable'}
                            </Text>
                            {provider.name ? <Text style={styles.body}>{provider.role}</Text> : null}
                        </Card>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </PageBackground>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 24, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
    body: { fontFamily: FONT, fontSize: 18, color: INK },
    cardGap: { gap: 6 },
    name: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: INK },
});