import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} & TextInputProps;

function Field({ label, icon, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
      <View style={[styles.field, focused && styles.fieldFocused]}>
          <Ionicons
              name={icon}
              size={20}
              color="#17618E"
              accessible={false}
          />
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

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
              <Text style={styles.title}>Login</Text>

              <Image
                  source={require('../../assets/images/ez-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessible={true}
                  accessibilityLabel="EZ Healthcare"
              />
            </View>

            <View style={styles.form}>
              <Field
                  label="USERNAME"
                  icon="person-outline"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
              />
              <Field
                  label="PASSWORD"
                  icon="lock-closed-outline"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
              />

              <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="LOGIN"
                  onPress={() => showMessage('Login')}
              >
                <Text style={styles.primaryButtonText}>LOGIN</Text>
              </Pressable>
            </View>

            <View style={styles.links}>
              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  onPress={() => showMessage('Forgot Password')}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                  style={styles.linkButton}
                  accessibilityRole="button"
                  onPress={() => router.push('/signup')}
              >
                <Text style={styles.secondaryLinkText}>
                  Don't have an account? <Text style={styles.secondaryLinkAccent}>Sign Up</Text>
                </Text>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
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
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 28,
  },

  header: {
    alignItems: 'center',
    gap: 12,
  },

  title: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#17618E',
    textAlign: 'center',
    fontWeight: 300,
  },

  logo: {
    width: 210,
    height: 210,
  },

  form: {
    gap: 14,
  },

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

  fieldFocused: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },

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

  links: {
    alignItems: 'center',
    gap: 2,
  },

  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  linkText: {
    fontSize: 15,
    color: '#17618E',
    textAlign: 'center',
  },

  secondaryLinkText: {
    fontSize: 14,
    color: '#44525A',
    textAlign: 'center',
  },

  secondaryLinkAccent: {
    fontWeight: '700',
    color: '#17618E',
  },
});