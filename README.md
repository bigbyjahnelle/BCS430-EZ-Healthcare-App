# EZ Healthcare

EZ Healthcare is a senior-project mobile prototype designed to make healthcare information easier to navigate for older adults and people with disabilities. The interface emphasizes clear labels, large controls, and straightforward navigation.

This is a development prototype, not a production healthcare application. Use fictional local records and Epic sandbox accounts only.

## Current Functionality

The Welcome screen lets you choose **Sample Data Mode** or **API Mode**. Both choices open the same Home screen and use the same record-screen layouts.

| Feature | Sample Data Mode | API Mode |
| --- | --- | --- |
| Medication Records | Fictional medication orders from PostgreSQL | Authorized Epic sandbox medication orders |
| My Providers | Fictional prescribing providers from PostgreSQL | Providers referenced by retrieved medication orders; details depend on access |
| My Health / My Vitals | Fictional vital signs from PostgreSQL | Epic vital-sign lookup; may return errors or no results |
| Messages, Test Results, Insurance, Share | Not implemented in this update | Not implemented in this update |

The appointment feature is being developed separately. The Home button in the source used for this update is still a placeholder. Check for newer team changes before replacing files.

Ask EZ voice functionality, medication reminders, and EZ Healthcare account authentication remain separate work items. The existing login/signup screens do not yet provide working account authentication.

API Mode never substitutes sample records when an Epic request fails. Completed medication orders retain their status and are not presented as active prescriptions.

## Architecture

| Component | Purpose |
| --- | --- |
| React Native, Expo, TypeScript, Expo Router | Mobile screens and navigation |
| Android Studio emulator | Local virtual Android device |
| Node.js and Express | Local API, Epic authorization, and data requests |
| PostgreSQL | Local application tables and fictional sample fixtures |
| Epic FHIR sandbox | Authorized synthetic healthcare records |

The mobile app calls Express; it does not connect directly to PostgreSQL.

The current Epic medication/provider snapshot and mobile sessions are stored in backend memory, not automatically persisted to PostgreSQL. Vitals are requested through their own backend route.

## Requirements

- The team's current GitHub branch, including matching lockfiles.
- Node.js 24 LTS and npm.
- PostgreSQL running locally.
- Android Studio, Android SDK tools, an emulator, and a compatible Java Development Kit.
- An editor such as IntelliJ IDEA or VS Code.
- The team's non-production Epic app configuration for backend startup.

The main tested workflow is a local Android development build on macOS. Windows instructions are included but should be rehearsed on the target machine. iOS setup is not covered by this guide.

**Use the EZ Healthcare development build, not Expo Go, for the custom Epic return link.**

## 1. Get the Project

Clone the repository using its GitHub URL, or download and extract the team's branch ZIP. Open the project folder in your editor.

The **project root** contains:

- `package.json`
- `src`
- `backend`
- `database`

In IntelliJ, open **View → Tool Windows → Terminal**.

Commands below assume you are in the specified folder. Do not run Expo from `backend`.

Never replace an entire source folder with a partial update ZIP. Copy changed files to their matching paths and preserve teammates' work.

## 2. Install Dependencies

