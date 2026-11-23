import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { Card, PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, recordStyles } from '../components/RecordsPage';
import type { Section } from '../data/fhir';
import { getGeneration, modeLabel, useDataMode } from '../services/dataMode';
import { loadSection } from '../services/healthcare';
const choices: { section: Section; label: string }[] = [
    { section: 'medications', label: 'Medications' }, { section: 'appointments', label: 'Appointments' },
    { section: 'profile', label: 'Personal information' }, { section: 'vitals', label: 'Vital signs' },
    { section: 'test-results', label: 'Test results' }, { section: 'insurance', label: 'Insurance' },
    { section: 'providers', label: 'Providers' },
];
export default function ShareScreen() {
    const mode = useDataMode();
    const [selected, setSelected] = useState<Section[]>(['medications']), [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false), [error, setError] = useState('');
    function toggle(section: Section) { if (loading) return; setSelected(v => v.includes(section) ? v.filter(x => x !== section) : [...v, section]); setPreview(''); setError(''); }
    async function prepare() {
        const generation = getGeneration(); setLoading(true); setPreview(''); setError('');
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 60000);
        try {
            const chunks = await Promise.all(choices.filter(x => selected.includes(x.section)).map(async choice => {
                const data = await loadSection(choice.section, controller.signal);
                return `${choice.label}\nSource: ${data.source}\nRetrieved: ${data.fetchedAt}\n` +
                    data.items.map(item => `${item.title}${item.status ? ` [${item.status}]` : ''}\n${item.lines.map(r => `${r.label}: ${r.value}`).join('\n')}`).join('\n\n') +
                    (data.items.length ? '' : 'No records returned.') + '\n' + data.warnings.join('\n');
            }));
            if (generation !== getGeneration()) return;
            setPreview(`EZ Healthcare — ${modeLabel(mode)}\nSYNTHETIC TEST DATA ONLY\nNot medical advice.\n\n${chunks.join('\n\n---\n\n')}`);
        } catch (e) { if (generation === getGeneration()) setError(e instanceof Error ? e.message : 'Could not prepare the selected sections.'); }
        finally { clearTimeout(timeout); controller.abort(); if (generation === getGeneration()) setLoading(false); }
    }
    function share() {
        const generation = getGeneration();
        Alert.alert('Share the preview?', 'Only the records shown below will leave EZ Healthcare. Check the recipient in the next app.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Open Share Menu', onPress: () => {
                    if (generation !== getGeneration() || !preview) return;
                    void Share.share({ title: 'EZ Healthcare — synthetic test records', message: preview }).catch(() => Alert.alert('Sharing unavailable', 'The share menu could not be opened.'));
                } },
        ]);
    }
    return <RecordsPage title="Share">
        <Text style={recordStyles.warning}>Review your selection and preview before sharing. Personal details and insurance identifiers are not selected by default.</Text>
        <Card>{choices.map(x => <Pressable key={x.section} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(x.section), disabled: loading }}
                                           onPress={() => toggle(x.section)} disabled={loading} style={{ minHeight: 56, justifyContent: 'center' }}>
            <Text style={recordStyles.body}>{selected.includes(x.section) ? '☑' : '☐'} {x.label}</Text>
        </Pressable>)}</Card>
        <PrimaryButton label={loading ? 'Preparing…' : 'Generate Preview'} disabled={loading || !selected.length} onPress={() => void prepare()} />
        {error ? <Text accessibilityRole="alert" style={recordStyles.error}>{error}</Text> : null}
        {preview ? <View style={{ gap: 16 }}><Card><Text selectable style={recordStyles.body}>{preview}</Text></Card>
            <PrimaryButton label="Review and Share" onPress={share} /></View> : null}
    </RecordsPage>;
}