import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useModeGeneration } from '../services/dataMode';
import { configureNotifications, isReminderNotification } from '../services/reminders';
import { supabase } from '../services/supabase';

configureNotifications();

export default function RootLayout() {
    const generation = useModeGeneration();
    const router = useRouter();
    const navigationReady = Boolean(useRootNavigationState()?.key);
    const lastResponse = Notifications.useLastNotificationResponse();
    const handledResponse = useRef<string | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        if (!supabase) {
            setAuthReady(true);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                setSession(nextSession);
                setAuthReady(true);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (
            !authReady ||
            !navigationReady ||
            !lastResponse ||
            lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
            !isReminderNotification(lastResponse.notification.request.content.data)
        ) {
            return;
        }

        const id = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;

        if (handledResponse.current === id) return;
        handledResponse.current = id;

        // A reminder tap must not bypass Login.
        if (session) {
            router.push('/reminders');
        }
    }, [authReady, lastResponse, navigationReady, router, session]);

    const signedIn = session !== null;

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />

            {!authReady ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        backgroundColor: '#F7F8F3',
                    }}
                >
                    <ActivityIndicator size="large" color="#17618E" />
                    <Text accessibilityLiveRegion="polite">Checking your session…</Text>
                </View>
            ) : (
                <Stack key={generation} screenOptions={{ headerShown: false }}>
                    <Stack.Protected guard={!signedIn}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="login" />
                        <Stack.Screen name="signup" />
                    </Stack.Protected>

                    <Stack.Protected guard={signedIn}>
                        <Stack.Screen name="welcome" />
                        <Stack.Screen name="home" />
                        <Stack.Screen name="accessibility" />
                        <Stack.Screen name="demo" />
                        <Stack.Screen name="medications" />
                        <Stack.Screen name="my-health" />
                        <Stack.Screen name="my-providers" />
                        <Stack.Screen name="reminders" />
                        <Stack.Screen name="test-results" />
                    </Stack.Protected>
                </Stack>
            )}
        </SafeAreaProvider>
    );
}