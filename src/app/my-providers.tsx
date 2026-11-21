import { Text } from 'react-native';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
export default function ProvidersScreen() {
    return <RecordsPage title="My Providers">
        <Text style={recordStyles.warning}>Linked prescribing providers are not a complete care-team directory. Missing names or denied lookups are not replaced with invented providers.</Text>
        <SectionPanel section="providers" />
    </RecordsPage>;
}