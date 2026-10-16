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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL =
    Platform.OS === 'android'
        ? 'http://10.0.2.2:3001'
        : 'http://localhost:3001';

// Retained while the app is running, including when navigating back.
let demoToken: string | null = null;

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  status: string;
  authoredOn: string;
};

type Snapshot = {
  source: string;
  fetchedAt: string;
  expiresAt: number;
  patient: {
    id: string;
    name: string;
  };
  medications: Medication[];
  warnings: string[];
};

export default function MedicationsScreen() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(demoToken));
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const timeout = setTimeout(() => controller.abort(), 15000);

    async function restoreConnection() {
      if (!demoToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/mobile/medications`, {
          headers: {
            Authorization: `Bearer ${demoToken}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) demoToken = null;
          throw new Error(data.error || 'Could not load the saved data.');
        }

        if (active) setSnapshot(data);
      } catch (requestError) {
        if (active) {
          setError(
              requestError instanceof Error
                  ? requestError.message
                  : 'Could not connect to the backend.'
          );
        }
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }

    restoreConnection();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // Clear the displayed snapshot when its demo access expires.
  useEffect(() => {
    if (!snapshot) return;

    const timeout = setTimeout(() => {
      demoToken = null;
      setSnapshot(null);
      setError('Demo access expired. Generate a new code on your Mac.');
    }, Math.max(0, snapshot.expiresAt - Date.now()));

    return () => clearTimeout(timeout);
  }, [snapshot]);

  async function connect() {
    if (!code.trim() || loading) return;

    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_URL}/api/mobile/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not pair the app.');
      }

      demoToken = data.token;
      setSnapshot(data.snapshot);
      setCode('');
    } catch (requestError) {
      setError(
          requestError instanceof Error
              ? requestError.message
              : 'Could not connect. Check that the backend is running.'
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
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
            Medication Records
          </Text>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Epic sandbox demonstration — fictional patient data.
            </Text>
          </View>

          {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#17618E" />
                <Text style={styles.body} accessibilityLiveRegion="polite">
                  Connecting…
                </Text>
              </View>
          )}

          {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
          ) : null}

          {!snapshot && !loading && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Connect to the demo</Text>

                <Text style={styles.body}>
                  Enter the pairing code shown in your Mac’s browser.
                </Text>

                <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="Pairing code"
                    placeholderTextColor="#566575"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                    accessibilityLabel="Pairing code"
                    onSubmitEditing={connect}
                />

                <Pressable
                    style={[
                      styles.button,
                      !code.trim() && styles.disabledButton,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !code.trim() }}
                    disabled={!code.trim()}
                    onPress={connect}
                >
                  <Text style={styles.buttonText}>Connect</Text>
                </Pressable>
              </View>
          )}

          {snapshot && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {snapshot.patient.name}
                  </Text>

                  <Text style={styles.body}>
                    Source: {snapshot.source}
                  </Text>

                  <Text style={styles.smallText}>
                    Retrieved: {new Date(snapshot.fetchedAt).toLocaleString()}
                  </Text>

                  <Text style={styles.smallText}>
                    Saved snapshot — this screen does not continuously update.
                  </Text>
                </View>

                {snapshot.medications.length === 0 && (
                    <Text style={styles.body}>
                      No medication orders were returned.
                    </Text>
                )}

                {snapshot.medications.map((medication) => (
                    <View key={medication.id} style={styles.card}>
                      <Ionicons
                          name="medkit-outline"
                          size={36}
                          color="#17618E"
                          accessible={false}
                      />

                      <Text
                          style={styles.cardTitle}
                          accessibilityRole="header"
                      >
                        {medication.name}
                      </Text>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          Status: {medication.status}
                        </Text>
                      </View>

                      {medication.status === 'completed' && (
                          <Text style={styles.smallText}>
                            Historical order marked completed in the source record.
                          </Text>
                      )}

                      <Text style={styles.detailLabel}>Recorded dosage</Text>
                      <Text style={styles.body}>{medication.dosage}</Text>

                      <Text style={styles.detailLabel}>Recorded frequency</Text>
                      <Text style={styles.body}>{medication.frequency}</Text>

                      <Text style={styles.detailLabel}>Recorded instructions</Text>
                      <Text style={styles.body}>{medication.instructions}</Text>

                      <Text style={styles.detailLabel}>Order date</Text>
                      <Text style={styles.body}>{medication.authoredOn}</Text>
                    </View>
                ))}

                {snapshot.warnings.map((warning, index) => (
                    <View key={index} style={styles.notice}>
                      <Text style={styles.noticeText}>{warning}</Text>
                    </View>
                ))}

                <Pressable
                    style={styles.button}
                    accessibilityRole="button"
                    onPress={() => {
                      demoToken = null;
                      setSnapshot(null);
                      setCode('');
                      setError('');
                    }}
                >
                  <Text style={styles.buttonText}>Enter a New Code</Text>
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
    fontSize: 30,
    fontWeight: '800',
    color: '#17618E',
  },
  notice: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#E7F2EC',
  },
  noticeText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#18533F',
  },
  card: {
    padding: 22,
    gap: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B2236',
  },
  body: {
    fontSize: 20,
    lineHeight: 29,
    color: '#0B2236',
  },
  smallText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#425466',
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17618E',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EDF0F3',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B2236',
  },
  input: {
    minHeight: 60,
    padding: 14,
    borderWidth: 2,
    borderColor: '#17618E',
    borderRadius: 12,
    fontSize: 22,
    color: '#0B2236',
    backgroundColor: '#FFFFFF',
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#17618E',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  error: {
    fontSize: 18,
    lineHeight: 27,
    color: '#9B2424',
  },
});