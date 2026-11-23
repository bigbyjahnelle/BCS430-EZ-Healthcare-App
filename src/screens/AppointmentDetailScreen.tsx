import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, RecordCard, recordStyles } from '../components/RecordsPage';
import type { Item } from '../data/fhir';
import { useDataMode } from '../services/dataMode';
import { cancelSampleAppointment, loadSection } from '../services/healthcare';
export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(), router = useRouter(), mode = useDataMode();
  const [item, setItem] = useState<Item | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; const controller = new AbortController();
    setItem(null); setError(''); setBusy(true);
    loadSection('appointments', controller.signal).then(data => {
      const found = data.items.find(x => x.id === id); if (!found) throw new Error('Appointment not found. Go back and select an appointment.');
      if (active) setItem(found);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load appointment.'); })
        .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [id, mode, revision]));
  function cancel() {
    if (!id || mode !== 'sample' || busy) return;
    Alert.alert('Cancel this sample appointment?', 'This changes only your fictional records on this device. No clinic will be contacted.', [
      { text: 'Keep Appointment', style: 'cancel' }, { text: 'Cancel Sample Appointment', style: 'destructive', onPress: () => {
          setBusy(true);
          void cancelSampleAppointment(id).then(() => setRevision(v => v + 1)).catch(e => setError(e instanceof Error ? e.message : 'Could not cancel.')).finally(() => setBusy(false));
        } },
    ]);
  }
  return <RecordsPage title="Appointment">
    {busy ? <ActivityIndicator size="large" /> : null}
    {error ? <Text accessibilityRole="alert" style={recordStyles.error}>{error}</Text> : null}
    {item ? <RecordCard item={item} /> : null}
    {mode === 'sample' && item && item.status !== 'cancelled' ? <>
      <PrimaryButton label="Reschedule Sample Appointment" disabled={busy} onPress={() => router.push({ pathname: '/new-appointment', params: { id: item.id } })} />
      <PrimaryButton label="Cancel Sample Appointment" disabled={busy} onPress={cancel} />
    </> : null}
    {mode === 'api' ? <Text style={recordStyles.warning}>Read-only Epic record. No booking or cancellation request can be sent from this demo.</Text> : null}
  </RecordsPage>;
}