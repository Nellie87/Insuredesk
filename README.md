# InsureAgent - Insurance Agent Management System

A mobile-first Progressive Web App (PWA) for insurance agents to manage clients, vehicles, payments, commissions, and reminders.

---

## Features

- **Client & vehicle registry** - searchable, filterable portfolio
- **Financial calculator** - down payment, installment schedule, commission
- **Payment tracker** - log payments (M-Pesa, cash, bank), track balances
- **Due date reminders** - WhatsApp and SMS alerts to clients
- **Push notifications** - lock-screen alerts on the agent's phone for due payments, renewals, and follow-ups
- **Policy renewal alerts** - proactive expiry notifications to agent
- **Commission dashboard** - monthly earnings breakdown
- **Offline-first** - works without internet, syncs when back online
- **PWA installable** - add to home screen on Android or iPhone

---

## Tech Stack

| Layer        | Tool                        |
|--------------|-----------------------------|
| Frontend     | React 18 + Vite             |
| Styling      | Tailwind CSS                |
| Routing      | React Router v6             |
| State        | Zustand                     |
| Database     | Supabase (PostgreSQL)       |
| Auth         | Supabase Auth               |
| Offline DB   | IndexedDB via `idb`         |
| PWA / SW     | Vite PWA plugin + Workbox   |
| SMS          | Africa's Talking            |
| Dates        | date-fns                    |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/insurance-agent-app.git
cd insurance-agent-app
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL editor, run the contents of `schema.sql` to create all tables
3. Copy your project URL and anon key from **Project Settings → API**

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production

```bash
npm run build
npm run preview  # to test the production build locally
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/       # AppLayout, bottom nav, header
│   ├── ui/           # Reusable UI components (Button, Card, Badge...)
│   └── modules/      # Feature-specific components
├── hooks/
│   ├── useClients.js     # Offline-first client data hook
│   └── usePayments.js    # Payment logging hook
├── lib/
│   ├── supabase.js   # Supabase client + auth helpers
│   ├── db.js         # IndexedDB (local offline storage)
│   └── sync.js       # Background sync manager
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ClientsPage.jsx
│   ├── ClientDetailPage.jsx
│   ├── AddClientPage.jsx
│   ├── CalculatorPage.jsx
│   ├── PaymentsPage.jsx
│   ├── RemindersPage.jsx
│   ├── CommissionsPage.jsx
│   └── SettingsPage.jsx
├── store/
│   └── appStore.js   # Zustand global store (auth, online status, sync)
├── types/
│   └── index.js      # JSDoc type definitions
├── utils/
│   ├── calculator.js # Financial math (down payment, installments, commission)
│   └── reminders.js  # WhatsApp/SMS message templates
└── styles/
    └── index.css     # Tailwind base + global styles
```

---

## Offline Behaviour

The app uses a **service worker** (via Workbox) and **IndexedDB** to work without internet:

| Action              | Offline behaviour                          |
|---------------------|--------------------------------------------|
| View clients        | Served from local IndexedDB cache          |
| Run calculator      | Works fully (pure math, no network needed) |
| Log a payment       | Saved locally, queued for sync             |
| Add a client        | Saved locally, queued for sync             |
| Send WhatsApp       | Opens WhatsApp directly on device          |
| Push notifications  | Need the phone online; scheduled by a daily job |

When the device reconnects, the sync queue automatically flushes to Supabase.

---

## Deploying

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set your environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**. Include `VITE_VAPID_PUBLIC_KEY` if you want phone alerts.

### Netlify

```bash
npm run build
# drag and drop the dist/ folder to netlify.com/drop
```

---

## Push notifications

The in-app calendar does not wake your phone on its own. Phone alerts use **Web Push**: the app asks permission, then a daily Supabase job sends due-date reminders to that device.

**What you get:** lock-screen alerts for payments (14 days / 7 days / tomorrow / today / first overdue day), policy renewals (30 / 14 / 7 days and expiry day), and follow-ups. Several items on the same day are grouped into one summary.

