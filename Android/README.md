# Splitzy - Mobile App

Cross-platform mobile app for the Splitzy expense sharing platform, built with React Native (Expo).

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Expo SDK | 55 | Managed workflow + dev builds |
| React Native | 0.83 | Cross-platform UI |
| React | 19 | Component library |
| TypeScript | 5.9 | Type safety |
| Expo Router | 55 | File-based navigation |
| Zustand | 5 | State management |
| NativeWind | 4 | Tailwind CSS for RN |
| Axios | 1.13 | HTTP client |
| Moti + Reanimated | - | Animations |

## Prerequisites

### Node.js

- **Node.js** >= 18 (LTS recommended)
- **npm** >= 9

### For Local Android Builds

- **JDK 21** (Liberica recommended — free, no license required)
  ```bash
  # Install via SDKMAN
  curl -s "https://get.sdkman.io" | bash
  sdk install java 21.0.9-librca
  sdk default java 21.0.9-librca
  ```

- **Android SDK** (API 35)
  ```bash
  # Set environment variables in ~/.zshrc or ~/.bashrc
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

  # Install required SDK components
  sdkmanager "platforms;android-35" "build-tools;35.0.0" "ndk;27.1.12297006" "platform-tools"
  ```

- **Gradle** 8.13 (bundled with the project wrapper — no manual install needed)

> **Important:** Gradle 9.0 has a known `IBM_SEMERU` bug. The project pins Gradle to 8.13 via the wrapper.

### For EAS Cloud Builds

- **EAS CLI** >= 15.0.0
  ```bash
  npm install -g eas-cli
  eas login
  ```

## Installation

```bash
cd Android
npm install
```

> The project uses `.npmrc` with `legacy-peer-deps=true` to handle peer dependency conflicts with React Native 0.83.

## Development

### Start Dev Server

```bash
npm start
# or
npx expo start
```

Scan the QR code with **Expo Go** (limited features) or a **development build** (full native module support).

### Run on Device/Emulator

```bash
npm run android    # Android
npm run ios        # iOS (macOS only)
```

### Type Check

```bash
npx tsc --noEmit
```

## Building APK (Local)

### 1. Prebuild Native Project

Generates the `android/` directory from `app.json` config:

```bash
npx expo prebuild --platform android --clean
```

> Re-run this whenever you change `app.json`, add/remove native plugins, or install packages with native modules.

### 2. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

### 3. Find the APK

```
android/app/build/outputs/apk/release/app-release.apk
```

### Quick Rebuild (no config changes)

If you only changed JS/TS code and the `android/` folder already exists:

```bash
cd android && ./gradlew assembleRelease
```

## Building with EAS (Cloud)

### Preview APK (Internal Testing)

```bash
eas build -p android --profile preview
```

### Production AAB (Play Store)

```bash
eas build -p android --profile production
```

### Development Build (With Dev Client)

```bash
eas build -p android --profile development
```

## Project Structure

```
Android/
├── app.json                  # Expo config (app name, icons, plugins)
├── eas.json                  # EAS Build profiles
├── package.json
├── tsconfig.json
├── tailwind.config.js        # NativeWind/Tailwind config
├── metro.config.js           # Metro bundler config
├── babel.config.js
├── global.css                # Tailwind base styles
├── assets/                   # Fonts, icons, images
│   ├── fonts/                # Inter font family
│   ├── icon.png              # App icon (512x512)
│   ├── android-icon-foreground.png
│   └── splash-icon.png
└── src/
    ├── app/                  # Expo Router (file-based routes)
    │   ├── _layout.tsx       # Root layout + auth guard
    │   ├── (auth)/           # Login, register, forgot-password, verify-email
    │   ├── (tabs)/           # Bottom tabs: Dashboard, Groups, Activity, Profile
    │   ├── group/            # Group detail [id], create
    │   ├── expense/          # Add expense, expense detail [id]
    │   └── settle-up.tsx     # Settlement flow
    ├── components/           # Reusable UI components
    │   ├── ui/               # GlassCard, Button, Input, Avatar, Toast, etc.
    │   ├── layout/           # ScreenWrapper, Header
    │   ├── dashboard/        # Balance summary, recent groups
    │   ├── groups/           # Group cards, search, filters
    │   ├── group-detail/     # Expense list, members, charts, balances
    │   ├── expense/          # Split selector, category picker
    │   ├── settle/           # Settle up form + confirmation
    │   └── auth/             # Auth-specific components
    ├── services/api/         # Axios client + endpoint services
    ├── stores/               # Zustand state stores
    ├── theme/                # Colors, typography, spacing
    ├── hooks/                # Custom React hooks
    ├── utils/                # Formatters (currency, date), validators
    ├── types/                # TypeScript type definitions
    └── constants/            # API endpoints, expense categories
```

## Configuration

### API

The app connects to the Splitzy backend at `https://splitzy.aarshiv.xyz`. API base URL is configured in `src/services/api/client.ts`.

### App Identity

| Field | Value |
|---|---|
| Package name | `com.splitzy.app` |
| Bundle ID | `com.splitzy.app` |
| EAS Project ID | `5c69f0f3-152a-4894-b433-1f2570a9aec7` |

### Environment Variables

Add these to your shell profile (`~/.zshrc` or `~/.bashrc`) for local builds:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# Java (after SDKMAN init)
export JAVA_HOME=$HOME/.sdkman/candidates/java/current
```

## Troubleshooting

### Peer dependency errors during `npm install`
The `.npmrc` file already sets `legacy-peer-deps=true`. If you still see errors, run:
```bash
npm install --legacy-peer-deps
```

### Gradle build fails with `IBM_SEMERU` error
Ensure Gradle wrapper is pinned to 8.13, not 9.0:
```
# android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=...gradle-8.13-bin.zip
```

### `npx expo prebuild` fails
Clear the native directory and retry:
```bash
rm -rf android
npx expo prebuild --platform android --clean
```

### Build succeeds but app crashes on launch
Check that all native modules are listed in `app.json` plugins array. After adding a new native package, always re-run `npx expo prebuild --platform android --clean`.
