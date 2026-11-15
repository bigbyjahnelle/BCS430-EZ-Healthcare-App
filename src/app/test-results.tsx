import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMobileSession } from '../screens/MedicationsScreen';
import { modeLabel, useDataMode } from '../services/dataMode';

type Measurement = { name: string; value: string; referenceRanges: string[]; flags: string[] };
type Lab = Measurement & {
    id: string; status: string; recordedAt: string | null; issuedAt: string | null;
    components: Measurement[]; notes: string[];
};
type Payload = {
    status: 'ok'; source: string; fetchedAt: string;
    patient: { id: string; name: string }; results: Lab[]; warnings: string[]; hasMore: boolean;
};
function strings(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((item) => typeof item === 'string');
}
function measurement(v: unknown): v is Measurement {
    if (!v || typeof v !== 'object') return false;
    const m = v as Measurement;
    return typeof m.name === 'string' && typeof m.value === 'string' && strings(m.referenceRanges) && strings(m.flags);
}
function validPayload(v: unknown): v is Payload {
    if (!v || typeof v !== 'object') return false;
    const p = v as Payload;
    return p.status === 'ok' && typeof p.source === 'string' && typeof p.fetchedAt === 'string' &&
        !!p.patient && typeof p.patient.name === 'string' && typeof p.patient.id === 'string' &&
        typeof p.hasMore === 'boolean' && strings(p.warnings) && Array.isArray(p.results) &&
        p.results.every((r) => measurement(r) && typeof r.id === 'string' && typeof r.status === 'string' &&
            (r.recordedAt === null || typeof r.recordedAt === 'string') &&
            (r.issuedAt === null || typeof r.issuedAt === 'string') && strings(r.notes) &&
            Array.isArray(r.components) && r.components.every(measurement));
}
function Details({ item }: { item: Measurement }) {
    return <>
        <Text style={styles.value}>{item.value}</Text>
        <Text style={styles.body}>Reference range(s) from source: {item.referenceRanges.join(' · ') || 'Not provided'}</Text>
        <Text style={styles.body}>Flag(s) from source: {item.flags.join(' · ') || 'Not provided'}</Text>
    </>;
}
export default function TestResultsScreen() {
    const router = useRouter();
    const mode = useDataMode();
    const [data, setData] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [needsConnection, setNeedsConnection] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useFocusEffect(useCallback(() => {
        const { apiUrl, token } = getMobileSession();
        setData(null);
        setError('');
        setNeedsConnection(false);
        if (mode === 'api' && !token) {
            setLoading(false);
            setNeedsConnection(true);
            return;
        }
        setLoading(true);
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 22000);
        async function load() {
            try {
                const response = await fetch(`${apiUrl}/api/${mode === 'sample' ? 'sample' : 'mobile'}/test-results`, {
                    headers: mode === 'api' ? { Authorization: `Bearer ${token}` } : {},
                    signal: controller.signal,
                });
                if (!active) return;
                if (response.status === 401 && mode === 'api') {
                    setNeedsConnection(true);
                    setError('Your Epic connection expired. Reconnect in Medications.');
                    return;
                }
                const body = await response.json();
                if (!active) return;
                if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (HTTP ${response.status}).`);
                if (!validPayload(body)) throw new Error('The backend returned an unexpected lab-results response.');
                const expectedSource = mode === 'sample'
                    ? 'Sample Data Mode — fictional local database records' : 'Epic sandbox';
                if (body.source !== expectedSource) throw new Error('The response data source does not match the selected mode.');
                setData(body);
            } catch (e) {
                if (!active) return;
                if (controller.signal.aborted) setError('The request timed out. This does not mean no results exist. Try again later.');
                else setError(e instanceof Error ? e.message : 'Could not load test results.');
            } finally {
                clearTimeout(timeout);
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [mode, attempt]));

    return (
        <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
            <Stack.Screen options={{ title: 'Test Results', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title} accessibilityRole="header">Lab Results</Text>
                <View style={styles.notice}><Text style={styles.body}>{modeLabel(mode)}. Test data only.</Text></View>
                <Text style={styles.body}>Individual laboratory results. This version does not display full reports or imaging. Values and flags are shown as supplied, without medical interpretation.</Text>
                {loading && <View style={styles.card}><ActivityIndicator size="large" color="#17618E" /><Text style={styles.body} accessibilityLiveRegion="polite">Loading test results…</Text></View>}
                {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                {needsConnection && <>
                    <Text style={styles.body}>Use the existing Epic connection in Medications, then return here.</Text>
                    <Pressable style={styles.button} accessibilityRole="button" onPress={() => router.push('/medications')}>
                        <Text style={styles.buttonText}>Go to Medications</Text>
                    </Pressable>
                </>}
                {!loading && !needsConnection && <Pressable style={styles.button} accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)}>
                    <Text style={styles.buttonText}>{error ? 'Try Again' : 'Refresh Results'}</Text>
                </Pressable>}
                {data && <>
                    <View style={styles.card}>
                        <Text style={styles.name}>{data.patient.name}</Text>
                        <Text style={styles.body}>Source: {data.source}</Text>
                        <Text style={styles.body}>Retrieved: {new Date(data.fetchedAt).toLocaleString()}</Text>
                    </View>
                    {data.warnings.map((warning, i) => <View style={styles.notice} key={i}><Text style={styles.body}>{warning}</Text></View>)}
                    {data.results.length === 0 && <Text style={styles.body}>No displayable laboratory results were returned for this request. This is not a statement about the patient's complete record.</Text>}
                    {data.results.map((lab) => <View key={lab.id} style={styles.card}>
                        <Text style={styles.name} accessibilityRole="header">{lab.name}</Text>
                        <Text style={styles.body}>Status: {lab.status}</Text>
                        {['preliminary', 'registered', 'partial'].includes(lab.status) && <Text style={styles.body}>This result is not final.</Text>}
                        <Details item={lab} />
                        <Text style={styles.body}>Recorded: {lab.recordedAt || 'Not provided'}</Text>
                        <Text style={styles.body}>Issued: {lab.issuedAt || 'Not provided'}</Text>
                        {lab.components.map((component, i) => <View style={styles.component} key={i}>
                            <Text style={styles.name}>{component.name}</Text><Details item={component} />
                        </View>)}
                        {lab.notes.map((note, i) => <Text style={styles.body} key={i}>Note: {note}</Text>)}
                    </View>)}
                </>}
            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8F3' },
    content: { padding: 20, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
    title: { fontSize: 28, fontWeight: '800', color: '#0B2236' },
    body: { fontSize: 18, color: '#0B2236' },
    card: { backgroundColor: '#FFFFFF', borderColor: '#DDE4E2', borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
    name: { fontSize: 20, fontWeight: '700', color: '#0B2236' },
    value: { fontSize: 23, fontWeight: '700', color: '#17618E' },
    notice: { backgroundColor: '#E4F2EC', padding: 16, borderRadius: 18 },
    error: { fontSize: 18, color: '#B42318' },
    component: { borderTopWidth: 1, borderColor: '#DDE4E2', paddingTop: 12, gap: 8 },
    button: { minHeight: 52, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17618E' },
    buttonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});