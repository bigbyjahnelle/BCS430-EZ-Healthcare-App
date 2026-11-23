import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageBackground from '../components/PageBackground';
import { modeLabel, useDataMode } from '../services/dataMode';
import { spokenList, useScreenSummary } from '../services/screenSummary';
import {
  BLUE,
  BORDER,
  Card,
  FONT,
  GEAR_CLEARANCE,
  INK,
  ScreenHeader,
  shadow,
} from '../components/ScreenParts';
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

// White chip so headings stay readable over the colorful background
function SectionChip({ title }: { title: string }) {
  return (
      <View style={styles.sectionChip}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
  );
}

export default function RemindersScreen() {
  const mode = useDataMode();
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

  // What Ask EZ reads for "read this screen": each reminder's times and when it is next due - RD
  const activeReminders = reminders.filter((reminder) => reminder.enabled);
  const offCount = reminders.length - activeReminders.length;
  const takenCount = doses.filter((dose) => dose.takenAt).length;
  const missed = doses.filter((dose) => !dose.takenAt && dose.time < currentTime);
  const describeReminder = (reminder: Reminder) => {
    const name = reminder.dosage ? `${reminder.medicationName}, ${reminder.dosage}` : reminder.medicationName;
    const dueLater = doses.find((dose) => dose.reminderId === reminder.id && !dose.takenAt && dose.time >= currentTime);
    const next = dueLater ? `today at ${formatTime(dueLater.time)}` : `tomorrow at ${formatTime(reminder.times[0])}`;
    return `${name}: every day at ${spokenList(reminder.times.map(formatTime), reminder.times.length)}. Next dose ${next}.`;
  };
  useScreenSummary(draft
      ? `You are ${draft.id ? 'editing' : 'adding'} a reminder${draft.medicationName ? ` for ${draft.medicationName}` : ''}.`
      : reminders.length === 0
          ? 'You have no medication reminders yet.'
          : [
              `You have ${activeReminders.length} active medication ${activeReminders.length === 1 ? 'reminder' : 'reminders'}.`,
              ...activeReminders.map(describeReminder),
              missed.length
                  ? `Not taken yet from earlier today: ${spokenList(missed.map((dose) => `${dose.medicationName} at ${formatTime(dose.time)}`), missed.length)}.`
                  : '',
              doses.length ? `Today, ${takenCount} of ${doses.length} ${doses.length === 1 ? 'dose is' : 'doses are'} taken.` : '',
              offCount ? `${offCount} ${offCount === 1 ? 'reminder is' : 'reminders are'} turned off.` : '',
            ].filter(Boolean).join(' '));

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
        <PageBackground>
          <SafeAreaView style={styles.screen}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
              <View style={styles.formTitleWrap}>
                <Text style={styles.title} accessibilityRole="header">
                  {isEditing ? 'Edit Reminder' : 'New Reminder'}
                </Text>
              </View>

              <Card style={styles.cardGap}>
                <Text style={styles.label} nativeID="medName">Medication name</Text>
                <TextInput
                    style={styles.input}
                    value={draft.medicationName}
                    onChangeText={(medicationName) => setDraft({ ...draft, medicationName })}
                    placeholder="For example: Lisinopril"
                    placeholderTextColor="#6F7E88"
                    accessibilityLabelledBy="medName"
                    accessibilityLabel="Medication name"
                />

                <Text style={styles.label} nativeID="dosage">Dosage (optional)</Text>
                <TextInput
                    style={styles.input}
                    value={draft.dosage}
                    onChangeText={(dosage) => setDraft({ ...draft, dosage })}
                    placeholder="For example: 10 mg, 1 tablet"
                    placeholderTextColor="#6F7E88"
                    accessibilityLabelledBy="dosage"
                    accessibilityLabel="Dosage"
                />
              </Card>

              <Card style={styles.cardGap}>
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
              </Card>

              {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.error} accessibilityRole="alert">{error}</Text>
                  </View>
              ) : null}

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
        </PageBackground>
    );
  }

  // ---------- Main view ----------
  return (
      <PageBackground>
        <SafeAreaView style={styles.screen}>
          <Stack.Screen options={{ headerShown: false }} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ScreenHeader title="Reminders" />

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {modeLabel(mode)}. Reminders are saved for this account and mode on this phone only. No reminder is written to Epic.
              </Text>
            </View>

            {status ? (
                <View style={styles.notice}>
                  <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>
                </View>
            ) : null}

            {alertsOn === false && reminders.length > 0 && (
                <Card style={styles.cardGap}>
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
                </Card>
            )}

            {reminders.length > 0 && alertsOn !== false && (
                <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => void testAlert()}>
                  <Text style={styles.secondaryButtonText}>Send a Test Alert</Text>
                </Pressable>
            )}

            <SectionChip title="Today" />
            {doses.length === 0 ? (
                <Card>
                  <Text style={styles.body}>No doses scheduled for today.</Text>
                </Card>
            ) : (
                doses.map((dose) => {
                  const due = !dose.takenAt && dose.time <= currentTime;
                  return (
                      <Card
                          key={dose.key}
                          style={dose.takenAt ? [styles.cardGap, styles.cardDone] : styles.cardGap}
                      >
                        <View style={styles.doseHeader}>
                          <Ionicons
                              name={dose.takenAt ? 'checkmark-circle' : 'alarm-outline'}
                              size={34}
                              color={dose.takenAt ? '#1E7A4C' : BLUE}
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
                      </Card>
                  );
                })
            )}

            <SectionChip title="My Reminders" />
            {reminders.length === 0 && (
                <Card>
                  <Text style={styles.body}>
                    You have no reminders yet. Add one below, or tap “Set Reminder” on a medication in Medications.
                  </Text>
                </Card>
            )}
            {reminders.map((reminder) => (
                <Card key={reminder.id} style={styles.cardGap}>
                  <View style={styles.reminderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{reminder.medicationName}</Text>
                      {reminder.dosage ? <Text style={styles.body}>{reminder.dosage}</Text> : null}
                    </View>
                    <Switch
                        value={reminder.enabled}
                        onValueChange={(enabled) => void toggleEnabled(reminder, enabled)}
                        accessibilityLabel={`Reminders for ${reminder.medicationName}`}
                        trackColor={{ true: BLUE, false: '#C9D1D6' }}
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
                </Card>
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
      </PageBackground>
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
          <Ionicons name="chevron-up" size={28} color={BLUE} accessible={false} />
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
          <Ionicons name="chevron-down" size={28} color={BLUE} accessible={false} />
        </Pressable>
      </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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

  title: { fontFamily: FONT, fontSize: 30, fontWeight: '800', color: INK, textAlign: 'center' },
  formTitleWrap: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 8,
  },

  sectionChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
  },
  sectionTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: INK },

  notice: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E7F2EC',
    borderWidth: 1.5,
    borderColor: '#B9DCC8',
  },
  noticeText: { fontSize: 17, lineHeight: 25, color: '#18533F' },
  status: { fontSize: 18, lineHeight: 26, color: '#18533F', fontWeight: '600' },

  cardGap: { gap: 12 },
  cardDone: { borderColor: '#B9DCC8' },
  cardTitle: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: INK },
  body: { fontSize: 20, lineHeight: 29, color: INK },
  smallText: { fontSize: 18, lineHeight: 26, color: '#2E3A42' },
  label: { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: BLUE },
  input: {
    minHeight: 60,
    padding: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 16,
    fontSize: 22,
    color: INK,
    backgroundColor: '#FFFFFF',
  },

  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseTime: { fontFamily: FONT, fontSize: 26, fontWeight: '800', color: BLUE },
  takenText: { fontSize: 19, fontWeight: '700', color: '#1E7A4C' },
  dueText: { fontSize: 19, fontWeight: '700', color: '#9B4A00' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minWidth: '46%',
    flexGrow: 1,
    minHeight: 64,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BLUE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: BLUE },
  chipText: { fontSize: 20, fontWeight: '700', color: BLUE },
  chipSub: { fontSize: 16, color: BLUE },
  chipTextSelected: { color: '#FFFFFF' },

  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stepper: { alignItems: 'center', gap: 4 },
  stepButton: {
    width: 64,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepValue: {
    fontSize: 30,
    fontWeight: '800',
    color: INK,
    minWidth: 72,
    minHeight: 56,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  colon: { fontSize: 30, fontWeight: '800', color: INK },
  periodButton: {
    width: 80,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#DCEAF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BLUE,
  },
  periodText: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: BLUE },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#C9D6E2',
  },
  linkButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontSize: 18, fontWeight: '700', color: '#9B2424' },

  button: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: BLUE,
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  buttonText: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  secondaryButton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: BLUE,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: BLUE, textAlign: 'center' },
  dangerButton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#9B2424',
    backgroundColor: '#FFFFFF',
  },
  dangerText: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: '#9B2424' },
  disabled: { opacity: 0.6 },

  errorBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#9B2424',
  },
  error: { fontSize: 18, lineHeight: 27, color: '#9B2424' },
});