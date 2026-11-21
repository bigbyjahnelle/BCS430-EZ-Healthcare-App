import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
export default function MedicationsScreen() {
  const router = useRouter();
  return <RecordsPage title="Medications">
    <PrimaryButton label="My Reminders & Today's Doses" onPress={() => router.push('/reminders')} />
    <Text style={recordStyles.warning}>Orders retain their source status. A completed order does not mean you currently take it. Reminder schedules are entered by you—not prescribed by this app.</Text>
    <SectionPanel section="medications" renderAction={item => item.status === 'active' ?
        <PrimaryButton label={`Set Reminder: ${item.title}`} onPress={() => router.push({ pathname: '/reminders',
          params: { medicationName: item.title, dosage: item.lines.find(x => x.label === 'Dose')?.value ?? '' } })} /> : null} />
  </RecordsPage>;
}