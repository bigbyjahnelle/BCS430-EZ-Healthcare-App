BEGIN;

-- This table contains only fictional records for the capstone walkthrough.
CREATE TABLE IF NOT EXISTS ez_demo_records (
                                               id integer PRIMARY KEY,
                                               section text NOT NULL,
                                               title text NOT NULL,
                                               detail text NOT NULL
);

-- Update the section constraint on databases seeded with the earlier script.
ALTER TABLE ez_demo_records DROP CONSTRAINT IF EXISTS ez_demo_records_section_check;
ALTER TABLE ez_demo_records ADD CONSTRAINT ez_demo_records_section_check
    CHECK (section IN ('medications', 'appointments', 'providers', 'vitals', 'insurance'));

INSERT INTO ez_demo_records (id, section, title, detail) VALUES
                                                             (1, 'medications', 'Sample Medication A', 'Example order · Completed'),
                                                             (2, 'medications', 'Sample Medication B', 'Example order · Active'),
                                                             (3, 'appointments', 'Annual checkup', 'December 10, 2026 at 10:30 AM · Sample Health Center'),
                                                             (4, 'providers', 'Dr. Avery Demo', 'Primary care · Sample Health Center'),
                                                             (5, 'vitals', 'Blood pressure', '118/76 mmHg · Recorded November 6, 2026'),
                                                             (6, 'vitals', 'Heart rate', '72 bpm · Recorded November 6, 2026'),
                                                             (7, 'vitals', 'Weight', '145 lb · Recorded November 6, 2026'),
                                                             (8, 'insurance', 'Sample Choice PPO',
                                                              E'Insurer: Example Health Insurance\nMember ID: DEMO-0001\nGroup number: DEMO-GRP-01')
    ON CONFLICT (id) DO UPDATE SET
                            section = EXCLUDED.section,
                            title = EXCLUDED.title,
                            detail = EXCLUDED.detail;

COMMIT;
