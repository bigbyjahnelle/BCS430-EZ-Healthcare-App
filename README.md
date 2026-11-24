# EZ Healthcare

EZ Healthcare is a BCS 430 senior-project mobile prototype that makes healthcare information easier to navigate for older adults and people with accessibility needs. It combines large controls, clear labels, and optional voice assistance in one Android-focused interface.

**This is an educational demonstration—not a production healthcare service. All demonstrated health records are fictional sample data or synthetic Epic sandbox records. The app does not provide medical advice, diagnosis, treatment, or emergency services.**

## Project Status

The recommended experience for the final presentation and external evaluation is **Sample Data Mode**. It provides predictable fictional records without requiring Epic sign-in or a locally running backend.

**API Mode** is also implemented for Epic FHIR sandbox integration testing. Authorization and some record requests have experienced errors during development, so live sandbox access should not be relied on for an uninterrupted demonstration. API Mode never silently replaces failed requests with sample records.

Accessibility and device testing are ongoing. Some accessibility categories are still placeholders.

## Contents

- [Try the Android demo](#try-the-android-demo)
- [What you can explore](#what-you-can-explore)
- [Sample Data Mode and API Mode](#sample-data-mode-and-api-mode)
- [Ask EZ voice assistance](#ask-ez-voice-assistance)
- [Accounts and saved data](#accounts-and-saved-data)
- [Technology](#technology)
- [Run from source](#run-from-source)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)
- [Contributors](#contributors)

## Try the Android Demo

The evaluation build is distributed as a **standalone Android APK**. It does not require Expo Go, a development server, or a contributor's computer to remain running.

An APK download link has not been added to this README. Use the evaluation APK supplied by the project maintainers, or follow [Run from Source](#run-from-source) to build the project.

### Install

- **Android phone:** Download the project APK, open it, and allow installation from that source if Android requests it. Only install the file supplied by the project maintainers.
- **Android emulator:** Start a compatible emulator and drag the APK onto its window. Alternatively, use `adb install -r path/to/EZ-Healthcare.apk`.

An APK cannot run directly on an iPhone, macOS, or Windows. A desktop user needs an Android emulator.

### Explore

1. Open **EZ Healthcare**.
2. Create an account and complete email verification when requested, or sign in with an existing confirmed account.
3. Choose **Sample Data Mode** and tap **Continue**.
4. Select a service from Home. Scroll down for additional services.
5. Open **Profile** for the fictional patient's personal information and vital signs.
6. Try **Ask EZ**, create a practice appointment, or set a reminder using fictional information.
7. Use **Help** for app instructions and **Log Out** when finished.

**Internet is required for signup and login.** After login, the bundled sample records and local practice changes do not require Epic or a local database. Voice recognition may require internet and a supported device speech service.

A newly created EZ Healthcare account does not create a real medical record. Testers initially see the same fictional patient in Sample Data Mode.

## What You Can Explore

| Feature | Demonstration behavior |
| --- | --- |
| Medications | View medication orders, details, and statuses; create local reminders where offered |
| Appointments | View appointments and try creating, rescheduling, or cancelling fictional sample appointments |
| Profile | View fictional or sandbox patient demographics and vital signs |
| My Providers | View sample providers or prescribing providers linked to available Epic medication orders |
| Test Results | View laboratory values, reference information, and status colors with text labels |
| Insurance | View fictional coverage details or request available Epic sandbox Coverage records |
| Messages | Save messages in a simulated conversation; no message is sent to a real care team |
| Share | Select information, generate a preview, and explicitly open the device share menu |
| Reminders | Save local schedules, track today's doses, and receive device notifications when permitted |
| Ask EZ | Navigate with spoken or typed commands and request screen readouts |
| Help | Read user-focused instructions for the app |

Practice bookings do not contact a clinic. Simulated messages are not monitored. Insurance details are not a guarantee of benefits, and test-result colors are not medical interpretations.

## Sample Data Mode and API Mode

Both modes use the same screens. The selected source determines which records appear and which actions are available.

| | Sample Data Mode | API Mode |
| --- | --- | --- |
| Record source | Fictional FHIR-shaped resources bundled with the app | Authorized synthetic records requested from Epic's FHIR R4 sandbox |
| Additional sign-in | No Epic sign-in | Separate Epic sandbox authorization |
| Backend requirement | No local backend or local PostgreSQL | Hosted Supabase `healthcare` function and internet access |
| Appointments | Local practice creation, editing, and cancellation | Read-only Epic requests |
| Messages | Locally saved simulated conversation | MyChart inbox/send integration is not configured |
| Reliability | Recommended for presentations and external evaluation | Subject to sandbox availability, permissions, and available test records |

To try API Mode, choose it on the mode-selection screen, then open **Connect / Manage Epic** from Home. Use only an approved synthetic sandbox account. Do not enter real patient credentials.

Use the mode label and **Change** on Home to return to the selector. Changing modes resets transient app connection/display state; it does not erase saved local practice records.

## Ask EZ Voice Assistance

Tap **Ask EZ** on Home or a microphone button on a supported screen. Allow microphone access when prompted, or use the typed-command field.

Example commands:

- “Open my medications.”
- “My appointments.”
- “Show my reminders.”
- “Test results.”
- “Read this screen.”
- “Voice settings.”
- “Go home.”
- “Go back.”

Ask EZ uses device speech recognition and keyword/phrase matching. It is **not a generative-AI medical assistant**. It navigates and reads available screen summaries; it does not automatically book appointments, send messages, or save reminders.

Open **Settings → Voice & Communication** to adjust voice commands, spoken confirmations, speaking speed, and appointment/result readout windows. Screen readouts may summarize rather than read every displayed record.

Recognition availability depends on the device's speech service and permissions. Typed commands provide an alternative when speech input is unavailable.

## Accounts and Saved Data

Supabase Auth manages EZ Healthcare account signup and login. Epic authorization is a separate connection used only for API Mode.

| Data | Current storage |
| --- | --- |
| Account credentials | Managed by Supabase Auth |
| Initial sample health records | Bundled with the app |
| Sample appointment and message edits | AsyncStorage on the device, scoped to the signed-in account and selected mode |
| Reminders and dose logs | Account/mode-scoped local storage and device notification scheduling |
| Voice preferences | Local app-installation settings; currently not account-specific |
| Epic authorization information | User-bound restricted Supabase tables, with encrypted access tokens |

Local sample edits and reminders **do not synchronize between devices**. They normally remain when the same user logs back in on the same installation. Uninstalling the app or clearing its storage removes them.

The current app does not persist the login session across fresh launches. Logging out suspends medication reminder notifications; signing back in reschedules saved reminders when permitted.

Profile displays the selected fictional or sandbox patient's information—not automatically the personal details of the person registering an account. Do not enter real medical information in this prototype.

## Technology

- **Mobile app:** React Native, Expo SDK 58, TypeScript, and Expo Router.
- **Account authentication:** Supabase Auth.
- **Hosted integration:** Supabase Edge Functions and restricted Supabase Postgres tables.
- **Health-data format:** FHIR R4 resources and shared normalization.
- **Local storage:** AsyncStorage.
- **Voice:** `expo-speech` and `expo-speech-recognition`.
- **Reminders:** `expo-notifications`.
- **Android distribution:** A standalone APK built with the committed EAS preview profile.

The older Express backend and local PostgreSQL scripts remain in the repository as legacy development work. They are not required by the current mobile sample-data or hosted API flow.

## Run from Source

### Requirements

- Node.js and npm. Node.js 24 is the project's development baseline; `package.json` requires Node.js 22.13.0 or newer.
- Git.
- Android Studio with the required SDK tools and an emulator, or an Android device configured for development.
- A compatible JDK; the project's documented local setup uses JDK 17.

Follow the appropriate Android environment instructions for the host operating system. This project's primary development workflow has been macOS/Android; Windows setup needs validation on the target computer. iOS build instructions are not included.

### Install and Build

```sh
git clone https://github.com/bigbyjahnelle/BCS430-EZ-Healthcare-App.git
cd BCS430-EZ-Healthcare-App
npm ci
npx expo prebuild --platform android
npx expo run:android
```

Run commands from the folder containing `package.json` and `app.json`, not `backend/`. Start the emulator or connect the development device before building.

The shared Supabase URL and publishable key are already in `src/config/publicConfig.ts`. An authorized contributor using the existing project does not need a separate Supabase project or a local Supabase `.env`. An independent deployment requires its own configuration; see [the setup guide](docs/SETUP.md).

For later JavaScript-only development sessions:

```sh
npm start
```

Press **a** to open Android. Use the matching development build, not Expo Go. Rebuild after native dependencies or config plugins change; reloading JavaScript alone cannot add a missing native module such as `ExpoSpeech`.

Retain the committed dependency versions and lockfile. Do not upgrade Expo or use `npm audit fix --force` as an installation step.

### Checks

```sh
npm run typecheck
npm run check:dependencies
```

These checks do not replace a native build or real-device testing. See [the setup guide](docs/SETUP.md) for OS-specific environment configuration, troubleshooting, deployment, and APK build instructions.

## Known Limitations

- Epic authorization and some record requests have failed or timed out during development. A permission error or timeout is not proof that no records exist.
- API appointment booking, editing, and cancellation are not implemented.
- A MyChart inbox/send integration is not configured.
- Provider results are linked prescribing providers, not a complete care team or searchable healthcare directory.
- API requests depend on granted scopes and the sandbox account's available records. The current integration does not maintain a complete longitudinal health record in Supabase.
- Epic connections expire; automatic refresh-token renewal is not implemented.
- Local sample changes and reminders are not cloud-synchronized.
- Several accessibility categories are placeholders; voice features and the interface still need broader accessibility and device testing.
- Hosted email delivery and account verification must be configured and tested before opening signup to external evaluators.

This prototype is not a production healthcare service and has not been established as HIPAA-compliant.

## Documentation

- [Development, deployment, troubleshooting, and contributor guide](docs/SETUP.md)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo Android APK builds](https://docs.expo.dev/build-reference/apk/)
- [Supabase documentation](https://supabase.com/docs)
- [Epic on FHIR](https://fhir.epic.com/)

Report problems through [GitHub Issues](https://github.com/bigbyjahnelle/BCS430-EZ-Healthcare-App/issues). Include the device/OS, app build or branch, selected data mode, steps to reproduce, and the error message. Remove passwords, tokens, verification codes, and personal information from logs and screenshots.

## Contributors

Developed for BCS 430 Senior Project by:

- Jahnelle Bigby
- Adrianna Lambert
- Matthew Hill
- Rahul Dookwah
