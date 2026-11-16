import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { modeLabel, useDataMode } from '../services/dataMode';
import { getMobileSession } from '../screens/MedicationsScreen';

type Vital = { id: string; name: string; value: string; recordedAt: string | null };

type Profile = {
    name: string;
    birthDate: string | null;
    sex: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    language: string | null;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

class ExpiredError extends Error {}

function parseBirthDate(value: string | null) {
    const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value ?? '');
    if (!match) return null;
    return { year: Number(match[1]), month: match[2] ? Number(match[2]) : null, day: match[3] ? Number(match[3]) : null };
}

/** "March 14, 1948 (age 78)" — built from local date parts so it never shifts a day. */
function describeBirthDate(value: string | null, today = new Date()) {
    const parts = parseBirthDate(value);
    if (!parts) return null;
    if (!parts.month || !parts.day) return `Born in ${parts.year}`;

    const date = new Date(parts.year, parts.month - 1, parts.day);
    let age = today.getFullYear() - parts.year;
    const hadBirthday =
        today.getMonth() + 1 > parts.month ||
        (today.getMonth() + 1 === parts.month && today.getDate() >= parts.day);
    if (!hadBirthday) age -= 1;

    const label = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    return age >= 0 ? `${label} (age ${age})` : label;
}

async function getJson(url: string, token: string | null, useToken: boolean, signal: AbortSignal) {
    const response = await fetch(url, {
        headers: useToken && token ? { Authorization: `Bearer ${token}` } : {},
        signal,
    });
    if (response.status === 401) throw new ExpiredError();
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
}

