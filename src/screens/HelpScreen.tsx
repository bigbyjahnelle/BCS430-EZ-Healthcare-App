import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, PrimaryButton } from '../components/ScreenParts';
import { RecordsPage, recordStyles } from '../components/RecordsPage';
import { useDataMode } from '../services/dataMode';

type HelpTopic = { question: string; answer: string };

export default function HelpScreen() {
    const router = useRouter();
    const mode = useDataMode();
    const isSample = mode === 'sample';

    const topics: HelpTopic[] = [
        {
            question: 'How do I find what I need?',
            answer: 'Choose a button on Home, such as Medications or Appointments. Scroll down for more options. Use the Back button at the top of a screen to return to the previous page.',
        },
        {
            question: 'Where are my personal details and vital signs?',
            answer: 'Tap Profile at the top of Home. Your personal information appears first, followed by vital signs such as blood pressure and heart rate. In Sample Data Mode, the person and readings are fictional.',
        },
        {
            question: 'How do I check medications?',
            answer: 'Open Medications from Home to see the available orders and their details. Check each order’s status. A completed order is a past order and does not mean you currently take that medication. Do not change your medication based on this demonstration.',
        },
        {
            question: 'How do I set a reminder?',
            answer: 'Open Reminders, tap Add Reminder, and enter a medication name and reminder times. Save it, and allow notifications if you want phone alerts. You can also start from Set Reminder on an active medication order. Reminders help you remember your own schedule; they do not replace your provider’s instructions.',
        },
        {
            question: 'How do I check an appointment?',
            answer: isSample
                ? 'Open Appointments and tap an appointment to see its details. You can try creating, rescheduling, or cancelling a sample appointment. These are practice actions only—no clinic is contacted and no real appointment changes.'
                : 'Open Appointments and tap an appointment to see its details and status. Appointments from Epic can be viewed here, but this app cannot book, reschedule, or cancel them. Contact your care team to make a real change.',
        },
        {
            question: 'What do the test result colors mean?',
            answer: 'Open Test Results to see the reported values and reference ranges. Green means the source marked a result normal; amber means abnormal; red means critical. Gray means a range status was not supplied. A color alone does not explain what a result means for a person’s health.',
        },
        {
            question: 'Where can I find providers and insurance?',
            answer: 'Choose My Providers or Insurance from Home. Provider information may include only the people linked to the available medication orders. Insurance details are not a guarantee that a service is covered. Sample insurance and provider details are fictional.',
        },
        {
            question: 'How do messages work?',
            answer: isSample
                ? 'Open Messages to try the fictional care-team conversation. Type a message and tap Save Simulated Message. It stays on this device and is not sent to a provider. Do not enter private medical information.'
                : 'Sending messages to a care team and viewing a MyChart inbox are not available in this version. Use your care team’s usual contact method. Messages in this app are not monitored.',
        },
        {
            question: 'How do I share information?',
            answer: 'Open Share and select the information you want to include. Tap Generate Preview and read it carefully. Choose Review and Share, confirm your choice, then select an app and recipient. Nothing is shared automatically. Check the recipient before sending.',
        },
        {
            question: 'Why can’t I see some information?',
            answer: isSample
                ? 'Sample Data Mode contains a small set of fictional records so you can explore the app. It does not contain your personal medical history.'
                : 'Some records may not be available to this app. If the app says your connection expired, open Connect / Manage Epic on Home and sign in again. Check your internet connection if information will not load. Missing information does not mean that no record exists.',
        },
        {
            question: 'Will my reminders and practice changes stay saved?',
            answer: 'Reminders and sample changes are saved for your account and selected mode on this device. They do not automatically move to another phone. Uninstalling the app or clearing its saved data removes them.',
        },
        {
            question: 'How do I sign out?',
            answer: 'Return to Home and tap Log Out at the top. Sign out when you finish, especially if someone else uses the same device.',
        },
    ];

    return (
        <RecordsPage title="Help">
            <Card>
                <View style={{ gap: 10 }}>
                    <Text style={recordStyles.title}>How can we help?</Text>
                    <Text style={recordStyles.body}>
                        Find simple steps for using EZ Healthcare below.
                    </Text>
                    <Text style={recordStyles.small}>
                        {isSample
                            ? 'You are exploring Sample Data Mode. All records are fictional and practice actions do not affect real care.'
                            : 'You are using API Mode with Epic’s test records. This demonstration is not connected to your real medical care.'}
                    </Text>
                </View>
            </Card>

            {topics.map(({ question, answer }) => (
                <Card key={question}>
                    <View style={{ gap: 10 }}>
                        <Text style={recordStyles.title} accessibilityRole="header">
                            {question}
                        </Text>
                        <Text style={recordStyles.body}>{answer}</Text>
                    </View>
                </Card>
            ))}

            <Text style={recordStyles.warning}>
                EZ Healthcare is a demonstration, not a medical advice or emergency
                service. Do not use its messages or reminders to request urgent help.
            </Text>

            {isSample ? null : (
                <PrimaryButton
                    label="Manage My Epic Connection"
                    onPress={() => router.push('/connect-epic')}
                />
            )}

            <PrimaryButton
                label="Return to Home"
                onPress={() => router.replace('/home')}
            />
        </RecordsPage>
    );
}
