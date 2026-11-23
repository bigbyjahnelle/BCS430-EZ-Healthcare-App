import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Card, PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, recordStyles } from '../components/RecordsPage';
import { arr, obj, str } from '../data/fhir';
import { useDataMode } from '../services/dataMode';
import { getAppointment, saveSampleAppointment } from '../services/healthcare';
import type { AppointmentInput } from '../services/healthcare';
const blank: AppointmentInput = { provider: '', reason: '', date: '', time: '', notes: '', type: 'In-Person' };
export default function NewAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(), router = useRouter(), mode = useDataMode();
  const [form, setForm] = useState<AppointmentInput>(blank), [saving, setSaving] = useState(false), [loading, setLoading] = useState(Boolean(id)), [error, setError] = useState('');
  useEffect(() => {
    if (!id || mode !== 'sample') return;
    let active = true;
    getAppointment(id).then(a => {
      const d = new Date(str(a.start)), p = arr(a.participant).map(x => obj(obj(x).actor)).find(x => str(x.reference).startsWith('Practitioner/'));
      if (active) setForm({ provider: str(p?.display), reason: str(a.description), notes: str(a.comment), type: str(obj(a.appointmentType).text) || 'In-Person',
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` });
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load appointment.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, mode]);
  async function save() {
    if (mode !== 'sample' || saving || loading) return;
    setSaving(true); setError('');
    try {
      const nextId = await saveSampleAppointment(form, id);
      Alert.alert('Sample appointment saved', 'No real appointment was booked and no clinic was contacted.');
      router.replace({ pathname: '/appointment-detail', params: { id: nextId } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save appointment.'); }
    finally { setSaving(false); }
  }
  const field = (key: keyof AppointmentInput, label: string, placeholder: string) => <View style={{ gap: 6 }} key={key}>
    <Text style={recordStyles.body}>{label}</Text>
    <TextInput style={recordStyles.input} accessibilityLabel={label} value={form[key]} placeholder={placeholder}
               editable={!saving && !loading} onChangeText={value => setForm(v => ({ ...v, [key]: value }))} maxLength={key === 'notes' ? 1000 : 200} />
  </View>;
  return <RecordsPage title={id ? 'Reschedule' : 'New Appointment'}>
    {mode === 'sample' ? <>
      <Text style={recordStyles.warning}>Sample booking simulation only. Dates and times use this device's local timezone.</Text>
      <Card><View style={{ gap: 14 }}>
        {field('provider', 'Fictional provider', 'e.g. Dr. Avery Sample')}
        {field('reason', 'Reason for visit', 'e.g. Sample follow-up')}
        {field('date', 'Date — YYYY-MM-DD', '2026-12-01')}
        {field('time', 'Time — 24-hour HH:MM', '10:30')}
        {field('notes', 'Notes (optional)', 'Fictional notes only')}
        <PrimaryButton label={form.type} onPress={() => setForm(v => ({ ...v, type: v.type === 'In-Person' ? 'Telehealth' : 'In-Person' }))} disabled={saving || loading} />
      </View></Card>
      {error ? <Text style={recordStyles.error} accessibilityRole="alert">{error}</Text> : null}
      <PrimaryButton label={loading ? 'Loading…' : saving ? 'Saving…' : 'Save Sample Appointment'} onPress={() => void save()} disabled={saving || loading} />
    </> : <Text style={recordStyles.warning}>Real Epic booking is not implemented. Return to Appointments to view the API records.</Text>}
  </RecordsPage>;
}