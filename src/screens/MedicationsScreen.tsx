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

import PageBackground from '../components/PageBackground';
import {
  BLUE,
  BORDER,
  Card,
  FONT,
  GEAR_CLEARANCE,
  INK,
  ScreenHeader,
  shadow,
} from '../components/ScreenParts';
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
      <PageBackground>
        <SafeAreaView style={styles.screen}>
          <Stack.Screen options={{ headerShown: false }} />

          <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
            <ScreenHeader title="Medications" />

            <Pressable
                style={styles.secondaryButton}
                accessibilityRole="button"
                onPress={() => router.push('/reminders')}
            >
              <Ionicons name="alarm-outline" size={26} color={BLUE} accessible={false} />
              <Text style={styles.secondaryButtonText}>My Reminders & Today’s Doses</Text>
            </Pressable>

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {modeLabel(mode)} — test data only.
              </Text>
            </View>

            {loading && (
                <Card style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={BLUE} />
                  <Text
                      style={styles.body}
                      accessibilityLiveRegion="polite"
                  >
                    Connecting…
                  </Text>
                </Card>
            )}

            {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.error} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
            ) : null}

            {!snapshot && !loading && !isSample && (
                <Card style={styles.cardGap}>
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
                </Card>
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
                  <Card style={styles.cardGap}>
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
                  </Card>

                  {snapshot.medications.length === 0 && (
                      <Card>
                        <Text style={styles.body}>
                          No medication orders were returned.
                        </Text>
                      </Card>
                  )}

                  {snapshot.medications.map((medication) => (
                      <Card key={medication.id} style={styles.cardGap}>
                        <View style={styles.medHeader}>
                          <View style={styles.iconCircle}>
                            <Ionicons
                                name="medkit-outline"
                                size={32}
                                color={BLUE}
                                accessible={false}
                            />
                          </View>

                          <Text
                              style={[styles.cardTitle, styles.flex]}
                              accessibilityRole="header"
                          >
                            {medication.name}
                          </Text>
                        </View>

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

                        {medication.status !== 'completed' && (
                            <Pressable
                                style={styles.secondaryButton}
                                accessibilityRole="button"
                                accessibilityLabel={`Set a reminder for ${medication.name}`}
                                onPress={() => router.push({
                                  pathname: '/reminders',
                                  params: {
                                    medicationName: medication.name,
                                    dosage: medication.dosage === 'Not provided' ? '' : medication.dosage,
                                  },
                                })}
                            >
                              <Ionicons name="alarm-outline" size={26} color={BLUE} accessible={false} />
                              <Text style={styles.secondaryButtonText}>Set Reminder</Text>
                            </Pressable>
                        )}
                      </Card>
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
      </PageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: GEAR_CLEARANCE,
    gap: 16,
  },
  flex: {
    flex: 1,
  },
  notice: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E7F2EC',
    borderWidth: 1.5,
    borderColor: '#B9DCC8',
  },
  noticeText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#18533F',
  },
  cardGap: {
    gap: 12,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF5',
  },
  cardTitle: {
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: '800',
    color: INK,
  },
  body: {
    fontSize: 20,
    lineHeight: 29,
    color: INK,
  },
  smallText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#2E3A42',
  },
  detailLabel: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '800',
    color: BLUE,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#DCEAF5',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
  },
  button: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: BLUE,
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  buttonText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: BLUE,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    color: BLUE,
    textAlign: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 16,
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#9B2424',
  },
  error: {
    fontSize: 18,
    lineHeight: 27,
    color: '#9B2424',
  },
});