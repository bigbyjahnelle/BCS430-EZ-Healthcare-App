import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageBackground from '../components/PageBackground';
import { supabase } from '../services/supabase';

// Colors (taken from the EZ logo)
const BLUE = '#0B5394';
const GREEN = '#00906F';
const INK = '#0B2236';
const BORDER = '#A9C2D6';
const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;

// true = serif text like the design picture, false = normal app font
const USE_SERIF = true;
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const FONT = USE_SERIF ? SERIF : undefined;

// Logo size
const LOGO_SIZE = 200;

type FieldProps = TextInputProps & {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

function Field({ label, icon, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
      <View style={styles.fieldShadow}>
        <LinearGradient
            colors={CARD_GRADIENT}
            style={[styles.field, focused && styles.fieldFocused]}
        >
          <Ionicons name={icon} size={24} color={BLUE} accessible={false} />
          <TextInput
              style={styles.input}
              placeholder={label}
              placeholderTextColor="#6B8397"
              accessibilityLabel={label}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              {...inputProps}
          />
        </LinearGradient>
      </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const submitting = useRef(false);

  // The page only scrolls if it really does not fit (very small phone or keyboard open)
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);

  async function signUp() {
    if (submitting.current) return;

    const displayName = username.trim();
    const trimmedEmail = email.trim();

    if (!displayName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Please fill in all four fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }

    if (!supabase) {
      Alert.alert(
          'Supabase is not configured',
          'Check the Supabase URL and publishable key in your project’s .env file, then restart Expo.'
      );
      return;
    }

    submitting.current = true;
    setSigningUp(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { username: displayName },
        },
      });

      if (error) {
        Alert.alert('Could not sign up', error.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');

      if (data.session) {
        router.replace('/welcome');
        return;
      }

      Alert.alert(
          'Check your email',
          'If your signup was accepted, follow the confirmation link in your email. Then come back to the app and log in.',
          [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
      );
    } catch {
      Alert.alert('Could not sign up', 'Check your internet connection and try again.');
    } finally {
      submitting.current = false;
      setSigningUp(false);
    }
  }

  return (
      <PageBackground offsetY={35}>
      {/* Android only: soft dark fade at the bottom so the white links are easy to read */}
        {Platform.OS === 'android' ? (
            <LinearGradient
                pointerEvents="none"
                colors={['rgba(7, 38, 70, 0)', 'rgba(7, 38, 70, 0.9)']}
                style={styles.scrim}
            />
        ) : null}

        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                scrollEnabled={contentH > viewH + 1}
                bounces={false}
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
                onContentSizeChange={(_w, h) => setContentH(h)}
            >
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  Sign Up
                </Text>
                <Image
                    source={require('../../assets/images/ez-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel="EZ Healthcare"
                />
              </View>

              <View style={styles.form}>
                <Field
                    label="USERNAME"
                    icon="person-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={setUsername}
                    editable={!signingUp}
                />

                <Field
                    label="EMAIL"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    editable={!signingUp}
                />

                <Field
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoComplete="new-password"
                    value={password}
                    onChangeText={setPassword}
                    editable={!signingUp}
                />

                <Field
                    label="CONFIRM PASSWORD"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!signingUp}
                    returnKeyType="go"
                    onSubmitEditing={() => void signUp()}
                />

                <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || signingUp) && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={signingUp ? 'Creating account' : 'Sign up'}
                    accessibilityState={{ disabled: signingUp, busy: signingUp }}
                    disabled={signingUp}
                    onPress={() => void signUp()}
                >
                  <Text style={styles.primaryButtonText}>
                    {signingUp ? 'CREATING ACCOUNT…' : 'SIGN UP'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Links stay at the bottom of the screen */}
            <View style={styles.links}>
              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  disabled={signingUp}
                  onPress={() =>
                      Alert.alert('Forgot Password', 'Password recovery is not connected yet.')
                  }
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  disabled={signingUp}
                  onPress={() => router.replace('/login')}
              >
                <Text style={styles.linkText}>
                  Already have an account?{' '}
                  <Text style={styles.secondaryLinkAccent}>Log In</Text>
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </PageBackground>
  );
}

const shadow = {
  elevation: 3,
  shadowColor: INK,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    gap: 14,
  },
  header: { alignItems: 'center', gap: 4 },
  title: {
    fontFamily: FONT,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    color: BLUE,
    textAlign: 'center',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  form: { gap: 12 },
  fieldShadow: {
    borderRadius: 18,
    backgroundColor: '#F7F8F3',
    ...shadow,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  fieldFocused: { borderWidth: 2.5, borderColor: BLUE },
  input: {
    flex: 1,
    fontSize: 18,
    letterSpacing: 0.5,
    color: INK,
    paddingVertical: 10,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: BLUE,
    marginTop: 10,
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  links: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: Platform.OS === 'android' ? 22 : 6,
  },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  linkText: {
    fontFamily: FONT,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(11, 34, 54, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  secondaryLinkAccent: {
    fontWeight: '800',
    color: Platform.OS === 'android' ? '#46D2A8' : GREEN,
  },
});