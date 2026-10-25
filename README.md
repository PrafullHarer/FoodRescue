# 🥦 FoodRescue — Smart Surplus Food Donation & Redistribution Platform

> An end-to-end, full-stack web platform connecting food providers, NGOs/shelters, and volunteer drivers to rescue surplus food in real time and eliminate food waste.

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

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Tailwind CSS v4, Lucide React, React Router v7, Axios, React Hot Toast, Vite |
| **Backend** | Node.js, Express.js, JWT Authentication (access + refresh token rotation), Zod validation |
| **Database** | PostgreSQL / Neon Cloud Postgres (with PostGIS for geolocation) |
| **Scheduling** | node-cron (automated background food expiry checker) |

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
| **NGO / Shelter** | `ngo@foodrescue.org` | `password123` | Browse donations, claim food |
| **Volunteer** | `volunteer@foodrescue.org` | `password123` | Accept deliveries, scan QR codes |
| **Administrator** | `admin@foodrescue.org` | `password123` | Verifications, users, complaints |

---

## 📁 Repository Structure

```
FoodRescue/
├── backend/                  # Express.js REST API
│   ├── src/
│   │   ├── config/           # Database pool and environment config
│   │   ├── db/               # Migration and seeding scripts
│   │   ├── jobs/             # Automated expiry cron job
│   │   ├── middleware/       # Auth guards, role verification, Zod validator
│   │   ├── modules/          # Domain modules (auth, donations, deliveries, etc.)
│   │   └── app.js            # Express application entry point
│   └── package.json
├── frontend/                 # React + Tailwind CSS Web Application
│   ├── src/
│   │   ├── api/              # Axios client with JWT auto-refresh interceptor
│   │   ├── components/       # Sidebar, ProtectedRoute, layout components
│   │   ├── contexts/         # AuthContext
│   │   ├── pages/            # Role pages (Provider, NGO, Volunteer, Admin, Dashboard)
│   │   └── App.jsx           # Routing configuration
│   ├── vite.config.js
│   └── package.json
├── database/                 # PostgreSQL System of Record
│   └── schema.sql            # Full relational schema with PostGIS & triggers
├── docs/                     # API Contracts and architecture specs
└── README.md
```

---

## 📄 License

This project is licensed under the MIT License.
