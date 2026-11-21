import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Card, PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, recordStyles } from '../components/RecordsPage';
import { useDataMode } from '../services/dataMode';
import { checkEpicConnection, connectEpic, disconnectEpic, finishEpicConnection } from '../services/epicConnection';
export default function EpicConnectionScreen() {
    const router = useRouter(), mode = useDataMode();
    const [connected, setConnected] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [expires, setExpires] = useState('');
    function apply(result: { connected: boolean; expiresAt: string | null }) {
        setConnected(result.connected); setExpires(result.expiresAt ?? '');
        setMessage(result.connected ? 'Connected to Epic. Open any supported record screen.' : 'No active Epic connection.');
    }
    useFocusEffect(useCallback(() => {
        if (mode !== 'api') return;
        let active = true;
        checkEpicConnection().then(result => { if (active) apply(result); }).catch(e => { if (active) setMessage(e instanceof Error ? e.message : 'Could not check the connection.'); });
        return () => { active = false; };
    }, [mode]));
    async function run(action: 'connect' | 'check' | 'disconnect') {
        if (busy) return; setBusy(true); setMessage('');
        try {
            if (action === 'disconnect') { await disconnectEpic(); apply({ connected: false, expiresAt: null }); }
            else apply(await (action === 'connect' ? connectEpic() : finishEpicConnection()));
        } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not connect.'); }
        finally { setBusy(false); }
    }
    return <RecordsPage title="Epic Connection">
        <Card><Text style={recordStyles.body}>Connect once to authorize the supported record screens. This uses Epic's synthetic sandbox—not real patient accounts. An expired authorization requires reconnecting.</Text></Card>
        {message ? <Card><Text accessibilityLiveRegion="polite" style={recordStyles.body}>{message}</Text>
            {connected && expires ? <Text style={recordStyles.small}>Connection expires: {new Date(expires).toLocaleString()}</Text> : null}</Card> : null}
        {mode === 'api' ? <>
            <PrimaryButton label={busy ? 'Working…' : connected ? 'Reconnect to Epic' : 'Connect to Epic'} disabled={busy} onPress={() => void run('connect')} />
            <PrimaryButton label="I Finished Sign-In — Check Connection" disabled={busy} onPress={() => void run('check')} />
            {connected ? <PrimaryButton label="Disconnect Epic" disabled={busy} onPress={() => void run('disconnect')} /> : null}
            <PrimaryButton label="Go to Home" disabled={busy} onPress={() => router.replace('/home')} />
        </> : <Text style={recordStyles.body}>Sample Data Mode does not need Epic. Change to API Mode first to connect.</Text>}
    </RecordsPage>;
}