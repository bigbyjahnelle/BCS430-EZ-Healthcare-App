# EZ Healthcare

BCS 430 capstone: an accessible healthcare assistance app for older adults.

Team members: 
Jahnelle Bigby - Project Manager
Adrianna Lambert - UX/UI / Documentation
Matthew Hill - Lead Developer
Rahul Dookwah - QA / Test Engineer

Initial React Native, Expo, and TypeScript skeleton. Android is the first testing platform; iOS uses the same code. The starter screen only displays the app name and tagline. UI prototypes and features will be added later. Backend and SQL implementation are still undecided.

## Setup

Install Node.js 24 LTS (includes npm), Git, and Android Studio. Open the project folder in IntelliJ or VS Code.

Clone the team's repository using its GitHub URL, or extract this ZIP. In the project terminal:

```bash
npm ci
npm start
```

No environment variables are required.

## Run on Android

1. Complete Android Studio's Standard setup.
2. In SDK Manager, install Android SDK Platform 36, Platform-Tools, and Android Emulator.
3. Open Virtual Device Manager, create a Pixel device, and download an Android 16/API 36 image matching your Mac: ARM64 for Apple Silicon or x86_64 for Intel.
4. Start the virtual device and wait for its home screen.
5. Press **a** in the Expo terminal, or run `npm run android`.

If the SDK is not found, follow the [Expo emulator setup guide](https://docs.expo.dev/workflow/android-studio-emulator/) to configure its location.

iOS testing can be added later using Xcode/iOS Simulator on macOS and `npm run ios`.

## Folders

- `src/app`: Expo Router entry and navigation layout
- `src/screens`: application screens
- `src/components`: future reusable UI components
- `src/services`: future REST API communication
- `src/hooks`: shared React hooks
- `src/types`: shared TypeScript types
- `src/constants`: shared constants
- `src/utils`: helper functions

Empty folders contain `.gitkeep` so Git preserves them.

## Git

Use the team's existing repository. Keep `main` stable, develop on feature branches, and review pull requests before merging. IntelliJ can handle commits and pushes.

Run `npm run typecheck` before committing. Commit `package-lock.json`; dependencies, local environment files, and generated files are ignored.