**iPhone:** iOS 16.4+. Add InsureAgent to the Home Screen, open it from there, then enable alerts in **Settings**. Safari-in-a-tab cannot receive them.

### 1. Database

Run `migrations/004_push_notifications.sql` in the Supabase SQL editor (skip this on a fresh install that already used the updated `schema.sql`).

### 2. VAPID keys

```bash
npm run generate:vapid
```

Put `VITE_VAPID_PUBLIC_KEY` in the app `.env` and in your host (Vercel/Netlify). Put the private values in **Supabase → Edge Functions → Secrets**:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example `mailto:you@example.com`)
- `CRON_SECRET`

### 3. Deploy the sender

```bash
supabase functions deploy push-notify
```

### 4. Schedule the job (morning, Kenya time)

Call the function once a day around 07:00 East Africa Time. Example with a cron service or GitHub Action:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/push-notify" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -d '{"mode":"cron"}'
```

Until this job is running, **Enable alerts** still stores the phone subscription and **Send test** can confirm permission. Scheduled due-date alerts start after the job is live.

Then open **Settings → Phone alerts** on the device and tap **Enable alerts**.

---

## SMS sandbox (Africa's Talking)

Use this to prove client reminder SMS before going live. Sandbox messages **do not reach real phones**.

1. In `.env` set `AT_USERNAME=sandbox` and `AT_API_KEY` to the **sandbox** app key from [Africa's Talking](https://account.africastalking.com/).
2. Add your test number in the [simulator](https://developers.africastalking.com/simulator).
3. Send a test from the terminal (no deploy needed):

```bash
npm run sms:test -- --to 0712345678
```

4. To send from the app, copy the same secrets into **Supabase → Edge Functions → Secrets** (`AT_API_KEY`, `AT_USERNAME`, optional `AT_SENDER_ID`), then deploy:

```bash
npx supabase functions deploy sms-send
```

The `supabase` CLI is not installed globally on Windows. `npx` downloads it for that command. After deploy, set `AT_API_KEY` and `AT_USERNAME` in **Supabase → Edge Functions → Secrets**.

After that, **Settings → SMS sandbox** sends a canned test, and each calendar item has an **SMS** button that sends the real reminder text.

While `npm run dev` is running, the app sends SMS through the local Vite server (same keys as `npm run sms:test`), so you can test in the browser without CORS. Restart the dev server after pulling this change.

---

## Roadmap

### Phase 1 - MVP ✅
- [x] Project scaffold (React + Vite + Tailwind + PWA)
- [x] Supabase schema with Row Level Security
- [x] Offline-first architecture (IndexedDB + sync queue)
- [x] Auth (login / session management)
- [x] Dashboard with stats and priority work list
- [x] Client list with search and filter
- [x] Financial calculator

### Phase 2 - Automation
- [ ] Full client add/edit forms with vehicle details
- [ ] Payment logging UI
- [x] Africa's Talking sandbox SMS test path
- [ ] Automated WhatsApp reminders (Africa's Talking / Twilio)
- [ ] Policy renewal alerts
- [ ] Commission dashboard

### Phase 3 - Growth
- [x] Push notifications for due dates and follow-ups
- [ ] PDF receipts for payments
- [ ] Excel/CSV export for reports
- [ ] Multi-agent / brokerage support
- [ ] Client self-service portal

---

## Environment Variables Reference

| Variable                          | Required | Description                        |
|-----------------------------------|----------|------------------------------------|
| `VITE_SUPABASE_URL`               | Yes      | Your Supabase project URL          |
| `VITE_SUPABASE_ANON_KEY`          | Yes      | Your Supabase anon/public key      |
| `VITE_VAPID_PUBLIC_KEY`           | No       | Web Push public key (phone alerts) |
| `AT_API_KEY`                      | No       | Africa's Talking API key (SMS)     |
| `AT_USERNAME`                     | No       | `sandbox` for PoC, live username later |
| `AT_SENDER_ID`                    | No       | Optional SMS sender ID             |

---

## License

MIT - built for insurance agents across Kenya and East Africa.
