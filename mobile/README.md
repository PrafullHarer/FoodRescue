# 📱 FoodRescue Mobile Application (Expo & React Native)

An exact, production-ready mobile application for the **FoodRescue** platform, featuring native hardware integration, an uncompromised 1:1 replica of the web experience, and a dedicated **Google Lens-style 4:3 QR code camera scanner**.

---

## 🌟 Key Capabilities

### 1. 📷 Google Lens-Style 4:3 QR Code Scanner
- **Hardware-Accelerated Live Feed:** Streams edge-to-edge rear camera preview directly from device camera sensors via `expo-camera` (`CameraView`).
- **4:3 Aspect Ratio Camera Module:** Precision-calculated 4:3 portrait camera viewport (`cameraWidth : cameraHeight = 3 : 4`) centered between sleek solid black letterbox bars.
- **Google Lens Overlay Reticle:**
  - 4 white curved corner brackets (`borderTopLeftRadius: 28`, `#FFFFFF`).
  - Animated neon-green laser scanning line (`#84CC16`) with glowing ambient elevation.
  - Contextual instruction pill: *"Point at donor or shelter QR code to scan"*.
  - Scanned confirmation checkmark badge with instant vibrational haptic feedback.
- **Top Navigation & Controls:**
  - Pinned back button (`←`) on top-left.
  - Flashlight toggle (`flash`) and camera flip toggle (`camera-reverse-outline`) on top-right.
  - Clean design with the words "QR Scanner" removed for a minimal, distraction-free view.
- **Bottom Bar & Actions:**
  - "Manual Code" pill button for entering alphanumeric tokens manually.
  - Google Lens double-ring circular scan shutter button centered at the bottom.
- **Zero SurfaceView Occlusion:** Unconstrained GPU surface rendering that avoids Android `SurfaceView` clipping conflicts.

### 2. 🌉 Bi-Directional Web-Native Bridge
- Integrates seamlessly with the web client:
  - Injects `window.isFoodRescueNativeApp = true`.
  - Exposes `window.openNativeCamera()` to trigger the native hardware scanner from web pages.
  - Safely unmounts Chromium WebView when the camera opens, granting 100% of the device's hardware graphics compositor to the camera.
  - Auto-extracts scanned codes, pre-fills the verification URL (`/qr-scan?code=<TOKEN>`), and reloads the web client with instant inspection checklist triggers.

### 3. 🎨 Zero Style Deviation (1:1 Web Replica)
- Exact Tailwind CSS dark carbon aesthetic matching the desktop and mobile web experiences:
  - Deep carbon background (`#050505`)
  - Elevated surfaces (`#121214`)
  - Subtle borders (`#232328`)
  - Vibrant brand lime accent (`#84CC16`)
- Full access to all platform features:
  - **Landing Page:** Interactive redistribution flow with dual QR badges.
  - **Authentication:** Email/password login, demo 1-click credentials, and Google OAuth.
  - **Provider Hub:** Post surplus food, manage active listings, track ESG environmental metrics.
  - **NGO Shelter Hub:** Live donation feed, proximity filtering, 1-click reservation, and claim tracking.
  - **Volunteer Courier Hub:** Delivery missions, route handovers, and physical verification.
  - **Trust & Reputation:** Click-to-view user reputation cards and verified rating scorecards.

### 4. 📱 Native Device Integrations
- **Physical Back Button Handling:** Android hardware back button traverses web history before minimizing the application.
- **Safe Area Insets:** Protected against display notches, status bars, and home indicator gesture bars on both Android and iOS.
- **Dynamic Dev Host Resolution:** Automatically discovers the development machine's LAN IP (`10.221.100.64:5173`) from Metro's `scriptURL` so physical devices running Expo Go connect effortlessly over local Wi-Fi.

---

## 📁 Project Structure

```
mobile/
├── assets/                       # App icons, splash screens, logos
│   ├── icon.png
│   ├── splash-icon.png
│   └── logo.png
├── src/
│   ├── api/                      # Mobile API client and network configuration
│   │   ├── client.js
│   │   └── config.js
│   ├── components/               # Native UI components & camera modal
│   │   ├── NativeCameraModal.js  # 📷 Google Lens 4:3 QR code camera scanner
│   │   ├── Header.js
│   │   ├── Logo.js
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Badge.js
│   │   └── Card.js
│   ├── context/                  # Mobile auth state context
│   │   └── AuthContext.js
│   ├── navigation/               # Stack & tab navigators
│   │   ├── RootNavigator.js
│   │   ├── AuthNavigator.js
│   │   ├── NGONavigator.js
│   │   ├── ProviderNavigator.js
│   │   └── VolunteerNavigator.js
│   ├── screens/                  # Native screen implementations
│   │   ├── WebviewReplicaScreen.js # Primary container with webview bridge
│   │   ├── auth/                 # Login, Register, VerificationPending screens
│   │   ├── ngo/                  # BrowseDonations, MyClaims, NGOProfile screens
│   │   ├── provider/             # CreateDonation, ProviderDashboard, ProviderDonations screens
│   │   └── volunteer/            # Deliveries, DeliveryDetail, QRScannerScreen screens
│   └── theme/                    # Color tokens and constants
│       └── colors.js
├── App.js                        # App entry point with SafeAreaProvider
├── app.json                      # Expo application manifest
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Backend API running on port 3000
- Frontend web app running on port 5173
- Mobile device with **Expo Go** installed (available on Google Play & Apple App Store)

### 2. Start Services
Ensure the backend API and frontend dev server are running:
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend Web App
cd frontend
npm run dev
```

### 3. Launch Mobile Development Server
```bash
# Terminal 3: Mobile Expo Metro Bundler
cd mobile
npx expo start
```

### 4. Open the App
- **Physical Phone:** Scan the Metro QR code using **Expo Go** (Android) or the default Camera app (iOS).
- **Android Emulator:** Press `a` in the Metro terminal.
- **iOS Simulator:** Press `i` in the Metro terminal.
- **Reload / Refresh:** Press `r` in the Metro terminal or shake your physical device and tap **Reload**.

---

## 🛠️ Build & Verification Commands

```bash
# Verify JavaScript & asset bundling for Android
npx expo export --platform android

# Check dependencies with Expo Doctor
npx expo-doctor
```
