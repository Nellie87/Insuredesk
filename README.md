# InsureAgent — Insurance Agent Management System

A mobile-first Progressive Web App (PWA) for insurance agents to manage clients, vehicles, payments, commissions, and reminders.

---

## Features

- **Client & vehicle registry** — searchable, filterable portfolio
- **Financial calculator** — down payment, installment schedule, commission
- **Payment tracker** — log payments (M-Pesa, cash, bank), track balances
- **Due date reminders** — WhatsApp and SMS alerts to clients
- **Policy renewal alerts** — proactive expiry notifications to agent
- **Commission dashboard** — monthly earnings breakdown
- **Offline-first** — works without internet, syncs when back online
- **PWA installable** — add to home screen on Android or iPhone

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
| Push notifications  | Queued, delivered when back online         |

When the device reconnects, the sync queue automatically flushes to Supabase.

---

## Deploying

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set your environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Netlify

```bash
npm run build
# drag and drop the dist/ folder to netlify.com/drop
```

---

## Roadmap

### Phase 1 — MVP ✅
- [x] Project scaffold (React + Vite + Tailwind + PWA)
- [x] Supabase schema with Row Level Security
- [x] Offline-first architecture (IndexedDB + sync queue)
- [x] Auth (login / session management)
- [x] Dashboard with stats and priority work list
- [x] Client list with search and filter
- [x] Financial calculator

### Phase 2 — Automation
- [ ] Full client add/edit forms with vehicle details
- [ ] Payment logging UI
- [ ] Automated WhatsApp reminders (Africa's Talking / Twilio)
- [ ] Policy renewal alerts
- [ ] Commission dashboard

### Phase 3 — Growth
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
| `AT_API_KEY`                      | No       | Africa's Talking API key (SMS)     |
| `AT_USERNAME`                     | No       | Africa's Talking username          |
| `VITE_FIREBASE_API_KEY`           | No       | Firebase (push notifications)      |

---

## License

MIT — built for insurance agents across Kenya and East Africa.
