import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { isReading, stopSpeaking } from './voiceSettings';

// "Read this screen": each screen describes what it is showing in a sentence or two - RD
// Only the screen currently on top is kept, so Ask EZ always reads the one you see - RD

let title: { owner: symbol; text: string } | null = null;
let summary: { owner: symbol; text: string } | null = null;

/** What Ask EZ reads for "read this screen", or null if the screen has nothing yet - RD */
export function getScreenSummary() {
    if (summary) return forSpeech(summary.text);
    if (title) return `This is the ${title.text} screen.`;
    return null;
}

// Units the phone's voice would otherwise spell out letter by letter - RD
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

const SPOKEN_UNITS: [RegExp, string | ((...match: string[]) => string)][] = [
    [/Systolic:\s*(\d+)\s*mm\s?Hg;\s*Diastolic:\s*(\d+)\s*mm\s?Hg/gi, '$1 over $2'],
    [/(\d+)\s*\/\s*(\d+)\s*mm\s?Hg\b/gi, '$1 over $2'],
    // Dates shown as 3/14/1948 are read as "March 14, 1948" - RD
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_match, month, day, year) =>
        MONTH_NAMES[Number(month) - 1] ? `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}` : _match],
    // Drop seconds from times like 10:00:00 AM - RD
    [/\b(\d{1,2}):(\d{2}):\d{2}(\s*[AP]M)\b/gi, '$1:$2$3'],
    [/\bmm\s?Hg\b/gi, 'millimeters of mercury'],
    [/\bmg\s*\/\s*dL\b/gi, 'milligrams per deciliter'],
    [/\bng\s*\/\s*mL\b/gi, 'nanograms per milliliter'],
    [/\bmmol\s*\/\s*L\b/gi, 'millimoles per liter'],
    [/\bg\s*\/\s*dL\b/gi, 'grams per deciliter'],
    [/\bmcg\b/gi, 'micrograms'],
    [/\bmg\b/gi, 'milligrams'],
    [/\bmL\b/g, 'milliliters'],
    [/\bbeats\s*\/\s*min\b/gi, 'beats per minute'],
    [/\bbpm\b/gi, 'beats per minute'],
    [/\s*°\s*C\b/g, ' degrees Celsius'],
    [/\s*°\s*F\b/g, ' degrees Fahrenheit'],
    [/(\d)\s*%/g, '$1 percent'],
    [/\s+—\s+/g, ', '],
];

/** Rewrites units so they are read naturally, e.g. "10 mg" → "10 milligrams" - RD */
export function forSpeech(text: string) {
    return SPOKEN_UNITS.reduce(
        (result, [pattern, replacement]) => result.replace(pattern, replacement as (substring: string, ...args: string[]) => string),
        text,
    );
}

function useFocusedValue(kind: 'title' | 'summary', text: string | null) {
    useFocusEffect(useCallback(() => {
        if (!text) return undefined;
        const owner = Symbol(kind);
        if (kind === 'title') title = { owner, text };
        else summary = { owner, text };

        // Clear it when this screen loses focus, unless another screen already replaced it - RD
        return () => {
            if (kind === 'title' && title?.owner === owner) title = null;
            if (kind === 'summary' && summary?.owner === owner) summary = null;
        };
    }, [kind, text]));
}

/** Used by ScreenHeader so every screen can at least say its name - RD */
export function useScreenTitle(text: string) {
    useFocusedValue('title', text);
    useStopReadingOnLeave();
}

/** Stops a screen readout when the user leaves that screen, so it doesn't follow them - RD */
export function useStopReadingOnLeave() {
    useFocusEffect(useCallback(() => () => {
        if (isReading()) stopSpeaking();
    }, []));
}

/** Screens call this with a short description of what is on screen right now - RD */
export function useScreenSummary(text: string | null) {
    useFocusedValue('summary', text);
}

/** Spoken date like "November 25", built from local date parts - RD */
export function spokenDate(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** Spoken time like "9:00 AM" - RD */
export function spokenTime(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "today", "tomorrow", or "on Wednesday, November 25" - RD */
export function spokenDay(date: Date, now = new Date()) {
    const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const days = Math.round((startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000));
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days === -1) return 'yesterday';
    return `on ${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${spokenDate(date)}`;
}

/** Joins a list for speech: "A", "A and B", "A, B, and 2 more" - RD */
export function spokenList(items: string[], max = 4) {
    const shown = items.slice(0, max);
    const extra = items.length - shown.length;
    if (extra > 0) return `${shown.join(', ')}, and ${extra} more`;
    if (shown.length <= 1) return shown.join('');
    return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}
