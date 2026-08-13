# Genesis School LMS - Android APK Build Guide

## Prerequisites (Install These First)

### 1. Node.js (v18+)
Download from https://nodejs.org — pick LTS version.

### 2. Java JDK 17
Download from https://adoptium.net/temurin/releases/?version=17
- Install to default path: `C:\Program Files\Java\jdk-17`
- Set JAVA_HOME environment variable:
  ```
  setx JAVA_HOME "C:\Program Files\Java\jdk-17"
  ```

### 3. Android Studio (for SDK)
Download from https://developer.android.com/studio
- During install, make sure "Android SDK" is checked
- After install, open Android Studio > Settings > SDK Manager
- Install these under "SDK Platforms":
  - Android 14 (API 34) or Android 15 (API 35)
- Install these under "SDK Tools" tab:
  - Android SDK Build-Tools 35.0.0
  - Android SDK Command-line Tools (latest)
  - Android SDK Platform-Tools
  - NDK (Side by side) — latest version
- Note your SDK path (usually): `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`

### 4. Set Environment Variables
```powershell
# Run in PowerShell as Administrator
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "User")

# Remove ANDROID_SDK_ROOT if it exists (conflicts with ANDROID_HOME)
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $null, "User")
```

### 5. Accept Android SDK Licenses
```powershell
# Run in PowerShell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
# Press 'y' to accept all licenses
```

---

## Project Setup

### 1. Extract the ZIP
Extract `school-lms.zip` to a folder, e.g., `C:\school-lms`

### 2. Install Backend Dependencies
```powershell
cd C:\school-lms\lms\backend
npm install
```

### 3. Setup Backend Environment
Copy `.env.example` to `.env` in the backend folder and fill in:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_lms
DB_USER=lms
DB_PASSWORD=your_password_here

# Server
PORT=3001
NODE_ENV=development

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### 4. Start Backend
```powershell
cd C:\school-lms\lms\backend
npm run dev
# Backend should start on http://localhost:3001
```

### 5. Install Mobile App Dependencies
```powershell
cd C:\school-lms\lms\mobile\app
npm install
```

### 6. Configure Mobile App Environment
The `.env` file should already exist with:
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_SUPABASE_URL=https://jfqpukpzgmzwzzjrcxra.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fqk3AYibfJUOWj1pyqkfjA_WhT3Cl-i
```
Update `EXPO_PUBLIC_API_URL` if your backend runs on a different port/address.

---

## Build APK (Two Options)

### Option A: EAS Cloud Build (Recommended — No Android SDK Needed)

```powershell
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create free account at https://expo.dev)
eas login

# Build APK
cd C:\school-lms\lms\mobile\app
eas build --platform android --profile preview --non-interactive
```

When build completes (~10-20 min), download the APK from the URL shown.

**Troubleshooting:**
- "Build credits exhausted" — Create a new Expo account: `eas logout` then `eas login`
- "No lock file" — Run `npm install` in `lms/mobile/app/` first
- "Missing peer dependency: react-native-worklets" — Run `npm install react-native-worklets`
- "Image not square" — Icon must be 1024x1024 PNG. See "Fix Icon" section below.

### Option B: Local Build (Requires Android SDK — 5-15 min)

```powershell
cd C:\school-lms\lms\mobile\app

# Step 1: Generate native Android project
npx expo prebuild --platform android --clean

# Step 2: Build debug APK
cmd /c "set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk&& set JAVA_HOME=C:\Program Files\Java\jdk-17&& cd /d C:\school-lms\lms\mobile\app\android && gradlew.bat assembleDebug --no-daemon"
```

APK will be at: `lms\mobile\app\android\app\build\outputs\apk\debug\app-debug.apk`

**Troubleshooting:**
- "ANDROID_HOME and ANDROID_SDK_ROOT contain different paths" — Delete ANDROID_SDK_ROOT env var
- "License not accepted" — Run `sdkmanager --licenses` and accept all
- "Could not resolve kotlin-gradle-plugin" — Check internet connection, retry
- "NDK not installed" — Install NDK via Android Studio SDK Manager
- "JAVA_HOME invalid" — Verify path exists: `Test-Path "C:\Program Files\Java\jdk-17"`

---

## Fix Icon (If Build Fails Due to Non-Square Image)

The icon `assets/genesis_icon.png` must be square (1024x1024). To fix:

```powershell
cd C:\school-lms\lms\mobile\app