export default function MyHealthScreen() {
    const router = useRouter();
    const mode = useDataMode();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileMessage, setProfileMessage] = useState('Loading your information…');
    const [readings, setReadings] = useState<Vital[]>([]);
    const [message, setMessage] = useState('Loading vital signs…');
    const [connect, setConnect] = useState(false);
    const [canRetry, setCanRetry] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useFocusEffect(useCallback(() => {
        const { apiUrl, token, mode: selectedMode } = getMobileSession();
        const isApi = selectedMode === 'api';
        const base = `${apiUrl}/api/${isApi ? 'mobile' : 'sample'}`;

        setProfile(null);
        setReadings([]);
        setConnect(isApi && !token);
        setCanRetry(false);
        if (isApi && !token) {
            setProfileMessage('');
            setMessage('Connect to Epic in Medications to view your health information.');
            return;
        }
        setProfileMessage('Loading your information…');
        setMessage('Loading vital signs…');

        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        async function loadProfile() {
            try {
                const data = await getJson(`${base}/profile`, token, isApi, controller.signal);
                if (!active) return;
                if (data.status !== 'ok' || !data.profile || typeof data.profile.name !== 'string') {
                    throw new Error('Invalid profile');
                }
                setProfile(data.profile);
                setProfileMessage('');
            } catch (error) {
                if (!active) return;
                if (error instanceof ExpiredError) {
                    setConnect(true);
                    setProfileMessage('');
                    setMessage('Your Epic connection expired. Reconnect in Medications.');
                    return;
                }
                setCanRetry(true);
                setProfileMessage(isApi
                    ? 'Your personal information is temporarily unavailable.'
                    : 'Sample personal information could not be loaded. Check the backend and run database/seed-sample-mode.sql.');
            }
        }

        async function loadVitals() {
            try {
                const data = await getJson(`${base}/vitals`, token, isApi, controller.signal);
                if (!active) return;
                if (data.status !== 'ok' || !Array.isArray(data.readings)) {
                    setCanRetry(true);
                    setMessage(isApi ? 'Epic vital signs are temporarily unavailable.' : 'Sample vital signs could not be loaded. Check the backend and database.');
                    return;
                }
                setReadings(data.readings);
                setMessage(data.hasMore
                    ? 'Showing readings from the first page Epic returned.'
                    : data.readings.length ? '' : 'No vital sign readings were available to display.');
            } catch (error) {
                if (!active) return;
                if (error instanceof ExpiredError) {
                    setConnect(true);
                    setMessage('Your Epic connection expired. Reconnect in Medications.');
                    return;
                }
                setCanRetry(true);
                setMessage(isApi ? 'Epic vital signs are temporarily unavailable.' : 'Sample vital signs could not be loaded. Check the backend and database.');
            }
        }

        void Promise.all([loadProfile(), loadVitals()]).finally(() => clearTimeout(timeout));
        return () => {
            active = false;
            clearTimeout(timeout);
            controller.abort();
        };
    }, [attempt, mode]));

    const details: { icon: IconName; label: string; value: string | null }[] = profile ? [
        { icon: 'calendar-outline', label: 'Date of birth', value: describeBirthDate(profile.birthDate) },
        { icon: 'person-outline', label: 'Sex', value: profile.sex },
        { icon: 'call-outline', label: 'Phone', value: profile.phone },
        { icon: 'mail-outline', label: 'Email', value: profile.email },
        { icon: 'home-outline', label: 'Address', value: profile.address },
        { icon: 'language-outline', label: 'Preferred language', value: profile.language },
    ] : [];

    return (
        <SafeAreaView style={styles.screen}>
            <Stack.Screen options={{ title: 'My Health', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.body}>{modeLabel(mode)}. Test data only.</Text>

                {connect ? (
                    <>
                        <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text>
                        <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push('/medications')}>
                            <Text style={styles.buttonText}>Go to Medications</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Text accessibilityRole="header" style={styles.title}>About Me</Text>
                        {profileMessage ? (
                            <Text style={styles.body} accessibilityLiveRegion="polite">{profileMessage}</Text>
                        ) : null}
                        {profile ? (
                            <View style={styles.card}>
                                <View style={styles.profileHeader}>
                                    <View style={styles.avatar}>
                                        <Ionicons name="person" size={34} color="#FFFFFF" accessible={false} />
                                    </View>
                                    <Text style={styles.profileName} accessibilityRole="header">{profile.name}</Text>
                                </View>
                                {details.map((item) => (
                                    <View
                                        key={item.label}
                                        style={styles.detailRow}
                                        accessible
                                        accessibilityLabel={`${item.label}: ${item.value ?? 'Not on file'}`}
                                    >
                                        <Ionicons name={item.icon} size={26} color="#17618E" accessible={false} />
                                        <View style={styles.detailText}>
                                            <Text style={styles.label}>{item.label}</Text>
                                            <Text style={item.value ? styles.body : styles.missing}>
                                                {item.value ?? 'Not on file'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                                <Text style={styles.smallText}>
                                    From your health record. To change these details, contact your provider’s office.
                                </Text>
                            </View>
                        ) : null}

                        <Text accessibilityRole="header" style={styles.title}>My Vitals</Text>
                        {message ? <Text style={styles.body} accessibilityLiveRegion="polite">{message}</Text> : null}
                        {readings.map((vital) => (
                            <View key={vital.id} style={styles.card}>
                                <Text style={styles.name}>{vital.name}</Text>
                                <Text style={styles.body}>{vital.value}</Text>
                                <Text style={styles.body}>Recorded: {vital.recordedAt?.slice(0, 10) || 'Date unavailable'}</Text>
                            </View>
                        ))}
                    </>
                )}

                {canRetry ? (
                    <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
                        setCanRetry(false);
                        setAttempt((value) => value + 1);
                    }}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8F3' },
    content: { padding: 20, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
    title: { fontSize: 28, fontWeight: '800', color: '#0B2236', marginTop: 4 },
    body: { fontSize: 18, lineHeight: 26, color: '#0B2236' },
    missing: { fontSize: 18, lineHeight: 26, color: '#6B7785', fontStyle: 'italic' },
    smallText: { fontSize: 16, lineHeight: 23, color: '#425466' },
    label: { fontSize: 16, fontWeight: '700', color: '#17618E' },
    card: { backgroundColor: '#FFFFFF', borderColor: '#DDE4E2', borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
    profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#17618E', alignItems: 'center', justifyContent: 'center' },
    profileName: { flex: 1, fontSize: 24, fontWeight: '800', color: '#0B2236' },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#EDF0F3' },
    detailText: { flex: 1, gap: 2 },
    name: { fontSize: 20, fontWeight: '700', color: '#0B2236' },
    button: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#17618E' },
    buttonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
