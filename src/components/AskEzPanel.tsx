import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getScreenSummary } from '../services/screenSummary';
import { speak, stopSpeaking } from '../services/voiceSettings';
import { describeAction, EXAMPLE_COMMANDS, matchAny, VOCABULARY, VoiceAction } from '../services/voiceCommands';

// Ask EZ: tap to speak a navigation command ("open my medications") - RD
// Speech is turned into text by the phone's speech recognizer, matched to a
// command in services/voiceCommands.ts, confirmed out loud, then carried out - RD
// Users can also type a command, for when speaking isn't possible - RD

type Phase =
    | 'starting'      // Starting the microphone - RD
    | 'askPermission' // Explaining why we need the microphone before Android's prompt - RD
    | 'listening'     // Microphone is on - RD
    | 'notUnderstood' // Heard something that isn't a command, or heard nothing - RD
    | 'help'          // Showing what you can say - RD
    | 'denied'        // Microphone permission refused - RD
    | 'unavailable'   // No speech recognizer on this device - RD
    | 'error';        // Anything else went wrong - RD

// Same values as components/ScreenParts, copied here on purpose: ScreenParts shows this panel
// from its header, so importing ScreenParts here would make the two files load each other
// and the colors could be undefined when this file first loads - RD
const BLUE = '#0B5394';
const GREEN = '#00906F';
const INK = '#0B2236';
const BORDER = '#A9C2D6';
const CARD_GRADIENT = ['#FFFFFF', '#F3F7F4'] as const;
const FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const shadow = {
  elevation: 3,
  shadowColor: INK,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
} as const;

// Sphere colors match the Ask EZ card on Home - RD
const YELLOW = '#EFD93A';
const SPHERE_GRADIENT = ['#5FBDEB', '#2F86C6', '#0B5394', '#073A6E'] as const;
const RING_GRADIENT = [BLUE, GREEN, YELLOW] as const;

const ERROR_TEXT: Record<string, string> = {
  network: 'Voice commands need an internet connection. Check your connection and try again.',
  'audio-capture': 'The microphone could not be used. Make sure no other app is using it.',
  busy: 'The speech service is busy. Please try again in a moment.',
};

