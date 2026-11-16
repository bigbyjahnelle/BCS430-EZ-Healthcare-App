import { Ionicons } from '@react-native-vector-icons/ionicons';
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

import { supabase } from '../services/supabase';

type FieldProps = TextInputProps & {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

function Field({ label, icon, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Ionicons name={icon} size={20} color="#17618E" accessible={false} />
        <TextInput
            style={styles.input}
            placeholder={label}
            placeholderTextColor="#5B88A5"
            accessibilityLabel={label}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...inputProps}
        />
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
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Sign Up</Text>
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
                <Text style={styles.secondaryLinkText}>
                  Already have an account?{' '}
                  <Text style={styles.secondaryLinkAccent}>Log In</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F3' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 28,
  },
  header: { alignItems: 'center', gap: 12 },
  title: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: 1,
    color: '#17618E',
    textAlign: 'center',
  },
  logo: { width: 210, height: 210 },
  form: { gap: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17618E',
    backgroundColor: '#F7F8F3',
  },
  fieldFocused: { borderWidth: 2, backgroundColor: '#FFFFFF' },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: 0.8,
    color: '#0B2236',
    paddingVertical: 12,
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#0F5C97',
    marginTop: 14,
    elevation: 8,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  links: { alignItems: 'center', gap: 2 },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  linkText: { fontSize: 15, color: '#17618E', textAlign: 'center' },
  secondaryLinkText: { fontSize: 14, color: '#44525A', textAlign: 'center' },
  secondaryLinkAccent: { fontWeight: '700', color: '#17618E' },
});