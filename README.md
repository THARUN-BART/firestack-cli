<div align="center">

# 🔥 rn-firebase-cli

**One command. All platforms & frameworks. Zero Firebase setup headache.**

[![npm version](https://img.shields.io/npm/v/rn-firebase-cli.svg?style=flat-square)](https://www.npmjs.com/package/rn-firebase-cli)
[![npm downloads](https://img.shields.io/npm/dm/rn-firebase-cli.svg?style=flat-square)](https://www.npmjs.com/package/rn-firebase-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)

Automatically configure Firebase for **Next.js, Expo, React (Vite / CRA), Bare React Native, Remix, Astro, and SvelteKit** — across Android, iOS, and Web.

```bash
npx rn-firebase-cli setup
```

</div>

---

## 📖 Table of Contents

- [Why rn-firebase-cli?](#-why-rn-firebase-cli)
- [Framework Support](#-framework-support)
- [Install](#-install)
- [Quick Start](#-quick-start)
- [Commands](#-commands)
- [How It Works](#-how-it-works)
- [Doctor & Fix](#-doctor--fix)
- [Safety Principles](#-safety-principles)
- [Development](#-development)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Why rn-firebase-cli?

Setting up Firebase across different frameworks and platforms is tedious:

- **Next.js**: Register web app → generate `NEXT_PUBLIC_*` in `.env.local` → initialize singleton `src/lib/firebase.ts` → setup Auth & Firestore.
- **Expo**: Register iOS & Android apps → download `google-services.json` & `GoogleService-Info.plist` → configure `app.json` plugins & `EXPO_PUBLIC_*` env vars.
- **React (Vite / CRA)**: Register web app → configure `VITE_*` / `REACT_APP_*` in `.env` → initialize client SDK.
- **Bare React Native**: Patch root and app `build.gradle` → drop plist in Xcode folder → setup `@react-native-firebase/app`.

**`rn-firebase-cli` automates all of that** with intelligent framework detection and direct Firebase API integration.

```
Your Project (Next.js / Expo / Vite / React Native / Remix)
                           │
                           ▼
                    rn-firebase-cli
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Web Frameworks         Expo          Bare React Native
 (Next.js/Vite/CRA)   (iOS/Android/Web)   (Android/iOS Native)
         │                 │                 │
   .env / lib/firebase   app.json + plists   Gradle + plists
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
                   Firebase Ready 🔥
```

---

## 🌟 Framework Support

| Framework | Detection Trigger | Config File Location | Env Vars Format | SDK Configured |
|---|---|---|---|---|
| **Next.js** (App & Pages) | `next` | `src/lib/firebase.ts` / `lib/firebase.ts` | `NEXT_PUBLIC_FIREBASE_*` in `.env.local` | `firebase` (JS SDK) |
| **Expo** (Managed & Bare) | `expo`, `app.json` | `app.json` + `google-services.json` + `GoogleService-Info.plist` | `EXPO_PUBLIC_FIREBASE_*` in `.env` | `@react-native-firebase` or `firebase` |
| **React (Vite)** | `vite` + `react` | `src/lib/firebase.ts` / `src/firebase.ts` | `VITE_FIREBASE_*` in `.env` | `firebase` (JS SDK) |
| **Create React App** | `react-scripts` | `src/firebase.ts` | `REACT_APP_FIREBASE_*` in `.env` | `firebase` (JS SDK) |
| **Bare React Native** | `react-native` | `android/app/google-services.json` & `ios/.../GoogleService-Info.plist` | Native Gradle / Plist | `@react-native-firebase/app` |
| **Remix / Astro / Svelte** | package matches | `src/lib/firebase.ts` / `app/lib/firebase.ts` | Framework-specific env prefix | `firebase` (JS SDK) |

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

From the root of your project:

```bash
npx rn-firebase-cli setup
```

The CLI auto-detects your framework and guides you through every step:

```
🔥 Firebase Setup CLI for Web, React Native & Expo

✔ Project analyzed
  Framework: Next.js (App Router)
  Package manager: bun
  TypeScript: yes

✔ Firebase CLI v15.8.0 found
✔ Authenticated as you@example.com

? Select a Firebase project to connect: › my-awesome-app
? Which Firebase services do you want to initialize in code?
  ✔ Authentication (auth)
  ✔ Cloud Firestore (db)
  ✔ Cloud Storage (storage)

◆ Configuring Firebase for Next.js (App Router)
✔ Created .env.local with NEXT_PUBLIC_FIREBASE_* variables
✔ Firebase client initialized at src/lib/firebase.ts

◆ Dependency Management
✔ Installed missing dependencies (firebase)

🎉 Firebase configuration complete!
```

---

## 🧩 Commands

| Command | Description |
|---|---|
| `rn-firebase setup` | Interactive Firebase setup wizard |
| `rn-firebase doctor` | Diagnose configuration & env issues (read-only) |
| `rn-firebase fix` | Auto-fix all detected problems |
| `rn-firebase fix env` | Fix environment variables (`.env.local` / `.env`) |
| `rn-firebase fix web` | Fix Web / JS SDK configuration |
| `rn-firebase fix android` | Fix Android native configuration |
| `rn-firebase fix ios` | Fix iOS native configuration |
| `rn-firebase fix deps` | Install missing Firebase dependencies |
| `rn-firebase --help` | Show help |
| `rn-firebase --version` | Show version |

---

## 🧠 How It Works

### 1 · Multi-Framework Detection

`rn-firebase-cli` inspects your project before making changes:

- **Framework** — Next.js (App / Pages router), Expo (with Expo Router), Vite, CRA, Remix, Astro, SvelteKit, Bare React Native
- **Package manager** — Bun, npm, pnpm, or Yarn
- **Environment format** — `.env.local` (Next.js) or `.env` (Vite/Expo) with appropriate variable prefixes
- **Native folders** — `android/` and `ios/` presence for mobile builds
- **Firebase services** — Auth, Firestore, Storage, Realtime DB, and Analytics

### 2 · Environment Variables & Client Boilerplate

- **Generates `.env.local` or `.env`**: Safely appends or updates `FIREBASE_*` credentials while preserving all your existing non-Firebase environment variables.
- **Generates Type-Safe Client Module**: Creates `src/lib/firebase.ts` (or `.js`) with singleton guards and typed exports for `auth`, `db`, `storage`, and `analytics`.

### 3 · Native Mobile Configuration (Expo & Bare RN)

- **Android**: Downloads `google-services.json`, patches `build.gradle` classpath inside `buildscript {}`, applies plugin in `android/app/build.gradle`.
- **iOS**: Downloads `GoogleService-Info.plist`, places it in Xcode target folders, and updates `app.json`.
- **Expo Prebuild**: Detects missing native folders and offers to run `expo prebuild --no-install`.

---

## 🩺 Doctor & Fix

### Doctor — read-only diagnostics

```bash
npx rn-firebase-cli doctor
```

```
🔥 Firebase Doctor

Project
  ✔ Framework: Next.js (App Router) (bun)
  ✔ Firebase CLI: Installed (v15.8.0)
  ✔ Firebase authentication: Authenticated as you@example.com

Environment
  ✔ .env.local: Environment configuration file found

Web
  ✔ Firebase configuration: Configuration module found (src/lib/firebase.ts)

Dependencies
  ✔ firebase (JS SDK): Installed

No problems detected! Your Firebase setup is healthy.
```

### Fix — automated remediation

```bash
npx rn-firebase-cli fix          # fix all issues
npx rn-firebase-cli fix env      # fix .env / .env.local variables
npx rn-firebase-cli fix web      # fix client boilerplate
npx rn-firebase-cli fix android  # fix Android native
npx rn-firebase-cli fix ios      # fix iOS native
npx rn-firebase-cli fix deps     # install missing packages
```

---

## 🛡️ Safety Principles

- **No passwords** — uses official `firebase login` OAuth session
- **No silent overwrites** — existing `google-services.json` and `GoogleService-Info.plist` are backed up as `.bak` before replacement
- **Env safety** — `.env.local` and `.env` parsing preserves all existing environment variables
- **No shell injection** — all subprocess execution uses `shell: false` with argument validation
- **Path traversal protection** — paths from `app.json` are validated against root boundary
- **Idempotent** — running setup multiple times never duplicates Gradle plugins or env keys

---

## 🧪 Development & Testing

```bash
# Clone
git clone https://github.com/tharunpoongavanam/rn-firebase-cli.git
cd rn-firebase-cli

# Install
bun install

# Run tests (44 tests across 7 suites)
bun test

# Build for distribution
bun run build
```

---

## 📄 License

[MIT](LICENSE) © [Tharun Poongavanam](https://github.com/tharunpoongavanam)

---

<div align="center">

**[npm](https://www.npmjs.com/package/rn-firebase-cli)** · **[GitHub](https://github.com/tharunpoongavanam/rn-firebase-cli)** · **[Issues](https://github.com/tharunpoongavanam/rn-firebase-cli/issues)**

Made with ❤️ for the Web & Mobile React community

</div>