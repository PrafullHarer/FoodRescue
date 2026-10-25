# API Contracts — FoodRescue

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Auth Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/auth/register` | ✗ | — | Register new user (provider/ngo/volunteer) |
| POST | `/auth/login` | ✗ | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | ✗ | — | Refresh access token |
| POST | `/auth/logout` | ✗ | — | Revoke refresh token |
| GET | `/auth/me` | ✓ | any | Get current user profile |

## Users

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/users` | ✓ | any | List users (paginated, filterable) |
| GET | `/users/:id` | ✓ | any | Get user by ID with role profile |
| PUT | `/users/:id` | ✓ | self/admin | Update user profile |
| PATCH | `/users/:id/status` | ✓ | admin | Change user status |

## Donations

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/donations` | ✗ | — | List donations (geo-filterable) |
| GET | `/donations/:id` | ✗ | — | Get donation details |
| POST | `/donations` | ✓ | provider | Create donation |
| PUT | `/donations/:id` | ✓ | provider | Update donation (posted only) |
| POST | `/donations/:id/claim` | ✓ | ngo | Claim a donation |
| POST | `/donations/:id/cancel` | ✓ | provider | Cancel a donation |

## Smart Matching

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/matching/:donationId/match` | ✓ | admin/provider | Trigger matching |
| GET | `/matching/:donationId/scores` | ✓ | admin | Preview match scores |

## Volunteers

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| PATCH | `/volunteers/availability` | ✓ | volunteer | Update availability |
| PATCH | `/volunteers/location` | ✓ | volunteer | Update GPS location |
| GET | `/volunteers/my-deliveries` | ✓ | volunteer | My active deliveries |
| GET | `/volunteers/ranked/:donationId` | ✓ | admin/ngo | Ranked volunteers |

## Deliveries

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/deliveries` | ✓ | any | List deliveries |
| GET | `/deliveries/:id` | ✓ | any | Get delivery details |
| POST | `/deliveries` | ✓ | admin/ngo | Create delivery assignment |
| POST | `/deliveries/:id/accept` | ✓ | volunteer | Accept delivery |
| PATCH | `/deliveries/:id/status` | ✓ | volunteer/admin | Update status |

## QR Codes

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/qr-codes/generate/:deliveryId` | ✓ | admin/volunteer | Generate QR pair |
| POST | `/qr-codes/:code/scan` | ✓ | volunteer | Scan/validate QR |
| GET | `/qr-codes/delivery/:deliveryId` | ✓ | any | Get QR codes |

## Notifications

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/notifications` | ✓ | any | My notifications |
| PATCH | `/notifications/:id/read` | ✓ | any | Mark as read |
| PATCH | `/notifications/read-all` | ✓ | any | Mark all as read |
| POST | `/notifications/device-token` | ✓ | any | Register push token |

## Analytics

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/analytics/impact` | ✓ | any | Impact dashboard metrics |
| GET | `/analytics/trends` | ✓ | any | Donation trends |
| GET | `/analytics/leaderboard` | ✓ | any | Leaderboards |

## Admin

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/admin/pending-verifications` | ✓ | admin | Pending verifications |
| POST | `/admin/verify/:type/:id` | ✓ | admin | Verify provider/ngo |
| GET | `/admin/complaints` | ✓ | admin | List complaints |
| POST | `/admin/complaints/:id/resolve` | ✓ | admin | Resolve complaint |
| GET | `/admin/audit-logs` | ✓ | admin | Audit log viewer |
