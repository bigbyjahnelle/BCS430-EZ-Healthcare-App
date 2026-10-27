# EZ Healthcare — Local Setup and Run Guide

EZ Healthcare is an accessibility-focused mobile application intended for older adults and individuals with disabilities.

The project uses React Native, Expo, TypeScript, a Node.js/Express backend, PostgreSQL, and Epic’s FHIR sandbox.

This guide explains how to install the required software and run the application locally using an Android Studio emulator.

All healthcare records used in the current Epic integration are synthetic sandbox data. Do not use real patient accounts or medical information.

## Current Project Status

The application is under development. Some screens and controls remain placeholders.

The current medication connection supports:

1. Opening Medications in EZ Healthcare.
2. Selecting Connect to Epic.
3. Signing into Epic’s sandbox through the emulator’s browser.
4. Approving access to the requested information.
5. Selecting Return to EZ Healthcare.
6. Viewing the synthetic patient’s medication records.

Users no longer need to copy or manually enter a pairing code. The backend handles the temporary connection exchange behind the scenes.

This is a local prototype, not a production healthcare deployment.

The updated workflow has been tested during development on macOS. Windows instructions are included but should be verified on each teammate’s computer.

## Contents

1. [Understand the components](#1-understand-the-components)
2. [Install Node.js and an editor](#2-install-nodejs-and-an-editor)
3. [Download and open the project](#3-download-and-open-the-project)
4. [Install project dependencies](#4-install-project-dependencies)
5. [Install PostgreSQL](#5-install-postgresql)
6. [Create the database](#6-create-the-database)
7. [Configure the backend](#7-configure-the-backend)
8. [Install Android Studio and configure the SDK](#8-install-android-studio-and-configure-the-sdk)
9. [Install and select Java 17](#9-install-and-select-java-17)
10. [Build and start the application](#10-build-and-start-the-application)
11. [Connect to Epic](#11-connect-to-epic)
12. [Regular startup after initial setup](#12-regular-startup-after-initial-setup)
13. [Troubleshooting](#13-troubleshooting)
14. [Development and Git guidelines](#14-development-and-git-guidelines)
15. [Reference links](#15-reference-links)

## 1. Understand the Components

| Component | Purpose |
| --- | --- |
| React Native and Expo | Run the mobile interface |
| Expo development build | Provides the installed EZ Healthcare app and its return-to-app URL scheme |
| Android Studio emulator | Runs a virtual Android phone |
| Node.js and Express | Handle Epic authorization, data retrieval, and mobile connection requests |
| PostgreSQL | Stores local sample application data |
| Epic FHIR sandbox | Supplies synthetic patient and medication records |

Keep PostgreSQL, the backend, Expo’s development server, and the emulator running while using the application.

Internet access is required for Epic authorization and data retrieval.

### Data storage

The PostgreSQL database contains seeded application records, including a sample user, accessibility settings, medication, and appointment.

The current Epic medication snapshot is stored separately in backend memory. It is not automatically saved into PostgreSQL.

Restarting the backend clears its temporary Epic sessions, pending mobile sign-ins, and medication snapshots.

### Supported local setup

These instructions assume the backend and Android emulator run on the same computer.

A physical phone requires additional networking and callback configuration. Scanning an Expo QR code with a phone is not sufficient for this setup.

### Terminal basics

- The project root contains `package.json`, `backend`, `database`, and `src`.
- The backend has its own `package.json` and dependency installation.
- `cd backend` moves from the project root into the backend folder.
- `cd ..` moves up one folder.
- Run each command from the folder specified.
- Do not copy terminal prompts or Markdown fence markers.
- A running server occupies its terminal. Use another terminal tab for other commands.

IntelliJ’s terminal is available through:

**View → Tool Windows → Terminal**

IntelliJ is optional. The same commands can run in a normal terminal.

## 2. Install Node.js and an Editor

### Node.js

1. Open https://nodejs.org/en/download.
2. Install Node.js 24 LTS, matching the major version used during development.
3. Select the installer for your operating system and processor.
4. Keep npm and the installer’s PATH configuration enabled.
5. Restart your terminal and editor after installation.

Verify:

```sh
node --version
npm --version
```

Node should print a version beginning with `v24.`.

### Editor

The team uses IntelliJ IDEA:

https://www.jetbrains.com/idea/download/

An existing editor and system terminal also work.

You do not need to purchase a database editor or configure IntelliJ’s database tools to run the SQL setup script.

### Expo

Expo dependencies are installed from this repository.

Do not create a new Expo project or install the deprecated global `expo-cli`.

The Epic return-to-app workflow uses an EZ Healthcare development build, not Expo Go.

## 3. Download and Open the Project

1. Obtain the repository link and current development branch from the team.
2. Sign into GitHub and accept any required repository invitation.
3. Select the correct branch.
4. Clone the repository using your normal Git workflow, or choose **Code → Download ZIP**.
5. If downloading a ZIP, extract it before opening the project.
6. Open the extracted or cloned project folder in your editor.

Open the project root, not only the `backend` folder.

### Check your current folder

macOS:

```sh
pwd
ls
```

Windows Command Prompt:

```bat
cd
dir
```

The folder listing should contain:

```text
package.json
package-lock.json
backend
database
src
```

### Required source files

Confirm the current branch includes:

```text
app.json
package.json
package-lock.json
database/setup.sql
backend/package.json
backend/package-lock.json
backend/src/server.ts
backend/src/epic.ts
backend/src/mobileDemo.ts
backend/src/nativeAuth.ts
src/screens/HomeScreen.tsx
src/screens/MedicationsScreen.tsx
src/app/medications.tsx
assets/images/ez-logo.png
```

If required files are missing, obtain the latest project changes before continuing.

## 4. Install Project Dependencies

From the project root:

```sh
npm ci
```

Then install backend dependencies:

```sh
cd backend
npm ci
cd ..
```

Wait for each installation to finish.

The current frontend dependency files should include `expo-dev-client` and `expo-web-browser`.

If those packages are missing, ask the developer to confirm that the current dependency files have been committed. When intentionally adding them during development, use:

```sh
npx expo install expo-dev-client expo-web-browser
```

Do not upgrade the Expo SDK or run `npm audit fix --force` as a setup workaround.

If `npm ci` reports mismatched package and lockfiles, resolve that mismatch with the developer.

### Windows terminal note

These Windows instructions use Command Prompt.

If PowerShell blocks `npm.ps1`, enter:

```bat
cmd
```

Then run the npm commands there. Alternatively, use `npm.cmd` and `npx.cmd` from PowerShell.

## 5. Install PostgreSQL

Use one PostgreSQL installation. Do not install a second server if you already have a working one.

### macOS: Postgres.app

1. Download Postgres.app from https://postgresapp.com/.
2. Move the application into Applications.
3. Open it.
4. Select Initialize for a new server, or start an existing server.
5. Confirm the server is running on port 5432.

To make its command-line tools available, run:

```sh
sudo mkdir -p /etc/paths.d
```

```sh
echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
```

If prompted, enter your Mac account password. Password characters will not appear.

Restart your terminal and editor, then verify:

```sh
psql --version
```

Find your Mac short account name:

```sh
whoami
```

With the default Postgres.app setup, this is normally your database username.

If your installation requires a database password, use its configured password.

### Windows: PostgreSQL installer

1. Open https://www.postgresql.org/download/windows/.
2. Follow the EDB installer link.
3. Choose a supported stable release, such as PostgreSQL 18.
4. Install PostgreSQL Server and Command Line Tools.
5. Keep port 5432 unless your existing setup uses another port.
6. Save the password you choose for the `postgres` account privately.
7. Complete installation. Additional Stack Builder packages are unnecessary for this workflow.

Add PostgreSQL’s `bin` folder to your user Path.

For a default PostgreSQL 18 installation:

```text
C:\Program Files\PostgreSQL\18\bin
```

Use your actual installation folder if different.

To edit Path:

1. Search Windows for **Edit environment variables for your account**.
2. Select **Path → Edit → New**.
3. Add the PostgreSQL `bin` path.
4. Preserve all existing entries.
5. Save and restart your editor and terminal.

Verify:

```bat
psql --version
```

Open Windows Services and confirm the PostgreSQL service is running.

The default database account for this installer is usually `postgres`, not your Windows account name.

## 6. Create the Database

PostgreSQL must be running.

Run the following from the project root.

### macOS with default Postgres.app credentials

```sh
createdb ez_healthcare_demo
```

```sh
psql -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/setup.sql
```

### Windows with the postgres account

```bat
createdb -h localhost -p 5432 -U postgres -W ez_healthcare_demo
```

```bat
psql -h localhost -p 5432 -U postgres -W -d ez_healthcare_demo -v ON_ERROR_STOP=1 -f database/setup.sql
```

Enter your database password when prompted.

### Expected result

The setup script should complete without an error and display table creation, insert, and transaction messages.

The seeded records include:

- A synthetic application user: Matt Demo.
- The sample email `matt@example.test`.
- Accessibility settings.
- Sample Medication A.
- An appointment with Dr. Demo.

These are sample records, not computer-specific configuration or real patient information.

If the database already exists, skip `createdb`. Do not delete the database to remove that message.

Database creation is a first-time setup task, not a regular startup step.

Each teammate needs a local database. Git does not copy another teammate’s running database.

## 7. Configure the Backend

Create a file named exactly `.env` inside `backend`.

Its path must be:

```text
backend/.env
```

Do not name it `backend.env` or `.env.txt`.

### macOS example

```dotenv
PORT=3001
PGHOST=localhost
PGPORT=5432
PGDATABASE=ez_healthcare_demo
PGUSER=YOUR_MAC_SHORT_USERNAME

EPIC_CLIENT_ID=0dfd33ec-b7df-4954-a807-5975bbddbac3
EPIC_REDIRECT_URI=http://localhost:3001/api/epic/callback
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

Replace `YOUR_MAC_SHORT_USERNAME` with your actual database username. For default Postgres.app installations, check `whoami`.

If needed, add:

```dotenv
PGPASSWORD="YOUR_DATABASE_PASSWORD"
```

### Windows example

```dotenv
PORT=3001
PGHOST=localhost
PGPORT=5432
PGDATABASE=ez_healthcare_demo
PGUSER=postgres
PGPASSWORD="YOUR_DATABASE_PASSWORD"

EPIC_CLIENT_ID=0dfd33ec-b7df-4954-a807-5975bbddbac3
EPIC_REDIRECT_URI=http://localhost:3001/api/epic/callback
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

Replace the password placeholder with your actual local PostgreSQL password.

### Important configuration notes

- URLs in `.env` must be plain URLs, not Markdown links.
- Retain the exact callback URL shown above for this implementation.
- Do not replace the callback’s `localhost` with `10.0.2.2`.
- The client ID identifies the team’s non-production Epic registration. It is not an access token.
- Teammates using the same registration do not need separate Epic app registrations.
- If the team replaces its Epic registration, obtain the updated non-production client ID.
- Keep `.env` out of Git.
- Never put database passwords or Epic access tokens into frontend code.

## 8. Install Android Studio and Configure the SDK

### Install Android Studio

1. Download Android Studio from https://developer.android.com/studio.
2. Select the version matching your operating system and processor.
3. Complete the standard setup wizard.
4. Accept the required SDK licenses.
5. Allow the SDK downloads to finish.

Open SDK Manager from the welcome screen’s More Actions menu or Android Studio’s settings.

Record the Android SDK Location.

Ensure the Android Emulator and Android SDK Platform-Tools are installed. Install any additional SDK platforms, build tools, or native build components requested by the project’s build.

Do not create a separate Android project.

### macOS environment variables

For the default SDK location, run these commands in the terminal you will use:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

If your SDK is elsewhere, substitute its actual path.

For future terminal sessions, add these lines once to your shell configuration, normally `~/.zshrc`, then restart the terminal.

### Windows environment variables

Open **Edit environment variables for your account**.

Create:

```text
ANDROID_HOME
```

Set it to the SDK location shown in Android Studio. The usual location is:

```text
C:\Users\YOUR_WINDOWS_USERNAME\AppData\Local\Android\Sdk
```

Add these entries to your user Path:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

Keep existing Path entries. Save and restart your editor and terminal.

### Verify Android tools

```sh
adb --version
```

### Configure android/local.properties

If the `android` folder already exists, open or create:

```text
android/local.properties
```

Set `sdk.dir` to your actual Android SDK location.

macOS example:

```properties
sdk.dir=/Users/YOUR_MAC_USERNAME/Library/Android/sdk
```

Windows example using forward slashes:

```properties
sdk.dir=C:/Users/YOUR_WINDOWS_USERNAME/AppData/Local/Android/Sdk
```

If the `android` folder has not been generated yet, configure `ANDROID_HOME` before the first build. The build process generates the native project.

Do not commit `android/local.properties`. It contains a machine-specific path.

### Create and start the emulator

1. Open Android Studio.
2. Select **More Actions → Virtual Device Manager**, or **Tools → Device Manager**.
3. Choose Create Virtual Device.
4. Select a Pixel phone profile.
5. Download a stable Android image supported by the project.
6. Select the appropriate architecture: typically ARM64 for Apple Silicon or x86_64 for Intel/AMD.
7. Finish creating the device.
8. Press its Play button.
9. Wait for Android’s home screen and unlock the device.

Verify:

```sh
adb devices
```

The emulator should appear with status `device`.

## 9. Install and Select Java 17

Building the Android development app requires a compatible Java installation.

The working local setup uses JDK 17. Newer Java versions should not automatically be selected for this project.

Download Temurin JDK 17 from:

https://adoptium.net/temurin/releases/?version=17

Choose JDK, version 17, and the operating system and architecture matching your computer.

### macOS

Install the `.pkg`, then list installed Java versions:

```sh
/usr/libexec/java_home -V
```

Select Java 17 in your build terminal:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Confirm the output reports Java 17.

These settings apply to the current terminal. To use them in future sessions, add the export lines once to your shell configuration or repeat them before building.

### Windows

Install Temurin JDK 17.

Set your user `JAVA_HOME` variable to its installation directory, not the `bin` subfolder.

An example structure is:

```text
C:\Program Files\Eclipse Adoptium\YOUR_JDK_17_FOLDER
```

Replace that placeholder with the actual installed directory.

Add this entry to your user Path:

```text
%JAVA_HOME%\bin
```

Make sure an older Java Path entry is not taking precedence. Restart the terminal.

Verify:

```bat
java -version
```

The output should report Java 17.

## 10. Build and Start the Application

Use separate terminal tabs for the backend and frontend.

### A. Start PostgreSQL

macOS: open Postgres.app and start its server.

Windows: confirm the PostgreSQL service is running.

### B. Start the backend

From the project root:

```sh
cd backend
npm run dev
```

Expected messages include:

```text
Connected to PostgreSQL!
EZ Healthcare backend: http://localhost:3001
Epic sandbox sign-in: http://localhost:3001/api/epic/login
```

Leave this terminal running.

Only one backend should use port 3001.

### C. Forward the emulator’s localhost port

In another terminal:

```sh
adb reverse tcp:3001 tcp:3001
```

This forwards connections from the Android device’s port 3001 to your computer’s port 3001.

The forwarding is necessary because the Epic callback uses:

```text
http://localhost:3001/api/epic/callback
```

Repeat the forwarding command after restarting or reconnecting the emulator.

If multiple Android devices are connected, use `adb devices` and select the intended emulator:

```sh
adb -s YOUR_EMULATOR_SERIAL reverse tcp:3001 tcp:3001
```

Replace `YOUR_EMULATOR_SERIAL` with the actual serial.

### D. Check connectivity

Open Chrome inside the emulator and visit:

```text
http://localhost:3001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "EZ Healthcare backend is running!",
  "database": "connected"
}
```

Do not proceed with Epic login until this works.

### E. Build the development app

In a terminal at the project root, with Java 17 selected:

```sh
npx expo run:android
```

This builds and installs EZ Healthcare in the emulator.

The first build can take longer because Gradle downloads dependencies and native build components.

Wait for `BUILD SUCCESSFUL` and the app to open.

If the build asks for an Android application identifier, use the team’s established identifier. Do not choose a different identifier for an existing project.

The existing local build was observed using `com.anonymous.ezhealthcare`; check the current app/native configuration before relying on a package name.

### F. Start Expo for an already installed development build

On later runs, a full native rebuild is normally unnecessary for TypeScript-only changes.

From the project root:

```sh
npx expo start --dev-client
```

Press `a` in that terminal to open Android.

Use the installed EZ Healthcare development app, not Expo Go.

Rebuild when native dependencies or native configuration change.

### Address reference

| Purpose | Address |
| --- | --- |
| Backend from the computer | `http://localhost:3001` |
| Backend API from Android application code | `http://10.0.2.2:3001` |
| Backend from emulator browser with port forwarding | `http://localhost:3001` |
| Epic callback | `http://localhost:3001/api/epic/callback` |
| Return link into EZ Healthcare | `ezhealthcare://medications` |

The Epic callback and the return-to-app link are different steps.

Epic returns to the backend callback first. The backend completes authorization and prepares the data, then displays a link back to the mobile app.

## 11. Connect to Epic

Keep PostgreSQL, the backend, Expo, and the emulator running.

1. Open EZ Healthcare in the emulator.
2. Navigate to the home screen using the current prototype navigation.
3. Select Medications.
4. Select Connect to Epic.
5. The emulator opens Epic’s sandbox authorization page.

Use the public synthetic test account used during development:

```text
Username: fhirderrick
Password: epicepic1
```

6. Complete the sharing and consent prompts.
7. Select Allow Access.
8. Look for the local confirmation page stating that the Epic connection succeeded.
9. Select Return to EZ Healthcare within one minute.
10. The app should open and load the medication record.

Do not use your personal Epic developer credentials or a real MyChart patient account for this sandbox patient login.

If the shared test account becomes unavailable, ask the developer to confirm an available Epic sandbox account.

### EZ Healthcare login versus Epic authorization

The application’s own Login and Sign Up screens are separate prototype features. They do not become working account authentication simply because Epic authorization works.

Epic’s test credentials belong only on Epic’s authorization page.

If the application’s own placeholder login prevents reaching Home, ask the team for the current prototype navigation. Do not assume that entering Epic credentials there will work.

### How the mobile connection works

- The mobile app creates a temporary sign-in attempt with the backend.
- The app opens Epic’s authorization flow in a browser session.
- The backend validates OAuth state and exchanges the authorization code using PKCE.
- The backend retrieves the authorized patient and medication data.
- The confirmation page provides a return-to-app link.
- The app uses its temporary secret to collect the connection result.
- The existing single-use pairing exchange happens automatically behind the scenes.
- The app receives a separate local snapshot token.

The Epic access token stays on the backend. It is not included in the return link.

### Snapshot behavior

The app displays a saved snapshot, not a continuously updating medication feed.

The current snapshot expires approximately 30 minutes after retrieval.

To retrieve a new snapshot:

1. Select Disconnect on the medication screen.
2. Select Connect to Epic.
3. Complete authorization again.

Disconnect clears the mobile app’s local demo connection. It does not revoke the authorization granted in Epic or necessarily remove the backend snapshot immediately.

Restarting the backend also invalidates temporary sessions and snapshots.

### Medication status

The observed sandbox response contained an aspirin 325 MG tablet order marked `completed`, with an order date in 2019.

Present completed orders as historical medication orders, not active prescriptions.

Sandbox contents can change, so the medication count and returned details may vary.

### Successful connection checklist

- [ ] Backend starts without errors.
- [ ] Emulator localhost health check reports `ok`.
- [ ] EZ Healthcare opens as a development build.
- [ ] Connect to Epic opens the sandbox login.
- [ ] Epic authorization succeeds.
- [ ] Return to EZ Healthcare opens the app.
- [ ] Patient and medication details load.
- [ ] Source and order status are displayed accurately.

## 12. Regular Startup After Initial Setup

Do not reinstall dependencies, recreate the database, or recreate `.env` every time.

1. Start PostgreSQL.
2. Start the existing Android emulator in Android Studio.
3. Open a terminal in `backend` and run:

```sh
npm run dev
```

4. In another terminal, run:

```sh
adb reverse tcp:3001 tcp:3001
```

5. Verify the emulator can open:

```text
http://localhost:3001/api/health
```

6. In a terminal at the project root, run:

```sh
npx expo start --dev-client
```

7. Press `a` to open the development app.
8. Open Medications and select Connect to Epic.
9. Approve access and select Return to EZ Healthcare.
10. Confirm the medication record loads.

### Restarting the backend

Click inside its terminal and press Control+C.

Then, from `backend`, run:

```sh
npm run dev
```

Start a fresh Epic connection after restarting.

### Shutting down

- Press Control+C in the Expo terminal.
- Press Control+C in the backend terminal.
- Close the emulator.
- Stop PostgreSQL if no other work needs it.

Database records remain on disk. Temporary backend sessions do not survive a backend restart.

## 13. Troubleshooting

### Address already in use / EADDRINUSE on port 3001

Another process already owns the backend port.

Find the original backend terminal and stop that process with Control+C before starting another copy.

On macOS, identify the listener with:

```sh
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

On Windows:

```bat
netstat -ano | findstr :3001
```

Identify the process before stopping it. Do not terminate unrelated processes.

A healthy response from an older backend does not prove your updated backend is running.

### Emulator browser says localhost cannot be reached

Run:

```sh
adb reverse tcp:3001 tcp:3001
```

Then test `/api/health` inside the emulator browser.

If it still fails, test the same URL in the computer’s browser.

If neither works, check the backend terminal and PostgreSQL.

### Unsupported class file major version 71

This error indicates the build tooling encountered Java 27 class files.

Select Java 17 using Section 9, then stop existing Gradle daemons.

macOS:

```sh
cd android
./gradlew --stop
cd ..
npx expo run:android
```

Windows Command Prompt:

```bat
cd android
gradlew.bat --stop
cd ..
npx expo run:android
```

Use the same terminal where Java 17 was selected.

### SDK location not found

Check Android Studio’s SDK Location.

Set `ANDROID_HOME` or add the correct `sdk.dir` to:

```text
android/local.properties
```

Use your own machine’s SDK path.

### Build shows CONFIGURING or IDLE

Those messages do not by themselves indicate failure.

Gradle may be resolving or downloading dependencies. A configuration percentage is not the percentage of the entire build.

Wait for `BUILD SUCCESSFUL` or a specific failure.

If output stops changing for an extended period, check connectivity and collect the relevant Gradle messages before changing configuration.

### Build failed with a generic non-zero exit code

Scroll up to:

```text
What went wrong:
```

The final Expo stack trace often only reports that Gradle failed.

Share the actual Gradle error section with the developer.

### Cannot find mobileDemo.js or nativeAuth.js

Confirm these source files exist:

```text
backend/src/mobileDemo.ts
backend/src/nativeAuth.ts
```

Imports ending in `.js` are intentional in this TypeScript backend setup.

Do not rename imports to `.ts.js`.

Start the backend with:

```sh
npm run dev
```

### Database connection errors

- Connection refused: confirm PostgreSQL is running and the port matches.
- Role does not exist: correct `PGUSER`.
- Password authentication failed: correct `PGPASSWORD`.
- Database does not exist: complete the database setup.
- After changing `.env`, restart the backend.

### Database already exists

Skip the creation command. Do not delete the existing database.

### No data sources configured in IntelliJ

This is an editor integration message.

Run the SQL using the `psql` command in Section 6. A configured IntelliJ database connection is not required.

### cd backend reports no such directory

Check the current folder. You may already be inside `backend`.

Use `cd ..` to return to the root when needed.

### adb is not found

Check the Android SDK Platform-Tools installation and Path configuration.

On macOS, the default full executable path is:

```text
$HOME/Library/Android/sdk/platform-tools/adb
```

Example:

```sh
"$HOME/Library/Android/sdk/platform-tools/adb" reverse tcp:3001 tcp:3001
```

On Windows, use `adb.exe` from your SDK’s `platform-tools` folder if needed.

### More than one device or emulator

Run:

```sh
adb devices
```

Then use `adb -s YOUR_EMULATOR_SERIAL` for device-specific commands.

### App opens in Expo Go

Stop Expo and restart with:

```sh
npx expo start --dev-client
```

Open the installed EZ Healthcare development build.

If no development build is installed, complete Section 10.

### Native module missing after installing a package

If a new native dependency was added after the development build was created, rebuild:

```sh
npx expo run:android
```

Restarting Metro alone cannot add a missing native module to an installed application.

### Epic reports invalid client or redirect

Check the team’s non-production client ID and exact callback URL.

Restart the backend after editing `.env`.

Do not change the callback to the app scheme or emulator API address without coordinating changes to the implementation and Epic registration.

### Epic account inactive

Ask the developer to verify an available synthetic sandbox account.

Do not reset a shared test account’s password.

### Authorization succeeds but the app does not reopen

Look for these backend messages:

```text
Epic sandbox authorization completed.
Epic mobile snapshot prepared: 1 medication order(s).
Mobile authorization return page sent.
```

The medication count may differ.

The current implementation shows a Return to EZ Healthcare button rather than relying only on an automatic browser redirect.

Tap that button within one minute.

To test the installed app’s link handler:

```sh
adb shell am start -W -a android.intent.action.VIEW -d "ezhealthcare://medications"
```

This command tests navigation only. It does not authorize Epic access.

If Android brings the existing app task forward and reports `Status: ok`, the link handler is working.

If it cannot resolve the link, verify that the installed development build contains the configured `ezhealthcare` scheme.

Do not guess a package name when testing links. Omitting the package lets Android resolve the registered scheme.

### MyChart shows “Thanks for using MyChart” instead of the return page

Check that the updated backend is actually running and not blocked by an older process on port 3001.

Check for `Mobile authorization return page sent.` in the active backend terminal.

If the issue persists, provide the final browser URL without its query string and the recent backend messages.

### Mobile sign-in expired or already started

Return to the app and select Connect to Epic to create a fresh attempt.

Do not refresh an old sign-in URL.

### Connection result expired

The app must collect the result within one minute after the backend prepares the mobile handoff.

Start a fresh sign-in if that window expires.

### Unauthorized / 401 or snapshot expired

Select Disconnect if a snapshot is still displayed, then Connect to Epic again.

Backend restarts clear temporary sessions and mobile tokens.

### TypeScript errors

From the project root:

```sh
npm run typecheck
```

This checks the entire frontend project, not only Medications.

If the terminal returns to its prompt without errors after `tsc --noEmit`, the check passed.

Passing a typecheck does not prove that Epic authorization works; test that flow separately.

### Expo reports a stale or unresolved module

Confirm the file exists and the import path is correct.

For the medication route:

```tsx
export { default } from '../screens/MedicationsScreen';
```

If the source is correct, stop Expo and clear the cache:

```sh
npx expo start --dev-client -c
```

Clearing the cache does not restore missing files.

### FHIR OperationOutcome warning

A medication response may include a warning explaining that the authorized data might not represent the entire medical record.

Do not count an OperationOutcome entry as a medication.

Warnings do not automatically mean that returned medication orders failed, but actual error/fatal outcomes require investigation.

### Sharing errors with the developer

Include:

- Operating system.
- Step reached.
- Exact terminal error.
- Whether the computer’s health endpoint works.
- Whether the emulator’s localhost health endpoint works.
- Whether Epic authorization and snapshot messages appeared.

Remove passwords, tokens, cookies, and authorization codes.

For browser URLs, remove the query string after `?` before sharing.

## 14. Development and Git Guidelines

### Files to commit

Commit the intended source changes and matching dependency files, including:

- Updated backend authorization and handoff code.
- Updated medication connection logic.
- TypeScript compatibility fixes.
- `app.json` changes.
- Root and backend package files when changed.
- README updates.

Review generated native project changes according to the team’s repository policy. Do not change whether native folders are tracked without coordinating with the team.

### Files not to commit

Do not commit:

- `backend/.env`
- `android/local.properties`
- `node_modules`
- Local build output
- Access tokens, session cookies, or database passwords

Use `.env.example` with placeholders for documenting configuration.

### Before committing

From the project root:

```sh
git status
git diff --stat
npm run typecheck
```

Review the actual diff before staging.

A frontend typecheck does not check all backend behavior. Also start the backend and test the Epic-to-mobile flow.

### Important limitations

- The application remains a partial prototype.
- Login and Sign Up are not yet a complete application account system.
- Several feature buttons remain placeholders.
- The Epic snapshot is temporary and limited to the implemented requests.
- Medication retrieval currently uses the first response page.
- Local HTTP, in-memory sessions, and emulator port forwarding are development arrangements.
- Successful sandbox integration does not establish production security, privacy compliance, or validated accessibility.

## 15. Reference Links

- Node.js: https://nodejs.org/en/download
- IntelliJ IDEA: https://www.jetbrains.com/idea/download/
- Postgres.app: https://postgresapp.com/documentation/install.html
- PostgreSQL Windows installers: https://www.postgresql.org/download/windows/
- Android Studio: https://developer.android.com/studio
- Temurin JDK 17: https://adoptium.net/temurin/releases/?version=17
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo authentication: https://docs.expo.dev/guides/authentication/
- Expo WebBrowser: https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/
- Android emulator setup: https://docs.expo.dev/workflow/android-studio-emulator/
- Android Debug Bridge: https://developer.android.com/tools/adb
- Epic on FHIR: https://fhir.epic.com/

Keep this guide aligned with the repository’s current code and the team’s Epic sandbox registration.