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
| GET | `/auth/google-config` | ✗ | — | Get Google OAuth client configuration |
| POST | `/auth/register` | ✗ | — | Register new user (provider/ngo/volunteer) |
| POST | `/auth/login` | ✗ | — | Login, returns access + refresh tokens |
| POST | `/auth/google` | ✗ | — | Authenticate via Google ID token |
| POST | `/auth/refresh` | ✗ | — | Refresh access token |
| POST | `/auth/logout` | ✗ | — | Revoke refresh token |
| GET | `/auth/me` | ✓ | any | Get current user profile |
| GET | `/auth/profile-status` | ✓ | any | Check if profile is completed |
| POST | `/auth/complete-profile` | ✓ | any | Complete profile after Google sign-up (role, phone, address) |

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
| GET | `/donations` | optional | — | List donations (geo-filterable, role-isolated) |
| GET | `/donations/my` | ✓ | provider | Get provider's own donations |
| GET | `/donations/my-claims` | ✓ | ngo | Get NGO's own claimed donations |
| GET | `/donations/:id` | optional | — | Get donation details (ownership verified) |
| POST | `/donations` | ✓ | provider | Create donation |
| PUT | `/donations/:id` | ✓ | provider | Update donation (own, posted only) |
| DELETE | `/donations/:id` | ✓ | provider | Delete own donation |
| POST | `/donations/:id/claim` | ✓ | ngo | Claim a donation |
| POST | `/donations/:id/cancel` | ✓ | provider | Cancel own donation |
| PATCH | `/donations/:id/pickup-type` | ✓ | ngo | Update pickup type for claimed donation |

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
| POST | `/qr-codes/generate/:deliveryId` | ✓ | admin/volunteer/provider/ngo | Generate QR pair |
| GET | `/qr-codes/preview/:code` | ✓ | any | Preview QR details before scan |
| POST | `/qr-codes/:code/scan` | ✓ | volunteer/ngo/admin/provider | Scan & validate QR |
| GET | `/qr-codes/delivery/:deliveryId` | ✓ | any | Get QR codes by delivery |
| GET | `/qr-codes/donation/:donationId` | ✓ | any | Get QR codes by donation |

## Reviews

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/reviews/users/:userId` | ✓ | any | Get user reputation & reviews |
| GET | `/reviews/me` | ✓ | provider/ngo/volunteer | My reputation overview |
| GET | `/reviews/eligibility/:deliveryId` | ✓ | any | Check review eligibility for delivery |
| GET | `/reviews/deliveries/:deliveryId` | ✓ | any | Get reviews for a delivery |
| POST | `/reviews` | ✓ | provider/ngo/volunteer | Submit verified review |
| PATCH | `/reviews/:reviewId` | ✓ | author | Edit review (48-hour window) |
| POST | `/reviews/:reviewId/report` | ✓ | any | Report review for moderation |
| PATCH | `/reviews/:reviewId/moderate` | ✓ | admin | Moderate review (approve/flag/hide) |

## Notifications

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/notifications` | ✓ | any | My notifications (admin: governance only) |
| PATCH | `/notifications/:id/read` | ✓ | any | Mark as read |
| PATCH | `/notifications/read-all` | ✓ | any | Mark all as read |
| POST | `/notifications/device-token` | ✓ | any | Register push token |

## Complaints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/complaints` | ✓ | any | Submit a new complaint |
| GET | `/complaints/me` | ✓ | any | Get my complaints |
| GET | `/complaints/:id` | ✓ | owner/admin | Get complaint details |
| GET | `/complaints/:id/messages` | ✓ | owner/admin | Get complaint thread messages |
| POST | `/complaints/:id/messages` | ✓ | owner/admin | Add message to complaint thread |
| GET | `/complaints/:id/history` | ✓ | owner/admin | Get complaint audit history |
| POST | `/complaints/:id/reopen` | ✓ | owner/admin | Reopen a resolved complaint |
| GET | `/complaints/admin/stats` | ✓ | admin | Complaint statistics dashboard |
| GET | `/complaints/admin/list` | ✓ | admin | List all complaints with filters |
| GET | `/complaints/admin/export` | ✓ | admin | Export complaints as CSV |
| POST | `/complaints/:id/assign` | ✓ | admin | Assign complaint to admin |
| PATCH | `/complaints/:id/status` | ✓ | admin | Update complaint status |
| POST | `/complaints/:id/resolve` | ✓ | admin | Resolve a complaint |
| POST | `/complaints/:id/reject` | ✓ | admin | Reject a complaint |
| PATCH | `/complaints/:id/priority` | ✓ | admin | Update complaint priority |

