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
| POST | `/auth/verify-email-otp` | ✗ | — | Verify 6-digit email OTP during registration |
| POST | `/auth/resend-email-otp` | ✗ | — | Resend 6-digit email OTP for pending registration |
| POST | `/auth/login` | ✗ | — | Login, returns access + refresh tokens |
| POST | `/auth/forgot-password` | ✗ | — | Request 6-digit password reset OTP (Super Admin excluded) |
| POST | `/auth/reset-password` | ✗ | — | Commit new password using verified 6-digit OTP |
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
| DELETE | `/users/:id` | ✓ | self | Delete account (blocked for admin, validates in-flight missions) |

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
| GET | `/donations/:id/claims` | ✓ | provider/admin | Get claims ranked by 5-Factor Priority Algorithm |
| POST | `/donations/:id/claim` | ✓ | ngo | Submit claim for surplus donation |
| POST | `/donations/:id/claims/:claimId/accept` | ✓ | provider | Accept NGO claim & create delivery record |
| POST | `/donations/:id/claims/:claimId/reject` | ✓ | provider | Reject claim with optional reason notes |
| POST | `/donations/:id/cancel` | ✓ | provider | Cancel own donation |
| PATCH | `/donations/:id/pickup-type` | ✓ | ngo | Update pickup type for claimed donation |
| GET | `/donations/:id/timeline` | optional | — | Get chronological donation lifecycle timeline events |
| GET | `/donations/:id/completion-emails` | ✓ | any | Get audit logs for automated donation completion emails |
| POST | `/donations/:id/completion-emails/retry` | ✓ | admin | Retry failed completion email dispatch |

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
| POST | `/notifications/test` | ✓ | any | Trigger test notification to verified devices |
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
| GET | `/admin/verifications` | ✓ | admin | List user verifications with status filters |
| GET | `/admin/verifications/:userId` | ✓ | admin | Get detailed verification data for a user |
| POST | `/admin/verifications/:userId/documents` | ✓ | admin | Add verification document record |
| PATCH | `/admin/verifications/:userId/approve` | ✓ | admin | Approve user registration & unlock dashboard access |
| PATCH | `/admin/verifications/:userId/reject` | ✓ | admin | Reject user verification with reason notes |
| PATCH | `/admin/verifications/:userId/request-info` | ✓ | admin | Request additional verification documents |
| PATCH | `/admin/verifications/:userId/suspend` | ✓ | admin | Suspend or reactivate user account |
| GET | `/admin/pending-verifications` | ✓ | admin | Legacy pending verifications list |
| POST | `/admin/verify/:type/:id` | ✓ | admin | Verify entity (provider/ngo) |
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

---

## Detailed Payload Specifications

### 1. Password Reset Flow

#### `POST /auth/forgot-password`
Initiates self-service password recovery by generating a single-use 6-digit OTP (10-minute expiry) delivered via email.
> **Security Guard**: Super Administrators (`role === 'admin'`) are strictly rejected with `403 Forbidden`.

- **Request Body**:
```json
{
  "email": "shelter@kindness.org"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset verification code sent to your email."
}
```
- **Error Response (403 Forbidden - Admin Protection)**:
```json
{
  "success": false,
  "message": "Super Administrator credentials cannot be reset via public recovery. Contact systems administrator."
}
```

#### `POST /auth/reset-password`
Validates the 6-digit OTP and commits the new `bcrypt` password hash.

- **Request Body**:
```json
{
  "email": "shelter@kindness.org",
  "otp": "492817",
  "newPassword": "NewSecurePassword123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new credentials."
}
```

---

### 2. Account Deletion Lifecycle

#### `DELETE /users/:id`
Permanently deletes the requesting user's account and associated data records.
> **Security Guards**:
> 1. Super Administrators (`role === 'admin'`) are strictly prohibited from deletion (`403 Forbidden`).
> 2. Users with active in-flight missions (active donations, incoming deliveries, or pending claims) cannot delete until completed or cancelled (`400 Bad Request`).

- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "confirmation": "password123" // Or "DELETE" for OAuth-linked accounts
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Account and associated profile records have been permanently deleted."
}
```
- **Error Response (400 Bad Request - In-Flight Mission Lock)**:
```json
{
  "success": false,
  "message": "Cannot delete account while you have active donations or delivery missions in progress."
}
```

---

### 3. Smart Shelter Claim Priority & Need Ranking

#### `GET /donations/:id/claims`
Fetches all candidate NGO claims submitted for a food donation, scored and ranked in real time by the 5-factor priority algorithm (`claim-ranking.service.js`).

- **Headers**: `Authorization: Bearer <access_token>` (Provider or Admin)
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "c1a2b3c4-0000-0000-0000-000000000001",
      "donation_id": "d1a2b3c4-0000-0000-0000-000000000001",
      "ngo_id": "n1a2b3c4-0000-0000-0000-000000000001",
      "ngo_name": "Hope Community Kitchen",
      "ngo_phone": "+91 98765 43210",
      "status": "pending",
      "claim_time": "2026-11-19T10:30:00Z",
      "priority_score": 94,
      "need_score": 95,
      "need_level": "critical",
      "capacity_score": 100,
      "distance_score": 90,
      "reviews_score": 88,
      "reliability_score": 100,
      "distance_km": 2.4,
      "days_since_last_donation": 14,
      "daily_capacity": 500,
      "daily_beneficiaries": 450,
      "bayesian_rating": 4.82,
      "recommendation_badge": "Best Match",
      "recommendation_badge_type": "best_match",
      "recommendation_reason": "Acute hunger deficit (14 days since last food intake), optimal portion intake match, and excellent community trust (4.8★).",
      "ranking_factors": {
        "hunger_need": 95,
        "community_reviews": 88,
        "absorption_capacity": 100,
        "proximity": 90,
        "reliability": 100
      }
    }
  ]
}
```

---

## 📞 Support & Operational Inquiries

For developer queries or API access support:
- **Central Project Email**: `2026.food.rescue@gmail.com`
- **India Country Helpline**: `+91 1800 555 7372`
- **Emergency Dispatch API Support**: `+91 98765 43211`
