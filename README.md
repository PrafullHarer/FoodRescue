# 🥦 FoodRescue — Smart Surplus Food Donation & Redistribution Platform

> An end-to-end, full-stack web platform connecting food providers, NGOs/shelters, and volunteer drivers to rescue surplus food in real time and eliminate food waste.

[![CI/CD Pipeline](https://github.com/PrafullHarer/FoodRescue/actions/workflows/ci.yml/badge.svg)](https://github.com/PrafullHarer/FoodRescue/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🌟 Overview

Every day, restaurants, caterers, bakeries, and grocery stores produce edible surplus food that goes to waste, while local shelters and charities face shortages. **FoodRescue** bridges this gap with a modern web platform featuring real-time claims, route handovers with verification QR codes, automated food expiry management, and ESG environmental impact analytics.

---

## 👥 Core Features by Role

### 🥖 1. Food Providers (Restaurants, Caterers, Bakeries, Supermarkets)
- **Post Surplus Food**: Quick listing form with food categories, quantity, dietary badges (vegan, halal, nut-free, etc.), and expiry countdown timer.
- **Manage Listings**: Real-time status tracking (`posted` ➔ `claimed` ➔ `in_transit` ➔ `delivered`).
- **ESG Impact Metrics**: Track total kilograms rescued, meals donated, and CO₂ emissions avoided.

### 🤝 2. NGOs & Community Shelters
- **Live Donation Feed**: Filter available surplus food by proximity, category, and servings.
- **1-Click Reservation**: Instant claim system to secure food packages before expiry.
- **Delivery Tracking**: Monitor incoming supplies from assigned volunteer couriers.
- **Direct Self-Pickup**: NGOs can opt for direct pickup from the food provider with single-step QR verification.

### 🚚 3. Volunteers & Couriers
- **Delivery Missions**: Browse active delivery runs and accept pickup/dropoff tasks.
- **Handover QR Verification**: Built-in QR scanner to verify physical handoff at both pickup from donor and dropoff at shelter.
- **Volunteer Leaderboard**: Gamified rankings based on completed delivery missions.

### 🛡️ 4. Administrators
- **Verification Portal**: Review business licenses and tax registrations for new NGOs and food providers.
- **User Governance**: Activate, suspend, or manage platform participants.
- **Dispute & Complaints Management**: Resolution workflow for reported issues.
- **Security Audit Logs**: Tamper-evident activity trail.

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
| `POST` | `/api/qrcodes/generate/:deliveryId` | Generate QR pair for a delivery | admin, volunteer, provider, ngo |
| `GET` | `/api/qrcodes/preview/:code` | Preview QR details without scanning | all authenticated |
| `POST` | `/api/qrcodes/:code/scan` | Scan & verify a QR code | volunteer, ngo, admin, provider |
| `GET` | `/api/qrcodes/delivery/:deliveryId` | Get QR codes by delivery ID | all authenticated |
| `GET` | `/api/qrcodes/donation/:donationId` | Get QR codes by donation ID | all authenticated |

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Tailwind CSS v4, Lucide React, React Router v7, Axios, React Hot Toast, Leaflet Maps, Vite |
| **Backend** | Node.js, Express.js, JWT Authentication (access + refresh token rotation), Zod validation, Helmet, Rate Limiting |
| **Database** | PostgreSQL / Neon Cloud Postgres (with PostGIS for geolocation) |
| **QR System** | `qrcode` (server-side generation), `crypto` (unique code hashing), built-in scanner UI |
| **Real-Time** | WebSocket (`ws`) for live notifications |
| **Scheduling** | node-cron (automated background food expiry checker) |
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
| **Administrator** | `admin@foodrescue.org` | `password123` | Verifications, users, complaints |

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
│   │   ├── jobs/                 # Automated expiry cron job
│   │   ├── middleware/           # Auth guards, role verification, Zod validator
│   │   ├── modules/
│   │   │   ├── admin/            # Admin verification & governance
│   │   │   ├── analytics/        # ESG impact metrics & dashboards
│   │   │   ├── auth/             # JWT login, register, token refresh
│   │   │   ├── deliveries/       # Delivery lifecycle management
│   │   │   ├── donations/        # Food donation CRUD & claiming
│   │   │   ├── matching/         # Donor-NGO matching engine
│   │   │   ├── notifications/    # Real-time in-app & WebSocket alerts
│   │   │   ├── qrcodes/          # 🔐 QR generation, preview & scan verification
│   │   │   ├── reviews/          # Post-delivery ratings & feedback
│   │   │   ├── users/            # User profile management
│   │   │   └── volunteers/       # Volunteer registration & dispatch
│   │   └── app.js                # Express application entry point
│   └── package.json
├── frontend/                     # React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── api/                  # Axios client with JWT auto-refresh interceptor
│   │   ├── components/           # Sidebar, ProtectedRoute, layout components
│   │   ├── contexts/             # AuthContext
│   │   ├── pages/
│   │   │   ├── admin/            # Admin dashboard, verifications, complaints
│   │   │   ├── analytics/        # ESG impact analytics dashboard
│   │   │   ├── auth/             # Login & registration pages
│   │   │   ├── dashboard/        # Role-based dashboards
│   │   │   ├── donations/        # Donation management pages
│   │   │   ├── landing/          # Public landing page
│   │   │   ├── ngo/              # NGO donation feed & claims
│   │   │   ├── notifications/    # Notification center
│   │   │   └── volunteer/        # 📱 Deliveries & QR scan page
│   │   └── App.jsx               # Routing configuration
│   ├── vite.config.js
│   └── package.json
├── database/                     # PostgreSQL System of Record
│   └── schema.sql                # Full relational schema with PostGIS & triggers
├── docs/                         # API Contracts and architecture specs
│   └── api-contracts.md
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
