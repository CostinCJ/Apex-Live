Based on the development plan and what's been built, here's what remains:

### Code that exists but needs real-world wiring

1. **Supabase project setup** — migrations are written but never applied to a live project. You need to:
   - Create a Supabase project at supabase.com
   - Run `npx supabase link --project-ref <ref>`
   - Run `npx supabase db push` to apply all 8 migrations
   - Deploy Edge Functions: `npx supabase functions deploy ai-proxy` and `workout-sync`
   - Set secrets: `OPENAI_API_KEY` on the Edge Function

2. **Environment variables** — `.env` with real `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. **EAS project ID** — replace `your-eas-project-id` in `app.config.ts` after running `eas init`

4. **First device build** — `eas build --profile development --platform ios` (voice + health require dev client, not Expo Go)

### Features stubbed but not fully implemented

5. **Workout detail screen** — history rows have `onPress` but no detail screen (`src/app/workout/detail/[id].tsx`)
6. **MMKV crash recovery** — `react-native-mmkv` is referenced in the plan but never installed or wired into the workout store for autosave/restore
7. **Progress charts** — the progress tab shows aggregate numbers but no actual charts (plan calls for `@shopify/react-native-skia` or `victory-native`)
8. **Health Connect adapter (Android)** — only the iOS HealthKit adapter and stub exist
9. **Background audio keepalive** — `UIBackgroundModes: ["audio"]` is configured but no silent audio loop or `BackgroundKeepAlive` service exists
10. **Now Playing / lock screen controls** — not implemented
11. **Bluetooth audio routing** — not implemented
12. **react-native-reanimated** — plan calls for it for the workout timer (60fps), currently using `setInterval`

### Testing & QA

13. **Zero tests written** — no unit tests, no E2E (Detox), no perf benchmarks (Reassure). Jest config exists but no test files
14. **ESLint/Prettier** — config files referenced in Phase 1 but never created (`.eslintrc.js`, `.prettierrc`)
15. **Sentry** — not installed or configured

### Pre-submission

16. **App icons & splash** — `assets/` references icons that may not exist yet
17. **Privacy policy URL** — needed for App Store
18. **App Store screenshots**
19. **`console.log` cleanup** for production builds
20. **Bundle size audit**

### Priority order if you want to get to a working demo

1. Supabase project + env vars + deploy Edge Functions
2. Install `react-native-mmkv`, wire crash recovery
3. First EAS dev build
4. Test the full flow on device: sign up → onboarding → start workout → voice coach → end → view history
5. Write tests for critical paths
6. Charts, detail screen, Android health adapter

Want me to start on any of these?