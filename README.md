# 🥦 FoodRescue — Smart Surplus Food Donation & Redistribution Platform

> An end-to-end, full-stack web platform connecting food providers, NGOs/shelters, and volunteer drivers to rescue surplus food in real time and eliminate food waste.


![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 Overview

Every day, restaurants, caterers, bakeries, and grocery stores produce edible surplus food that goes to waste, while local shelters and charities face shortages. **FoodRescue** bridges this gap with an end-to-end full-stack web and native mobile ecosystem (React 19 & Expo SDK 52) featuring real-time claims, multi-factor smart shelter selection algorithms, route handovers with dual-QR verification, Google Lens-style 4:3 hardware camera scanner, automated food expiry management, Google OAuth & clean 6-digit email OTP security, user verification governance, automated donation completion emails, comprehensive complaints & incident management, public feedback collection, admin analytics with geographical donation hotspots, and ESG environmental impact analytics.

---

## 👥 Core Features by Role

### 🥖 1. Food Providers (Restaurants, Caterers, Bakeries, Supermarkets)
- **Post Surplus Food**: Quick listing form with food categories, quantity, dietary badges (vegan, halal, nut-free, etc.), and expiry countdown timer.
- **Interactive Location Picker**: Full-screen dark carbon Leaflet map with custom branded center pin, live device GPS auto-detect, Nominatim address reverse-geocoding, and map layer switcher (Dark Matter vs Street Map).
- **Intelligent Shelter Selection**: Inspect multiple competing NGO claim requests ranked in real time by the **Smart Shelter Claim Priority Algorithm** (evaluating hunger need, capacity, community reviews, proximity, and reliability) with dynamic badges and 5-factor breakdown bars.
- **Manage Listings**: Real-time status tracking (`posted` ➔ `claimed` ➔ `in_transit` ➔ `delivered`).
- **Data Isolation**: Providers can only view, edit, and delete their own donations — never another provider's listings.
- **ESG Impact Metrics**: Track total kilograms rescued, meals donated, and CO₂ emissions avoided.
- **Automated Completion Receipts**: Automated email receipts containing verified meal metrics upon shelter handover.
- **Trust & Reputation**: Click volunteer names to inspect delivery success rates, on-time delivery percentages, and partner ratings; track donor ratings and packaging feedback.

### 🤝 2. NGOs & Community Shelters
- **Live Donation Feed**: Filter available surplus food by proximity, category, and servings.
- **1-Click Reservation & Fair Selection**: Instant claim system to secure food packages before expiry, with transparent algorithm-backed prioritization factoring in hunger need, days since last donation, and capacity.
- **Delivery Tracking**: Monitor incoming supplies from assigned volunteer couriers.
- **Direct Self-Pickup**: NGOs can opt for direct pickup from the food provider with single-step QR verification.
- **Account Verification Gating**: Mandatory onboarding verification to guarantee shelter legitimacy.
- **Data Isolation**: NGOs can only see their own claims and claim data — never another NGO's private information.
- **Verified Donor Trust**: Click provider names to view their 5-star rating breakdown, verified donation count, and historical reviews before claiming food.

### 🚚 3. Volunteers & Couriers
- **Delivery Missions**: Browse active delivery runs and accept pickup/dropoff tasks.
- **Handover QR Verification**: Built-in QR scanner and native Google Lens 4:3 hardware camera scanner to verify physical handoff.
- **Data Isolation**: Volunteers can only access deliveries assigned to them and their own delivery history.
- **Courier Reputation**: Transparent courier metrics showing successful delivery rate %, on-time rate %, and verified provider/NGO feedback.
- **Volunteer Leaderboard**: Gamified rankings based on completed delivery missions.

### 🛡️ 4. Administrators
- **Verification Portal**: Dedicated verification queue (`/admin/verifications`) to review registrations, inspect tax/business IDs, request info, approve, or reject accounts.
- **User Governance**: Activate, suspend, or manage platform participants.
- **Super Administrator Protection**: Immutable root administrator credentials protected against accidental or unauthorized account deletion and public password resets.
- **Advanced Analytics**: KPI dashboard, geographical donation hotspots (Leaflet map with clustered markers), wasted food categories, NGO demand gaps, delivery reliability, and inactive provider tracking.
- **Complaint Management**: Full lifecycle complaint resolution — submission, assignment, priority management, threaded messaging, audit history, CSV export, and status transitions.
- **Incident Management**: Automated incident detection, severity tracking, assignment, escalation, notes, and resolution workflows.
- **Feedback Portal**: Admin-only review of public user feedback with status management and admin notes.
- **Review Moderation**: Audit trail and moderation portal for flagged or policy-violating ratings.
- **Notification Isolation**: Admins receive only platform governance notifications (incidents, escalations, complaints, verifications) — never donation-related alerts.
- **Security Audit Logs**: Tamper-evident activity trail.

---

## 🔐 Authentication, Security & Account Lifecycle

FoodRescue implements enterprise-grade authentication, role-based session governance, cryptographic OTP dispatch, and strict data privacy lifecycle protocols:

### 1. Registration & Authentication Methods
- **Email & Password**: Registration with full name, email, phone (strictly formatted with India `+91`), role selection, and Leaflet map location picker. Passwords securely hashed using `bcrypt` (10 rounds).
- **Clean 6-Digit Email OTP Verification**: Real-time cryptographically generated 6-digit OTPs dispatched directly to user inboxes via Nodemailer. Zero client-side bypasses or exposed development codes in production.
- **Continue with Google (OAuth 2.0)**:
  - Integrated via **Google Identity Services** on Login and Register pages.
  - Backend token verification using `google-auth-library`.
  - Automatic email linking to prevent duplicate accounts.
  - Mandatory profile completion redirect (`/complete-profile`) for first-time Google sign-ups.

### 2. Self-Service Password Recovery (Forgot / Reset Password)
- Standardized self-service recovery available to **Food Providers**, **NGO Shelters**, and **Volunteers**.
- **Two-Step Email OTP Flow**:
  1. `POST /api/auth/forgot-password`: Generates a single-use 6-digit token (10-minute expiry) and emails it to the user.
  2. `POST /api/auth/reset-password`: Validates the OTP and commits the new `bcrypt` password hash.
- **Super Administrator Protection Policy**: Root Super Administrators (`role === 'admin'`) are strictly excluded from public forgot-password workflows. Any reset attempt against an admin account is blocked with `403 Forbidden` and audited to prevent takeover attempts.

### 3. Account Deletion & Data Privacy ("Danger Zone")
- Self-service account termination accessible from the **Profile Page** (`/profile`) under the Security section.
- **Double Confirmation Safeguards**: Requires re-entering the account password (or typing `"DELETE"` for OAuth-only users).
- **In-Flight Mission Protection**: Account deletion is strictly prohibited if the user is actively involved in incomplete operations:
  - Providers with active donations in `posted`, `claimed`, or `in_transit` state.
  - NGOs with active, unfulfilled claims or incoming deliveries.
  - Volunteers with assigned or in-transit delivery missions.
- **Super Administrator Exemption**: The Super Admin account is permanently immune to deletion via API or UI to prevent platform lockout.
- **Cascading Data Cleanup**: Deletion safely disassociates user data, invalidates active push tokens, cleans up notification records, and marks public review references.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Account Deletion Safeguards                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  User Clicks "Delete Account" in Profile Settings                      │
│            │                                                           │
│            ├── Is User Role === 'admin'?                               │
│            │       │                                                   │
│            │       └──► YES: 🛑 HTTP 403 Forbidden (Admin Protected)    │
│            │                                                           │
│            ├── Validate Credential (Password / "DELETE" confirmation)  │
│            │       │                                                   │
│            │       └──► INVALID: 🛑 HTTP 400 Incorrect Confirmation    │
│            │                                                           │
│            ├── Check In-Flight Mission Lock:                           │
│            │   • Active Provider Donations (posted / claimed)?         │
│            │   • Active NGO Claims / Inbound Deliveries?               │
│            │   • Active Volunteer In-Transit Deliveries?               │
│            │       │                                                   │
│            │       └──► ACTIVE FOUND: 🛑 HTTP 400 Complete/Cancel First │
│            │                                                           │
│            └──► ALL CLEAR: ✅ Delete Profile, Roles, & Tokens           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 QR Code Verification System

FoodRescue uses a dual-QR code handover system to ensure tamper-proof verification at every stage of the food rescue pipeline. Each delivery is assigned two unique QR codes — one for **pickup** and one for **dropoff** — that cryptographically tie the physical handoff to the digital delivery record.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    QR Code Verification Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CLAIM                                                               │
│     NGO claims a donation ─► Delivery record created                    │
│                              ─► 2 QR codes auto-generated               │
│                                  • RESCUE-PK-XXXX (Pickup)              │
│                                  • RESCUE-DL-XXXX (Dropoff)             │
│                                                                         │
│  2. PICKUP VERIFICATION                                                 │
│     Volunteer arrives at Food Provider                                  │
│     ─► Scans Pickup QR (RESCUE-PK-XXXX)                                │
│     ─► Quality Inspection Checklist auto-filled:                        │
│         ✅ Freshness & Visual Quality                                   │
│         ✅ Packaging & Seal Integrity                                   │
│         ✅ Safe Storage & Temperature                                   │
│         ✅ Portion & Quantity Match                                      │
│     ─► Delivery status: claimed → in_transit                            │
│     ─► Provider & NGO notified                                          │
│                                                                         │
│  3. DROPOFF VERIFICATION                                                │
│     Volunteer arrives at NGO/Shelter                                    │
│     ─► NGO scans Dropoff QR (RESCUE-DL-XXXX)                           │
│     ─► NGO reviews volunteer's Quality Checklist                        │
│     ─► Delivery status: in_transit → delivered                          │
│     ─► Provider, Volunteer & NGO all notified                           │
│     ─► Stats updated (deliveries, meals rescued)                        │
│                                                                         │
│  ALT. DIRECT NGO SELF-PICKUP                                           │
│     NGO picks up directly from Provider                                 │
│     ─► Scans Pickup QR only                                             │
│     ─► Single-step: claimed → delivered                                 │
│     ─► Both pickup & delivery confirmed at once                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### QR Code Features

| Feature | Details |
|---|---|
| **Code Format** | `RESCUE-PK-<12-hex>` (pickup) / `RESCUE-DL-<12-hex>` (dropoff) |
| **Generation** | Cryptographically random (`crypto.randomBytes`) — unique per delivery |
| **Rendering** | QR data URLs generated server-side via `qrcode` library (320×320px) |
| **Expiry** | 7-day TTL from generation — expired codes are rejected |
| **One-Time Use** | Each QR code can only be scanned once — prevents replay attacks |
| **Preview Mode** | Volunteers can preview donation details before confirming pickup |
| **Quality Checklist** | 4-point inspection auto-attached on pickup scan |
| **Notifications** | Real-time in-app alerts to Provider, NGO, and Volunteer on each scan |

### QR API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/qr-codes/generate/:deliveryId` | Generate QR pair for a delivery | admin, volunteer, provider, ngo |
| `GET` | `/api/qr-codes/preview/:code` | Preview QR details without scanning | all authenticated |
| `POST` | `/api/qr-codes/:code/scan` | Scan & verify a QR code | volunteer, ngo, admin, provider |
| `GET` | `/api/qr-codes/delivery/:deliveryId` | Get QR codes by delivery ID | all authenticated |
| `GET` | `/api/qr-codes/donation/:donationId` | Get QR codes by donation ID | all authenticated |

---

## 🗺️ Mobile-First Interactive Location Picker & Geolocation System

FoodRescue provides an edge-to-edge, mobile-optimized location picker modal (`MapAddressPickerModal.jsx`) engineered for precise pickup coordinates and volunteer dispatch accuracy.

### Key Capabilities
- **FoodRescue VIP Theme Matching**:
  - Deep carbon base surfaces (`#050505` / `#121214`) with `#232328` borders.
  - Electric neon lime accents (`#39FF14`) with pulsing active status indicator.
  - High-contrast, watermark-free Dark Mode map tiles using Leaflet and OpenStreetMap inverted CSS filters (`invert(100%) hue-rotate(180deg)`).
  - Map Style Switcher (`<Layers />` button) to toggle between Dark Matter and Standard Street tiles on the fly.
- **Branded Center Pin Marker**:
  - Animated teardrop pin with dark carbon body, `#39FF14` electric green rim, glowing inner core, and ground target contact ring.
  - Dynamically lifts on map movement and settles into exact street coordinates on release.
- **3-Tier Geolocation Engine (`geolocation.js`)**:
  1. **Tier 1 (Mobile Native GPS)**: Dispatched over the webview bridge via `expo-location` (`ACCESS_FINE_LOCATION`) on Android and iOS devices.
  2. **Tier 2 (Browser Geolocation API)**: Standard `navigator.geolocation.getCurrentPosition` with high-accuracy timeout fallback.
  3. **Tier 3 (Network IP Geolocation)**: Automatic fallback resolving network coordinates when GPS permissions are restricted.
- **Live Nominatim Reverse Geocoding**:
  - 350ms debounced reverse geocoding on map drag, resolving exact street, landmark, area, district, and postal code.
  - Collapsible search bar for instant landmark and street queries.
  - Floating high-z-index (`z-[1500]`) GPS FAB button to recenter map instantly.
- **Streamlined Donation Listing**:
  - Replaces cluttered multi-button forms with a clean "Open Location Picker" trigger and live volunteer coordinate readout in `CreateDonationPage.jsx`.

---

## 📱 Mobile Application (Expo & React Native)

FoodRescue includes a dedicated cross-platform mobile application located in `mobile/`, built on **Expo SDK 52** and **React Native 0.88**. It delivers a 1:1 mobile experience with the desktop web platform, packaged inside a high-performance webview container with direct native hardware access.

### 📷 Google Lens-Style 4:3 QR Code Camera Scanner
- **Direct Hardware Streaming**: Powered by `expo-camera` (`CameraView`), streaming live video feed directly from device camera sensors.
- **4:3 Aspect Ratio Viewport**: Precision-calculated 4:3 portrait camera frame (`cameraWidth : cameraHeight = 3 : 4`) letterboxed with solid black bars on top and bottom.
- **Unconstrained Surface Layer**: Live camera preview rendered on an unrestricted base layer to eliminate Android `SurfaceView` punch-hole clipping and black screen issues.
- **Google Lens Overlay Reticle**:
  - 4 white curved corner brackets (`borderTopLeftRadius: 28`, `#FFFFFF`).
  - Animated neon-green laser sweep line (`#84CC16`) with ambient elevation glow.
  - Contextual instruction pill: *"Point at donor or shelter QR code to scan"*.
  - Scanned confirmation checkmark badge with instant vibrational haptic feedback (`Vibration.vibrate(100)`).
- **Streamlined Top Bar Controls**:
  - Pinned back button (`←`) on top-left to exit camera mode immediately.
  - Flashlight toggle (`flash`) and camera flip switch (`camera-reverse-outline`) on top-right.
  - Minimal layout with the words "QR Scanner" removed for a clean, distraction-free viewfinder.
- **Bottom Bar & Actions**:
  - "Manual Code" pill button on the bottom-left for manual token entry (`RESCUE-PK-XXXX`).
  - Centered Google Lens double-ring circular scan shutter button.

### 🌉 Bi-Directional Web-Native Bridge
- Seamlessly connects the web application and native device capabilities:
  - Injects `window.isFoodRescueNativeApp = true`.
  - Exposes `window.openNativeCamera()` to trigger the native hardware scanner from web pages.
  - Safely unmounts Chromium WebView when the camera opens, granting 100% of the device's hardware graphics compositor to the camera sensor.
  - Automatically extracts scanned QR codes (`RESCUE-PK-XXXX`, `RESCUE-DL-XXXX`), navigates to `/qr-scan?code=<TOKEN>`, and re-mounts the webview with the 4-point Quality Checklist ready for verification.
  - **Native Geolocation Bridge**: Integrates `expo-location` to extract real-time GPS coordinates and emits `foodrescue:location-update` events to the WebView DOM for accurate, one-tap map positioning.
  - **Native Push Notifications**: Registers Expo Push Tokens with `/api/notifications/device-token` using `expo-notifications`, powering system tray push alerts and delivery updates.

### 🎨 Dark Carbon Styling (1:1 Web Match)
- Exact Tailwind CSS dark carbon aesthetic matching desktop and mobile web:
  - Deep carbon background (`#050505`)
  - Elevated surfaces (`#121214`)
  - Subtle borders (`#232328`)
  - Vibrant brand lime accent (`#84CC16`)

---

## ✉️ Automated Donation Completion Emails

When a food rescue mission is completed (via volunteer dropoff QR verification or direct shelter pickup), FoodRescue's `donation-email.service.js` triggers transactional confirmation emails to all participating parties.

### Dual-Party Automated Notifications
1. **Food Provider Completion Receipt**:
   - Summary of rescued food items and total weight (kg).
   - Equivalent meals provided and environmental metrics ($CO_2$ emissions avoided).
   - Receiving NGO shelter name, delivery timestamp, and verified volunteer driver recognition.
2. **NGO / Shelter Acknowledgment**:
   - Official delivery receipt and verification details.
   - Timestamped handover record for internal food bank accounting.

### Donation Lifecycle Timeline & Audit API
- `GET /api/donations/:id/timeline` — Chronological audit trail of all lifecycle events (`created` ➔ `claimed` ➔ `in_transit` ➔ `delivered`).
- `GET /api/donations/:id/completion-emails` — Email dispatch log verifying recipient, timestamp, and delivery status.
- `POST /api/donations/:id/completion-emails/retry` — Admin-only endpoint to re-dispatch failed completion notifications.

---

## 🛡️ User Verification & Governance Workflow

To maintain a trusted network of verified charities and licensed food businesses, FoodRescue includes a multi-step account verification pipeline:

### Workflow
1. **Registration & Role Selection**: New NGOs and food providers submit registration details and optional business license/tax exemption numbers.
2. **Pending Approval Gating**: Accounts with `verification_status = 'pending'` are redirected to the dedicated **Pending Approval Screen** (`/verification-pending`). Access to donation listings, claims, and dispatch tools remains locked until verified.
3. **Admin Verification Dashboard** (`/admin/verifications`):
   - Filter by status (`pending`, `approved`, `rejected`, `info_requested`, `suspended`).
   - Inspect organization details, contact info, and attached verification documentation.
   - 1-click status actions: Approve (activates full dashboard access), Request Info (sends notification to user for documentation), Reject (with reason notes), or Suspend.

---

## ⭐ Trust, Ratings & Reliability System

FoodRescue features an integrated, production-grade **Trust, Ratings & Reliability System** that prevents fraudulent feedback by anchoring every review to an actual, completed delivery or claim transaction (`deliveries.status = 'delivered'` or completed direct claim).

### 1. Verification Flow: Who Can Review Whom?

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Transaction-Verified Review Lifecycle                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   COMPLETED TRANSACTION                                                 │
│   (Food Rescue Handoff Confirmed via QR Verification)                   │
│                       │                                                 │
│       ┌───────────────┼────────────────┐                                │
│       ▼               ▼                ▼                                │
│   [NGO / SHELTER]  [VOLUNTEER]   [FOOD PROVIDER]                        │
│       │               │                │                                │
│       ├─► Review ────┼───────────────►│ (Packaging & Freshness)        │
│       │   Provider    │                │                                │
│       │               ├─► Review ─────►│ (Timely Handover & Cooperation)│
│       │               │   Provider     │                                │
│       ├─► Review ────►│                │                                │
│       │   Volunteer   │ (Careful Transport & Prompt Arrival)            │
│       │               │                │                                │
│       │               │◄─ Review ──────┤ (Volunteer Professionalism)    │
│       │               │   Volunteer    │                                │
│       │               │                │                                │
│       │◄─ Review ─────┴────────────────┤ (Dropoff Reception & Respect)  │
│       │   Shelter (Direct Self-Pickup)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Reviews cannot be submitted for pending, in-transit, expired, or cancelled donations. Server-side role checks reject self-reviews and prevent cross-transaction tampering.

### 2. Transparent Metrics & Mathematical Formulas

All scores and metrics are calculated transparently from verifiable database records:

* **Average Rating**:
  $$\text{Average Rating} = \frac{\sum \text{Eligible Star Ratings (1–5)}}{\text{Total Eligible Reviews}}$$

* **Delivery Success Rate**:
  $$\text{Success Rate} = \left( \frac{\text{Successfully Completed Deliveries}}{\text{Total Claimed Delivery Missions}} \right) \times 100$$

* **On-Time Delivery Rate**:
  $$\text{On-Time Rate} = \left( \frac{\text{Completed Deliveries Meeting Expiry Deadline}}{\text{Completed Deliveries with Valid Timestamp Data}} \right) \times 100$$
  *(Requires a minimum of 3 recorded deliveries before displaying an on-time percentage; zero denominators are handled gracefully without division errors or misleading placeholders).*

### 3. Click-to-View Reputation Profile

Clicking any Food Provider, Volunteer, or NGO Shelter name anywhere in the application opens a slide-in **Reputation Profile Modal**:
- **Verified Identity**: Official verified badge for registered food businesses and charities.
- **Scorecard**: Overall average out of 5.0 stars with star distribution bars (5★, 4★, 3★, 2★, 1★).
- **Transaction Statistics**: Completed rescues, delivery success rate %, and on-time delivery rate %.
- **Verified Feedback Stream**: Chronological list of completed transaction reviews with verified transaction tags, reviewer names, star breakdown, and written feedback.

### 4. My Ratings & Trust Hub (`/reviews`)

Accessible from the sidebar and profile, users can inspect their own reputation scorecard:
- **Received Reviews**: Filter by star rating, sort by recent/highest/lowest, and view transaction references.
- **Submitted Reviews**: View past reviews submitted for partners, with 48-hour inline edit policy for original reviewers.
- **Report & Moderation System**: Flag abusive or policy-violating reviews for admin audit and resolution.

### 5. Review API Endpoints

| Method | Endpoint | Description | Guard / Policy |
|---|---|---|---|
| `GET` | `/api/reviews/users/:userId` | Get user's public reputation summary, metrics, and verified review stream | Authenticated |
| `GET` | `/api/reviews/me` | Current user's reputation overview, received reviews & submitted reviews | Authenticated (provider, ngo, volunteer) |
| `GET` | `/api/reviews/eligibility/:deliveryId` | Check which reviews the authenticated user is eligible to submit for a delivery | Authenticated |
| `GET` | `/api/reviews/deliveries/:deliveryId` | Get all verified reviews associated with a delivery transaction | Authenticated |
| `POST` | `/api/reviews` | Submit a verified review (validates completion, prevents duplicate & self-reviews) | Authenticated + Zod |
| `PATCH` | `/api/reviews/:reviewId` | Edit a review (original reviewer only, within 48-hour audit window) | Authenticated |
| `POST` | `/api/reviews/:reviewId/report` | Report an inappropriate or policy-violating review | Authenticated |
| `PATCH` | `/api/reviews/:reviewId/moderate` | Admin moderation endpoint to approve, flag, or hide reviews | Role Guard (`admin`) |

---

## 🎯 Shelter Claim Requests & Selection Priority Algorithm

When multiple community shelters and NGOs submit claim requests for a single surplus food batch, FoodRescue replaces arbitrary first-come-first-served queues with an automated, multi-factor utility model (`claim-ranking.service.js`). The algorithm guarantees equitable food distribution, prevents food hoarding, minimizes cold-chain transport latency, and directs meals to where acute hunger need is greatest.

### Mathematical Formulation

The composite Priority Score ($P \in [0, 100]$) is computed as a weighted linear combination of five normalized dimensional scores:

$$\text{Priority Score} = \text{round}\left(S_{\text{need}} \times 0.35 + S_{\text{reviews}} \times 0.25 + S_{\text{capacity}} \times 0.20 + S_{\text{distance}} \times 0.15 + S_{\text{reliability}} \times 0.05\right)$$

```
┌────────────────────────────────────────────────────────────────────────┐
│             Shelter Selection Algorithm Weight Distribution            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [███████████████████████████████████]  35%  Hunger Need Intensity    │
│   [█████████████████████████]            25%  Community Trust & Rating │
│   [████████████████████]                20%  Absorption Capacity Match │
│   [███████████████]                     15%  Proximity & Cold-Chain    │
│   [█████]                                5%  Historical Reliability    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### The 5 Evaluation Factors

#### 1. Hunger Need Intensity ($S_{\text{need}}$, 35% Weight)
Ensures food reaches shelters experiencing acute deficit rather than those with saturated pantries:
- **Days Since Last Donation**: Evaluates historical intake timestamps:
  - $\ge 14\text{ days}$ or first-time recipient: $100\text{ points}$
  - $7 - 13\text{ days}$: $90\text{ points}$
  - $3 - 6\text{ days}$: $75\text{ points}$
  - $1 - 2\text{ days}$: $55\text{ points}$
  - Received today ($< 24\text{ hrs}$): $35\text{ points}$
- **Active Hoarding Dampener**: Deducts $10\text{ points}$ for every concurrent pending/in-transit claim already held by the shelter to prevent hoarding.
- **Beneficiary Scale Factor**: Grants up to $+15\text{ points}$ for large-scale operations ($\ge 500\text{ daily beneficiaries} \to +15$, $\ge 200 \to +10$, $\ge 50 \to +5$).

#### 2. Community Reviews & Trust ($S_{\text{reviews}}$, 25% Weight)
Prevents manipulation by new or unvetted accounts using Bayesian rating smoothing:
- **Bayesian Smoothed Score**:
  $$R_{\text{Bayes}} = \frac{C \cdot m + \sum_{i=1}^{n} r_i}{C + n}$$
  where prior confidence $C = 3$, platform baseline $m = 4.2$, and $r_i$ represents verified 5-star transaction reviews.
- **Positive Sentiment Bonus**: Adds $+5\text{ points}$ if $\ge 70\%$ of feedback tags indicate exceptional punctuality and food handling.

#### 3. Absorption Capacity Match ($S_{\text{capacity}}$, 20% Weight)
Guarantees the shelter has the immediate infrastructure to consume or store the donation without secondary spoilage:
$$\text{Ratio} = \frac{\text{Donation Quantity (Servings)}}{\text{NGO Daily Absorption Capacity}}$$
- Optimal Window ($0.20 \le \text{Ratio} \le 1.00$): $100\text{ points}$
- High Stretch ($1.00 < \text{Ratio} \le 1.50$): $85\text{ points}$
- Low Intake ($0.05 \le \text{Ratio} < 0.20$): $70\text{ points}$
- Severe Overcapacity ($\text{Ratio} > 2.00$): $40\text{ points}$ (penalizes accepting more meals than can be safely served).

#### 4. Proximity & Cold-Chain Speed ($S_{\text{distance}}$, 15% Weight)
Calculates Haversine spherical distance between food provider and shelter location:
- $\le 2.0\text{ km}$: $100\text{ points}$
- $\le 5.0\text{ km}$: $90\text{ points}$
- $\le 10.0\text{ km}$: $75\text{ points}$
- $\le 20.0\text{ km}$: $50\text{ points}$
- $> 20.0\text{ km}$: $30\text{ points}$

#### 5. Historical Reliability & Verification ($S_{\text{reliability}}$, 5% Weight)
- Verified NGO Identity (`verification_status = 'approved'`): $+40\text{ points}$
- Delivery Completion Record ($\ge 95\%$ completed claims without cancellation): $+40\text{ points}$
- Clean Operational Record (Zero safety or breach incident flags): $+20\text{ points}$

### Dynamic Recommendation Badges & UI Filters
- 🏆 **Best Match**: Assigned to the top-scoring NGO across the combined multi-factor model.
- 🚨 **Highest Need**: Assigned to shelters with critical hunger deficit ($S_{\text{need}} \ge 85$).
- ⚡ **Proximity Star**: Assigned to nearby facilities ($\le 3.0\text{ km}$) with optimal capacity.
- ⭐ **Top Community Rated**: Assigned to shelters with Bayesian trust scores $\ge 4.70$.
- **Provider View (`DonationDetailPage.jsx`)**: Providers can sort claims by "Algorithm Recommended (Priority Score)", "Highest Need First", "Proximity (Nearest First)", or "Best Community Rating", and inspect a visual 5-factor progress breakdown before approving.

---

---

## 📢 Complaints & Dispute Resolution System

FoodRescue includes a production-grade **Complaint Management System** enabling platform participants to report issues and administrators to manage resolutions through a structured workflow.

### User Features
- **Submit Complaints**: Any authenticated user can file a complaint about a transaction, user, or platform issue.
- **My Complaints**: Track personal complaint submissions and their current resolution status.
- **Complaint Detail View**: Threaded messaging between complainant and admin, audit history, and status tracking.
- **Reopen Complaints**: Complainants can reopen previously resolved complaints if the issue persists.

### Admin Features
- **Dashboard Statistics**: Real-time complaint counts by status (open, investigating, resolved, rejected).
- **Assignment & Priority**: Assign complaints to admin team members and set priority levels.
- **Status Workflow**: `open` ➔ `investigating` ➔ `resolved` / `rejected` with full audit trail.
- **Threaded Messaging**: Two-way communication between admin and complainant within the complaint.
- **CSV Export**: Export filtered complaint data for external reporting.

### Complaint API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/complaints` | Submit a new complaint | Authenticated |
| `GET` | `/api/complaints/me` | Get my complaints | Authenticated |
| `GET` | `/api/complaints/:id` | Get complaint details | Owner / Admin |
| `GET` | `/api/complaints/:id/messages` | Get complaint thread messages | Owner / Admin |
| `POST` | `/api/complaints/:id/messages` | Add a message to complaint thread | Owner / Admin |
| `GET` | `/api/complaints/:id/history` | Get complaint audit history | Owner / Admin |
| `POST` | `/api/complaints/:id/reopen` | Reopen a resolved complaint | Owner / Admin |
| `GET` | `/api/complaints/admin/stats` | Complaint statistics dashboard | Admin |
| `GET` | `/api/complaints/admin/list` | List all complaints with filters | Admin |
| `GET` | `/api/complaints/admin/export` | Export complaints as CSV | Admin |
| `POST` | `/api/complaints/:id/assign` | Assign complaint to admin | Admin |
| `PATCH` | `/api/complaints/:id/status` | Update complaint status | Admin |
| `POST` | `/api/complaints/:id/resolve` | Resolve a complaint | Admin |
| `POST` | `/api/complaints/:id/reject` | Reject a complaint | Admin |
| `PATCH` | `/api/complaints/:id/priority` | Update complaint priority | Admin |

---

## 🚨 Incident Management System

Automated and manual incident detection to ensure platform safety and reliability.

### Features
- **Automated Detection**: Background cron job (`incident-detector.cron.js`) automatically identifies patterns like expired food, delivery failures, and suspicious activity.
- **Manual Reporting**: Any authenticated user can report an incident.
- **Severity Tracking**: Incidents classified by severity (low, medium, high, critical).
- **Full Lifecycle Management**: Assignment, acknowledgement, status updates, severity changes, notes, escalation, resolution, closure, and reopening.
- **Admin Dashboard**: Summary statistics and filterable incident list.

### Incident API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/incidents` | Report an incident | All Authenticated |
| `GET` | `/api/incidents/summary` | Incident summary statistics | Admin |
| `GET` | `/api/incidents` | List all incidents | Admin |
| `GET` | `/api/incidents/:id` | Get incident details | Admin |
| `POST` | `/api/incidents/:id/assign` | Assign incident | Admin |
| `POST` | `/api/incidents/:id/acknowledge` | Acknowledge incident | Admin |
| `PATCH` | `/api/incidents/:id/status` | Update incident status | Admin |
| `PATCH` | `/api/incidents/:id/severity` | Update incident severity | Admin |
| `POST` | `/api/incidents/:id/notes` | Add investigation notes | Admin |
| `POST` | `/api/incidents/:id/resolve` | Resolve incident | Admin |
| `POST` | `/api/incidents/:id/close` | Close incident | Admin |
| `POST` | `/api/incidents/:id/reopen` | Reopen incident | Admin |
| `POST` | `/api/incidents/:id/escalate` | Escalate incident | Admin |

---

## 💬 Public Feedback System

A public-facing feedback collection system allowing anyone (authenticated or anonymous) to share platform feedback.

### Features
- **Public Submission**: No authentication required — rate-limited to 20 submissions per 15 minutes per IP.
- **Optional Authentication**: Logged-in users have their identity auto-attached to feedback submissions.
- **Admin Review Portal**: Full feedback list with filtering, pagination, status management, and admin notes.
- **Zod Validation**: All inputs validated with Zod schemas.

### Feedback API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/feedback` | Submit public feedback | Public (rate-limited) |
| `GET` | `/api/feedback` | List feedback with filters | Admin |
| `GET` | `/api/feedback/:id` | Get feedback details | Admin |
| `PATCH` | `/api/feedback/:id/status` | Update feedback status & notes | Admin |

---

## 📊 Admin Advanced Analytics

A comprehensive analytics suite available exclusively to administrators.

### Features
- **KPI Summary Dashboard**: Platform-wide key performance indicators.
- **Geographical Donation Hotspots**: Leaflet map with coordinate-based clustering (~1.1km grid), human-readable area names, demand gap status pills (unmet supply / balanced / high fulfillment), quick search, and status filtering.
- **Wasted Food Categories**: Breakdown of expired donations by food category.
- **NGO Demand Gaps**: Analysis of unmet demand across NGO regions.
- **Delivery Reliability**: Volunteer delivery performance metrics.
- **Inactive Provider Tracking**: Identification of providers who have stopped donating.
- **Data Export**: Export analytics data for external reporting.
- **Filter Options**: Dynamic filter options based on available data.

### Admin Analytics API Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/analytics/admin/kpis` | KPI summary dashboard | Admin |
| `GET` | `/api/analytics/admin/hotspots` | Geographical donation hotspots | Admin |
| `GET` | `/api/analytics/admin/wasted-categories` | Wasted food category breakdown | Admin |
| `GET` | `/api/analytics/admin/demand-gaps` | NGO demand gap analysis | Admin |
| `GET` | `/api/analytics/admin/delivery-reliability` | Delivery reliability metrics | Admin |
| `GET` | `/api/analytics/admin/inactive-providers` | Inactive provider list | Admin |
| `GET` | `/api/analytics/admin/filter-options` | Dynamic filter options | Admin |
| `GET` | `/api/analytics/admin/export` | Export analytics data | Admin |

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Tailwind CSS v4, Lucide React, React Router v7, Axios, React Hot Toast, Leaflet Maps (Inverted Dark CSS Filters), Nominatim Geocoding, Vite |
| **Mobile** | Expo SDK 52, React Native 0.88, expo-camera (CameraView), expo-location, expo-notifications, react-native-webview, @expo/vector-icons, react-native-safe-area-context |
| **Backend** | Node.js, Express.js, JWT Authentication (access + refresh token rotation), Google OAuth 2.0 (`google-auth-library`), Zod validation, Expo Server SDK (Push), Helmet, Rate Limiting |
| **Database** | PostgreSQL / Neon Cloud Postgres (with PostGIS for geolocation) |
| **QR System** | Google Lens 4:3 Camera Scanner (mobile), `qrcode` (server-side generation), `crypto` (unique code hashing), web camera fallback |
| **Real-Time** | WebSocket (`ws`) for live notifications |
| **Scheduling** | node-cron — automated food expiry checker, incident detector, complaint escalator |
| **Email** | Nodemailer with automated donation completion receipts & timeline tracking |
| **CI/CD** | GitHub Actions (lint, build, schema validation, deploy gate) |

---

## ⚙️ CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration. The pipeline runs on every push to `main`/`develop` and on every pull request to `main`.

```
┌──────────────────────────────────────────────────────┐
│                CI/CD Pipeline Flow                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  push / PR to main or develop                        │
│         │                                            │
│         ├──► 🔧 Backend CI                           │
│         │     ├─ Checkout                            │
│         │     ├─ Install deps (npm ci)               │
│         │     └─ Syntax check (node --check)         │
│         │                                            │
│         ├──► 🎨 Frontend CI                          │
│         │     ├─ Checkout                            │
│         │     ├─ Install deps (npm ci)               │
│         │     ├─ Lint (oxlint)                       │
│         │     └─ Build production bundle (vite)      │
│         │                                            │
│         └──► 🗄️ Schema Validation                   │
│               ├─ Spin up PostgreSQL 16 service       │
│               └─ Apply schema.sql to test DB         │
│                                                      │
│  All pass + main branch push?                        │
│         │                                            │
│         └──► 🚀 Deploy Gate                          │
│               └─ ✅ Ready for deployment              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Pipeline Jobs

| Job | Trigger | What It Does |
|---|---|---|
| **Backend CI** | push & PR | Installs dependencies, runs syntax validation on `app.js` |
| **Frontend CI** | push & PR | Installs dependencies, runs `oxlint` linter, builds production bundle with Vite |
| **Schema Validation** | push & PR | Spins up a PostgreSQL 16 container, applies `schema.sql` to verify migration integrity |
| **Deploy Gate** | main push only | Runs after Backend + Frontend CI pass — placeholder for deployment hooks |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- PostgreSQL database (or [Neon](https://neon.tech) cloud database)

---

### ⚡ Quick Start (Combined Command)

Run the backend API, frontend client, and mobile bundler directly from the root location:

```bash
# 1. Install all dependencies across root, backend, frontend, and mobile
npm run install:all

# 2. Start backend and frontend simultaneously
npm run dev
# or: npm start

# 3. Optional: Start mobile bundler
npm run dev:mobile
```

- **Backend API**: `http://localhost:3000`
- **Frontend Web App**: `http://localhost:5173`
- **Mobile Expo Metro**: `http://localhost:8081`

---

### 1. Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require
   JWT_SECRET=your-super-secret-jwt-key
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

4. Run database migration and seed default data:
   ```bash
   npm run db:migrate    # Creates all tables, ENUMs, triggers & indexes
   npm run db:seed       # Populates seed users and sample donations
   ```

5. Start the backend API:
   ```bash
   npm run dev
   ```
   *API will run at `http://localhost:3000`*

---

### 2. Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Web App will run at `http://localhost:5173`*

---

### 3. Mobile App Setup (Expo & React Native)

1. Navigate to the mobile folder:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo Metro bundler:
   ```bash
   npx expo start
   ```

4. Run the app:
   - **Physical Device:** Install **Expo Go** (Android/iOS) and scan the QR code displayed in the terminal. Metro will auto-discover your local workstation IP (`10.221.100.64`).
   - **Android Emulator:** Press `a` in the terminal.
   - **iOS Simulator:** Press `i` in the terminal.
   - **Reload:** Press `r` in the terminal or shake your device.

---

## 🔑 Demo Login Accounts

The database seeder pre-populates demo accounts with **1-Click Quick Login** buttons on the login screen:

| Role | Email | Password | Primary Actions |
|---|---|---|---|
| **Food Provider** | `provider@foodrescue.org` | `password123` | Post surplus food, view donations |
| **NGO / Shelter** | `ngo@foodrescue.org` | `password123` | Browse donations, claim food, scan delivery QR |
| **Volunteer** | `volunteer@foodrescue.org` | `password123` | Accept deliveries, scan pickup QR codes |
| **Administrator** | `admin@foodrescue.org` | `password123` | Verifications, users, complaints, incidents, analytics |

---

## 🔄 Background Jobs

FoodRescue runs three automated background cron jobs:

| Job | Schedule | Description |
|---|---|---|
| **Expiry Checker** | Every 5 minutes | Scans active donations and marks expired listings, cancels pending delivery legs, invalidates QR codes |
| **Incident Detector** | Periodic | Automatically detects patterns like delivery failures, expired food chains, and suspicious activity |
| **Complaint Escalator** | Periodic | Escalates unresolved complaints that exceed time thresholds |

---

## 📁 Repository Structure

```
FoodRescue/
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI/CD pipeline
├── backend/                      # Express.js REST API
│   ├── src/
│   │   ├── config/               # Database pool and environment config
│   │   ├── db/                   # Migration and seeding scripts
│   │   ├── jobs/                 # Background cron jobs
│   │   │   ├── expiry-checker.cron.js      # Automated donation expiry
│   │   │   ├── incident-detector.cron.js   # Automated incident detection
│   │   │   └── complaint-escalator.cron.js # Complaint escalation
│   │   ├── middleware/           # Auth guards, role verification, Zod validator, sanitizer
│   │   ├── modules/
│   │   │   ├── admin/            # Admin verification & governance
│   │   │   ├── analytics/        # ESG impact metrics, admin KPIs & donation hotspots
│   │   │   ├── auth/             # JWT login, register, Google OAuth, token refresh, OTP recovery, profile completion
│   │   │   ├── complaints/       # 📢 Full complaint lifecycle management
│   │   │   ├── deliveries/       # Delivery lifecycle management
│   │   │   ├── donations/        # Food donation CRUD, claiming, ranking & data isolation
│   │   │   ├── feedback/         # 💬 Public feedback collection & admin review
│   │   │   ├── incidents/        # 🚨 Incident detection, tracking & resolution
│   │   │   ├── matching/         # 🎯 Smart Donor-NGO matching & claim priority ranking (claim-ranking.service.js)
│   │   │   ├── notifications/    # Real-time in-app & WebSocket alerts (admin-isolated)
│   │   │   ├── qrcodes/          # 🔐 QR generation, preview & scan verification
│   │   │   ├── reviews/          # ⭐ Trust, ratings & reliability system
│   │   │   ├── users/            # User profile management & safe account deletion
│   │   │   └── volunteers/       # Volunteer registration & dispatch
│   │   └── app.js                # Express application entry point
│   └── package.json
├── frontend/                     # React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── api/                  # Axios client with JWT auto-refresh interceptor
│   │   ├── components/
│   │   │   ├── common/           # Shared components
│   │   │   │   ├── GoogleAuthButton.jsx    # 🔐 Google OAuth sign-in button
│   │   │   │   ├── ClaimDonationModal.jsx  # NGO claim modal
│   │   │   │   ├── DonationMapView.jsx     # Leaflet donation map
│   │   │   │   ├── DateTimePicker.jsx      # Date/time picker component
│   │   │   │   ├── ExpiringFoodAlert.jsx   # Expiry countdown alert
│   │   │   │   ├── Logo.jsx               # Brand logo component
│   │   │   │   ├── MapAddressPickerModal.jsx # Address picker with map
│   │   │   │   ├── NotificationPopup.jsx   # Real-time notification popup
│   │   │   │   ├── NormalNotificationAlert.jsx # Standard notification alert
│   │   │   │   ├── ProtectedRoute.jsx      # Role-based route guard
│   │   │   │   ├── ReviewModal.jsx         # Review submission modal
│   │   │   │   ├── StaticRouteMap.jsx      # Static route display map
│   │   │   │   └── ThemeToggle.jsx         # Dark/light theme toggle
│   │   │   ├── complaints/       # 📢 Complaint UI components
│   │   │   ├── incidents/        # 🚨 Incident UI components
│   │   │   ├── layout/           # DashboardLayout, Sidebar
│   │   │   ├── reviews/          # ⭐ StarRating, UserReputationLink, RatingSummary, etc.
│   │   │   └── ui/               # Reusable UI primitives
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx         # Session, JWT, active role management
│   │   │   ├── ReputationContext.jsx   # Reputation modal handler
│   │   │   └── ThemeContext.jsx        # Dark/light theme state
│   │   ├── pages/
│   │   │   ├── admin/            # Admin dashboard, verifications, complaints, incidents, feedback, analytics
│   │   │   ├── analytics/        # ESG impact analytics dashboard
│   │   │   ├── auth/             # Login, Registration, OTP Verification, Forgot & Reset Password
│   │   │   ├── complaints/       # 📢 My complaints & complaint detail pages
│   │   │   ├── contact/          # 📞 Official Contact & Operations Directory
│   │   │   ├── dashboard/        # Role-based dashboards
│   │   │   ├── donations/        # Donation management & Smart Claim Priority evaluation
│   │   │   ├── feedback/         # 💬 Public feedback submission page
│   │   │   ├── landing/          # Public landing page
│   │   │   ├── ngo/              # NGO donation feed & claims
│   │   │   ├── notifications/    # Notification center
│   │   │   ├── profile/          # User profile, Security & Account Deletion (Danger Zone)
│   │   │   ├── reviews/          # ⭐ MyRatings & Trust Hub (/reviews)
│   │   │   └── volunteer/        # 📱 Deliveries & QR scan page
│   │   ├── utils/                # Core client utilities
│   │   │   ├── browserNotifications.js # Desktop browser notification permissions & dispatcher
│   │   │   └── geolocation.js    # 3-tier mobile GPS, browser & IP reverse geocoder
│   │   └── App.jsx               # Routing configuration
│   ├── vite.config.js
│   └── package.json
├── mobile/                       # 📱 Expo & React Native Mobile App
│   ├── assets/                   # App icons, splash screens, logos
│   ├── src/
│   │   ├── api/                  # Mobile API client & dev host resolution
│   │   ├── components/           # UI primitives & NativeCameraModal
│   │   │   └── NativeCameraModal.js # 📷 Google Lens 4:3 QR code camera scanner
│   │   ├── context/              # Mobile auth context
│   │   ├── navigation/           # Root, auth, and role navigators
│   │   ├── screens/              # Screens & WebviewReplicaScreen
│   │   │   ├── WebviewReplicaScreen.js # Webview bridge container
│   │   │   ├── auth/             # Login, Register, VerificationPending
│   │   │   ├── ngo/              # BrowseDonations, MyClaims, NGOProfile
│   │   │   ├── provider/         # CreateDonation, ProviderDashboard, ProviderDonations
│   │   │   └── volunteer/        # Deliveries, DeliveryDetail, QRScannerScreen
│   │   └── theme/                # Dark carbon color system
│   ├── App.js                    # Mobile application root
│   ├── app.json                  # Expo project manifest
│   └── package.json
├── database/                     # PostgreSQL System of Record
│   └── schema.sql                # Full relational schema with PostGIS & triggers
├── docs/                         # API Contracts and architecture specs
│   └── api-contracts.md
├── ARCHITECTURE.md               # System architecture & flowcharts
└── README.md
```

---

## 📬 Contact & Support

For general inquiries, business/donor onboarding, logistics coordination, shelter partnerships, or technical assistance, our sole official point of contact is our project email:

- **Official Project Email**: [`2026.food.rescue@gmail.com`](mailto:2026.food.rescue@gmail.com)

---

## 👥 Team

This is a **group project** built collaboratively by:

| Contributor | GitHub |
|---|---|
| Prafull Harer | [@PrafullHarer](https://github.com/PrafullHarer) |
| Tanish Jadhav | [@TanishJadhav5244](https://github.com/TanishJadhav5244) |
| Virendra Desai | [@Virendra-Balasaheb-Desai](https://github.com/Virendra-Balasaheb-Desai) |
| Atharva Dhamdhere | [@AtharvaDhamdhere6462](https://github.com/AtharvaDhamdhere6462) |

> **Upstream Repository**: [github.com/PrafullHarer/FoodRescue](https://github.com/PrafullHarer/FoodRescue)

---

## 📄 License

This project is licensed under the MIT License.
