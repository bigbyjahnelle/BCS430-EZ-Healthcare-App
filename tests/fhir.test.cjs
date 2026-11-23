// Compile src/data/*.ts into a temporary folder first (see SETUP.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dir = process.env.EZ_TEST_BUILD || '/tmp/ez-healthcare-check/src/data';
const { normalize, bundleResources, patientReference } = require(path.join(dir, 'fhir.js'));
const { SAMPLE_PATIENT, sampleResource, sampleAppointments, searchBundle } = require(path.join(dir, 'sample.js'));
const base = 'https://example.test/fhir';
const sections = ['profile','medications','providers','vitals','appointments','insurance','test-results','messages'];
for (const section of sections) test(`sample ${section} uses the shared FHIR adapter`, () => {
    const data = normalize(section, sampleResource(section), SAMPLE_PATIENT, base, 'Sample', new Date().toISOString());
    assert.ok(data.items.length > 0);
    for (const item of data.items) { assert.ok(item.id); assert.ok(item.title); assert.ok(Array.isArray(item.lines)); }
});
test('new fixture appointments are future-dated with accepted patient/provider/location participants', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    for (const a of sampleAppointments(now)) {
        assert.equal(a.resourceType, 'Appointment'); assert.equal(a.status, 'booked');
        assert.ok(Date.parse(a.start) > now.getTime()); assert.ok(Date.parse(a.end) > Date.parse(a.start));
        assert.equal(a.participant.length, 3); assert.ok(a.participant.every(p => p.status === 'accepted'));
    }
});
test('historical medication order keeps completed status', () => {
    assert.equal(normalize('medications', sampleResource('medications'), SAMPLE_PATIENT, base, '', '').items[1].status, 'completed');
});
test('lab colors use supplied N/H/L interpretations', () => {
    assert.deepEqual(normalize('test-results', sampleResource('test-results'), SAMPLE_PATIENT, base, '', '').items.map(x => x.flag), ['normal','abnormal','abnormal']);
});
test('a result with no interpretation is neutral, not green', () => {
    const bundle = sampleResource('test-results'); delete bundle.entry[0].resource.interpretation;
    assert.equal(normalize('test-results', bundle, SAMPLE_PATIENT, base, '', '').items[0].flag, 'unknown');
});
test('critical component flags are retained', () => {
    const bundle = sampleResource('test-results'); const r = bundle.entry[0].resource;
    r.component = [{ code: { text: 'Panel component' }, valueQuantity: { value: 1, unit: 'test' }, interpretation: [{ coding: [{ code: 'LL' }] }] }];
    assert.equal(normalize('test-results', bundle, SAMPLE_PATIENT, base, '', '').items[0].flag, 'critical');
});
test('search pagination is disclosed', () => {
    const b = sampleResource('appointments'); b.link = [{ relation: 'next', url: 'https://example.test/next' }];
    assert.ok(normalize('appointments', b, SAMPLE_PATIENT, base, '', '').warnings.some(x => x.includes('first page')));
});
test('OperationOutcome warnings are not records', () => {
    const b = searchBundle([{ resourceType: 'OperationOutcome', issue: [{ severity: 'warning' }] }]);
    const data = normalize('medications', b, SAMPLE_PATIENT, base, '', '');
    assert.equal(data.items.length, 0); assert.ok(data.warnings.length);
});
test('OperationOutcome error is not treated as an empty successful search', () => {
    assert.throws(() => bundleResources(searchBundle([{ resourceType: 'OperationOutcome', issue: [{ severity: 'error' }] }])));
});
for (const section of ['medications','appointments','insurance','vitals','test-results','messages']) {
    test(`rejects wrong-patient ${section}`, () => {
        assert.throws(() => normalize(section, sampleResource(section), 'some-other-patient', base, '', ''), /patient/);
    });
}
test('absolute references must match the configured base', () => {
    assert.equal(patientReference(`${base}/Patient/${SAMPLE_PATIENT}`, SAMPLE_PATIENT, base), true);
    assert.equal(patientReference(`https://evil.test/Patient/${SAMPLE_PATIENT}`, SAMPLE_PATIENT, base), false);
});
test('cancelled and entered-in-error labs are omitted with a warning', () => {
    const b = sampleResource('test-results'); b.entry[0].resource.status = 'entered-in-error';
    const data = normalize('test-results', b, SAMPLE_PATIENT, base, '', '');
    assert.equal(data.items.length, 2); assert.ok(data.warnings.length > 0);
});
test('cancelled appointments remain visible with status intact', () => {
    const b = sampleResource('appointments'); b.entry[0].resource.status = 'cancelled';
    assert.equal(normalize('appointments', b, SAMPLE_PATIENT, base, '', '').items[0].status, 'cancelled');
});
test('unknown response type and missing record id are rejected', () => {
    assert.throws(() => normalize('appointments', {resourceType:'Patient'}, SAMPLE_PATIENT, base, '', ''));
    const b = sampleResource('appointments'); delete b.entry[0].resource.id;
    assert.throws(() => normalize('appointments', b, SAMPLE_PATIENT, base, '', ''));
});