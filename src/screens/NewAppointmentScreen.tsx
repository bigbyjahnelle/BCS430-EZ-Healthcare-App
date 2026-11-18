import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

export default function NewAppointmentScreen() {
  const router = useRouter();
  const [provider, setProvider] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'In-Person' | 'Telehealth'>('In-Person');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>

          <View style={styles.topRow}>
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

            <Text style={styles.topRowTitle}>New Appointment</Text>

            <View style={styles.topRowSpacer} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Provider</Text>
            <TextInput
                style={styles.fieldInput}
                placeholder="Select a provider…"
                placeholderTextColor="#8A97A0"
                value={provider}
                onChangeText={setProvider}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Reason for Visit</Text>
            <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Annual check-up"
                placeholderTextColor="#8A97A0"
                value={reason}
                onChangeText={setReason}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Appointment Type</Text>
            <View style={styles.typeRow}>
              {(['In-Person', 'Telehealth'] as const).map((option) => {
                const selected = type === option;
                return (
                    <Pressable
                        key={option}
                        style={[styles.typePill, selected && styles.typePillSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setType(option)}
                    >
                      <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
                style={styles.fieldInput}
                placeholder="Select a date…"
                placeholderTextColor="#8A97A0"
                value={date}
                onChangeText={setDate}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
                style={styles.fieldInput}
                placeholder="Select a time…"
                placeholderTextColor="#8A97A0"
                value={time}
                onChangeText={setTime}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
                style={styles.fieldInput}
                placeholder="Add any notes for your provider"
                placeholderTextColor="#8A97A0"
                value={notes}
                onChangeText={setNotes}
            />
          </View>

          <Pressable
              style={styles.confirmButton}
              accessibilityRole="button"
              onPress={() => showMessage('Confirm Appointment')}
          >
            <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
          </Pressable>

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
    fontSize: 20,
    fontWeight: '800',
    color: '#0B2236',
    textAlign: 'center',
  },

  topRowSpacer: {
    width: 44,
  },

  field: {
    gap: 6,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B2236',
  },

  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDE4E2',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0B2236',
  },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4E2',
    borderRadius: 14,
    padding: 4,
  },

  typePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },

  typePillSelected: {
    backgroundColor: '#17618E',
  },

  typePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B2236',
  },

  typePillTextSelected: {
    color: '#FFFFFF',
  },

  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#17618E',
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 4,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});