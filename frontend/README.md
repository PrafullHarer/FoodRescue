# FoodRescue — Frontend

The **FoodRescue** frontend is a modern single-page application built with **React 19** and **Vite**, featuring a comprehensive dark/light theme system, role-based dashboards, and real-time WebSocket notifications.

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework with functional components and hooks |
| **Vite** | Build tool with HMR for fast development |
| **React Router v7** | Client-side routing with role-based protection |
| **Tailwind CSS v4** | Utility-first CSS framework |
| **Axios** | HTTP client with JWT auto-refresh interceptor |
| **Lucide React** | Icon library |
| **React Hot Toast** | Toast notifications |
| **Leaflet** | Interactive maps (donation hotspots, address picker) |
| **Oxlint** | Fast JavaScript linter |

## Key Features

- **Google OAuth 2.0** — "Continue with Google" sign-in on Login and Register pages
- **Mandatory Profile Completion** — Google sign-up users must complete role, phone, and address before dashboard access
- **Role-Based Dashboards** — Separate views for Provider, NGO, Volunteer, and Admin
- **Data Isolation** — Each user sees only their own data; cross-user access is prevented
- **Dark / Light Theme** — System-wide theme toggle with CSS custom properties
- **Real-Time Notifications** — WebSocket-powered popups with role-based filtering (admins receive governance-only alerts)
- **QR Code Scanning** — Built-in QR scanner for pickup and delivery verification
- **Trust & Ratings** — Click-to-view reputation profiles, review submission, and moderation
- **Complaint System** — Submit, track, and communicate on complaints with threaded messaging
- **Public Feedback** — Anonymous or authenticated feedback submission
- **Admin Analytics** — KPI dashboards, geographical donation hotspots with Leaflet map, and data export
- **Map-Based Location Picker** — Interactive address picker with geocoding on registration

## Project Structure

```
frontend/
├── src/
│   ├── api/                      # Axios client with JWT auto-refresh interceptor
│   ├── components/
│   │   ├── common/               # Shared components (GoogleAuthButton, Maps, QR, Notifications, etc.)
│   │   ├── complaints/           # Complaint UI components
│   │   ├── incidents/            # Incident UI components
│   │   ├── layout/               # DashboardLayout, Sidebar
│   │   ├── reviews/              # StarRating, UserReputationLink, ReviewCard, etc.
│   │   └── ui/                   # Reusable UI primitives
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Session, JWT, active role management
│   │   ├── ReputationContext.jsx # Reputation modal handler
│   │   └── ThemeContext.jsx      # Dark/light theme state
│   ├── pages/
│   │   ├── admin/                # Admin: Analytics, Incidents, Complaints, Feedback, Users, Verifications, Audit Logs
│   │   ├── analytics/            # ESG impact analytics
│   │   ├── auth/                 # Login, Register, CompleteProfile
│   │   ├── complaints/           # My complaints & complaint detail
│   │   ├── dashboard/            # Role-based dashboards
│   │   ├── donations/            # Donation CRUD & detail
│   │   ├── feedback/             # Public feedback submission
│   │   ├── landing/              # Public landing page
│   │   ├── ngo/                  # Browse donations & claims
│   │   ├── notifications/        # Notification center
│   │   ├── profile/              # User profile
│   │   ├── reviews/              # My ratings & trust hub
│   │   └── volunteer/            # Deliveries & QR scan
│   └── App.jsx                   # Route configuration
├── index.html
├── vite.config.js
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

The development server runs at `http://localhost:5173` with API requests proxied to `http://localhost:3000`.

## Vite Plugins

This project uses [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) with [Oxc](https://oxc.rs) for fast JSX transforms and HMR.
