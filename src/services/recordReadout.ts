import type { Item, Records, Section } from '../data/fhir';
import { spokenDate, spokenDay, spokenList, spokenTime } from './screenSummary';
import type { VoiceSettings } from './voiceSettings';

// "Read this screen" for the shared record screens (RecordsPage / SectionPanel) - RD
// Turns one section's records into sentences; RecordsPage joins the sections in screen order - RD

const DAY = 24 * 60 * 60 * 1000;

/** A line's value, or null when the record left it out - RD */
function line(item: Item, label: string) {
    const value = item.lines.find((row) => row.label === label)?.value;
    return value && value !== 'Not provided' ? value : null;
}

function itemDate(item: Item) {
    const time = Date.parse(item.date ?? '');
    return Number.isNaN(time) ? null : new Date(time);
}

function sentence(parts: (string | null | undefined)[]) {
    const text = parts.filter(Boolean).join(', ');
    return text ? `${text.replace(/\.\s*$/, '')}.` : '';
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// Every active medication with its dose, how often, and instructions - RD
function medications(items: Item[]) {
    const active = items.filter((item) => item.status === 'active');
    const others = items.length - active.length;
    return [
        active.length ? `You have ${plural(active.length, 'active medication', 'active medications')}.` : 'You have no active medications.',
        ...active.map((item) => {
            const instructions = line(item, 'Instructions');
            return sentence([item.title, line(item, 'Dose'), line(item, 'Frequency')]) +
                (instructions ? ` Instructions: ${sentence([instructions])}` : '');
        }),
        others ? `${plural(others, 'other order is', 'other orders are')} not active.` : '',
    ];
}

const FLAG_WORDS: Record<NonNullable<Item['flag']>, string> = {
    normal: 'in range',
    abnormal: 'out of range',
    critical: 'critical',
    unknown: '',
};

// Results from the last few days (set in Voice settings), newest first - RD
function testResults(items: Item[], days: VoiceSettings['resultsDays']) {
    const dated = items
        .map((item) => ({ item, when: itemDate(item) }))
        .sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0));
    const cutoff = days ? Date.now() - days * DAY : -Infinity;
    const recent = dated.filter(({ when }) => !days || (when && when.getTime() >= cutoff));
    const window = days ? `in the last ${days} days` : 'on record';
    if (!recent.length) {
        const latest = dated.find(({ when }) => when)?.when;
        return [`You have no test results ${window}.` + (latest ? ` The most recent is from ${spokenDate(latest)}.` : '')];
    }
    return [
        `You have ${plural(recent.length, 'test result', 'test results')} ${window}.`,
        ...recent.map(({ item, when }) => sentence([
            `${item.title}: ${line(item, 'Value') ?? 'no value reported'}`,
            item.flag ? FLAG_WORDS[item.flag] || null : null,
            item.status && item.status !== 'final' ? item.status : null,
            when ? `from ${spokenDate(when)}` : null,
        ])),
    ];
}

// Upcoming appointments in the next few days (set in Voice settings), soonest first - RD
function appointments(items: Item[], days: VoiceSettings['appointmentsDays']) {
    const now = new Date();
    const upcoming = items
        .map((item) => ({ item, when: itemDate(item) }))
        .filter((entry): entry is { item: Item; when: Date } => entry.when !== null && entry.when >= now)
        .sort((a, b) => a.when.getTime() - b.when.getTime());
    const soon = upcoming.filter(({ when }) => when.getTime() <= now.getTime() + days * DAY);
    if (!soon.length) {
        const next = upcoming[0];
        return [`You have no appointments in the next ${days} days.` +
            (next ? ` Your next one is ${spokenDay(next.when, now)} with ${next.item.title}.` : '')];
    }
    return [
        `You have ${plural(soon.length, 'appointment', 'appointments')} in the next ${days} days.`,
        ...soon.map(({ item, when }) => sentence([
            item.title,
            item.subtitle,
            `${spokenDay(when, now)} at ${spokenTime(when)}`,
            line(item, 'Location') ? `at ${line(item, 'Location')}` : null,
            line(item, 'Visit') ? `for ${line(item, 'Visit')}` : null,
            item.status === 'cancelled' ? 'this appointment is cancelled' : null,
        ])),
    ];
}

// Messages: who sent each one, when, and what it says - RD
function messages(items: Item[]) {
    return [
        `You have ${plural(items.length, 'message', 'messages')}.`,
        ...items.map((item) => {
            const when = itemDate(item);
            const text = item.lines.filter((row) => row.label === 'Message').map((row) => row.value).join(' ');
            return `From ${item.title}${when ? `, ${spokenDay(when)}` : ''}: ${sentence([text])}`;
        }),
    ];
}

// Friendlier spoken names for some record labels - RD
const SPOKEN_LABELS: Record<string, string> = {
    'Administrative gender': 'sex',
    'Date of birth': 'born',
};

// Any other section: each record's title and its filled-in lines - RD
function generic(items: Item[], skip: string[] = []) {
    return items.map((item) => sentence([
        item.title,
        ...item.lines
            .filter((row) => !skip.includes(row.label) && row.value && row.value !== 'Not provided')
            .map((row) => `${SPOKEN_LABELS[row.label] ?? row.label} ${row.value}`),
    ]));
}

/** Spoken text for one section of a records screen - RD */
export function describeSection(
    section: Section,
    heading: string | undefined,
    state: { loading: boolean; error: string; data: Records | null },
    settings: VoiceSettings,
): string | null {
    const name = heading || section.replace('-', ' ');
    if (state.loading) return `Loading ${name.toLowerCase()}.`;
    if (state.error) return `${name}: ${state.error}`;
    if (!state.data) return null;
    const items = state.data.items;
    if (!items.length) return `${name}: no records were returned.`;

    const sentences =
        section === 'medications' ? medications(items)
            : section === 'test-results' ? testResults(items, settings.resultsDays)
                : section === 'appointments' ? appointments(items, settings.appointmentsDays)
                    : section === 'vitals'
                        ? [`Latest vitals: ${spokenList(items.map((item) => `${item.title} ${line(item, 'Value') ?? ''}`.trim()), items.length)}.`]
                        : section === 'messages' ? messages(items)
                            : section === 'providers' ? generic(items, ['Identifier'])
                            : generic(items);
    const intro = heading && !['medications', 'test-results', 'appointments', 'messages'].includes(section) ? `${heading}.` : '';
    return [intro, ...sentences].filter(Boolean).join(' ');
}
