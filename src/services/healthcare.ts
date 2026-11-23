import { HEALTHCARE_API_URL, PUBLIC_CONFIG } from '../config/publicConfig';
import { arr, normalize, obj, str } from '../data/fhir';
import type { Fhir, Section } from '../data/fhir';
import {
    SAMPLE_PATIENT,
    sampleAppointments,
    sampleMessages,
    sampleResource,
    searchBundle,
} from '../data/sample';
import { accountStorage } from './accountStorage';
import { getDataMode, getGeneration } from './dataMode';
import { supabase } from './supabase';

export const HOSTED_URL = HEALTHCARE_API_URL;

export class HealthcareError extends Error {
    constructor(
        message: string,
        readonly code = 'request_failed'
    ) {
        super(message);
    }
}

export async function hosted<T>(
    path: string,
    method = 'GET',
    signal?: AbortSignal
): Promise<T> {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        throw new HealthcareError(
            'Sign in to EZ Healthcare first.',
            'login_required'
        );
    }

    const controller = new AbortController();
    const abort = () => controller.abort();

    if (signal?.aborted) abort();

    signal?.addEventListener('abort', abort, { once: true });

    const timeout = setTimeout(abort, 45000);

    try {
        const response = await fetch(`${HOSTED_URL}/${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${data.session.access_token}`,
                apikey: PUBLIC_CONFIG.supabasePublishableKey,
                Accept: 'application/json',
            },
            signal: controller.signal,
        });

        let value: unknown;

        try {
            value = await response.json();
        } catch {
            throw new HealthcareError(
                `Hosted endpoint returned HTTP ${response.status}. ` +
                'Check that the healthcare function is deployed.'
            );
        }

        if (!response.ok) {
            throw new HealthcareError(
                str(obj(value).error) ||
                `Request failed (HTTP ${response.status}).`,
                str(obj(value).code)
            );
        }

        return value as T;
    } catch (error) {
        if (error instanceof HealthcareError) throw error;

        throw new HealthcareError(
            controller.signal.aborted
                ? 'The hosted request timed out. Try again later.'
                : 'The hosted backend could not be reached. Check your internet connection.'
        );
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
    }
}

async function storedResources(
    section: 'appointments' | 'messages'
) {
    const storage = await accountStorage('sample-records');
    const raw = await storage.getItem(section);

    if (raw !== null) {
        const value: unknown = JSON.parse(raw);

        if (!Array.isArray(value)) {
            throw new Error('Saved sample data could not be read.');
        }

        return value.map(obj);
    }

    const fixtures =
        section === 'appointments'
            ? sampleAppointments()
            : sampleMessages();

    await storage.setItem(section, JSON.stringify(fixtures));

    return fixtures;
}

export async function rawSection(
    section: Section,
    signal?: AbortSignal
) {
    if (getDataMode() === 'sample') {
        return {
            resource: ['appointments', 'messages'].includes(section)
                ? searchBundle(
                    await storedResources(
                        section as 'appointments' | 'messages'
                    )
                )
                : sampleResource(section),
            patientId: SAMPLE_PATIENT,
            fhirBase: 'https://example.test/fhir',
            source:
                'Sample Data Mode — fictional records bundled with the app',
            fetchedAt: new Date().toISOString(),
            warnings: [
                'Fictional testing data—not a real patient record or medical advice.',
            ],
        };
    }

    return hosted<{
        resource: Fhir;
        patientId: string;
        fhirBase: string;
        source: string;
        fetchedAt: string;
        warnings: string[];
    }>(`records/${section}`, 'GET', signal);
}

export async function loadSection(
    section: Section,
    signal?: AbortSignal
) {
    const generation = getGeneration();
    const raw = await rawSection(section, signal);

    if (generation !== getGeneration()) {
        throw new Error('The selected account or mode changed.');
    }

    const data = normalize(
        section,
        raw.resource,
        raw.patientId,
        raw.fhirBase,
        raw.source,
        raw.fetchedAt
    );

    data.warnings = [
        ...new Set([...data.warnings, ...raw.warnings]),
    ];

    return data;
}

export async function getAppointment(
    id: string,
    signal?: AbortSignal
) {
    const raw = await rawSection('appointments', signal);

    const resource = arr(raw.resource.entry)
        .map((entry) => obj(obj(entry).resource))
        .find((entry) => entry.id === id);

    if (!resource) {
        throw new Error(
            'Appointment not found. Return to the list and reload.'
        );
    }

    return resource;
}

