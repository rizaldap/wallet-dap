# 💰 Wallet-Dap

Personal finance tracker dengan fitur collaborative goals, gold investment tracking, dan analytics.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏦 **Wallets** | Multiple wallet management (cash, bank, e-wallet) |
| 💳 **Credit Cards** | Track credit card spending & limits |
| 📊 **Transactions** | Income, expense, & transfer tracking |
| 🎯 **Collaborative Goals** | Shared savings goals with members, budgets, contributions |
| 🪙 **Gold Investment** | Track gold purchases across platforms |
| 📈 **Analytics** | Charts, category breakdown, insights |
| 📱 **PWA** | Install as mobile app |
| 🔄 **Realtime Sync** | Live updates for collaborative features |

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | CSS Variables, Glassmorphism, Dark Theme |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Google OAuth) |
| **Realtime** | Supabase Realtime (WebSocket) |
| **Charts** | Recharts |
| **Hosting** | Vercel (recommended) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/wallet-dap.git
cd wallet-dap
npm install
```

### 2. Setup Supabase

1. Create new project di [Supabase](https://supabase.com)
2. Go to **SQL Editor** → Run `supabase-schema.sql`
3. Setup **Authentication**:
   - Enable Google OAuth di Authentication → Providers
   - Add redirect URL: `http://localhost:3000/auth/callback`

### 3. Environment Variables

Copy `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi dengan credentials dari Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 4. Run Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
wallet-dap/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   ├── goals/            # Goals feature
│   │   ├── gold/             # Gold investment
│   │   ├── analytics/        # Charts & insights
│   │   └── ...
│   ├── components/           # React components
│   │   ├── layout/           # Navigation, Layout
│   │   ├── transactions/     # Transaction modal
│   │   └── providers/        # Auth provider
│   ├── lib/
│   │   ├── supabase/         # Database layer
│   │   │   ├── browser.ts    # Browser client
│   │   │   ├── server.ts     # Server client
│   │   │   ├── goals.ts      # Goals functions
│   │   │   └── gold.ts       # Gold functions
│   │   └── hooks/            # React hooks
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── supabase-schema.sql       # Database schema
└── .env.example              # Environment template
```

## 🔐 Security

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Supabase Auth (Google OAuth) |
| **Authorization** | Row Level Security (RLS) on all tables |
| **API Protection** | All routes verify `getCurrentUser()` |
| **HTTPS** | Automatic with Vercel |

## 🌐 Deployment (Vercel)

### 1. Push ke GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy di Vercel

1. Import repo di [Vercel](https://vercel.com)
2. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy!

### 3. Update Supabase Auth

Add production URL ke Supabase → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`

## 📖 Usage Guide

### Wallets
1. Buka **Wallet** di sidebar
2. Klik **+ Add Wallet**
3. Pilih type (cash, bank, e-wallet)
4. Set saldo awal

### Transactions
1. Klik tombol **+** (FAB) di kanan bawah
2. Pilih type (income/expense/transfer)
3. Input amount, category, wallet
4. Save

### Goals (Collaborative)
1. Buka **Goals** → **Create Goal**
2. Set target amount & deadline
3. Invite members via link
4. Add budgets (item yang perlu dibayar)
5. Add contributions (deposit dari wallet)

### Gold Investment
1. Buka **Gold** → **Beli**
2. Pilih platform, jumlah gram, harga
3. Pilih wallet sumber dana
4. Track profit/loss di dashboard

### Export Data
1. Buka **Settings**
2. Klik **HTML** untuk report lengkap
3. Klik **CSV** untuk spreadsheet

## 📝 License

MIT License - feel free to use for personal or commercial projects.

---

Made with ❤️ by Rizal
