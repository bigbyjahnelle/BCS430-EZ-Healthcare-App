// Pure FHIR R4 adapters shared by sample fixtures, Edge Functions and mobile screens.
// These are display models, not diagnoses or treatment recommendations.
export type Fhir = Record<string, unknown>;
export type Section = 'profile' | 'vitals' | 'medications' | 'providers' |
    'appointments' | 'insurance' | 'test-results' | 'messages';
export type Row = { label: string; value: string };
export type Item = {
  id: string; title: string; subtitle?: string; status?: string;
  lines: Row[]; flag?: 'normal' | 'abnormal' | 'critical' | 'unknown';
  // Original ISO date of the record, used by Ask EZ to read only recent or upcoming records - RD
  date?: string;
};
export type Records = {
  items: Item[]; source: string; fetchedAt: string; warnings: string[];
};
export const obj = (v: unknown): Fhir => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Fhir : {};
export const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
export const str = (v: unknown): string => typeof v === 'string' ? v : '';
export function concept(v: unknown): string {
  const c = obj(v);
  return str(c.text) || arr(c.coding).map(x => str(obj(x).display) || str(obj(x).code)).filter(Boolean).join(' / ');
}
export function humanName(v: unknown): string {
  const names = arr(v).map(obj);
  const n = names.find(x => x.use === 'official') ?? names[0] ?? {};
  return str(n.text) || [...arr(n.given).map(str), str(n.family)].filter(Boolean).join(' ');
}
export function quantity(v: unknown): string {
  const q = obj(v);
  return typeof q.value === 'number' && Number.isFinite(q.value)
      ? `${str(q.comparator)}${q.value} ${str(q.unit) || str(q.code)}`.trim() : '';
}
export function displayDate(value: unknown): string {
  const s = str(value);
  // A date-only birth date must not shift a day when the timezone changes.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
  }
  if (/^\d{4}(-\d{2})?$/.test(s)) return s;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toLocaleString() : s || 'Not provided';
}
export function patientReference(reference: unknown, id: string, base: string): boolean {
  return reference === `Patient/${id}` || reference === `${base}/Patient/${id}`;
}
export function bundleResources(input: unknown): { resources: Fhir[]; warnings: string[] } {
  const b = obj(input);
  if (b.resourceType !== 'Bundle' || b.type !== 'searchset' ||
      (b.entry !== undefined && !Array.isArray(b.entry))) throw new Error('Unexpected FHIR search response.');
  const resources = arr(b.entry).map(x => obj(obj(x).resource));
  const warnings: string[] = [];
  for (const r of resources) if (r.resourceType === 'OperationOutcome') {
    for (const issue of arr(r.issue).map(obj)) {
      if (issue.severity === 'fatal' || issue.severity === 'error') throw new Error('Epic reported a record retrieval error.');
      if (issue.severity === 'warning') warnings.push('Epic warns that the returned information may be incomplete.');
    }
  }
  if (arr(b.link).some(x => obj(x).relation === 'next')) {
    warnings.push('Only the first page is displayed. More records may exist.');
  }
  return { resources: resources.filter(r => r.resourceType !== 'OperationOutcome'), warnings: [...new Set(warnings)] };
}
export function checkPatient(r: Fhir, section: Section, id: string, base: string): void {
  const matches = section === 'appointments'
      ? arr(r.participant).some(x => patientReference(obj(obj(x).actor).reference, id, base))
      : patientReference(obj(section === 'insurance' ? r.beneficiary : r.subject).reference, id, base);
  if (!matches) throw new Error('A returned record could not be matched to the connected patient.');
}
function row(label: string, value: unknown): Row {
  return { label, value: str(value) || 'Not provided' };
}
function observationValue(r: Fhir): string {
  if (typeof r.valueString === 'string') return r.valueString;
  if (typeof r.valueBoolean === 'boolean') return String(r.valueBoolean);
  return quantity(r.valueQuantity) || concept(r.valueCodeableConcept) ||
      concept(r.dataAbsentReason) || 'Not reported';
}
function range(r: Fhir): string {
  return arr(r.referenceRange).map(x => {
    const a = obj(x);
    return [str(a.text), quantity(a.low) ? `Low: ${quantity(a.low)}` : '',
      quantity(a.high) ? `High: ${quantity(a.high)}` : '', concept(a.type),
      ...arr(a.appliesTo).map(concept), a.age ? 'Age-specific range' : ''].filter(Boolean).join(' · ');
  }).filter(Boolean).join('; ') || 'Not provided';
}
function interpretation(r: Fhir): Item['flag'] {
  // Only use the source's coded interpretation. Do not infer a universal range.
  const codes = arr(r.interpretation).flatMap(x => arr(obj(x).coding).map(obj))
      .filter(x => !x.system || x.system === 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation')
      .map(x => str(x.code).toUpperCase());
  if (codes.some(x => ['HH', 'LL', 'AA'].includes(x))) return 'critical';
  if (codes.some(x => ['H', 'L', 'A'].includes(x))) return 'abnormal';
  return codes.includes('N') ? 'normal' : 'unknown';
}
export function normalize(section: Section, input: unknown, patientId: string, base: string,
                          source: string, fetchedAt: string): Records {
  if (section === 'profile') {
    const p = obj(input);
    if (p.resourceType !== 'Patient' || p.id !== patientId) throw new Error('Unexpected patient response.');
    const telecom = arr(p.telecom).map(obj);
    const address = obj(arr(p.address)[0]);
    const language = arr(p.communication).map(x => concept(obj(x).language)).filter(Boolean).join(', ');
    return { source, fetchedAt, warnings: [], items: [{ id: patientId,
        title: humanName(p.name) || 'Patient name not provided', lines: [
          row('Date of birth', displayDate(p.birthDate)), row('Administrative gender', p.gender),
          row('Phone', telecom.find(x => x.system === 'phone')?.value),
          row('Email', telecom.find(x => x.system === 'email')?.value),
          row('Address', str(address.text) || [...arr(address.line).map(str), str(address.city), str(address.state), str(address.postalCode)].filter(Boolean).join(', ')),
          row('Language', language),
        ] }] };
  }
  const expected: Record<Exclude<Section, 'profile'>, string> = {
    medications: 'MedicationRequest', appointments: 'Appointment', insurance: 'Coverage',
    providers: 'Practitioner', vitals: 'Observation', 'test-results': 'Observation', messages: 'Communication',
  };
  const { resources, warnings } = bundleResources(input);
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const r of resources) {
    if (r.resourceType !== expected[section]) continue;
    const id = str(r.id);
    if (!id) throw new Error('A record is missing its identifier.');
    if (seen.has(id)) continue;
    seen.add(id);
    if (section !== 'providers') checkPatient(r, section, patientId, base);
    if (section === 'appointments') {
      const participants = arr(r.participant).map(x => obj(obj(x).actor));
      const provider = participants.find(x => /(?:^|\/)Practitioner(?:Role)?\//.test(str(x.reference)));
      const location = participants.find(x => /(?:^|\/)Location\//.test(str(x.reference)));
      items.push({ id, title: str(provider?.display) || 'Provider name not provided', date: str(r.start) || undefined,
        subtitle: arr(r.specialty).map(concept).filter(Boolean).join(', '), status: str(r.status), lines: [
          row('Start', displayDate(r.start)), row('End', displayDate(r.end)),
          row('Location', location?.display), row('Visit', r.description),
          row('Reason', arr(r.reasonCode).map(concept).filter(Boolean).join(', ')),
          row('Instructions', r.patientInstruction), row('Notes', r.comment),
        ] });
    } else if (section === 'insurance') {
      items.push({ id, title: arr(r.payor).map(x => str(obj(x).display)).filter(Boolean).join(', ') || 'Insurance plan',
        status: str(r.status), lines: [row('Coverage type', concept(r.type)), row('Member ID', r.subscriberId),
          ...arr(r.class).map(x => { const c = obj(x); return row(concept(c.type) || 'Plan / group', [str(c.name), str(c.value)].filter(Boolean).join(' · ')); }),
          row('Start', displayDate(obj(r.period).start)), row('End', displayDate(obj(r.period).end)),
          row('Relationship', concept(r.relationship))] });
    } else if (section === 'medications') {
      const dose = obj(arr(r.dosageInstruction)[0]);
      const rates = arr(dose.doseAndRate).map(obj);
      const rate = rates.find(x => arr(obj(x.type).coding).some(c => obj(c).code === 'ordered')) ?? rates[0];
      items.push({ id, title: str(obj(r.medicationReference).display) || concept(r.medicationCodeableConcept) || 'Medication name not provided',
        status: str(r.status), date: str(r.authoredOn) || undefined, lines: [row('Dose', quantity(obj(rate).doseQuantity)), row('Frequency', concept(obj(dose.timing).code)),
          row('Instructions', str(dose.patientInstruction) || str(dose.text)), row('Ordered', displayDate(r.authoredOn))] });
    } else if (section === 'providers') {
      items.push({ id, title: humanName(r.name) || 'Provider name not provided',
        subtitle: 'Linked prescribing provider', lines: [row('Identifier', id),
          ...arr(r.telecom).map(x => row(str(obj(x).system) || 'Contact', obj(x).value))] });
    } else if (section === 'messages') {
      items.push({ id, title: str(obj(r.sender).display) || 'Care team', status: str(r.status), date: str(r.sent) || undefined, lines: [
          row('Date', displayDate(r.sent)), ...arr(r.payload).map(x => row('Message', obj(x).contentString))] });
    } else {
      const category = section === 'vitals' ? 'vital-signs' : 'laboratory';
      if (!arr(r.category).some(x => arr(obj(x).coding).some(c => obj(c).code === category))) continue;
      if (['entered-in-error', 'cancelled'].includes(str(r.status))) {
        warnings.push('Cancelled or entered-in-error observations were omitted.'); continue;
      }
      const parts = arr(r.component).map(obj);
      const value = parts.length ? parts.map(c => `${concept(c.code)}: ${observationValue(c)}`).join('; ') : observationValue(r);
      if (arr(r.hasMember).length) warnings.push('A panel references other results that are not fetched separately.');
      const details: Row[] = [row('Value', value), row('Recorded', displayDate(r.effectiveDateTime || obj(r.effectivePeriod).start))];
      if (section === 'test-results') {
        details.push(row('Reference range', range(r)), row('Source interpretation', arr(r.interpretation).map(concept).filter(Boolean).join(', ')));
        for (const c of parts) details.push(row(concept(c.code) || 'Component', `${observationValue(c)} · ${range(c)}`));
      }
      const ownFlag = interpretation(r);
      const componentFlags = parts.map(interpretation);
      const flag = componentFlags.includes('critical') ? 'critical' : componentFlags.includes('abnormal') ? 'abnormal' : ownFlag;
      items.push({ id, title: concept(r.code) || 'Observation', status: str(r.status), lines: details,
        date: str(r.effectiveDateTime) || str(obj(r.effectivePeriod).start) || undefined,
        flag: section === 'test-results' ? flag : undefined });
    }
  }
  return { source, fetchedAt, items, warnings: [...new Set(warnings)] };
}