import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Android Studio emulator connects to your Mac through 10.0.2.2.
// localhost works for the iOS simulator on your Mac.
const API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

type Medication = {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  source: string;
  last_synced_at: string | null;
};

export default function MedicationsScreen() {
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // Stop waiting if the backend does not respond within 10 seconds.
    const timeout = setTimeout(() => controller.abort(), 10000);

    async function loadMedications() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `${API_URL}/api/demo/medications`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Request failed: HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.medications)) {
          throw new Error('Unexpected medication response.');
        }

        if (active) {
          setMedications(data.medications);
        }
      } catch (requestError) {
        if (active) {
          console.error('Medication request failed:', requestError);
          setError(
            'We could not load your medications. Please try again.'
          );
        }
      } finally {
        clearTimeout(timeout);

        if (active) {
          setLoading(false);
        }
      }
    }

    loadMedications();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back-outline"
            size={26}
            color="#17618E"
            accessible={false}
          />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Medications
        </Text>

        <View style={styles.demoNotice}>
          <Text style={styles.demoText}>
            Demo — fictional medication data for Matt.
          </Text>
        </View>

        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator
              size="large"
              color="#17618E"
              accessibilityLabel="Loading medications"
            />
            <Text
              style={styles.body}
              accessibilityLiveRegion="polite"
            >
              Loading medications…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>

            <Pressable
              style={styles.actionButton}
              accessibilityRole="button"
              onPress={() => setAttempt((value) => value + 1)}
            >
              <Text style={styles.actionText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {medications.length === 0 ? (
              <Text style={styles.body}>
                No medications to display.
              </Text>
            ) : (
              medications.map((medication) => (
                <View key={medication.id} style={styles.card}>
                  <Ionicons
                    name="medkit-outline"
                    size={36}
                    color="#17618E"
                    accessible={false}
                  />

                  <Text
                    style={styles.medicationName}
                    accessibilityRole="header"
                  >
                    {medication.name}
                  </Text>

                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Dosage</Text>
                    <Text style={styles.body}>
                      {medication.dosage}
                    </Text>
                  </View>

                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>Frequency</Text>
                    <Text style={styles.body}>
                      {medication.frequency}
                    </Text>
                  </View>

                  {medication.instructions ? (
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>
                        Instructions
                      </Text>
                      <Text style={styles.body}>
                        {medication.instructions}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}

            <Pressable
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh medications"
              onPress={() => setAttempt((value) => value + 1)}
            >
              <Text style={styles.actionText}>Refresh</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F3',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    padding: 20,
    gap: 20,
  },
  backButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#17618E',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#17618E',
  },
  demoNotice: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#E7F2EC',
  },
  demoText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#18533F',
  },
  statusBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 20,
  },
  card: {
    padding: 22,
    gap: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },
  medicationName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B2236',
  },
  detail: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17618E',
  },
  body: {
    fontSize: 20,
    lineHeight: 30,
    color: '#0B2236',
  },
  errorText: {
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    color: '#9B2424',
  },
  actionButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#17618E',
  },
  actionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});