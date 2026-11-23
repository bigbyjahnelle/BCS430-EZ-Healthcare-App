import { useFocusEffect, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from './PageBackground';
import { BLUE, Card, FONT, GEAR_CLEARANCE, INK, PrimaryButton, ScreenHeader } from './ScreenParts';
import type { Item, Records, Section } from '../data/fhir';
import { useDataMode, modeLabel } from '../services/dataMode';
import { HealthcareError, loadSection } from '../services/healthcare';
import { describeSection } from '../services/recordReadout';
import { useScreenSummary } from '../services/screenSummary';
import { useVoiceSettings } from '../services/voiceSettings';

// Each SectionPanel reports its "read this screen" text to the RecordsPage around it - RD
const ReadoutContext = createContext<((key: string, text: string | null) => void) | null>(null);

export function RecordsPage({ title, children }: { title: string; children: ReactNode }) {
    const mode = useDataMode();

    // Sections are read in the order they first appear on the screen - RD
    const [parts, setParts] = useState<Record<string, string | null>>({});
    const order = useRef<string[]>([]);
    const report = useCallback((key: string, text: string | null) => {
        if (!order.current.includes(key)) order.current.push(key);
        setParts((current) => (current[key] === text ? current : { ...current, [key]: text }));
    }, []);
    const spoken = order.current.map((key) => parts[key]).filter(Boolean).join(' ');
    useScreenSummary(spoken ? `${title}. ${spoken}` : null);

    return <ReadoutContext.Provider value={report}><PageBackground><SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={recordStyles.page} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={title} />
            <Card><Text style={recordStyles.body}>{modeLabel(mode)} — test data only.</Text></Card>
            {children}
        </ScrollView>
    </SafeAreaView></PageBackground></ReadoutContext.Provider>;
}
export function RecordCard({ item, onPress }: { item: Item; onPress?: () => void }) {
    const flag = item.flag;
    const color = flag === 'normal' ? '#12633E' : flag === 'critical' ? '#8A1730' : flag === 'abnormal' ? '#8A4200' : '#425568';
    const background = flag === 'normal' ? '#DEF4E7' : flag === 'critical' ? '#FFDDE5' : flag === 'abnormal' ? '#FFF0CE' : '#E8EEF2';
    const content = <Card>
        <Text style={recordStyles.title}>{item.title}</Text>
        {item.subtitle ? <Text style={recordStyles.body}>{item.subtitle}</Text> : null}
        {item.status ? <Text style={recordStyles.small}>Status: {item.status}</Text> : null}
        {flag ? <View style={[recordStyles.badge, { backgroundColor: background, borderColor: color }]}>
            <Text style={{ color, fontWeight: '800', fontSize: 18 }}>
                {flag === 'normal' ? 'IN RANGE — reported by source' : flag === 'critical' ? 'CRITICAL — reported by source' : flag === 'abnormal' ? 'OUT OF RANGE — reported by source' : 'RANGE STATUS NOT REPORTED'}
            </Text>
        </View> : null}
        {item.lines.map((line, i) => <View key={`${line.label}-${i}`} style={{ marginTop: 9 }}>
            <Text style={recordStyles.small}>{line.label}</Text><Text style={recordStyles.body}>{line.value}</Text>
        </View>)}
        {onPress ? <Text style={[recordStyles.body, { color: BLUE, marginTop: 10, fontWeight: '700' }]}>View details →</Text> : null}
    </Card>;
    return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={onPress}>{content}</Pressable> : content;
}
export function SectionPanel({ section, heading, revision = 0, onItem, renderAction }: {
    section: Section; heading?: string; revision?: number; onItem?: (item: Item) => void;
    renderAction?: (item: Item) => ReactNode;
}) {
    const mode = useDataMode(), router = useRouter();
    const [data, setData] = useState<Records | null>(null), [error, setError] = useState(''), [code, setCode] = useState('');
    const [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
    useFocusEffect(useCallback(() => {
        let active = true; const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        setData(null); setError(''); setCode(''); setLoading(true);
        loadSection(section, controller.signal).then(value => { if (active) setData(value); }).catch(e => {
            if (active) { setError(e instanceof Error ? e.message : 'Could not load this section.'); setCode(e instanceof HealthcareError ? e.code : ''); }
        }).finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [section, mode, retry, revision]));

    // Tell the page what to read for this section whenever it changes - RD
    const report = useContext(ReadoutContext);
    const voice = useVoiceSettings();
    useEffect(() => {
        report?.(section, describeSection(section, heading, { loading, error, data }, voice));
    }, [report, section, heading, loading, error, data, voice]);
    useEffect(() => () => report?.(section, null), [report, section]);

    return <View style={{ gap: 14 }}>
        {heading ? <Text style={recordStyles.heading} accessibilityRole="header">{heading}</Text> : null}
        {loading ? <ActivityIndicator size="large" accessibilityLabel={`Loading ${heading || section}`} /> : null}
        {error ? <Card><Text style={recordStyles.error} accessibilityRole="alert">{error}</Text>
            <PrimaryButton label={code === 'epic_connection_required' ? 'Connect to Epic' : 'Try Again'}
                           onPress={() => code === 'epic_connection_required' ? router.push('/connect-epic') : setRetry(x => x + 1)} />
            {mode === 'api' && code !== 'epic_connection_required' ? <PrimaryButton label="Epic Connection" onPress={() => router.push('/connect-epic')} /> : null}
        </Card> : null}
        {data?.warnings.map(w => <Text style={recordStyles.warning} key={w}>{w}</Text>)}
        {data && data.items.length === 0 ? <Card><Text style={recordStyles.body}>No records were returned for this section.</Text></Card> : null}
        {data?.items.map(item => <View key={item.id} style={{ gap: 10 }}>
            <RecordCard item={item} onPress={onItem ? () => onItem(item) : undefined} />
            {renderAction?.(item)}
        </View>)}
        {data ? <Text style={recordStyles.small}>{data.source}{'\n'}Retrieved: {new Date(data.fetchedAt).toLocaleString()}</Text> : null}
    </View>;
}
export const recordStyles = StyleSheet.create({
    page: { flexGrow: 1, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: GEAR_CLEARANCE },
    title: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: INK },
    heading: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: INK, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12 },
    body: { color: INK, fontSize: 18, lineHeight: 27 },
    small: { color: '#44525A', fontSize: 15, lineHeight: 22 },
    error: { color: '#9A1825', fontSize: 18, lineHeight: 27, marginBottom: 14 },
    warning: { color: '#593A00', fontSize: 17, lineHeight: 25, backgroundColor: '#FFF2CF', padding: 12, borderRadius: 10 },
    badge: { padding: 14, borderWidth: 2, borderRadius: 12, marginTop: 12 },
    input: { backgroundColor: '#FFFFFF', borderColor: '#A9C2D6', borderWidth: 2, borderRadius: 12, padding: 14, color: INK, fontSize: 18, minHeight: 54 },
});