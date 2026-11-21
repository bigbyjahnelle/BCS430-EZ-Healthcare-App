import { accountStorage } from './accountStorage';
import { getDataMode } from './dataMode';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Medication reminders are stored on this device only - RD

export type Reminder = {
    id: string;
    medicationName: string;
    dosage: string;
    /** 24-hour times, "HH:MM", sorted - RD */
    times: string[];
    enabled: boolean;
    createdAt: string;
};

export type ReminderInput = {
    id?: string;
    medicationName: string;
    dosage: string;
    times: string[];
    enabled: boolean;
};

export type DoseItem = {
    key: string;
    reminderId: string;
    medicationName: string;
    dosage: string;
    time: string;
    takenAt: string | null;
};

/** Dose log: local date (YYYY-MM-DD) → dose key → time it was marked taken - RD */
type DoseLog = Record<string, Record<string, string>>;

const REMINDERS_KEY = 'ez.reminders.v1';
const DOSE_LOG_KEY = 'ez.doseLog.v1';
const CHANNEL_ID = 'medication-reminders';
const NOTIFICATION_KIND = 'medication-reminder';
const LOG_DAYS_KEPT = 14;

export const PRESET_TIMES = [
    { label: 'Morning', time: '08:00' },
    { label: 'Noon', time: '12:00' },
    { label: 'Evening', time: '18:00' },
    { label: 'Bedtime', time: '21:00' },
];

// ---------- Small helpers ----------

