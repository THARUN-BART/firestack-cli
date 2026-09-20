# 🔥 rn-firebase

> Unified, automated Firebase setup and diagnostic CLI for **React Native** and **Expo**.

Similar to how Flutter developers rely on `flutterfire configure`, `rn-firebase` orchestrates the entire Firebase onboarding and configuration workflow for React Native and Expo projects across **Android**, **iOS**, and **Web**.

---

## ✨ Features

- 🔍 **Intelligent Project Detection**: Automatically identifies whether your app is an Expo or bare React Native project, detects package managers (`bun`, `pnpm`, `yarn`, `npm`), package names, bundle IDs, and existing Firebase setup.
- ⚡ **Expo Prebuild Integration**: Detects missing native `android/` and `ios/` folders and optionally triggers `expo prebuild`.
- 🔐 **Zero Credential Overhead**: Connects to the official Firebase CLI (`firebase login` / `firebase-tools`) without ever asking for Google passwords directly.
- 📱 **Multi-Platform Support**:
  - **Android**: Automatically registers Android apps, downloads `google-services.json`, and updates Gradle / Expo config.
  - **iOS**: Automatically registers iOS apps with bundle identifier, downloads `GoogleService-Info.plist`, and configures Xcode target paths / Expo config.
  - **Web**: Registers Web app, retrieves Web SDK configuration, and creates an isolated `firebaseConfig.ts` or `src/firebaseConfig.ts` with JS SDK initialization.
- 📦 **Smart Dependency Management**: Detects missing `@react-native-firebase/app` or `firebase` dependencies and installs them using your project's native package manager.
- 🩺 **Firebase Doctor**: Inspects your project non-destructively to diagnose missing files, credentials, or bundle identifiers.
- 🛠️ **Automatic Fixes**: Proactively fixes missing platforms (`rn-firebase fix android`, `rn-firebase fix ios`, `rn-firebase fix web`).

---

## 🚀 Quick Start

Run directly via `bunx` or `npx`:

```bash
# Interactive setup for Android, iOS, and Web
bunx rn-firebase setup

# or via npx
npx rn-firebase setup
```

---

## 🩺 Diagnostic Doctor

Inspect your current configuration without touching any files:

```bash
bunx rn-firebase doctor
```

Example output:
```text
🔥 Firebase Doctor

Project
  ✔ Expo project
  ✔ Firebase CLI: Firebase CLI installed (15.8.0)
  ✔ Firebase authentication: Authenticated as user@example.com

Android
  ✔ google-services.json: Configuration file found
  ✔ Package ID: com.example.myapp

iOS
  ✔ GoogleService-Info.plist: Configuration file found
  ✔ Bundle ID: com.example.myapp

Web
  ✗ Firebase Web config: Missing Firebase Web configuration file

Dependencies
  ✔ @react-native-firebase/app: Installed

1 issue detected.

Suggested fix:
  rn-firebase fix web
```

---

## 🛠️ Auto-Fix Commands

Resolve issues highlighted by `doctor`:

```bash
# Fix all detected issues
bunx rn-firebase fix

# Fix a specific platform
bunx rn-firebase fix android
bunx rn-firebase fix ios
bunx rn-firebase fix web
bunx rn-firebase fix deps
```

---

## 🧪 Testing

```bash
bun test
```
