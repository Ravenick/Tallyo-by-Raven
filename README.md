# Tallyo | Premium People Counter

> **Tallyo by Raven**  
> A sleek, offline-first modern people counter with vibrant glowing neon controls, timestamps, instant exports, and native Android APK support.

---

## ✨ Features

- **Built by Raven**: Designed for speed, precision, and an exceptional user experience.
- **100% Offline-First**: All data (events, counts, user profiles, and theme preferences) persists locally via synchronous `localStorage` storage—works flawlessly with or without an internet connection.
- **Glowing Neon Controls**: Ultra-responsive `+` and `−` counter buttons with neon halo glow effects, rapid incrementing, and native haptic feedback on Android.
- **Custom Native Splash Screen**: Bespoke dark background (`#0b0d14`) featuring the smooth glowing cyan Tallyo logo with zero white-flash transitions and `androidx.core:core-splashscreen` support.
- **Event Management**: Create fresh timestamped events, log individual saved counts, edit or delete tiles, and merge previous events together.
- **Export & Sharing**:
  - Downloadable `.txt` log format
  - One-tap "Copy Raw" clipboard button
  - Native Android Share Sheet integration (Save to Drive, Files, Notes, or messaging)
- **Personalization**:
  - Dark and Light mode toggle
  - 4 Neon Accents: **Electric Cyan**, **Neon Lime**, **Hot Pink**, and **Cyber Amber**
  - Profile customization: Display name and custom profile picture upload

---

## 📱 Android App (APK)

A pre-built, ready-to-install debug APK is available in the root directory:
- **Location**: [`./Tallyo.apk`](./Tallyo.apk) (~5.88 MB)

### Android Specifications
- **Target SDK**: Android 36 (Android 14/15+)
- **Minimum SDK**: Android 24 (Android 7.0+)
- **Permissions**:
  - `android.permission.VIBRATE`: Tactile haptic feedback on count taps
  - `android.permission.INTERNET`: Webview runtime compatibility
  - `android.permission.READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE`: Profile photo avatar selection
  - `android.permission.WRITE_EXTERNAL_STORAGE`: Legacy file export support

---

## 🛠️ Tech Stack

- **Framework**: React 19, TanStack Start & TanStack Router
- **Build Tool**: Vite 8 with static prerendering
- **Mobile Native Runtime**: Capacitor 8 (`@capacitor/android`, `@capacitor/haptics`, `@capacitor/splash-screen`)
- **Styling**: Tailwind CSS v4, Lucide Icons

---

## 🚀 Development & Build

### 1. Install Dependencies
```sh
npm install
```

### 2. Run Local Web Dev Server
```sh
npm run dev
```

### 3. Build Web Assets
```sh
npm run build
```

### 4. Sync & Build Android APK
Ensure JDK 17 and Android SDK are configured on your system:

```sh
# Sync web build to native Android
npx cap sync android

# Build the Android APK
cd android
.\gradlew.bat assembleDebug
```
The output APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 👤 Author

**Tallyo by Raven**  
Built with craft and attention to detail.
