BEGIN;

-- Basic user information.
-- This does not create a working login system.
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                     first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- Each user has one set of accessibility preferences.
CREATE TABLE IF NOT EXISTS settings (
                                        user_id INTEGER PRIMARY KEY REFERENCES users(id),
    text_size VARCHAR(20) NOT NULL DEFAULT 'large',
    high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    CHECK (text_size IN ('standard', 'large', 'extra_large'))
    );

-- Medication records for the prototype.
CREATE TABLE IF NOT EXISTS medications (
                                           id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                           user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(150) NOT NULL,
    instructions TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'sample',
    last_synced_at TIMESTAMPTZ,

    CHECK (source IN ('sample', 'epic'))
    );

-- Appointment records for the prototype.
CREATE TABLE IF NOT EXISTS appointments (
                                            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                                            user_id INTEGER NOT NULL REFERENCES users(id),
    provider_name VARCHAR(150) NOT NULL,
    appointment_type VARCHAR(150) NOT NULL,
    appointment_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    source VARCHAR(20) NOT NULL DEFAULT 'sample',
    last_synced_at TIMESTAMPTZ,

    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    CHECK (source IN ('sample', 'epic'))
    );

-- Help the database find a user's records.
CREATE INDEX IF NOT EXISTS medications_user_id_index
    ON medications(user_id);

CREATE INDEX IF NOT EXISTS appointments_user_id_index
    ON appointments(user_id);

-- Demo user. All associated healthcare records are fictional.
INSERT INTO users (first_name, last_name, email)
VALUES ('Matt', 'Demo', 'matt@example.test')
    ON CONFLICT (email) DO NOTHING;

-- Default preferences for the demo user.
INSERT INTO settings (
    user_id,
    text_size,
    high_contrast,
    voice_enabled
)
SELECT id, 'large', FALSE, FALSE
FROM users
WHERE email = 'matt@example.test'
    ON CONFLICT (user_id) DO NOTHING;

-- Fictional medication record, for demonstration only.
INSERT INTO medications (
    user_id,
    name,
    dosage,
    frequency,
    instructions,
    source
)
SELECT
    u.id,
    'Sample Medication A',
    '10 mg',
    'Once daily',
    'Fictional record for testing the interface.',
    'sample'
FROM users u
WHERE u.email = 'matt@example.test'
  AND NOT EXISTS (
    SELECT 1
    FROM medications m
    WHERE m.user_id = u.id
      AND m.name = 'Sample Medication A'
      AND m.source = 'sample'
);

-- Fictional appointment, for demonstration only.
INSERT INTO appointments (
    user_id,
    provider_name,
    appointment_type,
    appointment_time,
    location,
    source
)
SELECT
    u.id,
    'Dr. Demo',
    'Routine checkup',
    '2026-11-16 10:00:00-05',
    'Sample Health Center, Room 101',
    'sample'
FROM users u
WHERE u.email = 'matt@example.test'
  AND NOT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.user_id = u.id
      AND a.provider_name = 'Dr. Demo'
      AND a.appointment_time = '2026-11-16 10:00:00-05'
      AND a.source = 'sample'
);

COMMIT;

-- Show the records after setup.
SELECT * FROM users;
SELECT * FROM settings;
SELECT * FROM medications;
SELECT * FROM appointments;