let editQueue: Promise<unknown> = Promise.resolve();

function sampleEdit<T>(
    action: () => Promise<T>
): Promise<T> {
    const generation = getGeneration();

    const next = editQueue.then(async () => {
        if (
            getDataMode() !== 'sample' ||
            generation !== getGeneration()
        ) {
            throw new Error(
                'Sample edits are only available in the current Sample Data Mode.'
            );
        }

        return action();
    });

    editQueue = next.catch(() => undefined);

    return next;
}

export type AppointmentInput = {
    provider: string;
    reason: string;
    date: string;
    time: string;
    notes: string;
    type: string;
};

export function saveSampleAppointment(
    input: AppointmentInput,
    id?: string
) {
    return sampleEdit(async () => {
        if (!input.provider.trim() || !input.reason.trim()) {
            throw new Error('Enter a provider and reason.');
        }

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            input.date
        );

        if (
            !match ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
        ) {
            throw new Error(
                'Use YYYY-MM-DD for the date and HH:MM (24-hour) for the time.'
            );
        }

        const [year, month, day] = match.slice(1).map(Number);
        const [hour, minute] = input.time.split(':').map(Number);

        const start = new Date(
            year,
            month - 1,
            day,
            hour,
            minute
        );

        if (
            start.getFullYear() !== year ||
            start.getMonth() !== month - 1 ||
            start.getDate() !== day
        ) {
            throw new Error('Enter a valid date.');
        }

        if (start.getTime() <= Date.now()) {
            throw new Error('Choose a future date and time.');
        }

        const storage = await accountStorage('sample-records');
        const current = await storedResources('appointments');
        const existing = id
            ? current.find((entry) => entry.id === id)
            : undefined;

        if (id && !existing) {
            throw new Error('Appointment not found.');
        }

        const resource: Fhir = {
            ...existing,
            resourceType: 'Appointment',
            id:
                id ??
                `sample-created-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`,
            status: 'booked',
            description: input.reason.trim(),
            reasonCode: [{ text: input.reason.trim() }],
            start: start.toISOString(),
            end: new Date(
                start.getTime() + 30 * 60000
            ).toISOString(),
            appointmentType: { text: input.type },
            comment: input.notes.trim(),
            participant: [
                {
                    actor: {
                        reference: `Patient/${SAMPLE_PATIENT}`,
                    },
                    status: 'accepted',
                },
                {
                    actor: {
                        reference: 'Practitioner/sample-selected-provider',
                        display: input.provider.trim(),
                    },
                    status: 'accepted',
                },
                {
                    actor: {
                        reference: 'Location/sample-clinic',
                        display:
                            input.type === 'Telehealth'
                                ? 'Sample video visit'
                                : 'Example Clinic (fictional)',
                    },
                    status: 'accepted',
                },
            ],
            patientInstruction:
                'Sample booking only. No clinic was contacted.',
        };

        const next = id
            ? current.map((entry) =>
                entry.id === id ? resource : entry
            )
            : [...current, resource];

        await storage.setItem(
            'appointments',
            JSON.stringify(next)
        );

        return str(resource.id);
    });
}

export function cancelSampleAppointment(id: string) {
    return sampleEdit(async () => {
        const storage = await accountStorage('sample-records');
        const current = await storedResources('appointments');

        if (!current.some((entry) => entry.id === id)) {
            throw new Error('Appointment not found.');
        }

        await storage.setItem(
            'appointments',
            JSON.stringify(
                current.map((entry) =>
                    entry.id === id
                        ? { ...entry, status: 'cancelled' }
                        : entry
                )
            )
        );
    });
}

export function sendSampleMessage(text: string) {
    return sampleEdit(async () => {
        if (!text.trim() || text.length > 2000) {
            throw new Error(
                'Enter a message of 1–2,000 characters.'
            );
        }

        const storage = await accountStorage('sample-records');
        const current = await storedResources('messages');

        current.push({
            resourceType: 'Communication',
            id: `sample-message-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
            status: 'completed',
            subject: {
                reference: `Patient/${SAMPLE_PATIENT}`,
            },
            sender: {
                reference: `Patient/${SAMPLE_PATIENT}`,
                display: 'You (sample conversation)',
            },
            recipient: [
                {
                    reference: 'Practitioner/sample-provider-1',
                    display: 'Fictional care team',
                },
            ],
            sent: new Date().toISOString(),
            payload: [{ contentString: text.trim() }],
        });

        await storage.setItem(
            'messages',
            JSON.stringify(current)
        );
    });
}