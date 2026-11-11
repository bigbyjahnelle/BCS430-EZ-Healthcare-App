type Quantity = {
    value?: number;
    unit?: string;
    code?: string;
    comparator?: string;
};

type Code = { text?: string; coding?: { display?: string }[] };
type Measurement = { code?: Code; valueQuantity?: Quantity };
type Observation = Measurement & {
    resourceType?: string;
    id?: string;
    status?: string;
    subject?: { reference?: string };
    effectiveDateTime?: string;
    effectivePeriod?: { start?: string };
    component?: Measurement[];
};

type Vital = { id: string; name: string; value: string; recordedAt: string | null };

function label(code: Code | undefined, fallback: string) {
    return code?.text || code?.coding?.find((item) => item.display)?.display || fallback;
}

function reading(quantity?: Quantity) {
    if (typeof quantity?.value !== 'number' || !Number.isFinite(quantity.value)) return null;
    return [`${quantity.comparator ?? ''}${quantity.value}`, quantity.unit || quantity.code]
        .filter(Boolean).join(' ');
}

export async function loadVitals(
    fhirBase: string,
    patientId: string,
    headers: Record<string, string>,
): Promise<{ status: 'ok' | 'unavailable'; readings: Vital[]; hasMore: boolean }> {
    try {
        const url = new URL(`${fhirBase}/Observation`);
        url.searchParams.set('patient', patientId);
        url.searchParams.set('category', 'vital-signs');
        const response = await fetch(url, {
            headers,
            redirect: 'error',
            signal: AbortSignal.timeout(15000),        });
        console.log(`Epic vital signs lookup: HTTP ${response.status}`);
        if (!response.ok) return { status: 'unavailable', readings: [], hasMore: false };

        const bundle: {
            resourceType?: string;
            entry?: { resource?: Observation & { issue?: { severity?: string }[] } }[];
            link?: { relation?: string }[];
        } = await response.json();
        if (bundle.resourceType !== 'Bundle') {
            return { status: 'unavailable', readings: [], hasMore: false };
        }

        const readings: Vital[] = [];
        for (const { resource } of bundle.entry ?? []) {
            if (resource?.resourceType === 'OperationOutcome' &&
                resource.issue?.some((issue) => ['error', 'fatal'].includes(issue.severity ?? ''))) {
                return { status: 'unavailable', readings: [], hasMore: false };
            }
            if (resource?.resourceType !== 'Observation' || !resource.id ||
                resource.subject?.reference !== `Patient/${patientId}` ||
                ['entered-in-error', 'cancelled'].includes(resource.status ?? '')) continue;

            const components = (resource.component ?? []).flatMap((component) => {
                const value = reading(component.valueQuantity);
                return value ? [`${label(component.code, 'Reading')}: ${value}`] : [];
            });
            const value = reading(resource.valueQuantity) || components.join(' · ');
            if (!value) continue;
            readings.push({
                id: resource.id,
                name: label(resource.code, 'Vital sign'),
                value,
                recordedAt: resource.effectiveDateTime ?? resource.effectivePeriod?.start ?? null,
            });
        }

        readings.sort((a, b) =>
            (Date.parse(b.recordedAt ?? '') || 0) - (Date.parse(a.recordedAt ?? '') || 0)
        );
        console.log(`Epic vital signs: ${readings.length} displayable reading(s).`);
        return { status: 'ok', readings, hasMore: bundle.link?.some(({ relation }) => relation === 'next') ?? false };
    } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        const code =
            typeof cause === 'object' && cause !== null && 'code' in cause
                ? cause.code
                : undefined;

        console.warn(
            'Epic vital signs lookup failed:',
            error instanceof Error ? error.name : 'UnknownError',
            code ?? '',
        );

        return { status: 'unavailable', readings: [], hasMore: false };
    }
}