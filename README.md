# EZ Healthcare

EZ Healthcare is a BCS 430 senior-project mobile prototype designed to make healthcare information easier to navigate for older adults and people with accessibility needs. The interface emphasizes large controls, clear labels, simple navigation, and optional voice assistance.

**Demonstration only. Use fictional sample records and Epic sandbox accounts—not real patient information. This app does not provide medical advice, diagnosis, treatment, or emergency services.**

## Current Demo Plan

The final presentation and shared Android APK are intended to use **Sample Data Mode**. API Mode remains available for Epic sandbox integration testing, but Epic authorization and some record requests have experienced errors during development. Do not depend on API Mode for an uninterrupted presentation.

Both modes use the same screens and layouts. Sample Data Mode is an explicit choice; API errors never silently substitute sample records.

The intended flow is:

1. Open EZ Healthcare and sign in or create an account.
2. Verify the signup email when required.
3. Select **Sample Data Mode** or **API Mode** and tap **Continue**.
4. Explore the shared Home screen and services.

**Sample records do not require a local backend or PostgreSQL installation. Supabase account signup/login still requires internet access.** Voice recognition may also need internet and an available device speech service.

## Contents

- [Features and limitations](#features-and-limitations)
- [Architecture and data storage](#architecture-and-data-storage)
- [Install and run for development](#install-and-run-for-development)
- [Use the app](#use-the-app)
- [Build and share the Android APK](#build-and-share-the-android-apk)
- [Hosted Supabase and Epic setup](#hosted-supabase-and-epic-setup)
- [Troubleshooting](#troubleshooting)
- [Team workflow](#team-workflow)
- [Validation checklist](#validation-checklist)
- [Key files](#key-files)

## Features and Limitations

| Feature | Sample Data Mode | API Mode |
| --- | --- | --- |
| Login and signup | Supabase Auth account | Same Supabase Auth account; Epic authorization is separate |
| Medication Records | Bundled fictional medication orders | Requests authorized Epic sandbox medication orders |
| Appointments | View, create, edit/reschedule, and cancel fictional appointments locally | Requests Epic appointments; booking, editing, and cancellation are not implemented |
| Profile | Fictional patient demographics and vital signs | Requests Epic Patient and vital-sign Observation resources |
| My Providers | Fictional providers | Prescribing providers referenced by medication orders; not a complete provider directory |
| Test Results | Fictional laboratory results with status colors and labels | Requests laboratory Observations; availability depends on Epic access and returned data |
| Insurance | Fictional insurance details | Requests Coverage resources; endpoint access and available records must be verified |
| Messages | Simulated conversation with locally saved practice messages | MyChart inbox/send integration is not configured; the app reports that it is unsupported |
| Share | Preview selected fictional records, then open the device share menu | Preview selected successfully retrieved records, then open the same share menu |
| Reminders | Locally saved schedules, dose tracking, and device notifications | Same local reminder tools; not synchronized with Epic |
| Help | User-focused instructions | Same help screen with mode-specific explanations |
| Ask EZ | Voice or typed navigation commands and screen readouts | Same command system; it does not bypass login or Epic permissions |

An implemented request path does not guarantee that a sandbox account has records or that Epic will authorize every request.

### Ask EZ Voice Prototype

Tap **Ask EZ** on Home or an available microphone button to speak. Allow microphone access when prompted. A typed-command option is also available.

Example commands include:

- “Open my medications.”
- “My appointments.”
- “Show my reminders.”
- “My health.”
- “Test results.”
- “Read this screen.”
- “Voice settings.”
- “Go home.”
- “Go back.”

Ask EZ uses speech recognition followed by keyword/phrase matching. It is **not a generative-AI medical assistant**. Commands navigate or read screen summaries; they do not create appointments, send messages, or save reminders automatically.

Open **Settings → Voice & Communication** to change voice-command visibility, spoken confirmations, speaking speed, and the appointment/result readout windows. “Read this screen” reads the available app summary, not necessarily every displayed item.

Other accessibility categories currently contain placeholder pages. Do not describe every accessibility setting as implemented until the team's changes are merged and tested.

## Architecture and Data Storage

| Component | Responsibility |
| --- | --- |
| React Native, Expo SDK 58, TypeScript, Expo Router | Mobile interface and navigation |
| Supabase Auth | EZ Healthcare account signup, verification, and login |
| Bundled sample resources | Fictional FHIR-shaped records shipped inside the app |
| AsyncStorage | Local sample edits, reminders, dose logs, and voice preferences |
| Supabase Edge Function `healthcare` | Hosted Epic authorization and sandbox record requests |
| Supabase Postgres | Restricted Epic authorization-attempt, connection, and rate-limit tables |
| Epic FHIR R4 sandbox | Authorized synthetic healthcare records |
| Android speech services and Expo speech modules | Voice recognition and spoken output |

The current mobile flow does **not** require the older Express server in `backend/`, a `localhost:3001` connection, or the older local PostgreSQL seed scripts in `database/`. Those files remain as legacy development work; do not delete teammates' files as part of setup.

### What Is Saved Where?

- **Accounts:** Supabase Auth manages credentials. The app does not save passwords in a custom local users table.
- **Sample records:** Initial records are bundled with the app. Every new tester starts with the same fictional patient data; it is not their personal medical history.
- **Sample appointments and messages:** Edits are saved locally, scoped to the signed-in user and selected mode.
- **Reminders and dose logs:** Saved locally per user and mode. Notifications are scheduled on the device, not through an Epic or cloud push service.
- **Voice settings:** Saved locally for the app installation; the current voice-settings storage is not account-specific.
- **Epic connection:** The hosted backend stores user-bound authorization information, including encrypted access tokens. Retrieved records are not automatically copied into a longitudinal Supabase health-record database.

Local changes do not sync to another phone or emulator. They normally survive app restarts and logout/login on the same installation, but uninstalling the app or clearing its storage removes them. Logging out suspends the app's medication reminder notifications; signing back in reschedules from saved reminders when permitted.

The current Supabase client uses `persistSession: false`, so the sign-in session is not intentionally saved across fresh app launches. This does not delete saved local sample edits.

## Install and Run for Development

These instructions are for teammates working from source. APK testers can skip to [Build and Share the Android APK](#build-and-share-the-android-apk).

Android is the presentation target. The main development workflow is macOS with an Android emulator. Windows setup should be rehearsed on the actual teammate's computer. iOS is not covered here.

### 1. Install Prerequisites

- Node.js and npm. Node.js 24 is the team's development baseline; `package.json` requires Node.js 22.13.0 or newer.
- Git and an editor such as IntelliJ IDEA or VS Code.
- Android Studio, Android SDK Platform-Tools, Android Emulator, and the SDK/build tools required by the project.
- A compatible JDK. The team's local Android build setup uses JDK 17.
- A running Android emulator or a connected Android phone with USB debugging enabled.

Use [Expo's Android setup guide](https://docs.expo.dev/workflow/android-studio-emulator/) and the Android SDK Location shown in Android Studio. Do not copy another teammate's username into local paths.

### 2. Clone and Install

```sh
git clone https://github.com/bigbyjahnelle/BCS430-EZ-Healthcare-App.git
cd BCS430-EZ-Healthcare-App
npm ci
```

The project root contains `package.json`, `app.json`, `src/`, and `supabase/`. Run Expo from this folder, **not** from `backend/`.

Retain the committed package versions and lockfile. If `npm ci` reports a package/lockfile mismatch, coordinate with the team. Do not upgrade Expo or run `npm audit fix --force` as a setup step.

### 3. Shared Supabase Configuration

The shared project URL and publishable key are committed in:

```text
src/config/publicConfig.ts
```

Both authentication and hosted record requests use this configuration. Teammates do **not** need their own Supabase project or a local `.env` containing those two values.

The URL and publishable key are public client configuration, not administrator credentials. Access control must still be enforced by authentication, database permissions, and backend checks.

Keep service-role keys, SMTP passwords, encryption keys, and Epic access tokens out of frontend code and Git. SMTP credentials belong in hosted Auth settings; Edge Function secrets belong in hosted function settings.

### 4. Configure Android Tools

Start a device from Android Studio's **Device Manager** and wait for its home screen.

On macOS, with the SDK installed in its usual location, run these commands in the terminal you will use to build:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

On Windows, set `JAVA_HOME` and `ANDROID_HOME` to the actual installed JDK and SDK locations and add their command-line tools to PATH. Reopen the terminal afterward. PowerShell users can use `npm.cmd` and `npx.cmd` if script execution blocks the `.ps1` launchers.

Check:

```sh
node --version
java -version
adb devices
```

The emulator or phone should appear with status `device`.

### 5. Build the Development App

For first setup, or after pulling changes to native libraries or config plugins:

```sh
npx expo prebuild --platform android
npx expo run:android
```

This generates/updates the local Android project, builds the app, installs it, and normally starts Metro. Keep the emulator and Metro running.

**Voice and notifications require the matching native development build.** Pulling JavaScript and pressing `a` does not add newly introduced native modules to an older installed app.

Do not use `prebuild --clean`, delete native folders, or uninstall the app as the first troubleshooting step. Native regeneration can overwrite manual native changes, and uninstalling removes local data. Coordinate changes to native configuration with the team.

### 6. Normal Daily Startup

If no native dependencies or native configuration changed, start the emulator and run:

```sh
npm start
```

Press **a** in the Expo terminal to open Android. `npm start` uses the development client, not Expo Go.

If the emulator cannot reach Metro over the normal connection, with the device connected to ADB:

```sh
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

Stop the previous Metro server before starting another. Port `8081` is Metro; the hosted backend does not use local port `3001`.

## Use the App

### Sample Data Mode — Recommended for the Presentation

1. Sign in to EZ Healthcare with a confirmed account, or complete signup and email verification.
2. Select **Sample Data Mode** and tap **Continue**.
3. Explore Medications, Appointments, Test Results, My Providers, Insurance, and Messages.
4. Open **Profile** for fictional patient demographics and vital signs. There is no separate My Health Home tile; the older route remains an alias.
5. Try a sample appointment or simulated message. No clinic or care team is contacted.
6. Test reminders with fictional information and allow notifications if desired.
7. Use Share to generate a preview before explicitly opening the device share menu.

After login, bundled records and local sample edits do not need Epic, Express, or a local database. This is not a fully offline login system.

Profile shows the selected fictional/sandbox patient's information, not automatically the name or date of birth of the person who created the EZ Healthcare account.

### API Mode — Integration Testing

1. Sign in to EZ Healthcare.
2. Choose **API Mode** and tap **Continue**.
3. Tap **Connect / Manage Epic** on Home.
4. Complete the sandbox login and consent in the browser.
5. Return to the app and confirm the connection, then open a record screen.

Use only the team's approved synthetic Epic test account. Obtain current test credentials from the team rather than committing passwords to the README. EZ Healthcare login and Epic authorization are separate steps.

API requests use the hosted `healthcare` function. Appointments are read-only; Messages reports unsupported MyChart integration. Provider details may be incomplete. Vital signs, labs, and insurance depend on sandbox records and permissions.

Known development problems have included Epic HTTP 500 responses, provider-detail HTTP 403 responses, request timeouts, and emulator browser/network failures. These are distinct failure types: none automatically proves there are no records.

API connections expire and may require reauthorization. The current backend does not implement automatic refresh-token renewal. Keep Sample Data Mode available for the presentation.

### Switch Modes or Log Out

Use the mode label and **Change** on Home to return to the selector. Selecting a mode resets transient mobile connection state and remounts navigation so old screen data is not retained. It does not erase saved local sample appointments or reminders.

This UI reset is not itself remote Epic-token revocation. Use the connection screen to disconnect; logout also attempts hosted disconnection and clears the local app session. Epic browser cookies may still remain.

## Build and Share the Android APK

The tester build is a **standalone Android APK**, not an SDK and not the development-client launcher. It includes its JavaScript bundle and does not require a teammate's laptop, Metro, Express, or local PostgreSQL to remain running.

Internet is still required for account authentication and API Mode. Voice-service requirements vary by device. Use Sample Data Mode for the distributed demo.

### Maintainer: Create a Preview Build

The committed `eas.json` already has a `preview` profile with internal distribution, `developmentClient: false`, and Android APK output.

From a reviewed, tested checkout:

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

On first use, coordinate Expo project linking and Android signing credentials with the team. Use one shared Expo project; do not independently initialize competing projects. Keep signing credentials private.

Download the finished APK from the build page and share its download link or attach the APK to the team's chosen distribution location. Do not claim an APK is available until a build succeeds and its actual link is published.

### Tester: Install and Run

- **Android phone:** Download the APK, allow installation from that source if Android requests it, and install. Only install the APK supplied by the team.
- **Android emulator:** Start a compatible emulator and drag the APK onto its window, or use `adb install -r path/to/EZ-Healthcare.apk`.
- Open EZ Healthcare, sign in or sign up, and choose **Sample Data Mode**.

An APK cannot run directly on macOS, Windows, or an iPhone. A Mac/Windows tester needs an Android emulator. Installing a new APK with a different signing key may require uninstalling the existing app, which removes its local data.

## Hosted Supabase and Epic Setup

**Maintainer-only setup. Ordinary teammates and APK testers do not need to repeat it.** Repository files do not prove that the hosted deployment or email configuration is complete; verify these before inviting testers.

### Supabase Authentication and Email

1. Use the team's shared Supabase project and enable email/password signup.
2. Keep signup confirmation enabled for the verification flow.
3. Configure an approved SMTP provider in Supabase Auth before allowing external testers to create accounts. The default mail service is restricted and is not a general-purpose public signup email service.
4. Configure the **Confirm signup** email template to show a numeric code using `{{ .Token }}`. For example:

```html
<h2>Verify your EZ Healthcare account</h2>
<p>Enter this code in the EZ Healthcare app:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request this account, ignore this email.</p>
```

5. Test signup, email receipt, code verification, resend, logout, and a fresh login using a permitted test account.

The app's verification screen calls Supabase's email-code verification API. A default browser link redirecting to `localhost:3000` is not the intended verification experience for this mobile flow. Dashboard template and SMTP changes are separate from copying app source files.

New Free projects using default SMTP may need custom SMTP before email-template customization is available. Configure sender credentials only in hosted Auth settings; never add them to the APK or repository. Do not make testers Supabase project administrators merely to receive verification emails.

### Epic Database Migration and Function

The migration is:

```text
supabase/migrations/202611210001_epic_hosting.sql
```

It creates restricted authorization-attempt, encrypted-connection, and rate-limit storage. It does not create cloud tables for sample appointment/message edits or automatically synchronize local reminders.

A maintainer with access can link the repository to the existing project and review pending migrations:

```sh
npx supabase login
npx supabase link --project-ref mmurlxdjbzvctegytiao
npx supabase db push --dry-run
```

Review the output with the team before applying pending migrations:

```sh
npx supabase db push
```

If the SQL was already applied through the Dashboard SQL Editor, reconcile migration history before using CLI database pushes. Do not blindly rerun or reset the hosted database.

Configure these Edge Function secrets in the hosted dashboard:

| Name | Value |
| --- | --- |
| `EPIC_CLIENT_ID` | Team non-production Epic client ID |
| `EPIC_TOKEN_ENCRYPTION_KEY` | Private, randomly generated 64-character hexadecimal value |
| `EPIC_EXTRA_SCOPES` | Optional additional scopes supported by the registration |

Supabase provides the function's platform URL and service-role environment variables. Do not place administrator keys in `src/config/publicConfig.ts`. Changing the encryption key invalidates the ability to decrypt previously stored connections; coordinate rotation and reconnect affected test users.

Deploy from the repository root after the migration and secrets are configured:

```sh
npx supabase functions deploy healthcare --use-api
```

Both files must be present before deployment:

```text
supabase/functions/healthcare/index.ts
supabase/functions/_shared/fhir.ts
```

The function uses `verify_jwt = false` in `supabase/config.toml` to allow Epic's browser callback. Other implemented endpoints verify the Supabase user in function code. Do not remove those checks or expose the private tables directly to mobile clients.

### Epic App Registration

Register this hosted callback exactly for the team's non-production Epic app:

```text
https://mmurlxdjbzvctegytiao.supabase.co/functions/v1/healthcare/callback
```

The backend returns the browser to:

```text
ezhealthcare://connect-epic
```

These are different: the HTTPS URL is Epic's registered callback; the custom scheme reopens the installed mobile app. Do not replace the hosted callback with emulator localhost.

Review registration support for Patient, MedicationRequest, Medication, Observation, Appointment, Coverage, and any permitted Practitioner lookup. The current code requests read access, not appointment booking or messaging write operations. Selecting an API in the Epic dashboard does not guarantee the requested scope will be granted; inspect authorization results and reconnect after registration changes.

## Troubleshooting

### Cannot Find Native Module `ExpoSpeech`, Speech Recognition, Notifications, or AsyncStorage

The installed development app may predate a new native dependency. Stop Metro, keep the emulator open, then run:

```sh
npm ci
npx expo prebuild --platform android
npx expo run:android
```

Clearing Metro's cache or pressing `a` alone does not install native modules. Keep the committed dependency versions.

### White App Screen or Bundling Error

Check the first error in the Expo terminal, including the filename and line number. Syntax errors and missing native modules need different fixes from network problems.

For a stale JavaScript cache, stop Metro and restart:

```sh
npx expo start --dev-client --clear
```

For local Metro connectivity, use the `8081` ADB reverse instructions above. Do not start a second server to hide a port conflict.

### Supabase `UnknownHostException` or Emulator Has No Internet

Compare connectivity on the computer and inside the emulator. A working computer browser does not prove the emulator has working DNS or HTTPS.

This address can help check basic reachability:

```text
https://mmurlxdjbzvctegytiao.supabase.co/auth/v1/health
```

A JSON response saying **No API key found** means that request reached Supabase; it is not a successful authenticated app login. A black browser screen alone does not identify the cause.

If emulator DNS is the problem, close the existing emulator normally and start its AVD with explicit DNS. On macOS, for an AVD actually named `Pixel_10`:

```sh
"$HOME/Library/Android/sdk/emulator/emulator" -avd Pixel_10 -dns-server 8.8.8.8,1.1.1.1 -no-snapshot-load
```

Use your own AVD name. This does not intentionally wipe its stored data. Networks may restrict public DNS, so retest rather than assuming this resolves every connectivity failure.

### `adb: command not found` or Android SDK Location Not Found

Use Android Studio's SDK Location, configure `ANDROID_HOME`, and add `platform-tools` to PATH. On a default macOS install, ADB can also be called directly:

```sh
"$HOME/Library/Android/sdk/platform-tools/adb" devices
```

Keep machine-specific SDK paths and `android/local.properties` out of Git.

### Java, Gradle, or Kotlin Build Failure

Check `java -version` in the same terminal doing the build. Use the project's compatible JDK and SDK tools. Read the first **What went wrong** section; the final non-zero-exit stack trace is usually only a summary.

Do not independently upgrade Gradle, Kotlin, Expo, and React Native to unrelated latest versions. Coordinate native-template and dependency fixes with the team.

### Signup Email Missing or Verification Code Rejected

Check the latest email and spam folder. Use Resend Code after its cooldown, then enter the newest code. Codes can expire or be single-use.

Ask the maintainer to inspect SMTP configuration, email templates, Auth logs, and service rate limits. The app's resend timer does not override server limits. Do not disable verification or bypass route protection merely to conceal an email-delivery problem.

### Hosted Function Deployment Says Entrypoint Does Not Exist

Confirm `supabase/functions/healthcare/index.ts` exists in the checkout and run deployment from the project root. Do not replace the entire `supabase/` folder with a partial set of files.

### Epic Fails to Connect or Records Do Not Load

- Reconnect through **Connect / Manage Epic** after authorization expires.
- Check hosted function logs and the registered callback when authorization fails.
- HTTP 403 means access was denied; it does not prove the record is absent.
- A timeout means the request did not finish; it is not an empty-result response.
- HTTP 500 requires identifying whether Epic or the hosted function returned it. Do not assume a sandbox announcement proves an outage or fixes it.
- If other websites also fail only inside the emulator, diagnose its network separately.
- Choose Sample Data Mode for the presentation instead of presenting fabricated records as an API response.

### Sample Records Ask for PostgreSQL or `localhost:3001`

Those messages indicate older code or an older build. The current bundled sample flow does not require those services. Check the branch, installed APK, and Metro project folder before running legacy seed scripts.

## Team Workflow

Use feature branches and pull requests rather than pushing unfinished changes directly to `main`.

```sh
git switch -c your-name/feature-name
```

Before integrating new `main` changes, commit or safely stash your local work. Then, from your feature branch:

```sh
git fetch origin
git merge origin/main
```

Resolve conflicts carefully, especially in `_layout.tsx`, shared screen components, authentication, voice hooks, and reminder lifecycle code. Preserve both teammates' features; do not accept an entire conflicting file without reviewing it.

After installing changed dependencies and testing, push your branch and open a pull request:

```sh
git push -u origin your-name/feature-name
```

Keep actual `.env` files, passwords, private keys, authorization codes, APKs, and signing credentials out of source commits. Commit public configuration, safe `.env.example` placeholders, migrations, and function source.

Adding `.env` to `.gitignore` does not untrack an already committed file. If the root `.env` is still tracked, remove only its Git tracking with `git rm --cached -- .env` and commit that removal; the local file remains. Rotate any private credentials that were actually exposed in repository history.

## Validation Checklist

Run from the project root:

```sh
npm run typecheck
npm run check:dependencies
```

These checks do not replace native builds or real-device testing. Rehearse on the actual presentation phone and a fresh preview APK, not only inside Metro.

- [ ] A fresh launch follows the expected login flow; record screens cannot bypass authentication.
- [ ] Signup, email-code verification, resend, login, and logout work for an external test account.
- [ ] Both modes use the same screens and clearly identify the record source.
- [ ] All bundled sample sections load without Express or local PostgreSQL.
- [ ] Sample appointments/messages persist for the same user on one installation without appearing in another user's local data.
- [ ] Local-only data is not described as cross-device cloud synchronization.
- [ ] Reminder permission, a test notification, dose tracking, and logout/account transitions behave correctly.
- [ ] Ask EZ works with microphone permission, denial, typed commands, reading, and Stop Reading.
- [ ] Voice settings and supported readout windows behave as expected.
- [ ] Accessibility routes, including Voice Settings, have appropriate signed-out behavior and are tested after merges.
- [ ] Profile displays the selected fictional/sandbox patient's demographics and vitals.
- [ ] Lab status colors include meaningful text labels; source warnings remain visible.
- [ ] Share requires selection, preview, and confirmation before opening another app.
- [ ] API Mode reports permission, connection, empty-result, and unsupported-feature states honestly.
- [ ] The release APK runs without Metro and is tested on the teammate's Android phone.
- [ ] No real medical information or private service credentials are included in the demo.

## Key Files

| Path | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | Auth-aware navigation and reminder-notification lifecycle |
| `src/screens/LoginScreen.tsx`, `SignUpScreen.tsx`, `VerifyEmailScreen.tsx` | Account and email-code flow |
| `src/screens/WelcomeScreen.tsx` | Sample/API selector after login |
| `src/screens/HomeScreen.tsx` | Services, Profile, Epic connection, Help, and Ask EZ entry points |
| `src/config/publicConfig.ts` | Shared public Supabase configuration |
| `src/services/supabase.ts` | Supabase Auth client and session configuration |
| `src/services/healthcare.ts` | Shared record loading and local sample edits |
| `src/services/accountStorage.ts` | Account/mode-scoped local storage |
| `src/data/sample.ts` | Bundled fictional FHIR-shaped resources |
| `src/data/fhir.ts` | Mobile bridge to shared FHIR parsing |
| `src/services/epicConnection.ts` | Hosted authorization and mobile return handling |
| `src/services/reminders.ts` | Local reminder storage, dose logs, and notification scheduling |
| `src/components/AskEzPanel.tsx` | Microphone/typed-command interface |
| `src/services/voiceCommands.ts` | Phrase matching and supported commands |
| `src/services/voiceSettings.ts`, `screenSummary.ts`, `recordReadout.ts` | Voice preferences and screen summaries/readouts |
| `supabase/functions/healthcare/index.ts` | Hosted Epic authorization and FHIR requests |
| `supabase/functions/_shared/fhir.ts` | Shared FHIR normalization and validation |
| `supabase/migrations/202611210001_epic_hosting.sql` | Restricted hosted authorization storage |
| `supabase/config.toml` | Function gateway configuration |
| `eas.json` | Standalone preview APK build profile |

## Official References

- [Node.js downloads](https://nodejs.org/en/download)
- [Android Studio](https://developer.android.com/studio)
- [Expo Android setup](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Expo development builds and native rebuilds](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo APK builds and installation](https://docs.expo.dev/build-reference/apk/)
- [Android emulator networking](https://developer.android.com/studio/run/emulator-networking)
- [Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Free-tier email-template restrictions](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)
- [Supabase function deployment](https://supabase.com/docs/guides/functions/deploy)
- [Epic on FHIR](https://fhir.epic.com/)