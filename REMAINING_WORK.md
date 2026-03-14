Based on the development plan and what's been built, here's the current status:

### Everything Done

| # | Feature | File(s) |
|---|---|---|
| 1 | PostgreSQL + Prisma server | `server/` (9 tables, JWT auth, all API routes) |
| 2 | Supabase fully removed | 0 references in `src/` |
| 3 | Workout detail screen | `src/app/workout/detail/[id].tsx` |
| 4 | MMKV crash recovery | `src/stores/workoutStore.ts` (Zustand persist + MMKV) |
| 5 | Progress bar charts | `src/features/progress/components/WeeklyChart.tsx` |
| 6 | Health Connect (Android) | `src/services/health/HealthConnectAdapter.android.ts` |
| 7 | Background audio keepalive | `src/services/voice/BackgroundKeepAlive.ts` |
| 8 | Reanimated 60fps timer | `src/features/workout/hooks/useAnimatedTimer.ts` |
| 9 | ESLint + Prettier | `eslint.config.js` + `.prettierrc` |
| 10 | 19 integration tests | `server/src/__tests__/auth.test.ts`, `workouts.test.ts` |
| 11 | Sentry error tracking | `@sentry/react-native` in `_layout.tsx` |
| 12 | Console.log prod strip | `babel.config.js` with transform-remove-console |
| 13 | EAS project linked | ID: `b87c63c3-e214-4d7c-9063-ba2b2bc3ceaf` |
| 14 | Privacy policy | `docs/privacy-policy.html` |
| 15 | Android dev build | Submitted to EAS |

### Still TODO (requires manual action)

- ~~**Sentry DSN**~~ — ✅ Done. Project `apex-live` created in `student-keg` org, DSN set in `.env`
- **OpenAI API key** — set `OPENAI_API_KEY` in `server/.env` for voice coach
- **iOS build** — requires Apple Developer account ($99/year): `eas build --profile development --platform ios`
- **App Store submission** — `eas submit --platform ios` after production build
- **Host privacy policy** — upload `docs/privacy-policy.html` to a public URL
- **Now Playing / lock screen controls** — nice-to-have, not blocking
- **Bluetooth audio routing** — nice-to-have, not blocking

### Quick reference

```bash
# Start everything
cd server && npm run dev          # API server on :3001
cd .. && npx expo start           # Metro bundler on :8081

# Testing
npm run test:server               # 19 integration tests
npm run typecheck                 # TypeScript check
npm run lint                      # ESLint

# Building
eas build --profile development --platform android
eas build --profile development --platform ios
eas build --profile production --platform all

# Database
cd server && npx prisma studio    # DB GUI on :5555
cd server && npx prisma migrate dev --name <name>
```
