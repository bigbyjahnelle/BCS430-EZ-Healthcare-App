import type { Fhir, Section } from './fhir';
export const SAMPLE_PATIENT = 'sample-patient-1';
const patient = { reference: `Patient/${SAMPLE_PATIENT}`, display: 'Taylor Sample (fictional)' };
const provider = { reference: 'Practitioner/sample-provider-1', display: 'Dr. Avery Sample (fictional)' };
const location = { reference: 'Location/sample-clinic-1', display: 'Example Clinic (fictional)' };
export const searchBundle = (resources: Fhir[]): Fhir => ({ resourceType: 'Bundle', type: 'searchset', total: resources.length, entry: resources.map(resource => ({ resource })) });
export function sampleAppointments(now = new Date()): Fhir[] {
    return [3, 10, 17].map((days, i) => {
        const start = new Date(now); start.setDate(start.getDate() + days); start.setHours(10 + i, 30, 0, 0);
        return { resourceType: 'Appointment', id: `sample-appointment-${i + 1}`, status: 'booked',
            description: ['Annual check-up (sample)', 'Follow-up visit (sample)', 'Physical therapy (sample)'][i],
            start: start.toISOString(), end: new Date(start.getTime() + 30 * 60000).toISOString(),
            reasonCode: [{ text: 'Fictional visit for interface testing' }], specialty: [{ text: 'Sample care' }],
            participant: [patient, provider, location].map(actor => ({ actor, status: 'accepted' })),
            patientInstruction: 'This is not a real booking. No clinic has been contacted.' };
    });
}
export function sampleMessages(): Fhir[] {
    return [{ resourceType: 'Communication', id: 'sample-message-1', status: 'completed', subject: patient,
        sender: provider, recipient: [patient], sent: '2026-11-20T15:00:00Z',
        payload: [{ contentString: 'Welcome! This is a fictional conversation for testing. Messages here never reach a real care team.' }] }];
}
function observation(id: string, name: string, code: string, value: number, unit: string, category: string, flag?: string): Fhir {
    return { resourceType: 'Observation', id, status: 'final', subject: patient,
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: category }] }],
        code: { text: name, coding: [{ system: 'http://loinc.org', code }] },
        effectiveDateTime: '2026-11-20T14:00:00Z', valueQuantity: { value, unit },
        ...(flag ? { interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: flag }] }] } : {}) };
}
export function sampleResource(section: Section): Fhir {
    switch (section) {
        case 'profile': return { resourceType: 'Patient', id: SAMPLE_PATIENT,
            name: [{ use: 'official', text: 'Taylor Sample (fictional)', given: ['Taylor'], family: 'Sample' }],
            birthDate: '1948-03-14', gender: 'female',
            telecom: [{ system: 'phone', value: '202-555-0100' }, { system: 'email', value: 'taylor@example.test' }],
            address: [{ text: '100 Example Street, Sampletown, NY (fictional)' }], communication: [{ language: { text: 'English' } }] };
        case 'medications': return searchBundle(['A', 'B'].map((n, i) => ({ resourceType: 'MedicationRequest', id: `sample-med-${i + 1}`,
            status: i ? 'completed' : 'active', intent: 'order', subject: patient, requester: provider,
            medicationCodeableConcept: { text: `Sample Medication ${n}` }, authoredOn: '2026-10-01',
            dosageInstruction: [{ text: 'Fictional instructions only—not medical advice.', timing: { code: { text: 'Once daily (sample)' } },
                doseAndRate: [{ type: { coding: [{ code: 'ordered' }] }, doseQuantity: { value: 10, unit: 'mg' } }] }] })));
        case 'providers': return searchBundle([{ resourceType: 'Practitioner', id: 'sample-provider-1', name: [{ text: provider.display }],
            telecom: [{ system: 'phone', value: '202-555-0101' }] }]);
        case 'vitals': return searchBundle([
            observation('sample-vital-1', 'Heart rate', '8867-4', 72, 'beats/min', 'vital-signs'),
            observation('sample-vital-2', 'Temperature', '8310-5', 36.8, '°C', 'vital-signs'),
            observation('sample-vital-3', 'Oxygen saturation', '2708-6', 98, '%', 'vital-signs'),
            { resourceType: 'Observation', id: 'sample-vital-4', status: 'final', subject: patient,
                category: [{ coding: [{ code: 'vital-signs' }] }], code: { text: 'Blood pressure' }, effectiveDateTime: '2026-11-20T14:00:00Z',
                component: [{ code: { text: 'Systolic' }, valueQuantity: { value: 118, unit: 'mmHg' } }, { code: { text: 'Diastolic' }, valueQuantity: { value: 76, unit: 'mmHg' } }] },
        ]);
        case 'test-results': return searchBundle([
            { ...observation('sample-lab-1', 'Hemoglobin (sample)', '718-7', 13.2, 'g/dL', 'laboratory', 'N'), referenceRange: [{ low: { value: 12, unit: 'g/dL' }, high: { value: 16, unit: 'g/dL' } }] },
            { ...observation('sample-lab-2', 'Glucose (sample)', '2345-7', 112, 'mg/dL', 'laboratory', 'H'), referenceRange: [{ text: 'Fictional reference interval for this sample only', low: { value: 70, unit: 'mg/dL' }, high: { value: 99, unit: 'mg/dL' } }] },
            { ...observation('sample-lab-3', 'Vitamin D (sample)', '1989-3', 18, 'ng/mL', 'laboratory', 'L'), referenceRange: [{ low: { value: 30, unit: 'ng/mL' }, high: { value: 100, unit: 'ng/mL' } }] },
        ]);
        case 'insurance': return searchBundle([{ resourceType: 'Coverage', id: 'sample-coverage-1', status: 'active', beneficiary: patient,
            type: { text: 'Fictional health plan' }, subscriberId: 'SAMPLE-NOT-VALID',
            relationship: { text: 'Self' }, payor: [{ display: 'Example Health Insurance (fictional)' }],
            class: [{ type: { text: 'Group' }, value: 'DEMO-001' }, { type: { text: 'Plan' }, value: 'Sample Plan' }],
            period: { start: '2026-01-01', end: '2026-12-31' } }]);
        case 'appointments': return searchBundle(sampleAppointments());
        case 'messages': return searchBundle(sampleMessages());
    }
}