## Incidents

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/incidents` | ✓ | any | Report an incident |
| GET | `/incidents/summary` | ✓ | admin | Incident summary statistics |
| GET | `/incidents` | ✓ | admin | List all incidents |
| GET | `/incidents/:id` | ✓ | admin | Get incident details |
| POST | `/incidents/:id/assign` | ✓ | admin | Assign incident |
| POST | `/incidents/:id/acknowledge` | ✓ | admin | Acknowledge incident |
| PATCH | `/incidents/:id/status` | ✓ | admin | Update incident status |
| PATCH | `/incidents/:id/severity` | ✓ | admin | Update incident severity |
| POST | `/incidents/:id/notes` | ✓ | admin | Add investigation notes |
| POST | `/incidents/:id/resolve` | ✓ | admin | Resolve incident |
| POST | `/incidents/:id/close` | ✓ | admin | Close incident |
| POST | `/incidents/:id/reopen` | ✓ | admin | Reopen incident |
| POST | `/incidents/:id/escalate` | ✓ | admin | Escalate incident |

## Feedback

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/feedback` | ✗ | — | Submit public feedback (rate-limited) |
| GET | `/feedback` | ✓ | admin | List feedback with filters |
| GET | `/feedback/:id` | ✓ | admin | Get feedback details |
| PATCH | `/feedback/:id/status` | ✓ | admin | Update feedback status & notes |

## Analytics

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/analytics/public-impact` | ✗ | — | Public impact metrics (landing page) |
| GET | `/analytics/impact` | ✓ | any | Impact dashboard metrics |
| GET | `/analytics/trends` | ✓ | any | Donation trends |
| GET | `/analytics/leaderboard` | ✓ | any | Leaderboards |
| GET | `/analytics/admin/kpis` | ✓ | admin | KPI summary dashboard |
| GET | `/analytics/admin/hotspots` | ✓ | admin | Geographical donation hotspots |
| GET | `/analytics/admin/wasted-categories` | ✓ | admin | Wasted food categories |
| GET | `/analytics/admin/demand-gaps` | ✓ | admin | NGO demand gap analysis |
| GET | `/analytics/admin/delivery-reliability` | ✓ | admin | Delivery reliability metrics |
| GET | `/analytics/admin/inactive-providers` | ✓ | admin | Inactive provider list |
| GET | `/analytics/admin/filter-options` | ✓ | admin | Dynamic filter options |
| GET | `/analytics/admin/export` | ✓ | admin | Export analytics data |

## Admin

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/admin/pending-verifications` | ✓ | admin | Pending verifications |
| POST | `/admin/verify/:type/:id` | ✓ | admin | Verify provider/ngo |
| GET | `/admin/complaints` | ✓ | admin | List complaints (alias) |
| GET | `/admin/complaints/stats` | ✓ | admin | Complaint stats (alias) |
| GET | `/admin/complaints/export` | ✓ | admin | Export complaints (alias) |
| GET | `/admin/complaints/:id` | ✓ | admin | Complaint detail (alias) |
| GET | `/admin/complaints/:id/messages` | ✓ | admin | Complaint messages (alias) |
| POST | `/admin/complaints/:id/messages` | ✓ | admin | Add complaint message (alias) |
| GET | `/admin/complaints/:id/history` | ✓ | admin | Complaint history (alias) |
| POST | `/admin/complaints/:id/assign` | ✓ | admin | Assign complaint (alias) |
| PATCH | `/admin/complaints/:id/status` | ✓ | admin | Update complaint status (alias) |
| POST | `/admin/complaints/:id/resolve` | ✓ | admin | Resolve complaint (alias) |
| POST | `/admin/complaints/:id/reject` | ✓ | admin | Reject complaint (alias) |
| POST | `/admin/complaints/:id/reopen` | ✓ | admin | Reopen complaint (alias) |
| PATCH | `/admin/complaints/:id/priority` | ✓ | admin | Update priority (alias) |
| GET | `/admin/audit-logs` | ✓ | admin | Audit log viewer |

## Health Check

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/health` | ✗ | — | API health check |
