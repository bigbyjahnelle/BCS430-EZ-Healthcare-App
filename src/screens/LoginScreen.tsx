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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const submitting = useRef(false);

  async function signIn() {
    if (submitting.current) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Missing information', 'Enter your email and password.');
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
    setSigningIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error || !data.session) {
        Alert.alert('Could not sign in', error?.message ?? 'Please try again.');
        return;
      }

      setPassword('');
      router.replace('/welcome');
    } catch {
      Alert.alert('Could not sign in', 'Check your internet connection and try again.');
    } finally {
      submitting.current = false;
      setSigningIn(false);
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
            <View style={styles.content}>
              {/* The logo shrinks to fit, so nothing has to scroll */}
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  Login
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
                    label="EMAIL"
                    icon="mail-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    editable={!signingIn}
                />

                <Field
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoComplete="current-password"
                    value={password}
                    onChangeText={setPassword}
                    editable={!signingIn}
                    returnKeyType="go"
                    onSubmitEditing={() => void signIn()}
                />

                <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || signingIn) && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={signingIn ? 'Signing in' : 'Login'}
                    accessibilityState={{ disabled: signingIn, busy: signingIn }}
                    disabled={signingIn}
                    onPress={() => void signIn()}
                >
                  <Text style={styles.primaryButtonText}>
                    {signingIn ? 'SIGNING IN…' : 'LOGIN'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Links stay at the bottom of the screen */}
            <View style={styles.links}>
              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  disabled={signingIn}
                  onPress={() =>
                      Alert.alert('Forgot Password', 'Password recovery is not connected yet.')
                  }
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  disabled={signingIn}
                  onPress={() => router.push('/signup')}
              >
                <Text style={styles.linkText}>
                  Don't have an account?{' '}
                  <Text style={styles.secondaryLinkAccent}>Sign Up</Text>
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
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 0,
    gap: 24,
  },
  header: {
    flexShrink: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FONT,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    color: BLUE,
    textAlign: 'center',
  },
  logo: { width: '100%', height: 210, flexShrink: 1 },  form: { gap: 14 },

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
    minHeight: 60,
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
    paddingVertical: 12,
  },
  primaryButton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: BLUE,
    marginTop: 14,
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
    marginTop: -24,
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