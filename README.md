# 🥦 FoodRescue — Smart Surplus Food Donation & Redistribution Platform

> An end-to-end, full-stack web platform connecting food providers, NGOs/shelters, and volunteer drivers to rescue surplus food in real time and eliminate food waste.


![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 Overview

Every day, restaurants, caterers, bakeries, and grocery stores produce edible surplus food that goes to waste, while local shelters and charities face shortages. **FoodRescue** bridges this gap with a modern web platform featuring real-time claims, route handovers with verification QR codes, automated food expiry management, Google OAuth sign-in, comprehensive complaints & incident management, public feedback collection, admin analytics with geographical donation hotspots, and ESG environmental impact analytics.

---

## 👥 Core Features by Role

### 🥖 1. Food Providers (Restaurants, Caterers, Bakeries, Supermarkets)
- **Post Surplus Food**: Quick listing form with food categories, quantity, dietary badges (vegan, halal, nut-free, etc.), and expiry countdown timer.
- **Manage Listings**: Real-time status tracking (`posted` ➔ `claimed` ➔ `in_transit` ➔ `delivered`).
- **Data Isolation**: Providers can only view, edit, and delete their own donations — never another provider's listings.
- **ESG Impact Metrics**: Track total kilograms rescued, meals donated, and CO₂ emissions avoided.
- **Trust & Reputation**: Click volunteer names to inspect delivery success rates, on-time delivery percentages, and partner ratings; track donor ratings and packaging feedback.

### 🤝 2. NGOs & Community Shelters
- **Live Donation Feed**: Filter available surplus food by proximity, category, and servings.
- **1-Click Reservation**: Instant claim system to secure food packages before expiry.
- **Delivery Tracking**: Monitor incoming supplies from assigned volunteer couriers.
- **Direct Self-Pickup**: NGOs can opt for direct pickup from the food provider with single-step QR verification.
- **Data Isolation**: NGOs can only see their own claims and claim data — never another NGO's private information.
- **Verified Donor Trust**: Click provider names to view their 5-star rating breakdown, verified donation count, and historical reviews before claiming food.

### 🚚 3. Volunteers & Couriers
- **Delivery Missions**: Browse active delivery runs and accept pickup/dropoff tasks.
- **Handover QR Verification**: Built-in QR scanner to verify physical handoff at both pickup from donor and dropoff at shelter.
- **Data Isolation**: Volunteers can only access deliveries assigned to them and their own delivery history.
- **Courier Reputation**: Transparent courier metrics showing successful delivery rate %, on-time rate %, and verified provider/NGO feedback.
- **Volunteer Leaderboard**: Gamified rankings based on completed delivery missions.

### 🛡️ 4. Administrators
- **Verification Portal**: Review business licenses and tax registrations for new NGOs and food providers.
- **User Governance**: Activate, suspend, or manage platform participants.
- **Advanced Analytics**: KPI dashboard, geographical donation hotspots (Leaflet map with clustered markers), wasted food categories, NGO demand gaps, delivery reliability, and inactive provider tracking.
- **Complaint Management**: Full lifecycle complaint resolution — submission, assignment, priority management, threaded messaging, audit history, CSV export, and status transitions.
- **Incident Management**: Automated incident detection, severity tracking, assignment, escalation, notes, and resolution workflows.
- **Feedback Portal**: Admin-only review of public user feedback with status management and admin notes.
- **Review Moderation**: Audit trail and moderation portal for flagged or policy-violating ratings.
- **Notification Isolation**: Admins receive only platform governance notifications (incidents, escalations, complaints, verifications) — never donation-related alerts.
- **Security Audit Logs**: Tamper-evident activity trail.

---

## 🔐 Authentication & Profile Completion

FoodRescue supports two authentication methods:

### Email & Password Registration
- Traditional registration with full name, email, phone, role selection, and address with map-based location picker.
- Passwords securely hashed with bcrypt.

### Continue with Google (OAuth 2.0)
- **Google Identity Services** integration on both Login and Register pages.
- Backend verification of Google ID tokens via the official `google-auth-library`.
- Automatic account linking by verified email — existing email/password users can seamlessly sign in with Google without creating duplicate accounts.
- New Google users are directed to a **mandatory profile completion page** (`/complete-profile`) to provide role, phone, and address before accessing the platform.

### Profile Completion Flow
```
Google Sign-In ──► Backend Verifies ID Token
                    │
                    ├── Existing User Found? ──► Sign In Directly
                    │
                    └── New User? ──► Create Account (profile_completed = false)
                                       │
                                       └── Redirect to /complete-profile
                                             │
                                             └── User Selects Role, Enters Phone & Address
                                                   │
                                                   └── Profile Marked Complete ──► Dashboard
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
| **Frontend** | React 19, Tailwind CSS v4, Lucide React, React Router v7, Axios, React Hot Toast, Leaflet Maps, Vite |
| **Backend** | Node.js, Express.js, JWT Authentication (access + refresh token rotation), Google OAuth 2.0 (`google-auth-library`), Zod validation, Helmet, Rate Limiting |
| **Database** | PostgreSQL / Neon Cloud Postgres (with PostGIS for geolocation) |
| **QR System** | `qrcode` (server-side generation), `crypto` (unique code hashing), built-in scanner UI |
| **Real-Time** | WebSocket (`ws`) for live notifications |
| **Scheduling** | node-cron — automated food expiry checker, incident detector, complaint escalator |
| **Email** | Nodemailer for transactional emails |
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

Run both the backend API and frontend client together directly from the root location:

```bash
# 1. Install all dependencies across root, backend, and frontend
npm run install:all

# 2. Start backend and frontend simultaneously
npm run dev
# or: npm start
```

- **Backend API**: `http://localhost:3000`
- **Frontend Web App**: `http://localhost:5173`

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
│   │   │   ├── auth/             # JWT login, register, Google OAuth, token refresh, profile completion
│   │   │   ├── complaints/       # 📢 Full complaint lifecycle management
│   │   │   ├── deliveries/       # Delivery lifecycle management
│   │   │   ├── donations/        # Food donation CRUD, claiming & data isolation
│   │   │   ├── feedback/         # 💬 Public feedback collection & admin review
│   │   │   ├── incidents/        # 🚨 Incident detection, tracking & resolution
│   │   │   ├── matching/         # Donor-NGO matching engine
│   │   │   ├── notifications/    # Real-time in-app & WebSocket alerts (admin-isolated)
│   │   │   ├── qrcodes/          # 🔐 QR generation, preview & scan verification
│   │   │   ├── reviews/          # ⭐ Trust, ratings & reliability system
│   │   │   ├── users/            # User profile management
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
│   │   │   ├── auth/             # Login, Registration & Profile Completion pages
│   │   │   ├── complaints/       # 📢 My complaints & complaint detail pages
│   │   │   ├── dashboard/        # Role-based dashboards
│   │   │   ├── donations/        # Donation management pages
│   │   │   ├── feedback/         # 💬 Public feedback submission page
│   │   │   ├── landing/          # Public landing page
│   │   │   ├── ngo/              # NGO donation feed & claims
│   │   │   ├── notifications/    # Notification center
│   │   │   ├── profile/          # User profile page
│   │   │   ├── reviews/          # ⭐ MyRatings & Trust Hub (/reviews)
│   │   │   └── volunteer/        # 📱 Deliveries & QR scan page
│   │   └── App.jsx               # Routing configuration
│   ├── vite.config.js
│   └── package.json
├── database/                     # PostgreSQL System of Record
│   └── schema.sql                # Full relational schema with PostGIS & triggers
├── docs/                         # API Contracts and architecture specs
│   └── api-contracts.md
├── ARCHITECTURE.md               # System architecture & flowcharts
└── README.md
```

---

## 👥 Team

This is a **group project** built collaboratively by:

| Contributor | GitHub |
|---|---|
| Prafull Harer | [@PrafullHarer](https://github.com/PrafullHarer) |
| Tanish Jadhav | [@TanishJadhav5244](https://github.com/TanishJadhav5244) |

> **Upstream Repository**: [github.com/PrafullHarer/FoodRescue](https://github.com/PrafullHarer/FoodRescue)

---

## 📄 License

This project is licensed under the MIT License.
