# Apex Live

**An AI voice fitness trainer for iOS and Android.** Talk to your coach mid-workout, hands-free, and it answers in real time using your live heart rate and workout data.

> Status: in active development. The Android development build runs end to end; the iOS build and store release are pending.

---

## What it does

- **Real-time voice coaching.** Streams microphone audio to the OpenAI Realtime API and plays the coach's reply back with low latency. Audio keeps running when the phone is locked.
- **Guided and custom workouts.** A workout player with a smooth 60 fps timer (Reanimated), a custom workout builder and a detailed per-workout history.
- **Health data.** Reads heart rate and activity from **Apple HealthKit** on iOS and **Health Connect** on Android, behind one shared interface.
- **Progress tracking.** Weekly charts, personal records and daily summaries.
- **Accounts and subscriptions.** Email sign-up with verification, password reset, onboarding and a paywall with subscription tiers.
- **Offline and crash-safe.** An active workout is persisted to MMKV, so a crash or app kill never loses it. API calls made offline are queued and synced later.

## Architecture

A monorepo with a React Native client and a Node.js API.

```
┌──────────────────────────┐      HTTPS / WebSocket      ┌───────────────────────────┐
│  Expo app (React Native) │ ──────────────────────────▶ │  Express API (TypeScript)  │
│  Expo Router · Zustand   │                             │  JWT auth · Zod · Prisma   │
│  HealthKit / Health Conn.│ ◀── coach audio stream ──── │  OpenAI Realtime proxy     │
└──────────────────────────┘                             └────────────┬──────────────┘
                                                                      │
                                                              PostgreSQL (12 tables)
```

**Client (`src/`)**
- Feature-first layout: `features/{auth, voice-coach, workout, health, progress, history, profile}`
- File-based routing with Expo Router; state in Zustand stores persisted to MMKV
- A fetch wrapper that refreshes tokens automatically, with a shared lock so concurrent 401s trigger **one** refresh instead of a thundering herd
- Voice pipeline: audio capture, playback, a JWT-authenticated WebSocket with heartbeat and exponential-backoff reconnection, and a background keep-alive

**Server (`server/`)**
- Express + Prisma on PostgreSQL. Routes for auth, workouts, metrics, conversations, progress, users, subscriptions and legal documents
- **The OpenAI key never ships in the app.** The client talks to the server, which proxies the Realtime session
- JWT access + refresh tokens with rotation; refresh tokens are stored only as SHA-256 hashes, passwords with bcrypt
- Zod validation on every route, rate limiting on auth endpoints, graceful shutdown and a `/health` check that pings the database
- High-volume heart-rate samples go into a `BigInt`-keyed metrics table, plus a 1-minute downsampled table for history views
- Scheduled jobs and transactional email; a multi-stage Dockerfile for deployment

## Quality

- **Strict TypeScript** (`noUncheckedIndexedAccess`, `noImplicitReturns`), ESLint with `--max-warnings 0`, Prettier
- **Integration tests** for every API area (auth, workouts, metrics, subscriptions, scheduler, AI proxy…) against a real PostgreSQL
- **CI (GitHub Actions):** lint, type-check and tests on every pull request; build on every push to `main`
- **Sentry** error tracking, with `console.log` stripped from production builds

## Tech stack

`React Native 0.83` `Expo 55` `TypeScript` `Expo Router` `Zustand` `MMKV` `Reanimated` `Node.js` `Express` `Prisma` `PostgreSQL` `JWT` `Zod` `WebSockets` `OpenAI Realtime API` `HealthKit` `Health Connect` `Jest` `Sentry` `Docker` `EAS Build` `GitHub Actions`

## Running locally

```bash
# API
cd server
# create .env with DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY
npm install
npm run db:migrate
npm run dev                 # http://localhost:3001

# App (in another terminal, from the repo root)
npm install
npx expo start
```

HealthKit and background audio need a development build (`eas build --profile development`) rather than Expo Go.

```bash
npm test            # client + server tests
npm run lint
npm run typecheck
```
