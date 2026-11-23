import { ScrollView, StyleSheet, Switch, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageBackground from '../components/PageBackground';
import { BLUE, BORDER, Card, FONT, GEAR_CLEARANCE, INK, PrimaryButton, ScreenHeader } from '../components/ScreenParts';
import { useScreenSummary } from '../services/screenSummary';
import {
  APPOINTMENTS_WINDOWS,
  RESULTS_WINDOWS,
  speak,
  SpeechSpeed,
  updateVoiceSettings,
  useVoiceSettings,
} from '../services/voiceSettings';

// Accessibility > Voice & Communication: controls for Ask EZ and spoken replies - RD

const SPEEDS: { value: SpeechSpeed; label: string }[] = [
  { value: 'slower', label: 'Slower' },
  { value: 'normal', label: 'Normal' },
  { value: 'faster', label: 'Faster' },
];

// Row of large choice buttons where one is selected - RD
function ChoiceRow<T extends string | number>({ title, description, options, value, onChange }: {
  title: string;
  description?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
      <View style={styles.choiceBlock}>
        <Text style={styles.rowTitle} accessibilityRole="header">{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
        <View style={styles.speedRow} accessibilityRole="radiogroup">
          {options.map((option) => {
            const selected = option.value === value;
            return (
                <Pressable
                    key={String(option.value)}
                    style={[styles.speedChip, selected && styles.speedChipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${title}: ${option.label}`}
                    onPress={() => onChange(option.value)}
                >
                  <Text style={[styles.speedText, selected && styles.speedTextSelected]}>{option.label}</Text>
                </Pressable>
            );
          })}
        </View>
      </View>
  );
}

function SettingRow({ title, description, value, onChange }: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowDescription}>{description}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onChange}
            accessibilityLabel={title}
            accessibilityHint={description}
            trackColor={{ true: BLUE, false: '#C9D1D6' }}
        />
      </View>
  );
}

export default function VoiceSettingsScreen() {
  const settings = useVoiceSettings();
  const speedLabel = SPEEDS.find((item) => item.value === settings.speed)?.label ?? 'Normal';

  const resultsLabel = settings.resultsDays ? `the last ${settings.resultsDays} days` : 'all results';
  useScreenSummary(
      `Voice settings. Voice commands are ${settings.commandsEnabled ? 'on' : 'off'}. ` +
      `Spoken replies are ${settings.spokenReplies ? 'on' : 'off'}. Speaking speed is ${speedLabel.toLowerCase()}. ` +
      `Test results read ${resultsLabel}, and appointments read the next ${settings.appointmentsDays} days.`,
  );

  return (
      <PageBackground>
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ScreenHeader title="Voice" />

            <Card style={styles.cardGap}>
              <SettingRow
                  title="Voice commands"
                  description="Show the Ask EZ microphone so you can move around the app by speaking."
                  value={settings.commandsEnabled}
                  onChange={(commandsEnabled) => void updateVoiceSettings({ commandsEnabled })}
              />
              <View style={styles.divider} />
              <SettingRow
                  title="Spoken replies"
                  description="Say things like “Opening Medications” out loud. Reading a screen always speaks."
                  value={settings.spokenReplies}
                  onChange={(spokenReplies) => void updateVoiceSettings({ spokenReplies })}
              />
            </Card>

            <Card style={styles.cardGap}>
              <ChoiceRow
                  title="Speaking speed"
                  options={SPEEDS}
                  value={settings.speed}
                  onChange={(speed) => void updateVoiceSettings({ speed })}
              />
              <PrimaryButton
                  label="Test My Voice"
                  onPress={() => speak('This is how EZ Healthcare will sound when it talks to you.', { always: true })}
              />
            </Card>

            <Card style={styles.cardGap}>
              <Text style={styles.cardHeading} accessibilityRole="header">Reading screens aloud</Text>
              <ChoiceRow
                  title="Test results"
                  description="How far back to read when you ask Ask EZ to read Test Results."
                  options={RESULTS_WINDOWS.map((days) => ({ value: days, label: days ? `${days} days` : 'All' }))}
                  value={settings.resultsDays}
                  onChange={(resultsDays) => void updateVoiceSettings({ resultsDays })}
              />
              <View style={styles.divider} />
              <ChoiceRow
                  title="Appointments"
                  description="How far ahead to read when you ask Ask EZ to read Appointments."
                  options={APPOINTMENTS_WINDOWS.map((days) => ({ value: days, label: `${days} days` }))}
                  value={settings.appointmentsDays}
                  onChange={(appointmentsDays) => void updateVoiceSettings({ appointmentsDays })}
              />
            </Card>

            <Text style={styles.note}>
              These settings are saved on this phone. Ask EZ only listens after you tap a microphone button.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </PageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: GEAR_CLEARANCE, gap: 16, width: '100%', maxWidth: 540, alignSelf: 'center' },
  cardGap: { gap: 14 },
  choiceBlock: { gap: 8 },
  cardHeading: { fontFamily: FONT, fontSize: 23, fontWeight: '800', color: BLUE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: FONT, fontSize: 21, fontWeight: '800', color: INK },
  rowDescription: { fontFamily: FONT, fontSize: 17, lineHeight: 24, color: '#44525A' },
  divider: { height: 1, backgroundColor: BORDER },
  speedRow: { flexDirection: 'row', gap: 10 },
  speedChip: { flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: BLUE, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  speedChipSelected: { backgroundColor: BLUE },
  speedText: { fontFamily: FONT, fontSize: 18, fontWeight: '700', color: BLUE },
  speedTextSelected: { color: '#FFFFFF' },
  note: { fontFamily: FONT, fontSize: 16, lineHeight: 23, color: '#44525A', textAlign: 'center' },
});