export function isValidTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatTime(value: string) {
    const [hour, minute] = value.split(':').map(Number);
    const suffix = hour < 12 ? 'AM' : 'PM';
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function localDateKey(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function doseKey(reminderId: string, time: string) {
    return `${reminderId}@${time}`;
}

function newId() {
    return `rem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTimes(times: string[]) {
    return [...new Set(times.filter(isValidTime))].sort();
}

// Run storage updates one at a time so quick taps cannot overwrite each other - RD
let queue: Promise<unknown> = Promise.resolve();
let scopedStorage: Awaited<ReturnType<typeof accountStorage>>;
function serialized<T>(task: () => Promise<T>, needsAccount = true): Promise<T> {
    const run = async () => {
        if (needsAccount) scopedStorage = await accountStorage('reminders');
        return task();
    };
    const next = queue.then(run, run);
    queue = next.catch(() => undefined);
    return next;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
    try {
        const raw = await scopedStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

async function readReminders(): Promise<Reminder[]> {
    const value = await readJson<unknown>(REMINDERS_KEY, []);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Reminder =>
        typeof item?.id === 'string' &&
        typeof item?.medicationName === 'string' &&
        Array.isArray(item?.times),
    );
}

async function writeReminders(reminders: Reminder[]) {
    await scopedStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

// ---------- Notifications ----------

let configured = false;

/** Call once at app start (done in src/app/_layout.tsx) - RD */
export function configureNotifications() {
    if (configured) return;
    configured = true;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === 'android') {
        void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Medication reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 400, 200, 400],
        }).catch(() => undefined);
    }
}

export async function hasNotificationPermission() {
    try {
        const { granted } = await Notifications.getPermissionsAsync();
        return granted;
    } catch {
        return false;
    }
}

/** Asks the system for permission if it has not been answered yet - RD */
export async function requestNotificationPermission() {
    try {
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) return true;
        if (!current.canAskAgain) return false;
        const answer = await Notifications.requestPermissionsAsync();
        return answer.granted;
    } catch {
        return false;
    }
}

export function isReminderNotification(data: unknown) {
    return typeof data === 'object' && data !== null &&
        (data as { kind?: unknown }).kind === NOTIFICATION_KIND;
}

/**
 * Cancels this app's reminder notifications and schedules one daily
 * notification per enabled reminder time. Returns false when the phone has
 * not allowed notifications (the in-app schedule still works) - RD
 */
async function syncNotifications(reminders: Reminder[]) {
    if (!(await hasNotificationPermission())) return false;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
        .filter((request) => isReminderNotification(request.content.data) &&
            !(request.content.data as { test?: boolean }).test)
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));

    for (const reminder of reminders) {
        if (!reminder.enabled) continue;
        for (const time of reminder.times) {
            await scopedStorage.getItem('__check_account__');
            const [hour, minute] = time.split(':').map(Number);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: getDataMode() === 'sample' ? 'Sample medication reminder' : 'Medication reminder',
                    body: `Time to take ${reminder.medicationName}` +
                        (reminder.dosage ? ` (${reminder.dosage})` : '') + '.',
                    sound: 'default',
                    data: { kind: NOTIFICATION_KIND, reminderId: reminder.id, time },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour,
                    minute,
                    channelId: CHANNEL_ID,
                },
            });
        }
    }
    return true;
}

/** Sends a one-off test notification after a few seconds, to check alerts work - RD */
export function sendTestNotification(seconds = 10) {
    return serialized(async () => {
        if (!(await hasNotificationPermission())) return false;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Test reminder',
                body: 'Medication reminders are working on this phone.',
                sound: 'default',
                data: { kind: NOTIFICATION_KIND, test: true },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds,
                channelId: CHANNEL_ID,
            },
        });
        return true;
    });
}

/** Re-schedules notifications from saved reminders (e.g. after permission is granted) - RD */
export function resyncNotifications() {
    return serialized(async () => syncNotifications(await readReminders()));
}

// ---------- Reminders ----------

export function getReminders() {
    return serialized(readReminders);
}

export function saveReminder(input: ReminderInput) {
    return serialized(async () => {
        const medicationName = input.medicationName.trim();
        const times = normalizeTimes(input.times);
        if (!medicationName) throw new Error('Enter the medication name.');
        if (!times.length) throw new Error('Choose at least one reminder time.');

        const reminders = await readReminders();
        const existing = input.id ? reminders.find((item) => item.id === input.id) : undefined;
        const reminder: Reminder = {
            id: existing?.id ?? newId(),
            medicationName,
            dosage: input.dosage.trim(),
            times,
            enabled: input.enabled,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        const next = existing
            ? reminders.map((item) => (item.id === reminder.id ? reminder : item))
            : [...reminders, reminder];

        await writeReminders(next);
        const notificationsOn = await syncNotifications(next).catch(() => false);
        return { reminder, notificationsOn };
    });
}

export function setReminderEnabled(id: string, enabled: boolean) {
    return serialized(async () => {
        const next = (await readReminders()).map((item) =>
            item.id === id ? { ...item, enabled } : item);
        await writeReminders(next);
        return syncNotifications(next).catch(() => false);
    });
}

export function deleteReminder(id: string) {
    return serialized(async () => {
        const next = (await readReminders()).filter((item) => item.id !== id);
        await writeReminders(next);
        await syncNotifications(next).catch(() => false);
    });
}

// ---------- Today's doses ----------

export function getTodayDoses(date = new Date()) {
    return serialized(async (): Promise<DoseItem[]> => {
        const reminders = await readReminders();
        const log = await readJson<DoseLog>(DOSE_LOG_KEY, {});
        const taken = log[localDateKey(date)] ?? {};

        return reminders
            .filter((reminder) => reminder.enabled)
            .flatMap((reminder) => reminder.times.map((time) => {
                const key = doseKey(reminder.id, time);
                return {
                    key,
                    reminderId: reminder.id,
                    medicationName: reminder.medicationName,
                    dosage: reminder.dosage,
                    time,
                    takenAt: taken[key] ?? null,
                };
            }))
            .sort((a, b) => a.time.localeCompare(b.time) ||
                a.medicationName.localeCompare(b.medicationName));
    });
}

export function setDoseTaken(reminderId: string, time: string, taken: boolean, date = new Date()) {
    return serialized(async () => {
        const log = await readJson<DoseLog>(DOSE_LOG_KEY, {});
        const day = localDateKey(date);
        const entries = { ...(log[day] ?? {}) };
        const key = doseKey(reminderId, time);

        if (taken) entries[key] = new Date().toISOString();
        else delete entries[key];

        // Keep only the most recent days so storage stays small - RD
        const next: DoseLog = { ...log, [day]: entries };
        const keep = Object.keys(next).sort().slice(-LOG_DAYS_KEPT);
        const trimmed = Object.fromEntries(keep.map((k) => [k, next[k]]));

        await scopedStorage.setItem(DOSE_LOG_KEY, JSON.stringify(trimmed));
        return entries[key] ?? null;
    });
}

// Cancel only this app's medication notifications on account/mode transitions.
export function suspendReminderNotifications() {
    return serialized(async () => {
        const requests = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(requests.filter(r => isReminderNotification(r.content.data))
            .map(r => Notifications.cancelScheduledNotificationAsync(r.identifier)));
    }, false);
}