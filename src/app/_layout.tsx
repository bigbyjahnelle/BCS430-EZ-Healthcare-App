import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import {
    Stack,
    useRootNavigationState,
    useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
    selectDataMode,
    useModeGeneration,
} from '../services/dataMode';

import {
    configureNotifications,
    isReminderNotification,
    resyncNotifications,
    suspendReminderNotifications,
} from '../services/reminders';

import { clearEpicAttempt } from '../services/epicConnection';
import { supabase } from '../services/supabase';

configureNotifications();

export default function RootLayout() {
    const generation = useModeGeneration();
    const router = useRouter();

    const navigationReady = Boolean(
        useRootNavigationState()?.key
    );

    const lastResponse =
        Notifications.useLastNotificationResponse();

    const handledResponse = useRef<string | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!supabase) {
            setReady(true);
            return;
        }

        let active = true;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (active) {
                    setSession(nextSession);
                    setReady(true);
                }
            }
        );

        void supabase.auth
            .getSession()
            .then(({ data }) => {
                if (active) {
                    setSession(data.session);
                    setReady(true);
                }
            })
            .catch(() => {
                if (active) {
                    setReady(true);
                }
            });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        clearEpicAttempt();

        if (!session) {
            selectDataMode('sample');
        }
    }, [session?.user.id]);

    useEffect(() => {
        // Cancel the previous account/mode's alerts before rescheduling.
        void suspendReminderNotifications()
            .then(() => {
                return session
                    ? resyncNotifications()
                    : undefined;
            })
            .catch(() => undefined);
    }, [session?.user.id, generation]);

    useEffect(() => {
        if (
            !ready ||
            !navigationReady ||
            !session ||
            !lastResponse ||
            lastResponse.actionIdentifier !==
            Notifications.DEFAULT_ACTION_IDENTIFIER ||
            !isReminderNotification(
                lastResponse.notification.request.content.data
            )
        ) {
            return;
        }

        const id =
            `${lastResponse.notification.request.identifier}:` +
            `${lastResponse.notification.date}`;

        if (handledResponse.current === id) return;

        handledResponse.current = id;
        router.push('/reminders');
    }, [
        ready,
        navigationReady,
        session,
        lastResponse,
        router,
    ]);

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />

            {!ready ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                    }}
                >
                    <ActivityIndicator size="large" />
                    <Text>Checking your session…</Text>
                </View>
            ) : (
                <Stack
                    key={`${session?.user.id ?? 'signed-out'}:${generation}`}
                    screenOptions={{ headerShown: false }}
                >
                    <Stack.Protected guard={!session}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="login" />
                        <Stack.Screen name="signup" />
                        <Stack.Screen name="verify-email" />
                    </Stack.Protected>

                    <Stack.Protected guard={Boolean(session)}>
                        <Stack.Screen name="welcome" />
                        <Stack.Screen name="home" />

                        <Stack.Screen name="profile" />
                        <Stack.Screen name="my-health" />

                        <Stack.Screen name="medications" />
                        <Stack.Screen name="my-providers" />

                        <Stack.Screen name="test-results" />
                        <Stack.Screen name="insurance" />

                        <Stack.Screen name="messages" />
                        <Stack.Screen name="share" />
                        <Stack.Screen name="help" />

                        <Stack.Screen name="connect-epic" />
                        <Stack.Screen name="reminders" />

                        <Stack.Screen name="appointments" />
                        <Stack.Screen name="appointment-detail" />
                        <Stack.Screen name="new-appointment" />

                        <Stack.Screen name="accessibility" />
                        <Stack.Screen name="accessibility/[category]" />

                        <Stack.Screen name="demo" />
                    </Stack.Protected>
                </Stack>
            )}
        </SafeAreaProvider>
    );
}