# EZ Healthcare — Local Demo Setup and Run Guide

This guide explains how to run the EZ Healthcare demonstration on your own computer, starting with installing the required software. Follow either the **Mac** instructions or the **Windows** instructions where they differ.

The demo uses an Android emulator, a local backend, PostgreSQL, and Epic's FHIR sandbox. All healthcare records used for this demonstration are synthetic test data.

**First time:** complete Sections 1–10 in order. **Already set up:** jump to [Demo-day startup](#11-demo-day-startup-after-first-time-setup).

These instructions document the team's local demonstration setup. The Mac workflow has been used during development. The Windows installation path is included for teammates but still needs a rehearsal on their computer. The repository's committed package versions should be retained.

## Contents

1. [Understand the pieces](#1-understand-the-pieces)
2. [Install Node.js and an editor](#2-install-nodejs-and-an-editor)
3. [Get the project and open a terminal](#3-get-the-project-and-open-a-terminal)
4. [Install the project dependencies](#4-install-the-project-dependencies)
5. [Install and start PostgreSQL](#5-install-and-start-postgresql)
6. [Create the local database](#6-create-the-local-database)
7. [Create the backend configuration](#7-create-the-backend-configuration)
8. [Install Android Studio and create an emulator](#8-install-android-studio-and-create-an-emulator)
9. [Start the backend and Expo](#9-start-the-backend-and-expo)
10. [Connect Epic and display medications](#10-connect-epic-and-display-medications)
11. [Starting the application](#11-starting-the-application)
12. [Troubleshooting](#12-troubleshooting)
13. [Reference links](#13-reference-links)

## 1. Understand the pieces

| Piece | What it does | Where it runs |
| --- | --- | --- |
| Expo / React Native | Displays the EZ Healthcare mobile interface | Expo terminal plus Android emulator |
| Android Studio | Provides a virtual Android phone | Desktop application |
| Node.js backend | Handles database requests, Epic authorization, and demo pairing | A separate terminal |
| PostgreSQL | Stores local sample users, settings, medications, and appointments | Background database server |
| Epic sandbox | Supplies synthetic patient and medication records | Internet service |
| Desktop browser | Signs into Epic and displays a pairing code | Chrome, Safari, Edge, or another browser |

Keep **PostgreSQL, the backend terminal, the Expo terminal, and the emulator running** throughout the demo. Internet access is needed for Epic.

The current Epic demonstration retrieves a snapshot into backend memory and pairs it with the mobile screen. That Epic snapshot is **not automatically saved into PostgreSQL**. The database's seeded “Sample Medication A” and Epic's returned medication orders are separate data sources.

This guide assumes the browser, backend, and Android Studio emulator are on the **same computer**. Scanning Expo's QR code with a physical phone will not complete this backend setup as written.

### Commands and folders

- A **terminal** is the panel where you type commands and press Enter.
- The **project root** is the folder containing `package.json`, `backend`, `database`, and `src`.
- The backend folder has its own `package.json`. It needs a separate dependency installation.
- Copy only commands inside code blocks. Do not copy the ``` markers or a terminal prompt such as `matthill@... %`.
- Run commands one at a time unless a block explicitly says to paste the whole block.
- When a server is running, its terminal stays occupied. This is expected. Use a second terminal for the other server.

## 2. Install Node.js and an editor

### Node.js — Mac and Windows

1. Open [the official Node.js download page](https://nodejs.org/en/download).
2. Choose **Node.js 24 LTS**, matching the major version used for this demo.
3. Download the installer for your computer: `.pkg` on Mac or `.msi` on Windows. Select the architecture matching your machine.
4. Run the installer and complete its prompts. Keep npm selected and the default PATH setup enabled.
5. Close and reopen any terminal or IntelliJ window that was already open.
6. Open Terminal on Mac or Command Prompt on Windows and run:

```sh
node --version
```

```sh
npm --version
```

Both should print version numbers. Node should begin with `v24.`. If a command is not found, finish the installation and restart the terminal before continuing.

### Editor

The team uses [IntelliJ IDEA](https://www.jetbrains.com/idea/download/). Install it if you want to follow the same interface. An existing text editor and your computer's terminal also work; a paid database editor is not required for this demonstration.

**Expo installation:** you will install the project's Expo dependencies in Section 4. Do not create a new Expo project or install the old global `expo-cli` package.

## 3. Get the project and open a terminal

### Download the project

1. Ask the team for the GitHub repository link and the branch containing the completed Epic mobile demo.
2. Sign into GitHub. If the repository is private, accept the team's invitation first.
3. Open the repository and select the demo branch in the branch dropdown.
4. Click **Code → Download ZIP**.
5. Extract the ZIP. On Windows, right-click it and choose **Extract All**. On Mac, double-click it.
6. Put the extracted folder somewhere easy to find, such as Documents. Keep it outside a cloud-synced folder if possible.

If you already have a Git checkout, get the team's latest demo changes instead of downloading another copy. Do not discard your own work while updating.

### Open the project in IntelliJ

1. Choose **Open** from IntelliJ's welcome screen, or **File → Open**.
2. Select the extracted project folder, not the ZIP and not just `backend`.
3. Open the project and allow it to finish loading.
4. Open **View → Tool Windows → Terminal**.
5. Check the current folder by running:

**Mac:**

```sh
pwd
```

```sh
ls
```

**Windows Command Prompt:**

```bat
cd
```

```bat
dir
```

The folder listing should include `package.json`, `backend`, `database`, and `src`.

On Windows, these instructions use **Command Prompt**. If IntelliJ opens PowerShell, you can enter `cmd` and press Enter to use Command Prompt in that tab.

To move up one folder, enter `cd ..`. To move from the project root into the backend, enter `cd backend`. Do not enter `cd backend` again when you are already there.

### Confirm the demo files are present

Check these paths in IntelliJ's project panel:

- `package.json` and `package-lock.json`
- `database/setup.sql`
- `backend/package.json` and `backend/package-lock.json`
- `backend/src/server.ts`
- `backend/src/epic.ts`
- `backend/src/mobileDemo.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/MedicationsScreen.tsx`
- `src/app/medications.tsx`
- `assets/images/ez-logo.png`

If the Epic/mobile files are missing, get the correct branch from the developer before continuing. A README cannot supply files that were not included in the download.

## 4. Install the project dependencies

In the terminal, starting in the **project root**, run:

```sh
npm ci
```

Wait until it finishes and the terminal prompt returns. This installs the frontend dependencies, including the project's Expo version.

Then install the backend dependencies:

```sh
cd backend
```

```sh
npm ci
```

Return to the project root:

```sh
cd ..
```

Warnings alone do not necessarily mean installation failed. If `npm ci` ends with an error, resolve that error before continuing. If the lockfile is missing or out of sync, ask the developer to commit the matching `package.json` and `package-lock.json`. Do not run `npm audit fix --force` or upgrade packages while preparing the demo.

You normally install dependencies only once, or after pulling changes to the package files.

## 5. Install and start PostgreSQL

Follow **one** operating-system section. If PostgreSQL already works on your computer, use the existing installation and its credentials instead of installing a second server.

### Mac: Postgres.app

1. Download [Postgres.app](https://postgresapp.com/).
2. Open the download and move **Postgres.app** into **Applications**.
3. Launch it from Applications.
4. Click **Initialize** for a new server. If already initialized, start the existing server.
5. Confirm it is running on port **5432**.
6. In Mac Terminal, run these commands to make its command-line tools available:

```sh
sudo mkdir -p /etc/paths.d
```

```sh
echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
```

If prompted, type your Mac account password and press Enter. The password will not appear while you type.

Quit and reopen IntelliJ and Terminal, then run:

```sh
psql --version
```

Record your Mac short account name:

```sh
whoami
```

Use that name for `PGUSER` later. With Postgres.app's default local setup, a database password is usually unnecessary. If your installation requires one, use its actual password.

### Windows: PostgreSQL installer

1. Open [PostgreSQL's Windows downloads page](https://www.postgresql.org/download/windows/) and follow the EDB installer link.
2. Download a supported stable PostgreSQL release for your computer, such as PostgreSQL 18 for Windows x64. Avoid beta/RC releases for this demo.
3. Run the installer. Include **PostgreSQL Server** and **Command Line Tools**. pgAdmin is optional for this workflow.
4. Keep port **5432** unless an existing installation is already using it.
5. Set a password for the `postgres` database account. Save it privately; you will need it again.
6. Finish installation. Extra Stack Builder packages are not needed for this demo.
7. Open Start and search for **Edit environment variables for your account**.
8. Under your user variables, select **Path → Edit → New**.
9. Add your PostgreSQL `bin` folder. For a default version 18 installation, this is:

```text
C:\Program Files\PostgreSQL\18\bin
```

Use the version/folder actually installed. Keep all existing Path entries.

10. Click OK to close the dialogs. Close and reopen IntelliJ and Command Prompt.
11. Run `psql --version`. It should print the PostgreSQL version.
12. Open Windows **Services** and confirm the PostgreSQL service is **Running**. Start it if necessary.

For this installation, your database username is `postgres`, not your Windows login name.

## 6. Create the local database

Open an IntelliJ terminal in the **project root**. PostgreSQL must already be running.

### Mac with default Postgres.app credentials

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

Enter the database password chosen during installation when prompted. Password characters may remain invisible.

### Expected result

The setup script should finish without an error and print table/insert messages, a `COMMIT`, and sample records. The seeded data includes:

- Matt Demo, with `matt@example.test`.
- Accessibility settings.
- “Sample Medication A.”
- A sample appointment with “Dr. Demo.”

`createdb` can finish successfully without printing anything. If it says the database already exists, skip that command and continue with the setup script if setup has not been completed.

Do not recreate the database every time you run the app. Each teammate needs their own local database; downloading the repository does not copy Matt's running database.

## 7. Create the backend configuration

In IntelliJ, right-click the **backend** folder and choose **New → File**. Name the file exactly:

```text
.env
```

Its location must be `backend/.env`. Do not name it `backend.env` or `.env.txt`.

If it already exists, edit it and retain any other settings your current backend needs. Use the appropriate example below.

### Mac example

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

Replace `YOUR_MAC_SHORT_USERNAME` with the output of `whoami`. Do not use `matthill` unless that is your actual local database account. If your database requires a password, also add `PGPASSWORD="your actual database password"`.

### Windows example

```dotenv
PORT=3001
PGHOST=localhost
PGPORT=5432
PGDATABASE=ez_healthcare_demo
PGUSER=postgres
PGPASSWORD="YOUR_POSTGRES_PASSWORD"

EPIC_CLIENT_ID=0dfd33ec-b7df-4954-a807-5975bbddbac3
EPIC_REDIRECT_URI=http://localhost:3001/api/epic/callback
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

Replace `YOUR_POSTGRES_PASSWORD` with the password set during PostgreSQL installation. Save the file.

The client ID above is the team's registered **non-production** Epic app identifier, not an access token. If the team replaces that registration, obtain the new non-production ID from the developer. Teammates using the existing registration do not need to register a separate Epic app.

Keep the callback URL exactly as written. Do not substitute the Android emulator address in the callback setting.

Keep `.env` out of Git. Confirm `backend/.gitignore` includes `.env`, `node_modules/`, and `dist/`. Do not put database passwords or Epic access tokens in frontend code.

## 8. Install Android Studio and create an emulator

### Install Android Studio

1. Download [Android Studio](https://developer.android.com/studio) for your operating system. On Mac, choose the correct Apple Silicon or Intel download.
2. Run the installer and open Android Studio.
3. Complete its setup wizard using the standard installation and accept the SDK licenses.
4. Let the downloads finish.
5. Open **More Actions → SDK Manager** on the welcome screen, or Android SDK settings if a project is open.
6. Note the **Android SDK Location**. In SDK Tools, ensure **Android SDK Platform-Tools** and **Android Emulator** are installed. Apply any selected installations.

Android Studio supplies the emulator here; you do not need to create a new Android application or import this Expo project into it. Expo Go runs the existing JavaScript app. Separate native build/JDK setup is outside this demo workflow.

### Make Android tools available — Mac

For the default SDK location and the normal Mac zsh shell, paste this entire block into Terminal once:

```sh
cat >> ~/.zshrc <<'EOF'
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
EOF
source ~/.zshrc
```

If SDK Manager shows a different location, use that location for `ANDROID_HOME`. If your shell is not zsh, use its configuration file instead. Restart IntelliJ after changing the configuration.

### Make Android tools available — Windows

1. Open **Edit environment variables for your account** again.
2. Add a user variable named `ANDROID_HOME` with the actual SDK location from Android Studio. The usual location is `C:\Users\YOUR_WINDOWS_USERNAME\AppData\Local\Android\Sdk`.
3. Edit your user **Path** and add two entries: that SDK folder followed by `\platform-tools`, and that SDK folder followed by `\emulator`.
4. Keep the existing Path entries, save, and restart IntelliJ and Command Prompt.

### Check the tools — both systems

```sh
adb --version
```

It should print an Android Debug Bridge version.

### Create and start a virtual phone

1. Open Android Studio's **More Actions → Virtual Device Manager**. If a project is open, use **Tools → Device Manager**.
2. Choose **Create Virtual Device** or the **+** button.
3. Choose a Pixel phone profile and continue.
4. Download a stable Android system image compatible with the project's Expo Go version. Use the architecture appropriate to your computer: usually ARM64 for Apple Silicon or x86_64 for Intel/AMD.
5. Finish creating the device.
6. Click its **Play** button and wait for the Android home screen. Unlock it if necessary.
7. Keep the emulator open.

In your terminal, run:

```sh
adb devices
```

The running emulator should appear with status `device`. If the emulator cannot start, resolve its virtualization/startup error before proceeding; see [Android's acceleration guide](https://developer.android.com/studio/run/emulator-acceleration).

## 9. Start the backend and Expo

You need **two separate terminal tabs**. IntelliJ's terminal panel has a **+** control to open another tab. Each tab can start in a different folder, so check its folder before entering commands.

### Terminal 1: backend

From the project root:

```sh
cd backend
```

```sh
npm run dev
```

If already in `backend`, run only `npm run dev`.

Expected startup messages include:

```text
Connected to PostgreSQL!
EZ Healthcare backend: http://localhost:3001
Epic sandbox sign-in: http://localhost:3001/api/epic/login
```

Leave this terminal running. If an error appears instead, fix it before opening the sign-in page.

In your **computer's browser**, open:

[http://localhost:3001/api/health](http://localhost:3001/api/health)

Expect a successful health response. This is a checkpoint for the local server/database, not proof of Epic authorization.

### Terminal 2: Expo

Open a new terminal tab in the **project root**. If it opens in `backend`, run `cd ..` once.

```sh
npx expo start
```

Wait for the QR code and keyboard options. Click inside **this terminal**, then press the lowercase **a** key to open Android.

Allow Expo to install/open the matching Expo Go app on the emulator if prompted. If `npx` unexpectedly asks to install the `expo` package itself, check that you are in the project root and that `npm ci` completed.

Wait for EZ Healthcare to load. Use the app's existing welcome/login navigation to reach the home screen, then select **Medications**. Epic's sandbox credentials belong in the browser flow in the next section, not in an unrelated app login form.

If the app's own login screen blocks access, ask the developer for the current demo navigation; this guide does not define a separate EZ Healthcare account/password.

### Which address goes where?

| Purpose | Address |
| --- | --- |
| Backend from the computer's browser | `http://localhost:3001` |
| Backend from the Android Studio emulator | `http://10.0.2.2:3001` |
| Epic callback registered for this demo | `http://localhost:3001/api/epic/callback` |

The medication screen should already select `10.0.2.2` on Android. Inside the emulator, `localhost` refers to the virtual phone itself. Expo's development server is separate from the backend; its port is not the Epic callback port.

## 10. Connect Epic and display medications

### A. Sign into Epic in the computer's browser

1. Keep both server terminals running.
2. Open [http://localhost:3001/api/epic/login](http://localhost:3001/api/epic/login).
3. On Epic's sandbox authorization screen, use the public test account that worked for this demo:

```text
Username: fhirderrick
Password: epicepic1
```

4. Complete the authorization/consent prompts for the synthetic patient. If patient selection is shown, select **Derrick Lin**.
5. Wait to return to the local page showing **Connected to Epic's sandbox** and **Authorization succeeded**.

This is a sandbox account. Do not enter a real patient account for this presentation. If Epic changes the test account or marks it inactive, ask the developer to confirm an available test patient before recording.

### B. Optional: show the raw FHIR responses

On the connected page:

- **View sandbox patient** opens `/api/epic/patient`.
- **View medication orders** opens `/api/epic/medications`.

A long JSON response is expected. A patient response has `resourceType: "Patient"`. A medication search returns a `Bundle` containing medication orders and possibly warnings.

The earlier working result for Derrick contained one **aspirin 325 MG tablet** order with status **completed**. That is a historical order, not proof that the patient currently takes aspirin. Sandbox contents may change.

### C. Generate the mobile pairing code

In the **same computer browser and browser profile used to sign in**, open:

[http://localhost:3001/api/epic/mobile](http://localhost:3001/api/epic/mobile)

The connected status page may only list patient and medication links. If there is no mobile link, enter the URL above manually.

This page retrieves the sandbox records and displays a pairing code. Keep it open. The code is valid for **5 minutes** and can be used **once**.

### D. Connect the emulator

1. Go to the emulator and open **Medications** in EZ Healthcare.
2. Enter the pairing code from the browser into the pairing field.
3. Tap the screen's connect/submit button.
4. Wait for the medication records to appear.
5. Verify the sandbox banner, patient name, medication name, status, source, and retrieval time.

The mobile screen displays a saved snapshot, which expires **30 minutes after retrieval**. To retrieve a new snapshot, choose **Enter a New Code**, generate a fresh code in the browser, and connect again. Reopening the screen does not necessarily retrieve new records from Epic.

The Epic access token remains in the backend. The mobile pairing flow uses a separate local token to access the snapshot.

**Avoid restarting or editing backend code during this sequence.** The development watcher restarts the server when files change, clearing in-memory sign-in sessions, pairing codes, and snapshots. If that happens, start again at step A.

### Success checklist

- [ ] Local health endpoint works.
- [ ] EZ Healthcare opens in the Android emulator.
- [ ] Browser reports successful Epic authorization.
- [ ] Patient and medication endpoints return FHIR data.
- [ ] A fresh pairing code connects the mobile screen.
- [ ] Mobile screen identifies the data as Epic sandbox data.
- [ ] Historical/completed orders retain their returned status.

## 11. Starting the application

You do not need to reinstall software, rerun database creation, or recreate `.env` each time.

1. Start PostgreSQL: open Postgres.app on Mac, or confirm the PostgreSQL Windows service is running.
2. Open the project in IntelliJ.
3. Open Android Studio → Device Manager → press Play beside the existing emulator. Wait for the Android home screen.
4. In terminal 1, from the project root, run `cd backend`, then `npm run dev`. Leave it running.
5. Open `http://localhost:3001/api/health` on your computer and check that it works.
6. In terminal 2, from the project root, run `npx expo start`. Press `a` when Expo is ready. Leave it running.
7. Open `http://localhost:3001/api/epic/login` in your computer browser and authorize using the sandbox test account.
8. In that same browser, open `http://localhost:3001/api/epic/mobile` to generate a new code.
9. On the emulator, open Medications, enter the code, and connect. Use **Enter a New Code** first if an older snapshot is still displayed.
10. Confirm the records and their statuses before starting the recording.

## 12. Troubleshooting

### “localhost refused to connect”

The local backend is not reachable. Check terminal 1. If it crashed, fix the first actual error, confirm PostgreSQL is running, and restart with `npm run dev` from `backend`. Test `/api/health` before trying Epic again. Keep the terminal open while using the demo.

### “Cannot find module ... mobileDemo.js”

Confirm the actual file exists at `backend/src/mobileDemo.ts`, with that exact capitalization. Do not create an empty replacement. Get the complete file from the demo branch.

The TypeScript source uses these imports:

In `backend/src/server.ts`:

```ts
import { mobileDemoRouter } from "./mobileDemo.js";
```

In `backend/src/epic.ts`:

```ts
import { prepareMobileDemo } from "./mobileDemo.js";
```

The `.js` import spelling is intentional for this project's setup even though the source file is `.ts`. Run using `npm run dev`, which invokes `tsx`. Do not change the path to `mobileDemo.ts.js`.

### “cd: no such file or directory: backend”

You may already be inside `backend`. Check the terminal's current folder. Run `npm run dev` directly there. For Expo, return to the project root with `cd ..`.

### “psql” or “createdb” is not found

Check the PostgreSQL PATH steps in Section 5 and restart IntelliJ completely. On Windows, confirm the version number in the `bin` path matches the installation.

### Database connection refused, missing role, or password failure

- Connection refused: PostgreSQL may be stopped or using a different port.
- Role does not exist: correct `PGUSER` in `backend/.env`. Mac defaults usually use your Mac short account name; the Windows installer account is usually `postgres`.
- Password authentication failed: correct `PGPASSWORD` using your local database password.
- Database does not exist: complete Section 6.
- After changing `.env`, restart the backend. Then repeat Epic sign-in and pairing.

### “database already exists”

Skip `createdb`. Do not delete a working database to remove this message. Run the provided setup script only if initial setup is still needed.

### IntelliJ says “No data sources are configured to run this SQL”

That is an editor/database-tool configuration message. Use the `psql ... -f database/setup.sql` command from Section 6. A configured IntelliJ database connection is not needed to run that terminal command.

### Windows says npm.ps1 cannot be loaded

Use Command Prompt: enter `cmd` in the terminal and run the commands there. Alternatively use `npm.cmd` and `npx.cmd` in PowerShell. Changing your system's script execution policy is not necessary for this workflow.

### Port 3001 is already in use

Find your other backend terminal and stop its server with Ctrl+C. Keep one backend running. Do not change port 3001 casually: the browser URLs, mobile API URL, and registered Epic callback depend on it. If another application owns the port, ask the developer to help identify it.

### Expo cannot find an emulator or adb

Start the virtual phone in Android Studio. Check `adb --version` and `adb devices` in a new terminal. If the command is missing, fix the Android SDK PATH. If the emulator is still booting, wait until it reaches the Android home screen before pressing `a` again.

### Expo Go reports an incompatible SDK

Use the Expo Go version matching this repository's Expo SDK. Do not upgrade the project just to make the message disappear. Follow the [Expo Go download selector](https://expo.dev/go) or ask the developer to install the matching Android build. Then reopen the project from the Expo terminal.

### Expo displays a 500 / “Unable to resolve” error

Read the Expo terminal for the missing file/module. Confirm `src/screens/MedicationsScreen.tsx` exists and `src/app/medications.tsx` contains:

```tsx
export { default } from '../screens/MedicationsScreen';
```

If the file is correct and a stale bundle remains, stop Expo with Ctrl+C and run from the root:

```sh
npx expo start -c
```

Press `a` again. Clearing the cache cannot restore a missing source file.

### Browser works but the mobile request fails

The Android emulator must use `http://10.0.2.2:3001`. Test `http://10.0.2.2:3001/api/health` in the emulator's browser. If it fails, check that the backend is running on this same computer. Do not replace the desktop Epic callback URL with `10.0.2.2`.

### Epic says the account is inactive

Use the working public sandbox account `fhirderrick`, not a personal account. If it also fails, ask the developer to verify Epic's currently available test accounts. Do not try to reset a shared sandbox account's password.

### Epic reports an invalid client or redirect

Check the non-production client ID and exact callback URL in Section 7. After changing `.env`, restart the backend and begin a fresh login. If the Epic registration was just edited, its sandbox configuration may take time to propagate. Ask the registration owner to verify the settings; production activation is not part of this local demo.

### “Cannot GET /api/epic/mobile”

Check that you have the latest mobile-demo backend code and restarted it after updating. This pairing page is different from `/api/mobile/medications`, which is the token-protected endpoint used by the app.

### Pairing code is invalid, expired, or already used

Generate a new code by reopening `/api/epic/mobile` in the same browser used for authorization. Enter it within five minutes and use it only once. If the backend restarted, sign into Epic again first.

### Unauthorized / 401, or snapshot expired

For browser routes, start a fresh login at `/api/epic/login`. For the app, choose **Enter a New Code** and pair with a fresh snapshot. Backend restarts clear sessions and mobile tokens. Snapshots also expire after 30 minutes.

### The response includes an OperationOutcome warning

The observed medication response included a warning that the authorized information might not contain the entire record. That warning did not remove the returned medication order. Distinguish warnings from actual errors and do not count an `OperationOutcome` entry as a medication.

### Still blocked?

Send the developer your operating system, the step you reached, and the exact error from the relevant terminal. State whether `/api/health` works. Remove passwords, tokens, cookies, and authorization codes before sharing screenshots or logs.

## 15. Reference links

Installation screens can vary between versions. These are the official references for the supporting tools:

- [Node.js downloads](https://nodejs.org/en/download)
- [IntelliJ IDEA downloads](https://www.jetbrains.com/idea/download/)
- [Postgres.app installation](https://postgresapp.com/documentation/install.html)
- [PostgreSQL Windows installers](https://www.postgresql.org/download/windows/)
- [Android Studio downloads](https://developer.android.com/studio)
- [Expo: Android Studio emulator setup](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Expo: start developing](https://docs.expo.dev/get-started/start-developing/)
- [Expo Go download selector](https://expo.dev/go)
- [Android Emulator networking](https://developer.android.com/studio/run/emulator-networking)
- [Android Emulator acceleration](https://developer.android.com/studio/run/emulator-acceleration)
- [Epic on FHIR](https://fhir.epic.com/)

The repository's code and the team's current Epic app registration determine project-specific behavior. If those change, update this guide and rehearse again before the presentation.
