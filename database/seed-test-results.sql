BEGIN;
-- Requires the shared-mode setup. Preserve all existing sample payloads.
ALTER TABLE ez_sample_payloads DROP CONSTRAINT IF EXISTS ez_sample_payloads_section_check;
ALTER TABLE ez_sample_payloads ADD CONSTRAINT ez_sample_payloads_section_check
    CHECK (section IN ('medications', 'providers', 'vitals', 'profile', 'test-results'));
INSERT INTO ez_sample_payloads (section, payload) VALUES
    ('test-results', $json${
  "status":"ok",
     "patient":{"id":"sample-patient-1","name":"Taylor Sample (fictional)"},
     "hasMore":false,
     "warnings":["Fictional laboratory examples for interface testing. Values, ranges, and flags are sample data, not medical guidance."],
     "results":[
    {"id":"sample-lab-1","name":"Glucose — fictional example","value":"92 mg/dL","referenceRanges":["70–99 mg/dL (fictional example range)"],"flags":["Normal (sample source flag)"],"status":"final","recordedAt":"2026-11-01T14:00:00Z","issuedAt":"2026-11-01T16:00:00Z","components":[],"notes":["Fictional result for testing the results screen."]},
        {"id":"sample-lab-2","name":"Hemoglobin — fictional example","value":"13.2 g/dL","referenceRanges":["13.5–17.5 g/dL (fictional example range)"],"flags":["Low (sample source flag)"],"status":"final","recordedAt":"2026-11-01T14:00:00Z","issuedAt":"2026-11-01T16:00:00Z","components":[],"notes":["This sample flag is stored in the fixture; the app does not calculate it."]},
        {"id":"sample-lab-3","name":"Urine culture — fictional example","value":"No result reported yet","referenceRanges":[],"flags":[],"status":"preliminary","recordedAt":"2026-11-02T14:00:00Z","issuedAt":null,"components":[],"notes":["Example of an unfinished result; not presented as final."]}
  ]
}$json$::jsonb)
    ON CONFLICT (section) DO UPDATE SET payload = EXCLUDED.payload;
COMMIT;
SELECT section FROM ez_sample_payloads ORDER BY section;