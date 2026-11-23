import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Card } from '../components/ScreenParts';
import { RecordsPage, SectionPanel, recordStyles } from '../components/RecordsPage';
import { supabase } from '../services/supabase';
export default function ProfileScreen() {
    const [email, setEmail] = useState('');
    useEffect(() => { let active = true; void supabase?.auth.getSession().then(({ data }) => { if (active) setEmail(data.session?.user.email ?? ''); }); return () => { active = false; }; }, []);
    return <RecordsPage title="Profile">
        <Card><Text style={recordStyles.body}>EZ Healthcare account: {email || 'Signed in'}</Text>
            <Text style={recordStyles.small}>Your app account is separate from the patient record shown below.</Text></Card>
        <SectionPanel section="profile" heading="Personal Information" />
        <SectionPanel section="vitals" heading="Vital Signs" />
    </RecordsPage>;
}