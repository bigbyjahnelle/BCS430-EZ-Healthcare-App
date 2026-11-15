// Read-only laboratory Observation adapter. No sample fallback or clinical interpretation.
type Obj = Record<string, unknown>;
const object = (v: unknown): Obj => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const text = (v: unknown): string => typeof v === 'string' ? v : '';
function label(v: unknown): string {
    const c = object(v);
    return text(c.text) || list(c.coding).map((x) => text(object(x).display) || text(object(x).code)).filter(Boolean).join(' / ');
}
function quantity(v: unknown): string {
    const q = object(v);
    if (typeof q.value !== 'number' || !Number.isFinite(q.value)) return '';
    return `${text(q.comparator)}${q.value} ${text(q.unit) || text(q.code)}`.trim();
}
function range(v: unknown): string {
    const r = object(v);
    const low = quantity(r.low), high = quantity(r.high);
    return low && high ? `${low} to ${high}` : low ? `Lower bound: ${low}` : high ? `Upper bound: ${high}` : '';
}
function value(v: Obj): string {
    if (v.valueQuantity !== undefined) return quantity(v.valueQuantity) || 'Value unavailable';
    if (typeof v.valueString === 'string') return v.valueString;
    if (typeof v.valueBoolean === 'boolean') return String(v.valueBoolean);
    if (typeof v.valueInteger === 'number') return String(v.valueInteger);
    if (v.valueCodeableConcept !== undefined) return label(v.valueCodeableConcept) || 'Coded result unavailable';
    if (v.valueRange !== undefined) return range(v.valueRange) || 'Range unavailable';
    if (v.valueRatio !== undefined) {
        const r = object(v.valueRatio);
        return `${quantity(r.numerator) || 'Unknown numerator'} / ${quantity(r.denominator) || 'Unknown denominator'}`;
    }
    if (typeof v.valueDateTime === 'string') return v.valueDateTime;
    if (typeof v.valueTime === 'string') return v.valueTime;
    const absent = label(v.dataAbsentReason);
    return absent ? `Not reported: ${absent}` : 'No scalar result reported; see components or source report.';
}
export type LabValue = { name: string; value: string; referenceRanges: string[]; flags: string[] };
export type LabResult = LabValue & {
    id: string; status: string; recordedAt: string | null; issuedAt: string | null;
    components: LabValue[]; notes: string[];
};
function measurement(v: Obj): LabValue {
    return {
        name: label(v.code) || 'Unnamed laboratory result',
        value: value(v),
        referenceRanges: list(v.referenceRange).map((item) => {
            const r = object(item);
            // Preserve supplied context; do not infer a universal normal range.
            return [text(r.text), range(r), label(r.type), ...list(r.appliesTo).map(label),
                r.age ? `Age: ${range(r.age)}` : ''].filter(Boolean).join(' · ');
        }).filter(Boolean),
        flags: list(v.interpretation).map(label).filter(Boolean),
    };
}
export class LabRequestError extends Error {
    constructor(public httpStatus: number, message: string) { super(message); this.name = 'LabRequestError'; }
}
export function normalizeLabBundle(input: unknown, patientId: string, fhirBase: string) {
    const bundle = object(input);
    if (bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset' ||
        (bundle.entry !== undefined && !Array.isArray(bundle.entry))) {
        throw new LabRequestError(502, 'Epic returned an unexpected lab response.');
    }
    const results: LabResult[] = [];
    const warnings = new Set<string>();
    const seen = new Set<string>();
    for (const entry of list(bundle.entry)) {
        const r = object(object(entry).resource);
        if (r.resourceType === 'OperationOutcome') {
            for (const issue of list(r.issue)) {
                const i = object(issue);
                if (i.severity === 'error' || i.severity === 'fatal') throw new LabRequestError(502, 'Epic reported a lab retrieval error.');
                if (i.severity === 'warning') warnings.add('Epic returned a warning: the available results may be incomplete.');
            }
            continue;
        }
        if (r.resourceType !== 'Observation') continue;
        const reference = text(object(r.subject).reference);
        if (reference !== `Patient/${patientId}` && reference !== `${fhirBase}/Patient/${patientId}`) {
            throw new LabRequestError(502, 'A lab result could not be matched to the authorized patient.');
        }
        const isLab = list(r.category).some((c) => list(object(c).coding).some((x) => object(x).code === 'laboratory'));
        if (!isLab) { warnings.add('Some returned observations were not labeled laboratory and were omitted.'); continue; }
        if (['cancelled', 'entered-in-error'].includes(text(r.status))) {
            warnings.add('Cancelled or entered-in-error results were omitted.'); continue;
        }
        const id = text(r.id);
        if (!id) throw new LabRequestError(502, 'Epic returned a lab result without an identifier.');
        if (seen.has(id)) continue;
        seen.add(id);
        if (list(r.hasMember).length) warnings.add('Some panels link to additional results. Linked results are not fetched separately in this version.');
        results.push({
            ...measurement(r), id, status: text(r.status) || 'unknown',
            recordedAt: text(r.effectiveDateTime) || text(object(r.effectivePeriod).start) || null,
            issuedAt: text(r.issued) || null,
            components: list(r.component).map((item) => measurement(object(item))),
            notes: list(r.note).map((n) => text(object(n).text)).filter(Boolean),
        });
    }
    const hasMore = list(bundle.link).some((l) => object(l).relation === 'next');
    if (hasMore) warnings.add('Only the first page of lab results is displayed; additional pages are available.');
    results.sort((a, b) => (Date.parse(b.recordedAt ?? '') || 0) - (Date.parse(a.recordedAt ?? '') || 0));
    return { status: 'ok' as const, results, warnings: [...warnings], hasMore };
}
export async function loadLabResults(fhirBase: string, patientId: string, accessToken: string) {
    const url = new URL(`${fhirBase}/Observation`);
    url.searchParams.set('patient', patientId);
    url.searchParams.set('category', 'laboratory');
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/fhir+json' },
            redirect: 'error', signal: AbortSignal.timeout(15000),
        });
        console.log(`Epic lab results lookup: HTTP ${response.status}`);
        if (response.status === 401) throw new LabRequestError(401, 'Your Epic authorization expired. Reconnect in Medications.');
        if (response.status === 403) throw new LabRequestError(403, 'Epic denied lab access. Check the selected Labs API and granted Observation permission, then reconnect.');
        if (response.status === 429) throw new LabRequestError(503, 'Epic is limiting requests. Wait before trying again.');
        if (!response.ok) throw new LabRequestError(502, `Epic could not retrieve lab results (HTTP ${response.status}).`);
        return normalizeLabBundle(await response.json(), patientId, fhirBase);
    } catch (error) {
        if (error instanceof LabRequestError) throw error;
        const name = error instanceof Error ? error.name : 'UnknownError';
        console.warn('Epic lab results lookup failed:', name);
        if (name === 'TimeoutError' || name === 'AbortError') throw new LabRequestError(504, 'Epic lab results timed out. This does not mean no results exist. Try again later.');
        throw new LabRequestError(502, 'Epic lab results could not be retrieved. Check the backend connection and try again.');
    }
}