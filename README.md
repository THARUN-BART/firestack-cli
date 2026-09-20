<div align="center">

# 🔥 rn-firebase-cli

**One command. Three platforms. Zero Firebase setup headache.**

[![npm version](https://img.shields.io/npm/v/rn-firebase-cli.svg?style=flat-square)](https://www.npmjs.com/package/rn-firebase-cli)
[![npm downloads](https://img.shields.io/npm/dm/rn-firebase-cli.svg?style=flat-square)](https://www.npmjs.com/package/rn-firebase-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)

Configure Firebase for **Android, iOS, and Web** in your React Native & Expo project — automatically.

```bash
npx rn-firebase-cli setup
```

</div>

---

## 📖 Table of Contents

- [Why rn-firebase?](#-why-rn-firebase)
- [Install](#-install)
- [Quick Start](#-quick-start)
- [Commands](#-commands)
- [How It Works](#-how-it-works)
- [Platform Support](#-platform-support)
- [Doctor & Fix](#-doctor--fix)
- [Safety Principles](#-safety-principles)
- [Development](#-development)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Why rn-firebase?

Setting up Firebase in a React Native or Expo project is tedious:

- Download `google-services.json` → drop it in the right folder
- Patch `android/build.gradle` and `android/app/build.gradle`
- Download `GoogleService-Info.plist` → place it in the Xcode target folder
- Generate `firebaseConfig.ts` for web
- Register apps in Firebase Console for each platform
- Install `@react-native-firebase/app`, run `expo prebuild`, …

**`rn-firebase` automates all of that** from a single interactive CLI that talks directly to the Firebase API on your behalf.

```
Your React Native / Expo project
           │
           ▼
      rn-firebase
           │
   ┌───────┼───────┐
   ▼       ▼       ▼
Android   iOS     Web
   │       │       │
   └───────┼───────┘
           ▼
    Firebase Ready 🔥
```

---

## 📦 Install

### Use without installing (recommended)

```bash
npx rn-firebase-cli setup
# or
bunx rn-firebase-cli setup
```

### Install globally

```bash
# npm
npm install -g rn-firebase-cli

# bun
bun add -g rn-firebase-cli

# pnpm
pnpm add -g rn-firebase-cli
```

### Prerequisites

| Requirement | Purpose |
|---|---|
| [Firebase CLI](https://firebase.google.com/docs/cli) | API access — `npm i -g firebase-tools` |
| `firebase login` | Authenticate before running setup |
| Node.js ≥ 18 | Runtime |

---

## 🚀 Quick Start

From the root of your React Native or Expo project:

```bash
npx rn-firebase setup
```

The CLI auto-detects your project and guides you through every step:

```
🔥 Firebase Setup CLI for React Native / Expo

✔ Project analyzed
  Project type: Expo project
  Package manager: bun
  Android: found  ·  iOS: found

✔ Firebase CLI v15.8.0 found
✔ Authenticated as you@example.com

? Select a Firebase project to connect: › my-awesome-app
? Which platforms do you want to configure? › ◉ Android  ◉ iOS  ◉ Web

◆ Configuring Android
✔ Android app registered with Firebase
✔ Android configuration files installed
✔ Gradle configuration updated with Google Services plugin

◆ Configuring iOS
✔ iOS app registered with Firebase
✔ iOS configuration files installed

◆ Configuring Web
✔ Web configuration created at src/firebaseConfig.ts

◆ Dependency Management
✔ All required Firebase dependencies are already installed

🎉 Firebase configuration complete!
```

---

## 🧩 Commands

| Command | Description |
|---|---|
| `rn-firebase setup` | Interactive Firebase setup wizard |
| `rn-firebase doctor` | Diagnose configuration issues (read-only) |
| `rn-firebase fix` | Auto-fix all detected problems |
| `rn-firebase fix android` | Fix Android configuration only |
| `rn-firebase fix ios` | Fix iOS configuration only |
| `rn-firebase fix web` | Fix Web configuration only |
| `rn-firebase fix deps` | Install missing Firebase dependencies |
| `rn-firebase --help` | Show help |
| `rn-firebase --version` | Show version |

---

## 🧠 How It Works

### 1 · Project Detection

`rn-firebase` inspects your project before touching anything:

- **Project type** — Expo managed, bare React Native, or plain JS/TS
- **Package manager** — Bun, npm, pnpm, or Yarn (detected via lockfile)
- **Native folders** — `android/` and `ios/` presence
- **Package / bundle IDs** — from `app.json`, `build.gradle`, `AndroidManifest.xml`, or `.pbxproj`
- **Existing Firebase files** — `google-services.json`, `GoogleService-Info.plist`, `firebaseConfig.ts`
- **Installed dependencies** — `@react-native-firebase/app`, `firebase`

### 2 · Expo Prebuild (if needed)

For Expo projects without native folders:

```
Native projects are missing.
? Run expo prebuild now? › Yes
```

Runs `expo prebuild --no-install` so your native projects are ready for configuration.

### 3 · Firebase Auth & Project Selection

Uses the Firebase CLI you already authenticated with (`firebase login`). Prompts you to select an existing project or create a new one.

### 4 · Per-Platform Configuration

#### Android

- Registers Android app in Firebase (or finds existing one)
- Downloads `google-services.json` → places it in `android/app/`
- Patches `android/build.gradle` to add the Google Services classpath (inside `buildscript {}` only)
- Applies `com.google.gms.google-services` plugin in `android/app/build.gradle`
- Updates `app.json` for Expo projects

#### iOS

- Registers iOS app in Firebase (or finds existing one)
- Downloads `GoogleService-Info.plist` → places it in the correct Xcode target folder
- Updates `app.json` for Expo projects

#### Web

- Registers Web app in Firebase (or finds existing one)
- Downloads the Web SDK config
- Generates `src/firebaseConfig.ts` (or `.js` for non-TS projects)

### 5 · Dependency Management

Checks which Firebase packages are missing and offers to install them using your project's package manager:

```
Missing dependencies: @react-native-firebase/app
? Install missing dependencies using bun? › Yes
```

---

## 📱 Platform Support

| Feature | Android | iOS | Web |
|---|:---:|:---:|:---:|
| Auto-detect app ID / bundle ID | ✅ | ✅ | — |
| Firebase app registration | ✅ | ✅ | ✅ |
| Config file download & placement | ✅ | ✅ | ✅ |
| Gradle patching | ✅ | — | — |
| Expo `app.json` integration | ✅ | ✅ | ✅ |
| Doctor | ✅ | ✅ | ✅ |
| Fix | ✅ | ✅ | ✅ |

---

## 🩺 Doctor & Fix

### Doctor — read-only health check

```bash
rn-firebase doctor
```

```
🔥 Firebase Doctor

Project
  ✔ Expo project
  ✔ Firebase CLI installed (v15.8.0)
  ✔ Firebase authenticated

Android
  ✔ google-services.json present
  ✔ Package ID: com.example.myapp

iOS
  ✔ GoogleService-Info.plist present
  ✔ Bundle ID: com.example.myapp

Web
  ✗ Firebase Web configuration missing

Dependencies
  ✔ @react-native-firebase/app

1 issue detected.
Run: rn-firebase fix web
```

### Fix — targeted remediation

```bash
rn-firebase fix          # fix everything
rn-firebase fix android  # Android only
rn-firebase fix ios      # iOS only
rn-firebase fix web      # Web only
rn-firebase fix deps     # missing packages only
```

Before making any changes, the CLI shows a preview and asks for confirmation.

---

## 🛡️ Safety Principles

- **No passwords** — relies solely on `firebase login` OAuth flow
- **No silent overwrites** — existing `google-services.json` and `GoogleService-Info.plist` are backed up as `.bak` before replacement
- **Confirmation prompts** — destructive operations always ask first
- **No shell injection** — all subprocess calls use `shell: false` with validated arguments
- **Path traversal protection** — paths from `app.json` are validated to stay inside the project directory
- **Idempotent** — running `setup` twice doesn't duplicate Gradle plugins or Expo config entries
- **Temp file cleanup** — sensitive SDK credential files downloaded to `.tmp-*` are always deleted in `finally` blocks

---

## 🏗️ Architecture

```
src/
├── cli.ts                  Commander.js entrypoint
├── commands/
│   ├── setup.ts            Interactive setup wizard
│   ├── doctor.ts           Read-only diagnostics
│   └── fix.ts              Auto-remediation
├── detection/
│   ├── project.ts          Aggregates all detections → ProjectInfo
│   ├── platforms.ts        Android/iOS native dir + config file detection
│   ├── package-manager.ts  Lockfile-based PM detection
│   └── dependencies.ts     package.json dep scanning
├── expo/
│   ├── prebuild.ts         expo prebuild runner
│   └── plugins.ts          app.json updater
├── firebase/
│   ├── cli.ts              Firebase CLI wrapper + JSON extractor
│   ├── auth.ts             Auth check via firebase login:list
│   ├── projects.ts         Projects list/create
│   └── apps.ts             Apps list/create/sdkconfig
├── config/
│   ├── android.ts          google-services.json + Gradle patcher
│   ├── ios.ts              GoogleService-Info.plist placer
│   └── web.ts              firebaseConfig.ts generator
└── utils/
    ├── exec.ts             runCommandSync / runCommandAsync (shell: false)
    └── fs.ts               Safe file I/O helpers
```

---

## 🧪 Development

```bash
# Clone
git clone https://github.com/tharunpoongavanam/rn-firebase-cli.git
cd rn-firebase-cli

# Install
bun install

# Run locally in your RN/Expo project directory
bun run src/cli.ts setup
bun run src/cli.ts doctor

# Tests (29 tests across 5 suites)
bun test

# Build for distribution
bun run build
```

### Running tests

```bash
bun test
```

```
✓ Firebase CLI output parsing › extracts JSON when CLI prints progress logs
✓ Command execution security › sanitizeArg rejects shell metacharacters
✓ Project Detection › rejects path traversal attempts in app.json
✓ Platform Configurations › inserts classpath only inside buildscript block
✓ Platform Configurations › creates a .bak backup before overwriting credentials
... 29 tests pass
```

---

## 🗺️ Roadmap

- [x] Project detection (Expo, bare RN, package manager)
- [x] Firebase auth & project selection
- [x] Android configuration (google-services.json + Gradle)
- [x] iOS configuration (GoogleService-Info.plist)
- [x] Web configuration (firebaseConfig.ts)
- [x] Smart dependency management
- [x] Doctor command
- [x] Fix command (all / per-platform)
- [x] Security hardening (path traversal, shell injection, credential backups)
- [ ] `--dry-run` mode (preview changes without writing files)
- [ ] `--ci` mode (non-interactive, exit code for CI pipelines)
- [ ] `rn-firebase setup --platform android` (skip platform selection)
- [ ] `rn-firebase doctor --json` (machine-readable output)
- [ ] Firebase Emulator Suite integration
- [ ] Multi-project / multi-environment support

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `bun test`
5. Open a pull request describing what changed and why

For large changes, please open an issue first to discuss the approach.

---

## 📄 License

[MIT](LICENSE) © [Tharun Poongavanam](https://github.com/THARUN-BART)

---

<div align="center">

**[npm](https://www.npmjs.com/package/rn-firebase-cli)** · **[GitHub](https://github.com/tharunpoongavanam/rn-firebase-cli)** · **[Issues](https://github.com/tharunpoongavanam/rn-firebase-cli/issues)**

Made with ❤️ for the React Native community

</div>