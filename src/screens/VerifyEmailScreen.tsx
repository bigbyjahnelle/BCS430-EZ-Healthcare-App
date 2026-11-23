import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageBackground from '../components/PageBackground';
import {
    BLUE,
    Card,
    FONT,
    INK,
    PrimaryButton,
} from '../components/ScreenParts';
import { supabase } from '../services/supabase';

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams<{
        email?: string;
        sent?: string;
    }>();

    const router = useRouter();

    const [email, setEmail] = useState(
        typeof params.email === 'string' ? params.email : ''
    );
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
    const [error, setError] = useState('');

    const [message, setMessage] = useState(
        params.sent === '1'
            ? 'If signup was accepted, your email contains a verification code. Check your inbox and spam folder.'
            : 'Enter the code from your most recent signup email. Need another code? Use Resend Code below.'
    );

    const [nextSendAt, setNextSendAt] = useState(
        params.sent === '1' ? Date.now() + 60000 : 0
    );
    const [now, setNow] = useState(Date.now());

    const inFlight = useRef(false);
    const mounted = useRef(true);

    const seconds = Math.max(
        0,
        Math.ceil((nextSendAt - now) / 1000)
    );

    useEffect(() => {
        mounted.current = true;

        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => {
            mounted.current = false;
            clearInterval(timer);
        };
    }, []);

    function validEmail() {
        const value = email.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setError('Enter the email address you used to sign up.');
            return null;
        }

        return value;
    }

    async function verify() {
        if (inFlight.current) return;

        const address = validEmail();
        if (!address) return;

        const token = code.replace(/\s/g, '');

        if (!/^\d{6,10}$/.test(token)) {
            setError('Enter the complete numeric code from your email.');
            return;
        }

        if (!supabase) {
            setError(
                'Sign-in is not configured. Please contact the project team.'
            );
            return;
        }

        inFlight.current = true;
        setBusy('verify');
        setError('');
        setMessage('');

        try {
            const { data, error: verifyError } =
                await supabase.auth.verifyOtp({
                    email: address,
                    token,
                    type: 'email',
                });

            if (!mounted.current) return;

            if (verifyError) {
                setError(
                    verifyError.code === 'otp_expired'
                        ? 'That code is invalid, expired, or already used. Check the latest email or request a new code.'
                        : verifyError.message
                );
                return;
            }

            setCode('');

            if (data.session) {
                // The root authentication listener opens Welcome.
                setMessage('Email verified. Opening EZ Healthcare…');
            } else {
                Alert.alert(
                    'Verification completed',
                    'Return to Login and sign in with your email and password.',
                    [
                        {
                            text: 'Go to Login',
                            onPress: () => router.replace('/login'),
                        },
                    ]
                );
            }
        } catch {
            if (mounted.current) {
                setError(
                    'Could not reach the sign-in service. Check your internet connection and try again.'
                );
            }
        } finally {
            inFlight.current = false;

            if (mounted.current) {
                setBusy(null);
            }
        }
    }

    async function resend() {
        if (inFlight.current || Date.now() < nextSendAt) return;

        const address = validEmail();
        if (!address) return;

        if (!supabase) {
            setError(
                'Sign-in is not configured. Please contact the project team.'
            );
            return;
        }

        inFlight.current = true;
        setBusy('resend');
        setError('');
        setMessage('');

        // Supabase also enforces its own server-side limits.
        setNextSendAt(Date.now() + 60000);
        setNow(Date.now());

        try {
            const { error: resendError } =
                await supabase.auth.resend({
                    type: 'signup',
                    email: address,
                });

            if (!mounted.current) return;

            if (resendError) {
                setError(resendError.message);
                return;
            }

            setCode('');

            setMessage(
                'If this account still needs verification, a new code has been requested. Use the newest email. Already verified? Return to Login.'
            );
        } catch {
            if (mounted.current) {
                setError(
                    'Could not request another code. Check your internet connection and try again.'
                );
            }
        } finally {
            inFlight.current = false;

            if (mounted.current) {
                setBusy(null);
            }
        }
    }

    return (
        <PageBackground>
            <SafeAreaView style={styles.screen}>
                <KeyboardAvoidingView
                    style={styles.screen}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Card>
                            <View style={styles.gap}>
                                <Text
                                    style={styles.title}
                                    accessibilityRole="header"
                                >
                                    Verify Your Email
                                </Text>

                                <Text style={styles.body}>
                                    Open your signup email and enter its code here.
                                    No browser link is needed.
                                </Text>

                                <Text style={styles.label}>
                                    Email address
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    accessibilityLabel="Email address"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    value={email}
                                    editable={!busy}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        setCode('');
                                        setError('');
                                    }}
                                />

                                <Text style={styles.label}>
                                    Verification code
                                </Text>

                                <TextInput
                                    style={[styles.input, styles.code]}
                                    accessibilityLabel="Verification code"
                                    keyboardType="number-pad"
                                    textContentType="oneTimeCode"
                                    autoComplete="one-time-code"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={code}
                                    maxLength={16}
                                    editable={!busy}
                                    placeholder="Code from your email"
                                    onChangeText={(value) => {
                                        setCode(
                                            value.replace(/\D/g, '').slice(0, 10)
                                        );
                                        setError('');
                                    }}
                                    returnKeyType="done"
                                    onSubmitEditing={() => void verify()}
                                />

                                {message ? (
                                    <Text
                                        style={styles.body}
                                        accessibilityLiveRegion="polite"
                                    >
                                        {message}
                                    </Text>
                                ) : null}

                                {error ? (
                                    <Text
                                        style={styles.error}
                                        accessibilityRole="alert"
                                    >
                                        {error}
                                    </Text>
                                ) : null}

                                {busy ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={BLUE}
                                    />
                                ) : null}

                                <PrimaryButton
                                    label={
                                        busy === 'verify'
                                            ? 'Verifying…'
                                            : 'Verify and Continue'
                                    }
                                    disabled={Boolean(busy) || !code}
                                    onPress={() => void verify()}
                                />

                                <PrimaryButton
                                    label={
                                        busy === 'resend'
                                            ? 'Requesting Code…'
                                            : seconds > 0
                                                ? `Resend Code in ${seconds}s`
                                                : 'Resend Code'
                                    }
                                    disabled={Boolean(busy) || seconds > 0}
                                    onPress={() => void resend()}
                                />

                                <Text style={styles.small}>
                                    Use only the most recent code. Never share it
                                    with anyone. If you change your email here,
                                    request a code for that account.
                                </Text>

                                <PrimaryButton
                                    label="Back to Login"
                                    disabled={Boolean(busy)}
                                    onPress={() => router.replace('/login')}
                                />
                            </View>
                        </Card>
                    </ScrollView>
                </KeyboardAvoidingView>
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
        justifyContent: 'center',
        gap: 18,
        width: '100%',
        maxWidth: 540,
        alignSelf: 'center',
        padding: 20,
    },
    gap: {
        gap: 14,
    },
    title: {
        fontFamily: FONT,
        color: INK,
        fontWeight: '800',
        fontSize: 30,
        textAlign: 'center',
    },
    body: {
        color: INK,
        fontSize: 18,
        lineHeight: 27,
    },
    label: {
        color: INK,
        fontWeight: '700',
        fontSize: 18,
    },
    small: {
        color: '#44525A',
        fontSize: 16,
        lineHeight: 24,
    },
    input: {
        minHeight: 56,
        borderWidth: 2,
        borderColor: '#A9C2D6',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        color: INK,
        padding: 14,
        fontSize: 18,
    },
    code: {
        textAlign: 'center',
    },
    error: {
        color: '#9A1825',
        fontSize: 18,
        lineHeight: 27,
    },
});