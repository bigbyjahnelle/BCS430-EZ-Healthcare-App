import * as Notifications from 'expo-notifications';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useModeGeneration } from '../services/dataMode';
import { configureNotifications, isReminderNotification } from '../services/reminders';

configureNotifications();

export default function RootLayout() {
    const generation = useModeGeneration();
    const router = useRouter();
    const navigationReady = Boolean(useRootNavigationState()?.key);
    const lastResponse = Notifications.useLastNotificationResponse();
    const handledResponse = useRef<string | null>(null);

    // Tapping a medication reminder opens today's doses - RD
    useEffect(() => {
        if (
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
        router.push('/reminders');
    }, [lastResponse, navigationReady, router]);

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack key={generation} screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
    );
}
