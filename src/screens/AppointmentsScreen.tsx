import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
import { useDataMode } from '../services/dataMode';
export default function AppointmentsScreen() {
  const router = useRouter(), mode = useDataMode();
  return <RecordsPage title="Appointments">
    {mode === 'sample'
        ? <PrimaryButton label="+ New Sample Appointment" onPress={() => router.push('/new-appointment')} />
        : <Text style={recordStyles.warning}>Epic appointments are read-only in this integration. Booking, rescheduling and cancellation must be arranged with the care team.</Text>}
    <SectionPanel section="appointments" heading="Appointments and Statuses"
                  onItem={item => router.push({ pathname: '/appointment-detail', params: { id: item.id } })} />
  </RecordsPage>;
}