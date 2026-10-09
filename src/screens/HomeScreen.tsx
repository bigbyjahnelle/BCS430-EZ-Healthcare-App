import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

export default function HomeScreen() {
  const router = useRouter();

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>

          {/* Top buttons and logo */}
          <View style={styles.row}>
            <Pressable
                style={styles.roundButton}
                accessibilityRole="button"
                onPress={() => showMessage('Profile')}
            >
              <View style={styles.circle}>
                <Ionicons
                    name="person-outline"
                    size={30}
                    color="#17618E"
                    accessible={false}
                />
              </View>

              <Text style={styles.label}>Profile</Text>
            </Pressable>

            <Image
                source={require('../../assets/images/ez-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="EZ Healthcare"
            />

            <Pressable
                style={styles.roundButton}
                accessibilityRole="button"
                onPress={() => router.push('/login')}
            >
              <View style={styles.circle}>
                <Ionicons
                    name="log-out-outline"
                    size={30}
                    color="#17618E"
                    accessible={false}
                />
              </View>

              <Text style={styles.label}>Log Out</Text>
            </Pressable>
          </View>

          {/* Ask EZ */}
          <Pressable
              style={styles.askCard}
              accessibilityRole="button"
              accessibilityLabel="Ask EZ. Tap to speak."
              onPress={() => showMessage('Ask EZ')}
          >
            <Text style={styles.heading}>
              ASK <Text style={styles.greenText}>EZ</Text>
            </Text>

            <View style={styles.voiceCircle}>
              <Ionicons
                  name="mic-outline"
                  size={40}
                  color="#FFFFFF"
                  accessible={false}
              />
            </View>

            <Text style={styles.speakText}>Tap to Speak</Text>
          </Pressable>

          {/* Feature buttons */}
          <View style={styles.features}>
            <View style={styles.cardRow}>
              <Pressable
                  style={styles.card}
                  accessibilityRole="button"
                  onPress={() => showMessage('Medications')}
              >
                <Ionicons
                    name="medkit-outline"
                    size={40}
                    color="#17618E"
                    accessible={false}
                />

                <Text style={styles.label}>Medications</Text>
              </Pressable>

              <Pressable
                  style={styles.card}
                  accessibilityRole="button"
                  onPress={() => showMessage('Appointments')}
              >
                <Ionicons
                    name="calendar-outline"
                    size={40}
                    color="#17618E"
                    accessible={false}
                />

                <Text style={styles.label}>Appointments</Text>
              </Pressable>
            </View>

            <View style={styles.cardRow}>
              <Pressable
                  style={styles.card}
                  accessibilityRole="button"
                  onPress={() => showMessage('Messages')}
              >
                <Ionicons
                    name="mail-outline"
                    size={40}
                    color="#17618E"
                    accessible={false}
                />

                <Text style={styles.label}>Messages</Text>
              </Pressable>

              <Pressable
                  style={styles.card}
                  accessibilityRole="button"
                  onPress={() => showMessage('Test Results')}
              >
                <Ionicons
                    name="document-text-outline"
                    size={40}
                    color="#17618E"
                    accessible={false}
                />

                <Text style={styles.label}>Test Results</Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom buttons */}
          <View style={styles.row}>
            <Pressable
                style={styles.roundButton}
                accessibilityRole="button"
                onPress={() => router.push('/accessibility')}
            >
              <View style={styles.circle}>
                <Ionicons
                    name="settings-outline"
                    size={30}
                    color="#17618E"
                    accessible={false}
                />
              </View>

              <Text style={styles.label}>Settings</Text>
            </Pressable>

            <Pressable
                style={styles.roundButton}
                accessibilityRole="button"
                onPress={() => showMessage('Help')}
            >
              <View style={styles.circle}>
                <Ionicons
                    name="help-circle-outline"
                    size={34}
                    color="#17618E"
                    accessible={false}
                />
              </View>

              <Text style={styles.label}>Help</Text>
            </Pressable>
          </View>

        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F3',
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    padding: 16,
    gap: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  logo: {
    width: 90,
    height: 90,
  },

  roundButton: {
    minWidth: 64,
    minHeight: 64,
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },

  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  label: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#0B2236',
  },

  askCard: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 26,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  heading: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: '#17618E',
  },

  greenText: {
    color: '#008060',
  },

  voiceCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0072AA',
  },

  speakText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#0B2236',
  },

  features: {
    flex: 1,
    gap: 12,
  },

  cardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },

  card: {
    flex: 1,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    elevation: 3,
    shadowColor: '#0B2236',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
});