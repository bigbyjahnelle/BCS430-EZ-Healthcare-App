import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useModeGeneration } from '../services/dataMode';

export default function RootLayout() {
    const generation = useModeGeneration();
    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack key={generation} screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
    );
}