import { Text } from 'react-native';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
export default function InsuranceScreen() {
    return <RecordsPage title="Insurance">
        <Text style={recordStyles.warning}>Coverage records are not a guarantee of eligibility, benefits, or payment. Sample insurance cannot be used for care.</Text>
        <SectionPanel section="insurance" />
    </RecordsPage>;
}