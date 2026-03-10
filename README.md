# QRgency – QR + Emergency

Production-quality MVP for instant emergency information via QR codes on vehicles, helmets, and commercial fleets.

**Two models:**
- **B2C (Personal)** — individuals and families register their own vehicle / helmet QR with personal medical and contact information.
- **B2B (Commercial / Fleet)** — logistics companies, cab operators, and organisations register multiple vehicles and drivers under a single company account, with bulk QR generation and a fleet management dashboard.

## Stack

- **Frontend**: Next.js App Router (TypeScript), Tailwind CSS, Framer Motion
- **Backend**: Next.js route handlers + Supabase (PostgreSQL + Auth)
- **Database**: Supabase Postgres using a single schema file `qrgency_supabase_schema.sql`
- **Payments**: Razorpay (primary) + Stripe (secondary)
- **CDN / Caching**: Upstash Redis + Vercel Edge

## Features

### Personal (B2C)
- User registration + login (Google OAuth primary, email/password secondary)
- **Mobile OTP verification** for phone numbers
- Emergency profile wizard (guardian, medical info, critical instructions)
- One-time QR activation with tiered pricing:
  - First 100 activations free, then ₹99 / ₹199 / ₹299
  - Concurrency-safe global counter (starts at 10158200)
  - Secure random QR token (no PII in QR)
- Public, read-only **emergency scan page** at `/e/[token]`

### Commercial / Fleet (B2B)
- Separate **commercial dashboard** for fleet owners
- Register vehicles with number plate, label, and make/model
- Register drivers with name, phone, blood group, and notes
- **Assign drivers to vehicles** — emergency page auto-updates
- **Bulk QR generation** for all vehicles
- Per-vehicle QR download
- Dedicated fleet management pages at `/fleet` and `/drivers`

### Admin Panel
- Login via `admins` table (bcrypt-hashed passwords, JWT session)
- Metrics: users, free vs paid, revenue, QR count
- Recent users & scans
- Ability to **disable / re-enable** any QR

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

ADMIN_JWT_SECRET=any-random-64-char-string

# CDN + Edge caching (Upstash Redis) — see setup guide below
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Stripe keys are no longer required – payments are mocked in-app.

### 2b. Set up Upstash Redis (free — for CDN caching & rate limiting)

The emergency page (`/e/[token]`) uses Upstash Redis for edge caching and rate limiting. Without it the app still works, but every scan hits Supabase directly and there is no abuse protection.

**Step-by-step:**

1. Go to [console.upstash.com](https://console.upstash.com) and create a free account (GitHub / Google login works).
2. Click **"Create Database"**.
3. Give it a name (e.g. `qrgency-cache`).
4. Select the region closest to your users:
   - **Asia Pacific (Mumbai)** — best for India
   - Or pick the region closest to your Vercel deployment
5. Leave the type as **Regional** (free tier) and click **Create**.
6. On the database details page, scroll to the **REST API** section.
7. Copy the two values:
   - `UPSTASH_REDIS_REST_URL` — looks like `https://xyz-abc.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` — looks like `AXxx...long-string`
8. Paste them into your `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL=https://xyz-abc.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXxxYourTokenHere
   ```
9. Restart the dev server (`npm run dev`). The cache is now active.

**Free tier limits** (more than enough for this project):
- 10,000 commands/day
- 256 MB storage
- Global replication available on paid plans

**What it does once configured:**
- Emergency profile data is cached in Redis for 60 seconds — repeat scans skip Supabase entirely (~5ms response).
- Vercel CDN serves the cached HTML at the edge for another 60s with 5-min stale-while-revalidate.
- Rate limiter blocks IPs that make more than 30 requests/minute to `/e/*` routes.
- Cache is automatically busted when admin toggles QR status or user updates their profile.

### 3. Apply database schema

1. Open the Supabase SQL editor for your project.
2. Paste the contents of `qrgency_supabase_schema.sql`.
3. Run the script once to create all tables, policies, and functions:
   - `profiles` (with `account_type` for B2C/B2B), `emergency_profiles`, `medical_info`, `emergency_notes`
   - `emergency_contacts`, `qr_codes`, `payments`, `customer_counter`
   - `fleet_vehicles`, `fleet_drivers` (B2B fleet tables)
   - `scan_logs`, `admins`, `mobile_verification`
   - Analytics: `daily_stats`, `analytics_snapshots`, `user_lifecycle_events`, `abuse_incidents`

The `customer_counter` is seeded so the first activated user gets activation number **10158200**.

### 4. Seed an admin user

In Supabase SQL editor, create an initial admin (password is `admin123` in this example, hashed with bcrypt):

```sql
insert into public.admins (email, password_hash)
values (
  'admin@gmail.com',
  '$2b$10$kB4Q7iZ3L1dS7pW8Sx5o9e6q3gD8FpX7eFJ0vXlYbqYkbtq3lF2u' -- replace with your own bcrypt hash
);
```

You can generate a bcrypt hash locally using Node or any online tool and replace the value above.

### 5. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Core Flows

### Personal (B2C)
- **Onboarding**: Register → mobile OTP → dashboard → emergency profile → activate QR.
- **Activation**: Dashboard opens a PaymentModal which calls `/api/activate` (free) or Razorpay (paid). The backend atomically increments `customer_counter`, generates a secure QR token, and records the payment.
- **Emergency scan**: `/e/[token]` renders a fast, mobile-first page with name, blood group, allergies, medications, critical instructions, call buttons for guardian & emergency contacts, and fixed 112 buttons.

### Commercial (B2B)
- **Onboarding**: Register with `?segment=commercial` → commercial dashboard.
- **Fleet management**: Add vehicles → add drivers → assign drivers to vehicles.
- **Bulk QR**: Generate QR codes for all vehicles at once via `/api/fleet/generate-all-vehicle-qrs`.
- **Emergency scan**: `/e/[token]` shows company name, vehicle details, driver info, and owner contact instead of personal medical data.

## Admin Panel

- Go to `/admin` and log in with your seeded admin account.
- Dashboard lets you:
  - View total users, free vs paid activations, QR count, and estimated revenue.
  - Search users by mobile number.
  - See QR token + active/disabled status per user.
  - Toggle QR active state via the **Disable QR / Enable QR** button.
  - Inspect recent scan logs (token, time, IP).

## Notes

- Mobile OTP is implemented as a **mock** flow:
  - OTP codes are stored hashed in `mobile_verification`.
  - Codes are logged to the server console for development.
  - Swap in an SMS provider later without changing the main app logic.
- Payments are **mocked**:
  - First 1000 activations are free.
  - Later activations record a ₹10 mock payment in `payments`.
  - The activation flow remains concurrency-safe via the `complete_activation` database function.
