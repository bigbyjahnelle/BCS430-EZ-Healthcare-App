import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { doctor, specialty, date, time, location, reason } = useLocalSearchParams<{
    doctor: string;
    specialty: string;
    date: string;
    time: string;
    location: string;
    reason: string;
  }>();

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>

          <Pressable
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to Appointments"
              onPress={() => router.back()}
          >
            <Ionicons
                name="arrow-back-outline"
                size={24}
                color="#17618E"
                accessible={false}
            />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                  name="calendar-outline"
                  size={34}
                  color="#17618E"
                  accessible={false}
              />
            </View>

            <Text style={styles.doctor}>{doctor}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#17618E"
                  accessible={false}
              />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{date}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                  name="time-outline"
                  size={20}
                  color="#17618E"
                  accessible={false}
              />
              <View>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{time}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                  name="location-outline"
                  size={20}
                  color="#17618E"
                  accessible={false}
              />
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#17618E"
                  accessible={false}
              />
              <View>
                <Text style={styles.infoLabel}>Reason for Visit</Text>
                <Text style={styles.infoValue}>{reason}</Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
              style={styles.rescheduleButton}
              accessibilityRole="button"
              onPress={() => showMessage('Reschedule')}
          >
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </Pressable>

          <Pressable
              style={styles.cancelButton}
              accessibilityRole="button"
              onPress={() => showMessage('Cancel Appointment')}
          >
            <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
          </Pressable>

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
    padding: 20,
    gap: 20,
  },

  backButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  header: {
    alignItems: 'center',
    gap: 6,
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#17618E',
    marginBottom: 4,
  },

  doctor: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B2236',
  },

  specialty: {
    fontSize: 14,
    color: '#44525A',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  infoLabel: {
    fontSize: 13,
    color: '#44525A',
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B2236',
  },

  rescheduleButton: {
    alignItems: 'center',
    backgroundColor: '#17618E',
    borderRadius: 18,
    paddingVertical: 16,
  },

  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDE4E2',
    borderRadius: 18,
    paddingVertical: 16,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B3261E',
  },
});