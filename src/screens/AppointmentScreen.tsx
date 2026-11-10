import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Appointment = {
  key: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  reason: string;
};

const APPOINTMENTS: Appointment[] = [
  {
    key: 'chen',
    doctor: 'Dr. Sarah Chen',
    specialty: 'Primary Care',
    date: 'Thursday, November 12, 2026',
    time: '10:30 AM',
    location: 'EZ Health Clinic — Downtown',
    reason: 'Annual check-up',
  },
  {
    key: 'torres',
    doctor: 'Dr. Michael Torres',
    specialty: 'Cardiology',
    date: 'Wednesday, November 18, 2026',
    time: '2:00 PM',
    location: 'Riverside Medical Center',
    reason: 'Follow-up consultation',
  },
  {
    key: 'lee',
    doctor: 'Dr. Amanda Lee',
    specialty: 'Physical Therapy',
    date: 'Wednesday, November 25, 2026',
    time: '9:00 AM',
    location: 'EZ Health Clinic — Downtown',
    reason: 'Physical therapy session',
  },
];

export default function AppointmentsScreen() {
  const router = useRouter();

  return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* Header */}
          <View style={styles.topRow}>
            <Pressable
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back to Home"
                onPress={() => router.back()}
            >
              <Ionicons
                  name="arrow-back-outline"
                  size={24}
                  color="#17618E"
                  accessible={false}
              />
            </Pressable>

            <Text style={styles.topRowTitle}>Appointments</Text>

            <View style={styles.topRowSpacer} />
          </View>

          {/* New appointment button */}
          <Pressable
              style={styles.newButton}
              accessibilityRole="button"
              onPress={() => router.push('/new-appointment')}
          >
            <Ionicons
                name="add-outline"
                size={22}
                color="#FFFFFF"
                accessible={false}
            />
            <Text style={styles.newButtonText}>New Appointment</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Upcoming</Text>

          {/* Appointment list */}
          <View style={styles.list}>
            {APPOINTMENTS.map((appt) => (
                <Pressable
                    key={appt.key}
                    style={styles.card}
                    accessibilityRole="button"
                    accessibilityLabel={`${appt.doctor}, ${appt.specialty}, ${appt.date} at ${appt.time}`}
                    onPress={() => router.push({
                      pathname: '/appointment-detail',
                      params: {
                        doctor: appt.doctor,
                        specialty: appt.specialty,
                        date: appt.date,
                        time: appt.time,
                        location: appt.location,
                        reason: appt.reason,
                      },
                    })}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTopLeft}>
                      <View style={styles.cardIconCircle}>
                        <Ionicons
                            name="calendar-outline"
                            size={22}
                            color="#17618E"
                            accessible={false}
                        />
                      </View>

                      <View>
                        <Text style={styles.cardDoctor}>{appt.doctor}</Text>
                        <Text style={styles.cardSpecialty}>{appt.specialty}</Text>
                      </View>
                    </View>

                    <Ionicons
                        name="chevron-forward-outline"
                        size={18}
                        color="#8A97A0"
                        accessible={false}
                    />
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardDetailRow}>
                    <View style={styles.cardDetailItem}>
                      <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#44525A"
                          accessible={false}
                      />
                      <Text style={styles.cardDetailText}>{appt.date.split(',')[0]}</Text>
                    </View>

                    <View style={styles.cardDetailItem}>
                      <Ionicons
                          name="time-outline"
                          size={16}
                          color="#44525A"
                          accessible={false}
                      />
                      <Text style={styles.cardDetailText}>{appt.time}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetailItem}>
                    <Ionicons
                        name="location-outline"
                        size={16}
                        color="#44525A"
                        accessible={false}
                    />
                    <Text style={styles.cardDetailText}>{appt.location}</Text>
                  </View>
                </Pressable>
            ))}
          </View>

        </ScrollView>
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
    maxWidth: 540,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  topRowTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
  },

  topRowSpacer: {
    width: 44,
  },

  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#17618E',
    borderRadius: 18,
    paddingVertical: 16,
  },

  newButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2236',
  },

  list: {
    gap: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    borderRadius: 20,
    padding: 16,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F3',
    borderWidth: 1,
    borderColor: '#DDE4E2',
  },

  cardDoctor: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B2236',
  },

  cardSpecialty: {
    fontSize: 13,
    color: '#44525A',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#DDE4E2',
    marginVertical: 12,
  },

  cardDetailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },

  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cardDetailText: {
    fontSize: 13,
    color: '#44525A',
  },
});