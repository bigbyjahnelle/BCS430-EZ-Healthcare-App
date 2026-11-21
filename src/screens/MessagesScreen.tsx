import { useState } from 'react';
import { Alert, Text, TextInput } from 'react-native';
import { Card, PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
import { useDataMode } from '../services/dataMode';
import { sendSampleMessage } from '../services/healthcare';
export default function MessagesScreen() {
    const mode = useDataMode(), [message, setMessage] = useState(''), [saving, setSaving] = useState(false), [revision, setRevision] = useState(0);
    async function send() {
        if (mode !== 'sample' || saving) return;
        setSaving(true);
        try { await sendSampleMessage(message); setMessage(''); setRevision(x => x + 1); Alert.alert('Sample message saved', 'Saved on this device only. No provider was contacted.'); }
        catch (e) { Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.'); }
        finally { setSaving(false); }
    }
    return <RecordsPage title="Messages">
        <Text style={recordStyles.warning}>Not for emergencies. This app is not monitored by a clinical care team.</Text>
        <SectionPanel section="messages" heading={mode === 'sample' ? 'Fictional Care Team Conversation' : 'Epic Messages'} revision={revision} />
        {mode === 'sample' ? <Card>
            <Text style={recordStyles.title}>Write a Sample Message</Text>
            <TextInput style={[recordStyles.input, { minHeight: 120, textAlignVertical: 'top', marginVertical: 14 }]} multiline
                       accessibilityLabel="Sample message" placeholder="Type a fictional message…" value={message} maxLength={2000} onChangeText={setMessage} />
            <PrimaryButton label={saving ? 'Saving…' : 'Save Simulated Message'} disabled={saving || !message.trim()} onPress={() => void send()} />
            <Text style={recordStyles.small}>Nothing is sent. Do not type real medical information.</Text>
        </Card> : null}
    </RecordsPage>;
}