import { Text } from 'react-native';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
export default function TestResultsScreen() {
    return <RecordsPage title="Test Results">
        <Text style={recordStyles.warning}>Colors follow the record's reported interpretation: green for normal, amber for abnormal, and red for critical. Unflagged results remain neutral—not assumed normal. Reference ranges can differ between patients and laboratories.</Text>
        <SectionPanel section="test-results" />
    </RecordsPage>;
}