# Install sharp temporarily
npm install sharp --no-save

# Run this Node.js script to resize
node -e "const sharp = require('sharp'); sharp('./assets/genesis_icon.png').resize(1024, 1024, { fit: 'contain', background: { r: 250, g: 250, b: 245, alpha: 1 } }).png().toFile('./assets/genesis_icon_fixed.png').then(() => { require('fs').copyFileSync('./assets/genesis_icon_fixed.png', './assets/genesis_icon.png'); require('fs').unlinkSync('./assets/genesis_icon_fixed.png'); console.log('Icon fixed to 1024x1024'); })"
```

---

## Install APK on Phone

1. Enable "Developer Options" on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable "USB Debugging" in Developer Options
3. Connect phone via USB
4. Install:
   ```powershell
   adb install path\to\app-debug.apk
   ```
   Or transfer the APK file to your phone and open it.

---

## Quick Start Script (All-in-One)

Save this as `build.bat` in the project root:

```batch
@echo off
echo === Genesis LMS APK Builder ===

echo [1/4] Installing mobile dependencies...
cd /d %~dp0lms\mobile\app
call npm install

echo [2/4] Fixing icon if needed...
node -e "try{const s=require('sharp'),f=require('fs');s('./assets/genesis_icon.png').resize(1024,1024,{fit:'contain',background:{r:250,g:250,b:245,alpha:1}}).png().toFile('./tmp_icon.png').then(()=>{f.copyFileSync('./tmp_icon.png','./assets/genesis_icon.png');f.unlinkSync('./tmp_icon.png');console.log('Icon OK')})}catch(e){console.log('Icon skip: '+e.message)}"

echo [3/4] Generating Android project...
call npx expo prebuild --platform android --clean

echo [4/4] Building APK...
cd android
call gradlew.bat assembleDebug --no-daemon

echo === Build complete! ===
echo APK: lms\mobile\app\android\app\build\outputs\apk\debug\app-debug.apk
pause
```

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `ngrok tunnel took too long` | Use LAN mode: `npx expo start` (no --tunnel) |
| `No lock file detected` | Run `npm install` in mobile/app |
| `Missing peer dependency: react-native-worklets` | `npm install react-native-worklets` |
| `Image not square` | Resize icon to 1024x1024 (see Fix Icon section) |
| `Build credits exhausted` | Create new Expo account, `eas logout` then `eas login` |
| `ANDROID_HOME vs ANDROID_SDK_ROOT` | Delete ANDROID_SDK_ROOT env var |
| `License not accepted` | `sdkmanager --licenses` and press y for all |
| `Could not resolve module` | Delete `node_modules` and `package-lock.json`, run `npm install` again |
| `SyntaxError in babel` | Ensure `react-native-worklets` is in `package.json` dependencies |
| `JAVA_HOME invalid` | Verify JDK 17 installed at `C:\Program Files\Java\jdk-17` |

---

## Environment Variables Summary

| Variable | Value | Where |
|----------|-------|-------|
| `JAVA_HOME` | `C:\Program Files\Java\jdk-17` | System env |
| `ANDROID_HOME` | `C:\Users\YOU\AppData\Local\Android\Sdk` | System env |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/api` | Mobile `.env` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://jfqpukpzgmzwzzjrcxra.supabase.co` | Mobile `.env` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_fqk3AYibfJUOWj1pyqkfjA_WhT3Cl-i` | Mobile `.env` |

---

## File Structure After Setup

```
school-lms/
  lms/
    backend/          ← Express API server (port 3001)
      src/
      package.json
      .env            ← Database config
    mobile/
      app/            ← Expo React Native app
        assets/       ← Icons, splash screen
        src/          ← App source code
        package.json
        app.json      ← Expo config
        eas.json      ← EAS build config
        .env          ← API URL + Supabase keys
    frontend/         ← Web frontend (separate)
```

---

## Notes

- The mobile app talks to the backend API at `localhost:3001`
- For testing on a real phone with LAN, update `EXPO_PUBLIC_API_URL` to your PC's local IP (e.g., `http://192.168.1.100:3001/api`)
- The APK connects to Supabase cloud for auth — no local Supabase needed
- Backend requires a PostgreSQL database — use Docker or install locally
