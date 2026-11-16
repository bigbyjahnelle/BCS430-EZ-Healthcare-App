import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deleteReminder,
  DoseItem,
  formatTime,
  getReminders,
  getTodayDoses,
  hasNotificationPermission,
  PRESET_TIMES,
  Reminder,
  ReminderInput,
  requestNotificationPermission,
  resyncNotifications,
  saveReminder,
  sendTestNotification,
  setDoseTaken,
  setReminderEnabled,
} from '../services/reminders';

type Draft = ReminderInput;

function emptyDraft(medicationName = '', dosage = ''): Draft {
  return { medicationName, dosage, times: [], enabled: true };
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function to24Hour(hour12: number, minute: number, period: 'AM' | 'PM') {
  const hour = (hour12 % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function RemindersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ medicationName?: string; dosage?: string }>();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [alertsOn, setAlertsOn] = useState<boolean | null>(null);
  const [alertsBlocked, setAlertsBlocked] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [currentTime, setCurrentTime] = useState(nowTime());
  const [saving, setSaving] = useState(false);
  const handledParams = useRef('');

  // Custom time picker state (12-hour clock). Starts at the current time - RD
  const [customHour, setCustomHour] = useState(() => new Date().getHours() % 12 || 12);
  const [customMinute, setCustomMinute] = useState(() => new Date().getMinutes());
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>(() => (new Date().getHours() < 12 ? 'AM' : 'PM'));

  const refresh = useCallback(async () => {
    const [savedReminders, todayDoses, permission] = await Promise.all([
      getReminders(),
      getTodayDoses(),
      hasNotificationPermission(),
    ]);
    setReminders(savedReminders);
    setDoses(todayDoses);
    setAlertsOn(permission);
    setCurrentTime(nowTime());
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    // If alerts were turned on in phone Settings, make sure saved reminders are scheduled - RD
    void hasNotificationPermission().then((granted) => {
      if (granted) void resyncNotifications();
    });
    const timer = setInterval(() => setCurrentTime(nowTime()), 60_000);
    return () => clearInterval(timer);
  }, [refresh]));

  // "Set Reminder" on the Medications screen opens this screen with the form filled in - RD
  useEffect(() => {
    const name = params.medicationName ?? '';
    const signature = `${name}|${params.dosage ?? ''}`;
    if (name && handledParams.current !== signature) {
      handledParams.current = signature;
      setError('');
      setDraft(emptyDraft(name, params.dosage ?? ''));
    }
  }, [params.medicationName, params.dosage]);

  async function turnOnAlerts() {
    const granted = await requestNotificationPermission();
    setAlertsOn(granted);
    setAlertsBlocked(!granted);
    if (granted) {
      await resyncNotifications();
      setStatus('Phone alerts are on.');
    }
  }

  async function testAlert() {
    let granted = alertsOn === true;
    if (!granted) {
      granted = await requestNotificationPermission();
      setAlertsOn(granted);
      setAlertsBlocked(!granted);
    }
    if (granted && await sendTestNotification(10)) {
      setStatus('A test alert will arrive in about 10 seconds. You can go to the home screen to see it.');
    } else {
      setStatus('Phone alerts are off, so the test alert could not be sent.');
    }
  }

  async function toggleTaken(dose: DoseItem) {
    const takenAt = await setDoseTaken(dose.reminderId, dose.time, !dose.takenAt);
    setDoses((items) => items.map((item) => (item.key === dose.key ? { ...item, takenAt } : item)));
    setStatus(takenAt
        ? `${dose.medicationName} marked as taken.`
        : `${dose.medicationName} marked as not taken.`);
  }

  async function toggleEnabled(reminder: Reminder, enabled: boolean) {
    await setReminderEnabled(reminder.id, enabled);
    await refresh();
    setStatus(`${reminder.medicationName} reminders turned ${enabled ? 'on' : 'off'}.`);
  }

  function confirmDelete(reminder: Reminder) {
    Alert.alert(
        'Delete reminder?',
        `Stop all reminders for ${reminder.medicationName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteReminder(reminder.id);
              await refresh();
              setStatus(`${reminder.medicationName} reminder deleted.`);
            },
          },
        ],
    );
  }

  function toggleDraftTime(time: string) {
    setDraft((current) => current && ({
      ...current,
      times: current.times.includes(time)
          ? current.times.filter((item) => item !== time)
          : [...current.times, time].sort(),
    }));
  }

  function addCustomTime() {
    const time = to24Hour(customHour, customMinute, customPeriod);
    setDraft((current) => current && (current.times.includes(time)
        ? current
        : { ...current, times: [...current.times, time].sort() }));
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError('');
    try {
      // Ask for phone alerts the first time a reminder is saved - RD
      if (draft.enabled && alertsOn === false && !alertsBlocked) {
        const granted = await requestNotificationPermission();
        setAlertsOn(granted);
        setAlertsBlocked(!granted);
      }
      const { reminder, notificationsOn } = await saveReminder(draft);
      setDraft(null);
      router.setParams({ medicationName: '', dosage: '' });
      await refresh();
      setStatus(notificationsOn
          ? `Reminder saved for ${reminder.medicationName}.`
          : `Reminder saved for ${reminder.medicationName}. Phone alerts are off, so check this screen for your doses.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The reminder could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  // ---------- Add / Edit form ----------
  if (draft) {
    const isEditing = Boolean(draft.id);
    return (
        <SafeAreaView style={styles.screen}>
          <Stack.Screen options={{ headerShown: false }} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header">
              {isEditing ? 'Edit Reminder' : 'New Reminder'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.label} nativeID="medName">Medication name</Text>
              <TextInput
                  style={styles.input}
                  value={draft.medicationName}
                  onChangeText={(medicationName) => setDraft({ ...draft, medicationName })}
                  placeholder="For example: Lisinopril"
                  accessibilityLabelledBy="medName"
                  accessibilityLabel="Medication name"
              />

              <Text style={styles.label} nativeID="dosage">Dosage (optional)</Text>
              <TextInput
                  style={styles.input}
                  value={draft.dosage}
                  onChangeText={(dosage) => setDraft({ ...draft, dosage })}
                  placeholder="For example: 10 mg, 1 tablet"
                  accessibilityLabelledBy="dosage"
                  accessibilityLabel="Dosage"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">When should we remind you?</Text>
              <View style={styles.chipRow}>
                {PRESET_TIMES.map((preset) => {
                  const selected = draft.times.includes(preset.time);
                  return (
                      <Pressable
                          key={preset.time}
                          style={[styles.chip, selected && styles.chipSelected]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={`${preset.label}, ${formatTime(preset.time)}`}
                          onPress={() => toggleDraftTime(preset.time)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {preset.label}
                        </Text>
                        <Text style={[styles.chipSub, selected && styles.chipTextSelected]}>
                          {formatTime(preset.time)}
                        </Text>
                      </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Or pick another time</Text>
              <Text style={styles.smallText}>Tap the arrows, or tap a number to type it.</Text>
              <View style={styles.pickerRow}>
                <Stepper
                    label="Hour"
                    value={customHour}
                    min={1}
                    max={12}
                    onChange={setCustomHour}
                />
                <Text style={styles.colon} accessible={false}>:</Text>
                <Stepper
                    label="Minute"
                    value={customMinute}
                    min={0}
                    max={59}
                    pad
                    onChange={setCustomMinute}
                />
                <Pressable
                    style={styles.periodButton}
                    accessibilityRole="button"
                    accessibilityLabel={`${customPeriod}. Tap to switch to ${customPeriod === 'AM' ? 'PM' : 'AM'}`}
                    onPress={() => setCustomPeriod((p) => (p === 'AM' ? 'PM' : 'AM'))}
                >
                  <Text style={styles.periodText}>{customPeriod}</Text>
                </Pressable>
              </View>
              <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={addCustomTime}>
                <Text style={styles.secondaryButtonText}>
                  Add {formatTime(to24Hour(customHour, customMinute, customPeriod))}
                </Text>
              </Pressable>

              <Text style={styles.label}>Reminder times</Text>
              {draft.times.length === 0 ? (
                  <Text style={styles.smallText}>No times chosen yet.</Text>
              ) : (
                  draft.times.map((time) => (
                      <View key={time} style={styles.timeRow}>
                        <Text style={styles.body}>{formatTime(time)}</Text>
                        <Pressable
                            style={styles.linkButton}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${formatTime(time)}`}
                            onPress={() => toggleDraftTime(time)}
                        >
                          <Text style={styles.linkText}>Remove</Text>
                        </Pressable>
                      </View>
                  ))
              )}
            </View>

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Pressable
                style={[styles.button, saving && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
                onPress={save}
            >
              <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Reminder'}</Text>
            </Pressable>
            <Pressable
                style={styles.secondaryButton}
                accessibilityRole="button"
                onPress={() => {
                  setDraft(null);
                  setError('');
                  router.setParams({ medicationName: '', dosage: '' });
                }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
    );
  }

  // ---------- Main view ----------
  return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={26} color="#17618E" accessible={false} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title} accessibilityRole="header">Medication Reminders</Text>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Reminders are saved on this phone only. Always follow your provider’s instructions.
            </Text>
          </View>

          {status ? (
              <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>
          ) : null}

          {alertsOn === false && reminders.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Phone alerts are off</Text>
                {alertsBlocked ? (
                    <>
                      <Text style={styles.body}>
                        Notifications are turned off for EZ Healthcare. You can turn them on in your phone’s Settings.
                      </Text>
                      <Pressable style={styles.button} accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                        <Text style={styles.buttonText}>Open Settings</Text>
                      </Pressable>
                    </>
                ) : (
                    <>
                      <Text style={styles.body}>
                        Turn on alerts so your phone reminds you even when the app is closed.
                      </Text>
                      <Pressable style={styles.button} accessibilityRole="button" onPress={turnOnAlerts}>
                        <Text style={styles.buttonText}>Turn On Alerts</Text>
                      </Pressable>
                    </>
                )}
              </View>
          )}

          {reminders.length > 0 && alertsOn !== false && (
              <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => void testAlert()}>
                <Text style={styles.secondaryButtonText}>Send a Test Alert</Text>
              </Pressable>
          )}

          <Text style={styles.sectionTitle} accessibilityRole="header">Today</Text>
          {doses.length === 0 ? (
              <Text style={styles.body}>No doses scheduled for today.</Text>
          ) : (
              doses.map((dose) => {
                const due = !dose.takenAt && dose.time <= currentTime;
                return (
                    <View key={dose.key} style={[styles.card, dose.takenAt ? styles.cardDone : null]}>
                      <View style={styles.doseHeader}>
                        <Ionicons
                            name={dose.takenAt ? 'checkmark-circle' : 'alarm-outline'}
                            size={34}
                            color={dose.takenAt ? '#1E7A4C' : '#17618E'}
                            accessible={false}
                        />
                        <Text style={styles.doseTime}>{formatTime(dose.time)}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{dose.medicationName}</Text>
                      {dose.dosage ? <Text style={styles.body}>{dose.dosage}</Text> : null}
                      {dose.takenAt ? (
                          <Text style={styles.takenText}>
                            Taken at {new Date(dose.takenAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </Text>
                      ) : due ? (
                          <Text style={styles.dueText}>Due now</Text>
                      ) : null}
                      <Pressable
                          style={dose.takenAt ? styles.secondaryButton : styles.button}
                          accessibilityRole="button"
                          accessibilityLabel={dose.takenAt
                              ? `Undo. Mark ${dose.medicationName} at ${formatTime(dose.time)} as not taken`
                              : `Mark ${dose.medicationName} at ${formatTime(dose.time)} as taken`}
                          onPress={() => void toggleTaken(dose)}
                      >
                        <Text style={dose.takenAt ? styles.secondaryButtonText : styles.buttonText}>
                          {dose.takenAt ? 'Undo' : 'Mark as Taken'}
                        </Text>
                      </Pressable>
                    </View>
                );
              })
          )}

          <Text style={styles.sectionTitle} accessibilityRole="header">My Reminders</Text>
          {reminders.length === 0 && (
              <Text style={styles.body}>
                You have no reminders yet. Add one below, or tap “Set Reminder” on a medication in Medications.
              </Text>
          )}
          {reminders.map((reminder) => (
              <View key={reminder.id} style={styles.card}>
                <View style={styles.reminderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{reminder.medicationName}</Text>
                    {reminder.dosage ? <Text style={styles.body}>{reminder.dosage}</Text> : null}
                  </View>
                  <Switch
                      value={reminder.enabled}
                      onValueChange={(enabled) => void toggleEnabled(reminder, enabled)}
                      accessibilityLabel={`Reminders for ${reminder.medicationName}`}
                      trackColor={{ true: '#17618E', false: '#C9D1D6' }}
                  />
                </View>
                <Text style={styles.smallText}>
                  {reminder.enabled ? 'Every day at ' : 'Off · '}
                  {reminder.times.map(formatTime).join(', ')}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                      style={[styles.secondaryButton, styles.flex]}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${reminder.medicationName} reminder`}
                      onPress={() => {
                        setError('');
                        setDraft({
                          id: reminder.id,
                          medicationName: reminder.medicationName,
                          dosage: reminder.dosage,
                          times: reminder.times,
                          enabled: reminder.enabled,
                        });
                      }}
                  >
                    <Text style={styles.secondaryButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                      style={[styles.dangerButton, styles.flex]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${reminder.medicationName} reminder`}
                      onPress={() => confirmDelete(reminder)}
                  >
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
          ))}

          <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setDraft(emptyDraft());
              }}
          >
            <Text style={styles.buttonText}>Add Reminder</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
  );
}

function Stepper({ label, value, min, max, pad = false, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  pad?: boolean;
  onChange: (value: number) => void;
}) {
  const shown = pad ? String(value).padStart(2, '0') : String(value);
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);

  // Wrap around: 12 → 1 for hours, 59 → 00 for minutes - RD
  const step = (delta: number) => {
    const span = max - min + 1;
    onChange(((value - min + delta) % span + span) % span + min);
  };

  const commit = () => {
    setEditing(false);
    const typed = Number.parseInt(text, 10);
    if (Number.isFinite(typed) && typed >= min && typed <= max) onChange(typed);
  };

  return (
      <View style={styles.stepper}>
        <Pressable style={styles.stepButton} accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => step(1)}>
          <Ionicons name="chevron-up" size={28} color="#17618E" accessible={false} />
        </Pressable>
        <TextInput
            style={styles.stepValue}
            value={editing ? text : shown}
            onFocus={() => {
              setEditing(true);
              setText('');
            }}
            onChangeText={(next) => setText(next.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel={`${label}: ${shown}. Double tap to type a ${label.toLowerCase()} from ${min} to ${max}`}
        />
        <Pressable style={styles.stepButton} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => step(-1)}>
          <Ionicons name="chevron-down" size={28} color="#17618E" accessible={false} />
        </Pressable>
      </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F3' },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', padding: 20, gap: 18 },
  backButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 12 },
  backText: { fontSize: 20, fontWeight: '600', color: '#17618E' },
  title: { fontSize: 30, fontWeight: '800', color: '#17618E' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#0B2236', marginTop: 8 },
  notice: { padding: 16, borderRadius: 16, backgroundColor: '#E7F2EC' },
  noticeText: { fontSize: 17, lineHeight: 25, color: '#18533F' },
  status: { fontSize: 18, lineHeight: 26, color: '#18533F', fontWeight: '600' },
  card: { padding: 20, gap: 12, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE4E2' },
  cardDone: { backgroundColor: '#F1F8F4', borderColor: '#B9DCC8' },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#0B2236' },
  body: { fontSize: 20, lineHeight: 29, color: '#0B2236' },
  smallText: { fontSize: 18, lineHeight: 26, color: '#425466' },
  label: { fontSize: 18, fontWeight: '700', color: '#17618E' },
  input: { minHeight: 60, padding: 14, borderWidth: 2, borderColor: '#17618E', borderRadius: 12, fontSize: 22, color: '#0B2236', backgroundColor: '#FFFFFF' },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseTime: { fontSize: 26, fontWeight: '800', color: '#17618E' },
  takenText: { fontSize: 19, fontWeight: '700', color: '#1E7A4C' },
  dueText: { fontSize: 19, fontWeight: '700', color: '#9B4A00' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minWidth: '46%', flexGrow: 1, minHeight: 64, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: '#17618E', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: '#17618E' },
  chipText: { fontSize: 20, fontWeight: '700', color: '#17618E' },
  chipSub: { fontSize: 16, color: '#17618E' },
  chipTextSelected: { color: '#FFFFFF' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stepper: { alignItems: 'center', gap: 4 },
  stepButton: { width: 64, height: 52, borderRadius: 12, borderWidth: 2, borderColor: '#DDE4E2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  stepValue: { fontSize: 30, fontWeight: '800', color: '#0B2236', minWidth: 72, minHeight: 56, textAlign: 'center', borderWidth: 2, borderColor: '#DDE4E2', borderRadius: 12, backgroundColor: '#FFFFFF', paddingVertical: 4 },
  colon: { fontSize: 30, fontWeight: '800', color: '#0B2236' },
  periodButton: { width: 80, height: 64, borderRadius: 14, backgroundColor: '#E8F1F7', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#17618E' },
  periodText: { fontSize: 24, fontWeight: '800', color: '#17618E' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: 1, borderBottomColor: '#EDF0F3' },
  linkButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontSize: 18, fontWeight: '700', color: '#9B2424' },
  button: { minHeight: 56, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: '#17618E' },
  buttonText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  secondaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#17618E', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { fontSize: 20, fontWeight: '700', color: '#17618E', textAlign: 'center' },
  dangerButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#9B2424', backgroundColor: '#FFFFFF' },
  dangerText: { fontSize: 20, fontWeight: '700', color: '#9B2424' },
  disabled: { opacity: 0.6 },
  error: { fontSize: 18, lineHeight: 27, color: '#9B2424' },
});
