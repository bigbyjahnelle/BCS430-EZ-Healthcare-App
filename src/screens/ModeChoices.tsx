import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
    onApiMode: () => void;
};

export default function ModeChoices({ onApiMode }: Props) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Pressable
                accessibilityRole="button"
                accessibilityHint="Browse fictional records without signing into Epic"
                onPress={() => router.push('/demo')}
                style={[styles.button, styles.primary]}
            >
                <Text style={[styles.label, styles.primaryLabel]}>
                    Sample Data Mode
                </Text>
                <Text style={[styles.description, styles.primaryLabel]}>
                    Explore the app with fictional records.
                </Text>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityHint="Continue to the existing app flow for Epic sandbox access"
                onPress={onApiMode}
                style={[styles.button, styles.secondary]}
            >
                <Text style={styles.label}>API Mode</Text>
                <Text style={styles.description}>
                    Continue to the app and connect to Epic’s sandbox.
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: 12,
    },
    button: {
        minHeight: 64,
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#17618E',
    },
    primary: {
        backgroundColor: '#17618E',
    },
    secondary: {
        backgroundColor: '#FFFFFF',
    },
    label: {
        color: '#0B2236',
        fontSize: 20,
        fontWeight: '700',
    },
    description: {
        color: '#44525A',
        fontSize: 16,
        marginTop: 4,
    },
    primaryLabel: {
        color: '#FFFFFF',
    },
});