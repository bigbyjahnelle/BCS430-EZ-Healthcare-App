BEGIN;

-- Separate fictional fixtures; existing user, medication and Epic data are untouched.
CREATE TABLE IF NOT EXISTS ez_sample_payloads (
                                                  section TEXT PRIMARY KEY CHECK (section IN ('medications', 'providers', 'vitals')),
    payload JSONB NOT NULL
    );

INSERT INTO ez_sample_payloads (section, payload) VALUES
                                                      ('medications', $json${
  "patient": {"id":"sample-patient-1","name":"Taylor Sample (fictional)"},
                                                       "medications": [
    {"id":"sample-med-1","name":"Sample Medication A","dosage":"10 mg","frequency":"Once daily","instructions":"Fictional instructions for interface testing only.","status":"active","authoredOn":"2026-10-01"},
                                                          {"id":"sample-med-2","name":"Sample Medication B","dosage":"5 mg","frequency":"Twice daily","instructions":"Fictional historical order for interface testing only.","status":"completed","authoredOn":"2026-08-15"}
  ],
                                                       "warnings":["Fictional sample records — not Epic data or medical instructions."]
}$json$::jsonb),
                                                      ('providers', $json${
  "providers":[
    {"id":"sample-provider-1","name":"Dr. Avery Sample (fictional)","role":"Prescribing provider"},
                                                          {"id":"sample-provider-2","name":"Dr. Jordan Example (fictional)","role":"Prescribing provider"}
  ]
}$json$::jsonb),
                                                      ('vitals', $json${
  "status":"ok","hasMore":false,
                                                       "readings":[
    {"id":"sample-vital-1","name":"Blood pressure","value":"118/76 mmHg","recordedAt":"2026-11-01T14:00:00Z"},
                                                          {"id":"sample-vital-2","name":"Heart rate","value":"72 beats/min","recordedAt":"2026-11-01T14:00:00Z"},
                                                          {"id":"sample-vital-3","name":"Temperature","value":"36.8 °C","recordedAt":"2026-11-01T14:00:00Z"},
                                                          {"id":"sample-vital-4","name":"Oxygen saturation","value":"98%","recordedAt":"2026-11-01T14:00:00Z"}
  ]
}$json$::jsonb)
    ON CONFLICT (section) DO UPDATE SET payload = EXCLUDED.payload;

COMMIT;
SELECT section FROM ez_sample_payloads ORDER BY section;