import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from '../components/PageBackground';
import {
  BLUE,
  BORDER,
  Card,
  FONT,
  GEAR_CLEARANCE,
  INK,
  PrimaryButton,
  ScreenHeader,
} from '../components/ScreenParts';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

function DetailLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.detailLine}>
      <Ionicons name={icon} size={20} color={BLUE} accessible={false} />
      <Text style={styles.detailText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();

  return (
    <PageBackground>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Appointments" />

          <PrimaryButton
            label="+  New Appointment"
            onPress={() => router.push('/new-appointment')}
          />

          <View style={styles.sectionChip}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Upcoming
            </Text>
          </View>

          <View style={styles.list}>
            {APPOINTMENTS.map((appt) => (
              <Pressable
                key={appt.key}
                accessibilityRole="button"
                accessibilityLabel={`${appt.doctor}, ${appt.specialty}, ${appt.date} at ${appt.time}`}
                onPress={() =>
                  router.push({
                    pathname: '/appointment-detail',
                    params: {
                      doctor: appt.doctor,
                      specialty: appt.specialty,
                      date: appt.date,
                      time: appt.time,
                      location: appt.location,
                      reason: appt.reason,
                    },
                  })
                }
              >
                <Card>
                  <View style={styles.cardTop}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="calendar-outline"
                        size={28}
                        color={BLUE}
                        accessible={false}
                      />
                    </View>

                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.doctor} numberOfLines={1}>
                        {appt.doctor}
                      </Text>
                      <Text style={styles.specialty}>{appt.specialty}</Text>
                    </View>

                    <Ionicons
                      name="chevron-forward-outline"
                      size={26}
                      color={BLUE}
                      accessible={false}
                    />
                  </View>

                  <View style={styles.divider} />

                  <DetailLine
                    icon="time-outline"
                    text={`${appt.date.split(',')[0]} · ${appt.time}`}
                  />
                  <DetailLine icon="location-outline" text={appt.location} />
                </Card>
              </Pressable>
            ))}
          </View>
        </ScrollView>
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
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: GEAR_CLEARANCE,
    gap: 16,
  },

  // White chip so the heading is readable over the blue background
  sectionChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  sectionLabel: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: '800',
    color: INK,
  },

  list: {
    gap: 14,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF5',
  },

  cardTitleWrap: {
    flex: 1,
  },

  doctor: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    color: INK,
  },

  specialty: {
    fontSize: 16,
    color: '#44525A',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#C9D6E2',
    marginVertical: 12,
  },

  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  detailText: {
    flex: 1,
    fontSize: 16,
    color: '#2E3A42',
  },
});