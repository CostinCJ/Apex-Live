# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apex Live is an AI voice fitness trainer — a React Native (Expo 55) mobile app with an Express + Prisma backend. The OpenAI Realtime voice API provides coaching during workouts, proxied through the server for key security.

## Commands

```bash
# Development
npx expo start                    # Metro bundler on :8081
cd server && npm run dev          # API server on :3001 (tsx watch)

# Testing
npm run test                      # All tests (client + server)
npm run test:server               # Server integration tests only
npm run test -- --testPathPattern=auth  # Run specific test file

# Quality
npm run lint                      # ESLint (src/ only, --max-warnings 0)
npm run typecheck                 # TypeScript (client)
cd server && npm run typecheck    # TypeScript (server, separate tsconfig)

# Database
cd server && npm run db:generate          # Regenerate client after schema change
cd server && npm run db:migrate           # Create migration
cd server && npm run db:push              # Push schema without migration
cd server && npm run db:studio            # GUI on :5555

# Builds
eas build --profile development --platform android
eas build --profile development --platform ios
eas build --profile production --platform all
```

## Architecture

**Monorepo with two separate package.json files:**
- Root (`package.json`) — Expo/React Native client, `src/`
- `server/package.json` — Express API server, `server/src/`

Each has its own `tsconfig.json`. ESLint only covers `src/` (server is excluded). Jest config at root runs tests from both `src/` and `server/src/`.

### Client (`src/`)

- **Routing:** Expo Router (file-based) — `src/app/` with `(auth)/`, `(tabs)/`, `onboarding/`, `workout/` groups
- **Features:** Colocated in `src/features/{auth,voice-coach,workout,health,progress,history,profile,onboarding}/` — each contains `components/`, `hooks/`, `services/`, `context/`
- **State:** Zustand stores with MMKV persist (`src/stores/`) — `workoutStore`, `realtimeStore`, `settingsStore`
- **API client:** `src/services/api/client.ts` — fetch wrapper with auto token refresh (deduplicated), offline SyncQueue
- **Voice pipeline:** `src/services/voice/` — AudioCapture, AudioPlayback, RealtimeWebSocket, OpenAIRealtimeAdapter, BackgroundKeepAlive
- **Health:** Platform-specific adapters — `HealthKitAdapter.ios.ts`, `HealthConnectAdapter.android.ts`, shared `IHealthService` interface
- **Path aliases:** `@/*`, `@features/*`, `@services/*`, `@stores/*`, `@theme/*`, `@utils/*`, `@types/*`

### Server (`server/src/`)

- **Routes:** `routes/{auth,workouts,metrics,conversations,progress,users,aiProxy}.ts` — all under `/api/`
- **Auth:** JWT access + refresh tokens, bcrypt (SALT_ROUNDS=12), refresh tokens stored as SHA256 hash. Token rotation on refresh.
- **Middleware:** `middleware/{auth,params,errorHandler,rateLimit}.ts` — `requireAuth` guard extracts user from JWT, rate limiting on auth endpoints
- **Database:** PostgreSQL + Prisma ORM, singleton client in `config/database.ts`. 9 tables (see `server/prisma/schema.prisma`)
- **Validation:** Zod schemas on all routes
- **WebSocket:** `ws` library for realtime sync and OpenAI voice proxy

### Key Design Decisions

- **BigInt IDs:** `WorkoutMetric` uses `BigInt` autoincrement (high-cardinality time-series). `BigInt.toJSON` is patched at server startup. Client API client serializes BigInt in responses.
- **Downsampled metrics:** `workout_metrics_downsampled` table stores 1-min aggregated buckets for historical data
- **Token refresh dedup:** Client uses a `refreshPromise` lock to prevent thundering herd on concurrent 401s
- **Crash recovery:** Active workout state persists to MMKV via Zustand persist middleware
- **Graceful shutdown:** Server handles SIGTERM/SIGINT, closes WebSocket and Prisma connections
- **Health check:** `GET /health` pings PostgreSQL; returns 503 if database is down
- **Containerized:** `server/Dockerfile` provides multi-stage build for production deployment

## Code Style

- Prettier: single quotes, trailing commas, 100 char width, 2-space indent
- ESLint enforces `consistent-type-imports` (use `import type` for type-only imports)
- Unused vars must be prefixed with `_` (`argsIgnorePattern: '^_'`)
- `no-console` is a warning — use `console.warn`/`console.error` only (console.log stripped in prod via babel plugin)
- Strict TypeScript: `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

## Environment

- Client env vars must be prefixed with `EXPO_PUBLIC_` (e.g., `EXPO_PUBLIC_API_URL`)
- Server env in `server/.env` — see `server/.env.example` for required vars (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`)
- CI: GitHub Actions — `deploy.yml` (build on push main / tag), `pr-quality.yml` (lint + typecheck + test on PR)
