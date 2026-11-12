import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

import { getDataMode, getGeneration, mobileSession, modeLabel, useDataMode } from '../services/dataMode';

const API_URL =
    Platform.OS === 'android'
        ? 'http://10.0.2.2:3001'
        : 'http://localhost:3001';



export function getMobileSession() {
  return { apiUrl: API_URL, token: mobileSession.token, mode: getDataMode() };
}

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

type ConnectedData = {
  token: string;
  snapshot: Snapshot;
};

type NativeAttempt = {
  id: string;
  generation: number;
  secret: string;
  result?: Promise<ConnectedData>;
};

let pendingLogin: NativeAttempt | null = null;

async function postJson(
    path: string,
    body: object,
    token?: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
          data.error || 'The connection could not be completed.'
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function finishConnection(
    attempt: NativeAttempt
): Promise<ConnectedData> {
  // Share one request if the browser result and Router callback
  // both try to collect the single-use connection result.
  if (!attempt.result) {
    attempt.result = (async () => {
      try {
        const claim = await postJson(
            '/api/native/claim',
            { id: attempt.id },
            attempt.secret
        );

        const data = await postJson(
            '/api/mobile/pair',
            { code: claim.code }
        );

        if (
            typeof data.token !== 'string' ||
            !data.snapshot ||
            !Array.isArray(data.snapshot.medications)
        ) {
          throw new Error(
              'The backend returned an unexpected response.'
          );
        }

        if (attempt.generation !== getGeneration() || getDataMode() !== 'api') {
          throw new Error('The data mode changed. Start a new connection.');
        }
        mobileSession.token = data.token;
        return data as ConnectedData;
      } finally {
        attempt.secret = '';
      }
    })();
  }

  return attempt.result;
}

export default function MedicationsScreen() {
  const router = useRouter();
  const mode = useDataMode();
  const isSample = mode === 'sample';

  const params = useLocalSearchParams<{
    epic?: string;
    attempt?: string;
  }>();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(isSample || Boolean(mobileSession.token));
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Handle Epic's return link if Router remounts this screen.
  useEffect(() => {
    const attempt = pendingLogin;

    if (
        isSample ||
        attempt?.generation !== getGeneration() ||
        params.epic !== 'connected' ||
        !attempt ||
        params.attempt !== attempt.id
    ) {
      return;
    }

    let active = true;

    setLoading(true);
    setError('');

    finishConnection(attempt)
        .then((data) => {
          if (active) {
            setSnapshot(data.snapshot);
          }
        })
        .catch((requestError) => {
          if (active) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Could not complete Epic sign-in.'
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

    return () => {
      active = false;
    };
  }, [params.epic, params.attempt, mode]);

  // Restore the saved connection when reopening this screen.
  useEffect(() => {
    // The return-link effect handles this case instead.
    if (
        !isSample &&
        pendingLogin?.generation === getGeneration() &&
        params.epic === 'connected' &&
        pendingLogin &&
        params.attempt === pendingLogin.id
    ) {
      return;
    }

    const savedToken = mobileSession.token;

    if (!isSample && !savedToken) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;

    async function restoreConnection() {
      try {
        const response = await fetch(
            `${API_URL}${isSample ? '/api/sample/medications' : '/api/mobile/medications'}`,
            {
              headers: {
                ...(!isSample && savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
              },
              signal: controller.signal,
            }
        );

        const data = await response.json();

        if (!response.ok) {
          if (
              response.status === 401 &&
              mobileSession.token === savedToken
          ) {
            mobileSession.token = null;
          }

          throw new Error(
              data.error || 'Could not load the saved data.'
          );
        }

        if (active) {
          setSnapshot(data);
        }
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

        if (active) {
          setLoading(false);
        }
      }
    }

    restoreConnection();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, reload]);

  // Clear the displayed snapshot when its access expires.
  useEffect(() => {
    if (!snapshot || isSample) return;

    const timeout = setTimeout(() => {
      mobileSession.token = null;
      pendingLogin = null;
      setSnapshot(null);
      setError(
          'Your sandbox connection expired. Connect to Epic again.'
      );
    }, Math.max(0, snapshot.expiresAt - Date.now()));

    return () => clearTimeout(timeout);
  }, [snapshot]);

  async function connect() {
    if (loading || isSample) return;

    setLoading(true);
    setError('');

    try {
      const started = await postJson('/api/native/start', {});

      if (
          typeof started.id !== 'string' ||
          typeof started.secret !== 'string' ||
          typeof started.loginUrl !== 'string'
      ) {
        throw new Error(
            'The backend could not start Epic sign-in.'
        );
      }

      const attempt: NativeAttempt = {
        id: started.id,
        generation: getGeneration(),
        secret: started.secret,
      };

      pendingLogin = attempt;

      const result = await WebBrowser.openAuthSessionAsync(
          started.loginUrl,
          'ezhealthcare://medications'
      );

      if (result.type !== 'success') {
        // Router may already be collecting a successful result.
        if (attempt.result) {
          const data = await attempt.result;
          setSnapshot(data.snapshot);
          return;
        }

        if (pendingLogin === attempt) {
          pendingLogin = null;
        }

        setError(
            'Sign-in was closed. Tap Connect to Epic to try again.'
        );
        return;
      }

      const returnedUrl = new URL(result.url);

      if (
          returnedUrl.protocol !== 'ezhealthcare:' ||
          returnedUrl.hostname !== 'medications' ||
          returnedUrl.searchParams.get('epic') !== 'connected' ||
          returnedUrl.searchParams.get('attempt') !== attempt.id
      ) {
        throw new Error(
            'The sign-in return link could not be verified.'
        );
      }

      const data = await finishConnection(attempt);
      setSnapshot(data.snapshot);
    } catch (requestError) {
      setError(
          requestError instanceof Error
              ? requestError.message
              : 'Could not connect. Check that the backend is running.'
      );
    } finally {
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
              {modeLabel(mode)} — test data only.
            </Text>
          </View>

          {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#17618E" />
                <Text
                    style={styles.body}
                    accessibilityLiveRegion="polite"
                >
                  Connecting…
                </Text>
              </View>
          )}

          {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
          ) : null}

          {!snapshot && !loading && !isSample && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Connect to Epic</Text>

                <Text style={styles.body}>
                  Sign into Epic’s sandbox to view the test patient’s
                  medication records. You will return here after approving
                  access.
                </Text>

                <Pressable
                    style={styles.button}
                    accessibilityRole="button"
                    onPress={connect}
                >
                  <Text style={styles.buttonText}>
                    Connect to Epic
                  </Text>
                </Pressable>
              </View>
          )}

          {isSample && !loading && !snapshot && (
              <Pressable style={styles.button} accessibilityRole="button" onPress={() => {
                setError('');
                setLoading(true);
                setReload((value) => value + 1);
              }}><Text style={styles.buttonText}>Try Again</Text></Pressable>
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
                    Retrieved:{' '}
                    {new Date(snapshot.fetchedAt).toLocaleString()}
                  </Text>

                  <Text style={styles.smallText}>
                    Saved snapshot — this screen does not continuously
                    update.
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
                            Historical order marked completed in the source
                            record.
                          </Text>
                      )}

                      <Text style={styles.detailLabel}>
                        Recorded dosage
                      </Text>
                      <Text style={styles.body}>
                        {medication.dosage}
                      </Text>

                      <Text style={styles.detailLabel}>
                        Recorded frequency
                      </Text>
                      <Text style={styles.body}>
                        {medication.frequency}
                      </Text>

                      <Text style={styles.detailLabel}>
                        Recorded instructions
                      </Text>
                      <Text style={styles.body}>
                        {medication.instructions}
                      </Text>

                      <Text style={styles.detailLabel}>Order date</Text>
                      <Text style={styles.body}>
                        {medication.authoredOn}
                      </Text>
                    </View>
                ))}

                {snapshot.warnings.map((warning, index) => (
                    <View key={index} style={styles.notice}>
                      <Text style={styles.noticeText}>{warning}</Text>
                    </View>
                ))}

                {!isSample && <Pressable
                    style={styles.button}
                    accessibilityRole="button"
                    onPress={() => {
                      mobileSession.token = null;
                      pendingLogin = null;
                      setSnapshot(null);
                      setError('');
                      router.setParams({ epic: '', attempt: '' });
                    }}
                >
                  <Text style={styles.buttonText}>Disconnect</Text>
                </Pressable>}
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