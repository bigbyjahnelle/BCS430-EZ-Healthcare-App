import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

function showMessage(feature: string) {
  Alert.alert(feature, 'This feature is not connected yet.');
}

export default function NewAppointmentScreen() {
  const [provider, setProvider] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'In-Person' | 'Telehealth'>('In-Person');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <PageBackground>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader title="New Appointment" />

            <Card style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Provider</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Select a provider…"
                  placeholderTextColor="#6F7E88"
                  value={provider}
                  onChangeText={setProvider}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Reason for Visit</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Annual check-up"
                  placeholderTextColor="#6F7E88"
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
                        <Text
                          style={[styles.typePillText, selected && styles.typePillTextSelected]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.col]}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Select a date…"
                    placeholderTextColor="#6F7E88"
                    value={date}
                    onChangeText={setDate}
                  />
                </View>

                <View style={[styles.field, styles.col]}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Select a time…"
                    placeholderTextColor="#6F7E88"
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Add any notes for your provider"
                  placeholderTextColor="#6F7E88"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </Card>

            <PrimaryButton
              label="Confirm Appointment"
              onPress={() => showMessage('Confirm Appointment')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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

  formCard: {
    gap: 14,
  },

  field: {
    gap: 6,
  },

  fieldLabel: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: '800',
    color: INK,
  },

  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: INK,
  },

  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },

  col: {
    flex: 1,
  },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 4,
  },

  typePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 12,
  },

  typePillSelected: {
    backgroundColor: BLUE,
  },

  typePillText: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
  },

  typePillTextSelected: {
    color: '#FFFFFF',
  },
});