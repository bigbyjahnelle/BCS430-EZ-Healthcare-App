import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageBackground from '../components/PageBackground';
import {
  BLUE,
  Card,
  FONT,
  GEAR_CLEARANCE,
  INK,
  ScreenHeader,
  shadow,
} from '../components/ScreenParts';

type IconName = ComponentProps<typeof Ionicons>['name'];

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={24} color={BLUE} accessible={false} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not available'}</Text>
      </View>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const { doctor, specialty, date, time, location, reason } = useLocalSearchParams<{
    doctor: string;
    specialty: string;
    date: string;
    time: string;
    location: string;
    reason: string;
  }>();

  return (
    <PageBackground>
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Appointment" />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="calendar-outline"
                size={34}
                color={BLUE}
                accessible={false}
              />
            </View>

            <Text style={styles.doctor} adjustsFontSizeToFit numberOfLines={1}>
              {doctor || 'Appointment details'}
            </Text>
            <Text style={styles.specialty}>
              {specialty || 'Go back and pick an appointment'}
            </Text>
          </View>

          <Card style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Date" value={date} />
            <InfoRow icon="time-outline" label="Time" value={time} />
            <InfoRow icon="location-outline" label="Location" value={location} />
            <InfoRow icon="document-text-outline" label="Reason for Visit" value={reason} />
          </Card>

          <View style={styles.spacer} />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.actionButton, styles.rescheduleButton]}
              accessibilityRole="button"
              accessibilityLabel="Reschedule"
              onPress={() => showMessage('Reschedule')}
            >
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              accessibilityRole="button"
              accessibilityLabel="Cancel Appointment"
              onPress={() => showMessage('Cancel Appointment')}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: GEAR_CLEARANCE,
    gap: 12,
  },

  header: {
    alignItems: 'center',
    gap: 2,
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: BLUE,
    marginBottom: 4,
  },

  doctor: {
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },

  specialty: {
    fontSize: 18,
    color: '#2E3A42',
  },

  infoCard: {
    gap: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF5',
  },

  rowText: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 15,
    color: '#44525A',
  },

  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    marginTop: 1,
  },

  spacer: {
    flex: 1,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 8,
  },

  rescheduleButton: {
    backgroundColor: BLUE,
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },

  rescheduleText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B3261E',
  },

  cancelText: {
    fontFamily: FONT,
    fontSize: 20,
    fontWeight: '800',
    color: '#B3261E',
  },
});