Install Node.js from [Node.js downloads](https://nodejs.org/en/download).

Reopen your terminal, then check:

```sh
node --version
npm --version
```

From the project root, run these commands one at a time:

```sh
npm ci
cd backend
npm ci
cd ..
```

This installs frontend and backend dependencies separately.

Keep the committed dependency versions. If `npm ci` reports mismatched or missing lockfiles, ask the developer for matching package files rather than upgrading packages.

Do not run `npm audit fix --force` as a setup step.

## 3. Install and Start PostgreSQL

### macOS

Install [Postgres.app](https://postgresapp.com/documentation/install.html) in Applications, launch it, and initialize/start a local server.

Add its command-line tools to your shell PATH using the linked instructions. Reopen your terminal and check:

```sh
psql --version
whoami
```

With the usual Postgres.app setup, the database username matches your Mac short account name. Use your actual database account if configured differently.

### Windows

Install PostgreSQL through [the official Windows download page](https://www.postgresql.org/download/windows/), including the server and command-line tools.

Save the password you choose for the `postgres` account.

Add your installed PostgreSQL `bin` directory to your user PATH, restart the terminal, and verify:

```sh
psql --version
```

Confirm the PostgreSQL service is running in Windows Services.

Use your actual installation folder and version, not another teammate's path.

### Create and Seed the Database

From the project root, on macOS with the default local account:

```sh
createdb ez_healthcare_demo
psql -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/setup.sql
psql -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/seed-sample-mode.sql
```

On Windows using the `postgres` account:

```sh
createdb -h localhost -p 5432 -U postgres -W ez_healthcare_demo
psql -h localhost -p 5432 -U postgres -W -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/setup.sql
psql -h localhost -p 5432 -U postgres -W -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/seed-sample-mode.sql
```

Enter the database password when prompted.

If the database already exists, skip `createdb`.

If the original setup was already completed, do not repeat it just to install Sample Data Mode. Run only the new seed script.

| SQL File | Purpose |
| --- | --- |
| `database/setup.sql` | Original local user, accessibility, medication, and appointment tables |
| `database/seed-sample-mode.sql` | Fictional medication, provider, and vital-sign payloads for the shared screens |
| `database/seed-demo.sql` | Older standalone demo; not needed by the new modes |

The new seed script should print `COMMIT` and three section rows:

- `medications`
- `providers`
- `vitals`

It creates `ez_sample_payloads` and updates its three fictional fixtures when rerun. It does not replace the original application tables.

Do not put real patient data into the sample table.

## 4. Configure the Backend

Create `backend/.env`.

The filename must be exactly `.env`, not `backend.env` or `.env.txt`.

```dotenv
PORT=3001
PGHOST=localhost
PGPORT=5432
PGDATABASE=ez_healthcare_demo
PGUSER=YOUR_LOCAL_DATABASE_USERNAME

# Add this if your database requires a password:
# PGPASSWORD="YOUR_LOCAL_DATABASE_PASSWORD"

EPIC_CLIENT_ID=YOUR_TEAM_NON_PRODUCTION_CLIENT_ID
EPIC_REDIRECT_URI=http://localhost:3001/api/epic/callback
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

Replace the username and client ID placeholders.

Windows installer setups commonly use `postgres` as the database username.

Obtain the team's registered non-production client ID from the project developer. Do not create a new registration unnecessarily.

Keep the callback and sandbox URLs exactly as shown: the current backend validates them. Do not change the callback to the Android emulator address.

**Even Sample Data Mode currently requires the Epic settings to be present**, because the backend imports the Epic router at startup. Sample requests themselves do not sign in or contact Epic.

Keep `.env` and `node_modules` out of Git. Do not commit passwords, tokens, session cookies, or authorization codes. Keep credentials out of frontend code.

## 5. Set Up the Android Emulator

Install [Android Studio](https://developer.android.com/studio).

Follow [Expo's Android environment guide](https://docs.expo.dev/workflow/android-studio-emulator/) for your operating system, including its JDK and SDK prerequisites.

The guide specifies JDK 17. Avoid using an incompatible newer JDK for the project's Gradle build.

In Android Studio:

1. Complete the setup wizard and SDK downloads.
2. Open SDK Manager and note the Android SDK Location.
3. Install Android SDK Platform-Tools and Android Emulator, plus the SDK/build tools required by the project build.
4. Open Device Manager.
5. Create a Pixel virtual device with a compatible stable system image.
6. Start the device.
7. Wait until the Android home screen appears.

Configure `ANDROID_HOME` and add the SDK's `platform-tools` and `emulator` folders to PATH using the environment guide.

On macOS, the usual SDK location is:

```text
$HOME/Library/Android/sdk
```

On Windows, use the actual path from SDK Manager. Do not copy a teammate's username into it.

Verify in a newly opened terminal:

```sh
java -version
adb --version
adb devices
```

The emulator should appear with status `device`.

## 6. Build the Development App Once

If the current EZ Healthcare development build is already installed, skip this section.

With the emulator running, from the project root:

```sh
npx expo run:android
```

This builds and installs the native app. The first build can take time to download dependencies.

See [Expo's development-build guide](https://docs.expo.dev/develop/development-builds/introduction/) for background.

The project already includes `expo-dev-client` and its custom `ezhealthcare` scheme. Do not create another Expo project.

JavaScript/TypeScript screen changes normally need a reload, not another native build. Native dependency or configuration changes may require rebuilding.

## 7. Start the Application Each Session

Keep PostgreSQL, the emulator, the backend, and Expo running.

Use separate terminal tabs.

### Terminal 1: Backend

From the project root:

```sh
cd backend
npm run dev
```

If already in `backend`, run only:

```sh
npm run dev
```

Wait for the PostgreSQL connection and backend startup messages. Keep this terminal open.

In your computer browser, open:

[http://localhost:3001/api/health](http://localhost:3001/api/health)

Expect:

```json
{
  "status": "ok",
  "message": "EZ Healthcare backend is running!",
  "database": "connected"
}
```

This checks the server/database connection, not whether sample tables exist or Epic authorization works.

### Terminal 2: Emulator Port Forwarding

With the emulator running:

```sh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
```

Repeat after restarting the emulator if necessary.

- Port `8081` is Expo.
- Port `3001` is the backend.
- Forwarding `3001` supports the registered localhost callback in the emulator browser.

### Terminal 3: Expo

From the project root:

```sh
npx expo start --dev-client --localhost
```

Press **a** in this terminal to open Android.

Confirm the terminal says it is using a development build. Keep it running.

The first native-build command may already have started Expo. Stop that instance before starting another.

Keep one Expo server on `8081` and one backend on `3001`.

## 8. Use Sample Data Mode

1. On Welcome, select **Sample Data Mode**.
2. Tap **Continue**.
3. Tap **Medications** to retrieve Taylor Sample's fictional medication orders.
4. Return Home and open **My Providers** to view fictional provider names.
5. Open **My Health** to view fictional vital readings.

No Epic login is needed.

Once dependencies and builds are installed, this mode does not need Epic internet access, but it still needs the local Express server and PostgreSQL.

Records are clearly labeled as fictional. The screens are the same screens used by API Mode, not a separate demo layout.

## 9. Use API Mode

1. On Welcome, select **API Mode**.
2. Tap **Continue**.
3. Open **Medications → Connect to Epic**.
4. Complete the Epic sandbox login and consent screens in the emulator's browser session.
5. Approve access and use the return-to-app action if displayed.
6. After returning to EZ Healthcare, verify the patient, medication source, retrieval time, and order status.
7. Open **My Providers** and **My Health** to request their API-backed information using the current mobile connection.

Use the team's verified synthetic test account, not a personal patient account.

The previously used test username is `fhirderrick` and the password is 'epicepic1'.

Authorization temporarily uses the browser. The return link brings the user back to the app.

The normal mobile flow no longer requires manually copying a pairing code. The backend still uses a temporary code internally to complete the mobile handoff.

Epic login authorizes access to sandbox data; it is not a complete EZ Healthcare account-login implementation.

### API Limitations Observed During Development

- Medication retrieval has worked with the synthetic test account.
- Practitioner-detail requests have returned HTTP 403. A linked provider may therefore show only a generic display name such as “Physician.”
- Vital-sign requests have timed out. A timeout does not prove that no vital data exists.
- Epic's login page has sometimes remained white inside emulator Chrome while loading on the host computer. The cause has not been established.

Sample mode is an explicit user choice, never an automatic fallback for these failures.

## 10. Switch Modes

Tap the mode indicator / **Change** on Home to return to Welcome. Select a mode and tap **Continue**.

Selecting a mode clears the app's in-memory mobile token and remounts navigation to prevent previously displayed data from carrying over.

API Mode requires a new connection after switching. Mode selection is not permanently stored.

This local reset is not production token revocation and does not necessarily clear Epic browser cookies.

Backend restarts also clear in-memory authorization, session, and snapshot state. Avoid editing backend files while demonstrating an active API session: the development watcher may restart it.

The old `/demo` route now opens Welcome. `src/app/demo.tsx` being a one-line re-export is intentional.

The unused `ModeChoices.tsx` and old seed file are not required for the current flow.

## 11. Troubleshooting

### “Sample Data Is Unavailable”

From the project root, run:

```sh
psql -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/seed-sample-mode.sql
```

Use your PostgreSQL username/host options if required.

Check this endpoint in the host browser:

[http://localhost:3001/api/sample/medications](http://localhost:3001/api/sample/medications)

Then tap **Try Again** in the app.

If it still fails, inspect the backend line starting:

```text
Sample data lookup failed:
```

Confirm the seed command and `.env` point to the same database and server.

### “localhost Refused to Connect” or Connection to 10.0.2.2:3001 Failed

Verify the backend terminal is running and the health endpoint works on the host computer.

Then open this address in emulator Chrome:

```text
http://10.0.2.2:3001/api/health
```

The mobile code uses `10.0.2.2` to reach the host.

The Epic callback uses localhost through port forwarding.

Keep these addresses distinct. Do not change the registered callback casually.

### Port 3001 or 8081 Already in Use

Find the terminal already running that service and reuse it, or stop it with **Ctrl+C** before restarting.

Do not launch Expo inside `backend`, and do not switch ports just to hide the conflict.

### Development Build Launcher or White App Screen

Ensure Expo is running from the root with:

```sh
npx expo start --dev-client --localhost
```

Set the `8081` port forwarding and press **a**.

Check the Expo terminal for the first error, including its filename and line number. A syntax error is not solved by changing the network.

If necessary, stop Expo and restart with:

```sh
npx expo start --dev-client --localhost --clear
```

### White Epic Login Page Only in Emulator Chrome

First distinguish this from an app-loading failure.

1. Confirm local health works inside the emulator.
2. Confirm the browser has navigated to Epic.
3. Compare the page on the host browser.
4. Inspect emulator Chrome through the host Chrome page:

```text
chrome://inspect/#devices
```

Report the first relevant network or console error, excluding tokens and authorization URLs.

Do not assume the campus network is blocking the emulator without diagnostic evidence.

Sample Mode can still be tested separately.

### Android SDK Location Not Found

Use the SDK Location shown by Android Studio.

Configure `ANDROID_HOME`, or set `sdk.dir` in `android/local.properties` to the actual local SDK path.

Keep this machine-specific file out of Git.

### Unsupported Java Class-File Version

Check:

```sh
java -version
```

Run this in the same terminal doing the build.

Use the compatible JDK configured for this project rather than whichever newer JDK your shell happens to select. See the Android setup guide above.

### Epic 401, 403, or Timeout

- **401:** Reconnect through Medications. The connection may have expired or the backend restarted.
- **403:** Inspect granted permissions and the selected Epic API. An authorization failure is not proof that data is absent.
- **Timeout:** Inspect the request and logs, then retry later. Do not label it “no records.”

### “Cannot Find Module mobileDemo.js”

Confirm this file exists:

```text
backend/src/mobileDemo.ts
```

The `.js` suffix in this project's TypeScript imports is intentional.

Start with:

```sh
npm run dev
```

Do not rename imports to `.ts.js`.

### IntelliJ Warnings

**“No data sources are configured”** is an editor SQL-tool warning. Use the documented `psql` command.

**“Throw of exception caught locally”** describes the deliberate try/catch error-handling pattern and is not itself a compilation failure.

### Windows PowerShell Blocks npm.ps1

Use Command Prompt, or invoke `npm.cmd` and `npx.cmd` from PowerShell.

## 12. Validation Checklist

From the project root:

```sh
npm run typecheck
```

- [ ] Backend health reports database connected.
- [ ] Welcome opens and both mode options are selectable.
- [ ] All three sample screens load without Epic sign-in.
- [ ] Mode switching removes the previous source's displayed records.
- [ ] API Mode opens the existing Epic authorization flow.
- [ ] Medication source, patient, dates, and statuses are displayed correctly.
- [ ] API errors do not display sample records as if retrieved from Epic.
- [ ] Existing accessibility and navigation behavior is rehearsed on the emulator.

The mode update passed frontend TypeScript checks and sample-route tests with a mocked database. Sample Data Mode was also confirmed working in local development.

These checks do not constitute complete integration, accessibility, or production-readiness testing.

## Key Files

| Path | Purpose |
| --- | --- |
| `src/app/index.tsx`, `src/app/welcome.tsx` | Welcome routes |
| `src/screens/WelcomeScreen.tsx` | Mode-selection interface |
| `src/services/dataMode.ts` | Selected mode, session reset, and change notifications |
| `src/app/home.tsx`, `src/screens/HomeScreen.tsx` | Shared Home screen |
| `src/screens/MedicationsScreen.tsx` | Shared medications screen and Epic mobile connection |
| `src/app/my-providers.tsx`, `src/app/my-health.tsx` | Shared provider/vital screens |
| `backend/src/server.ts` | Express startup and route registration |
| `backend/src/sampleData.ts` | Fictional PostgreSQL-backed endpoints |
| `backend/src/epic.ts`, `backend/src/nativeAuth.ts` | Epic authorization and mobile handoff |
| `backend/src/mobileDemo.ts`, `backend/src/vitals.ts` | Epic-backed record handling |
| `database/seed-sample-mode.sql` | Fictional fixtures for Sample Data Mode |

## Remaining Work

- Build Messages, Test Results, Insurance, and Share.
- Integrate team appointment and medication-reminder work.
- Continue voice navigation development.
- Implement EZ Healthcare account authentication.
- Continue accessibility, device, and integration testing.

For new record features, use shared screens with separate sample and API sources.

Verify supported Epic endpoints and permissions before promising live integration. Unsupported features must be labeled honestly rather than simulated in API Mode.