export default function AskEzPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('starting');
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState('');
  const [typed, setTyped] = useState('');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const active = useRef(false);  // True while a listening session belongs to this panel - RD
  const handled = useRef(false); // True once this session's result has been acted on - RD
  const open = useRef(visible);   // Latest value of `visible`, for checks after awaiting - RD

  useEffect(() => {
    open.current = visible;
    if (visible) void startListening();
    return () => stopListening();
  }, [visible]);

  function stopListening() {
    if (active.current) {
      active.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Already stopped - RD
      }
    }
  }

  async function startListening() {
    stopListening();
    stopSpeaking();
    setHeard('');
    setMessage('');
    setPhase('starting');
    handled.current = false;

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setPhase('unavailable');
      return;
    }

    // Explain first, then let the user trigger Android's permission prompt - RD
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!open.current) return;
    if (!current.granted) {
      setCanAskAgain(current.canAskAgain);
      setPhase(current.canAskAgain ? 'askPermission' : 'denied');
      return;
    }
    beginRecognition();
  }

  /** Shows Android's "Allow EZ Healthcare to record audio?" prompt - RD */
  async function askForMicrophone() {
    const answer = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!open.current) return; // Panel was closed while the prompt was showing - RD
    setCanAskAgain(answer.canAskAgain);
    if (answer.granted) beginRecognition();
    else setPhase('denied');
  }

  function beginRecognition() {
    handled.current = false;
    active.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,  // Show words as they are heard - RD
      maxAlternatives: 3,    // Try other guesses if the first one isn't a command - RD
      continuous: false,     // Stop after the user finishes speaking - RD
      contextualStrings: VOCABULARY,
    });
  }

  function close() {
    stopListening();
    setTyped('');
    onClose();
  }

  function carryOut(action: VoiceAction) {
    switch (action.type) {
      case 'navigate':
        close();
        if (pathname === action.route) {
          speak(`You are already on ${action.label}.`);
        } else {
          speak(describeAction(action));
          router.push(action.route);
        }
        return;
      case 'back':
        close();
        if (router.canGoBack()) {
          speak(describeAction(action));
          router.back();
        } else {
          speak('There is no previous screen.');
        }
        return;
      case 'read':
        // The user asked to hear this, so read it even when spoken replies are off - RD
        close();
        speak(getScreenSummary() ?? 'There is nothing to read on this screen yet.', { always: true, reading: true });
        return;
      case 'help':
        setPhase('help');
        speak(describeAction(action), { always: true });
        return;
      case 'cancel':
        close();
        return;
    }
  }

  function handleTranscripts(transcripts: string[]) {
    if (handled.current) return;
    handled.current = true;
    active.current = false;

    const match = matchAny(transcripts.filter(Boolean));
    if (match) {
      setHeard(match.heard);
      carryOut(match.action);
    } else {
      setPhase('notUnderstood');
      setMessage(transcripts[0] ? 'Sorry, that isn’t something I can do yet.' : 'Sorry, I didn’t hear anything.');
      speak(transcripts[0] ? 'Sorry, I didn’t understand that.' : 'Sorry, I didn’t hear anything.');
    }
  }

  function submitTyped() {
    if (!typed.trim()) return;
    stopListening();
    handled.current = true;
    setHeard(typed.trim());
    const match = matchAny([typed]);
    if (match) {
      setTyped('');
      carryOut(match.action);
    } else {
      setPhase('notUnderstood');
      setMessage('Sorry, that isn’t something I can do yet.');
    }
  }

  // ---------- speech recognizer events ----------
  useSpeechRecognitionEvent('start', () => {
    if (active.current) setPhase('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!active.current) return;
    const transcripts = event.results.map((result) => result.transcript);
    setHeard(transcripts[0] ?? '');
    if (event.isFinal) handleTranscripts(transcripts);
  });

  useSpeechRecognitionEvent('nomatch', () => {
    if (active.current) handleTranscripts([]);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!active.current || event.error === 'aborted') return;
    active.current = false;
    handled.current = true;
    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setPhase('notUnderstood');
      setMessage('Sorry, I didn’t hear anything.');
    } else if (event.error === 'not-allowed') {
      setPhase('denied');
    } else if (event.error === 'service-not-allowed' || event.error === 'language-not-supported') {
      setPhase('unavailable');
    } else {
      setPhase('error');
      setMessage(ERROR_TEXT[event.error] ?? 'Something went wrong with voice commands. Please try again.');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // Ended without a final result (e.g. silence on some phones) - RD
    if (active.current && !handled.current) handleTranscripts([]);
    active.current = false;
  });

  // ---------- screen ----------
  const listening = phase === 'listening' || phase === 'starting';
  const statusText = {
    starting: 'Getting ready…',
    listening: 'Listening… say a command.',
    notUnderstood: message,
    help: 'Here are some things you can say.',
    askPermission: 'To hear your voice commands, EZ Healthcare needs to use your microphone. It only listens after you tap Ask EZ.',
    denied: canAskAgain
        ? 'Microphone permission was not given, so EZ Healthcare can’t hear you.'
        : 'Microphone access is turned off for EZ Healthcare. Turn it on in Settings → Permissions → Microphone.',
    unavailable: 'Voice commands are not available on this device. You can type a command instead.',
    error: message,
  }[phase];

  return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <LinearGradient colors={CARD_GRADIENT} style={styles.sheet}>
          <SafeAreaView edges={['bottom']} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.headerRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title} accessibilityRole="header">
                    ASK <Text style={styles.green}>EZ</Text>
                  </Text>
                  <View style={styles.goldLine} />
                </View>
                <Pressable style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close Ask EZ" onPress={close}>
                  <Ionicons name="close" size={30} color={BLUE} accessible={false} />
                </Pressable>
              </View>

              {/* Same sphere as the Ask EZ card on Home; dimmed when not listening - RD */}
              <LinearGradient
                  colors={RING_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.sphereRing, !listening && styles.sphereIdle]}
              >
                <View style={styles.sphereWhite}>
                  <LinearGradient
                      colors={SPHERE_GRADIENT}
                      locations={[0, 0.34, 0.62, 1]}
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={styles.sphere}
                  >
                    {phase === 'starting'
                        ? <ActivityIndicator size="large" color="#FFFFFF" />
                        : <Ionicons name={listening ? 'mic' : 'mic-outline'} size={56} color="#FFFFFF" accessible={false} />}
                  </LinearGradient>
                </View>
              </LinearGradient>

              <Text style={styles.status} accessibilityLiveRegion="polite" accessibilityRole="text">
                {statusText}
              </Text>

              {heard ? (
                  <Text style={styles.heard} accessibilityLabel={`Heard: ${heard}`}>“{heard}”</Text>
              ) : null}

              {listening ? (
                  <Pressable
                      style={styles.secondaryButton}
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          ExpoSpeechRecognitionModule.stop(); // Finish now and use what was heard - RD
                        } catch {
                          close();
                        }
                      }}
                  >
                    <Text style={styles.secondaryText}>Done Speaking</Text>
                  </Pressable>
              ) : phase === 'askPermission' || (phase === 'denied' && canAskAgain) ? (
                  <Pressable style={styles.button} accessibilityRole="button" onPress={() => void askForMicrophone()}>
                    <Ionicons name="mic-outline" size={24} color="#FFFFFF" accessible={false} />
                    <Text style={styles.buttonText}>Allow Microphone</Text>
                  </Pressable>
              ) : phase === 'denied' ? (
                  <Pressable style={styles.button} accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                    <Text style={styles.buttonText}>Open Settings</Text>
                  </Pressable>
              ) : phase !== 'unavailable' ? (
                  <Pressable style={styles.button} accessibilityRole="button" onPress={() => void startListening()}>
                    <Ionicons name="mic-outline" size={24} color="#FFFFFF" accessible={false} />
                    <Text style={styles.buttonText}>Try Again</Text>
                  </Pressable>
              ) : null}

              {/* Read without speaking a command - RD */}
              <Pressable
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                  onPress={() => carryOut({ type: 'read' })}
              >
                <Ionicons name="volume-high-outline" size={24} color={BLUE} accessible={false} />
                <Text style={styles.secondaryText}>Read This Screen</Text>
              </Pressable>

              {phase === 'help' || phase === 'notUnderstood' || phase === 'listening' ? (
                  <View style={styles.examples}>
                    <Text style={styles.label}>Try saying:</Text>
                    {EXAMPLE_COMMANDS.map((example) => (
                        <Text key={example} style={styles.example}>• “{example}”</Text>
                    ))}
                  </View>
              ) : null}

              <View style={styles.typeBox}>
                <Text style={styles.label} nativeID="typeCommand">Or type a command</Text>
                <View style={styles.typeRow}>
                  <TextInput
                      style={styles.input}
                      value={typed}
                      onChangeText={setTyped}
                      placeholder="For example: medications"
                      accessibilityLabel="Type a command"
                      accessibilityLabelledBy="typeCommand"
                      returnKeyType="go"
                      onFocus={stopListening}
                      onSubmitEditing={submitTyped}
                  />
                  <Pressable
                      style={styles.goButton}
                      accessibilityRole="button"
                      accessibilityLabel="Go"
                      onPress={submitTyped}
                  >
                    <Text style={styles.buttonText}>Go</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
          </LinearGradient>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11, 34, 54, 0.45)' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1.5, borderBottomWidth: 0, borderColor: BORDER, overflow: 'hidden' },
  content: { padding: 22, gap: 18, alignItems: 'stretch', width: '100%', maxWidth: 540, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { gap: 6 },
  title: { fontFamily: FONT, fontSize: 32, fontWeight: '700', letterSpacing: 1, color: INK },
  green: { color: GREEN },
  goldLine: { width: 44, height: 2, borderRadius: 1, backgroundColor: YELLOW },
  closeButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  sphereRing: { alignSelf: 'center', width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  sphereIdle: { opacity: 0.55 },
  sphereWhite: { width: 122, height: 122, borderRadius: 61, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sphere: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  status: { fontFamily: FONT, fontSize: 22, lineHeight: 30, fontWeight: '700', color: INK, textAlign: 'center' },
  heard: { fontFamily: FONT, fontSize: 22, lineHeight: 30, color: BLUE, textAlign: 'center', fontStyle: 'italic' },
  examples: { padding: 16, borderRadius: 18, backgroundColor: '#D9F0E8', gap: 4 },
  example: { fontFamily: FONT, fontSize: 19, lineHeight: 28, color: '#00664F' },
  label: { fontFamily: FONT, fontSize: 18, fontWeight: '700', color: BLUE },
  typeBox: { gap: 8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minHeight: 56, paddingHorizontal: 14, borderWidth: 2, borderColor: BLUE, borderRadius: 14, fontSize: 20, color: INK, backgroundColor: '#FFFFFF' },
  goButton: { minWidth: 72, minHeight: 56, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', ...shadow },
  button: { minHeight: 56, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 18, backgroundColor: BLUE, ...shadow },
  buttonText: { fontFamily: FONT, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { minHeight: 56, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 18, borderWidth: 2, borderColor: BLUE, backgroundColor: '#FFFFFF' },
  secondaryText: { fontFamily: FONT, fontSize: 20, fontWeight: '700', color: BLUE },
});
