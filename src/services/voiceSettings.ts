import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useEffect, useSyncExternalStore } from 'react';

// Voice settings from Accessibility > Voice & Communication - RD

export type SpeechSpeed = 'slower' | 'normal' | 'faster';

/** How far back "read this screen" goes on Test Results; 0 means all results - RD */
export type ResultsWindow = 0 | 7 | 30 | 90;

/** How far ahead "read this screen" goes on Appointments - RD */
export type AppointmentsWindow = 7 | 14 | 30;

export const RESULTS_WINDOWS: ResultsWindow[] = [7, 30, 90, 0];
export const APPOINTMENTS_WINDOWS: AppointmentsWindow[] = [7, 14, 30];

export type VoiceSettings = {
    /** Shows the Ask EZ microphone buttons - RD */
    commandsEnabled: boolean;
    /** Says confirmations like "Opening Medications" out loud - RD */
    spokenReplies: boolean;
    speed: SpeechSpeed;
    resultsDays: ResultsWindow;
    appointmentsDays: AppointmentsWindow;
};

const STORAGE_KEY = 'ez.voiceSettings.v1';

const DEFAULTS: VoiceSettings = {
    commandsEnabled: true,
    spokenReplies: true,
    speed: 'normal',
    resultsDays: 30,
    appointmentsDays: 7,
};

// Speech rates for expo-speech, where 1.0 is the phone's normal speed - RD
const RATES: Record<SpeechSpeed, number> = { slower: 0.75, normal: 0.95, faster: 1.15 };

let settings: VoiceSettings = DEFAULTS;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

/** Reads saved settings once; screens show the defaults until this finishes - RD */
export function loadVoiceSettings() {
    if (loaded) return Promise.resolve();
    if (!loading) {
        loading = (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                const saved = raw ? (JSON.parse(raw) as Partial<VoiceSettings>) : {};
                settings = {
                    commandsEnabled: typeof saved.commandsEnabled === 'boolean' ? saved.commandsEnabled : DEFAULTS.commandsEnabled,
                    spokenReplies: typeof saved.spokenReplies === 'boolean' ? saved.spokenReplies : DEFAULTS.spokenReplies,
                    speed: saved.speed && saved.speed in RATES ? saved.speed : DEFAULTS.speed,
                    resultsDays: RESULTS_WINDOWS.includes(saved.resultsDays as ResultsWindow)
                        ? saved.resultsDays as ResultsWindow
                        : DEFAULTS.resultsDays,
                    appointmentsDays: APPOINTMENTS_WINDOWS.includes(saved.appointmentsDays as AppointmentsWindow)
                        ? saved.appointmentsDays as AppointmentsWindow
                        : DEFAULTS.appointmentsDays,
                };
            } catch {
                settings = DEFAULTS;
            }
            loaded = true;
            notify();
        })();
    }
    return loading;
}

export function getVoiceSettings() {
    return settings;
}

export async function updateVoiceSettings(changes: Partial<VoiceSettings>) {
    settings = { ...settings, ...changes };
    notify();
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Still applies for this session even if it couldn't be saved - RD
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Current voice settings; screens update automatically when they change - RD */
export function useVoiceSettings() {
    useEffect(() => {
        void loadVoiceSettings();
    }, []);
    return useSyncExternalStore(subscribe, getVoiceSettings, getVoiceSettings);
}

// Whether a "read this screen" readout is playing, so screens can show a Stop button - RD
let reading = false;
let speechId = 0;
const readingListeners = new Set<() => void>();

function setReading(value: boolean) {
    if (reading === value) return;
    reading = value;
    readingListeners.forEach((listener) => listener());
}

export function isReading() {
    return reading;
}

/** True while a screen readout is playing - RD */
export function useIsReading() {
    return useSyncExternalStore(
        (listener) => {
            readingListeners.add(listener);
            return () => {
                readingListeners.delete(listener);
            };
        },
        isReading,
        isReading,
    );
}

/**
 * Says text out loud at the chosen speed. Short confirmations are skipped when
 * spoken replies are off; pass always: true for things the user asked to hear,
 * and reading: true for screen readouts so a Stop button is shown while they play - RD
 */
export function speak(text: string, options: { always?: boolean; reading?: boolean } = {}) {
    if (!options.always && !settings.spokenReplies) return;
    void Speech.stop();
    const id = ++speechId;
    // Only the latest speech can clear the reading state, so stopping old speech can't hide a new Stop button - RD
    const finished = () => {
        if (id === speechId) setReading(false);
    };
    setReading(Boolean(options.reading));
    Speech.speak(text, {
        language: 'en-US',
        rate: RATES[settings.speed],
        onDone: finished,
        onStopped: finished,
        onError: finished,
    });
}

export function stopSpeaking() {
    speechId += 1;
    setReading(false);
    void Speech.stop();
}
