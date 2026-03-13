# Apex Live -- AI Voice Fitness Trainer: Development Plan

> **Stack:** React Native + Expo (Development Client), TypeScript, Zustand, Supabase, OpenAI Realtime API
> **Platform:** iOS primary (HealthKit), Android secondary (Health Connect)
> **Dev Environment:** Windows 11 host, EAS cloud builds for iOS

---

## Phase 1: Project Scaffold and Tooling

**Goal:** A buildable Expo project with strict TypeScript, linting, testing infrastructure, dark theme foundation, and the full folder structure in place. No features -- just the skeleton.

**Dependencies:** None (first phase)
**Complexity:** M

### Steps

1.1. **Initialize Expo project with TypeScript template**
```bash
npx create-expo-app@latest Apex-Live --template blank-typescript
```
Move contents into repo root. Rename to `app.config.ts` (dynamic config, not `app.json`).
*[DevOps: dynamic config with env-aware settings]*

1.2. **Configure `app.config.ts`** with environment-aware bundle IDs
- `com.apexlive.dev` / `com.apexlive.preview` / `com.apexlive.prod`
- Read `APP_ENV` from `process.env` or default to `development`
- Set `expo.plugins` for later: `expo-av`, `expo-secure-store`, `expo-haptics`
- Add `UIBackgroundModes: ["audio"]` in iOS config
- File: `app.config.ts`
*[DevOps, Developer]*

1.3. **Install and configure TypeScript strict mode**
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`, `forceConsistentCasingInFileNames: true`
- Add path aliases: `@/` -> `src/`, `@features/` -> `src/features/`, `@services/` -> `src/services/`
- File: `tsconfig.json`
*[QA]*

1.4. **Install and configure ESLint + Prettier**
- Packages: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react-hooks`, `eslint-plugin-react-native-a11y`, `prettier`
- Config: strict-type-checked preset, ban `any` (`@typescript-eslint/no-explicit-any: error`), ban non-null assertions
- Files: `.eslintrc.js`, `.prettierrc`
*[QA]*

1.5. **Install testing infrastructure**
- Packages: `jest`, `@testing-library/react-native`, `@testing-library/jest-native`, `msw`, `ts-jest`
- Detox (E2E) config stub -- actual setup deferred to Phase 10
- Files: `jest.config.ts`, `jest.setup.ts`, `src/__mocks__/` directory
*[Tester]*

1.6. **Create feature-based folder structure**
```
src/
  app/                    # Root layout, navigation, providers
  features/
    voice-coach/          # Voice pipeline feature
      components/
      hooks/
      services/
      types.ts
    workout/              # Active workout feature
      components/
      hooks/
      services/
      types.ts
    health/               # HealthKit / Health Connect
      components/
      hooks/
      services/
      types.ts
    history/              # Training history & charts
      components/
      hooks/
      services/
      types.ts
    profile/              # User profile & settings
      components/
      hooks/
      services/
      types.ts
    auth/                 # Authentication
      components/
      hooks/
      services/
      types.ts
    onboarding/           # First-run flow
      components/
      hooks/
      types.ts
  services/               # Shared service interfaces & adapters
    voice/
      IVoiceService.ts
      OpenAIRealtimeAdapter.ts
    health/
      IHealthService.ts
      HealthKitAdapter.ios.ts
      HealthConnectAdapter.android.ts
    supabase/
      client.ts
      types.ts
  stores/                 # Zustand stores (slice pattern)
    realtimeStore.ts      # Fast-updating (HR, timer, audio state)
    workoutStore.ts       # Session data (sets, reps, exercise)
    settingsStore.ts      # User preferences, persisted
    index.ts
  theme/
    colors.ts
    spacing.ts
    typography.ts
    ThemeProvider.tsx
  utils/
    constants.ts
    haptics.ts
    audio.ts
    prompt-engine.ts
  types/
    global.d.ts
    navigation.ts
    supabase.ts
```
*[Architect]*

1.7. **Set up dark theme foundation**
- Background: `#0D0D0D`, Surface: `#1A1A1A`, Primary: high-contrast accent
- Typography scale: 72sp timer, 64-80sp primary metric, body, caption
- Touch target constants: 56dp minimum
- Files: `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/typography.ts`
*[UX/Accessibility]*

1.8. **Create `.env.example` and `.gitignore`**
- `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ENV`
- `.gitignore`: node_modules, .env*, ios/, android/, .expo/
- File: `.env.example`, `.gitignore`
*[DevOps, Security]*

1.9. **Set up EAS configuration**
- `eas.json` with 3 profiles: `development` (dev client), `preview` (internal distribution), `production` (app store)
- File: `eas.json`
*[DevOps]*

1.10. **Verify scaffold builds**
- Run `npx expo start` -- app launches with dark background
- Run `npx tsc --noEmit` -- zero type errors
- Run `npx eslint src/` -- zero lint errors
- Run `npx jest` -- test runner initializes (0 tests is OK)

### Acceptance Criteria
- [ ] `npx expo start` launches without errors
- [ ] TypeScript strict mode compiles cleanly
- [ ] ESLint passes with zero warnings/errors
- [ ] All directories from 1.6 exist with placeholder `index.ts` barrel files
- [ ] `app.config.ts` dynamically sets bundle ID based on `APP_ENV`
- [ ] Dark theme renders on screen

---

## Phase 2: Backend / Database Setup

**Goal:** Supabase project configured with full schema, RLS policies, Edge Functions for AI proxy, and migrations in version control.

**Dependencies:** Phase 1 (Supabase client needs project to connect to)
**Complexity:** L

### Steps

2.1. **Create Supabase project (dev environment)**
- Create project via Supabase dashboard (dev instance)
- Initialize Supabase CLI locally: `npx supabase init`
- Link to remote: `npx supabase link --project-ref <ref>`
- File: `supabase/config.toml`
*[DevOps, Database]*

2.2. **Create core schema migration -- users and workouts**
```sql
-- Migration: 001_core_schema.sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  fitness_level TEXT CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  voice_preference JSONB DEFAULT '{"verbosity":"normal","encouragement":true}',
  units TEXT DEFAULT 'imperial' CHECK (units IN ('imperial','metric')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  workout_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);
CREATE INDEX idx_workouts_user_started ON workouts(user_id, started_at DESC);
```
- File: `supabase/migrations/001_core_schema.sql`
*[Database]*

2.3. **Create workout_metrics table with monthly partitioning**
```sql
-- Migration: 002_workout_metrics.sql
CREATE TABLE workout_metrics (
  id UUID DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create partitions for current + next 3 months
-- BRIN index for time-series queries
CREATE INDEX idx_metrics_recorded_brin ON workout_metrics USING BRIN(recorded_at);
CREATE INDEX idx_metrics_workout ON workout_metrics(workout_id, metric_type);
CREATE INDEX idx_metrics_user_type ON workout_metrics(user_id, metric_type, recorded_at DESC);
```
- File: `supabase/migrations/002_workout_metrics.sql`
*[Database, Performance]*

2.4. **Create supporting tables**
```sql
-- Migration: 003_supporting_tables.sql
-- personal_records, coach_conversations, coach_messages, daily_workout_summaries
```
- `personal_records`: user_id, exercise, metric_type, value, achieved_at, workout_id
- `coach_conversations`: id, user_id, workout_id, started_at, ended_at, message_count
- `coach_messages`: id, conversation_id, role, content, audio_duration_ms, created_at
- `daily_workout_summaries`: user_id, date, total_duration, total_calories, workout_count, summary_data JSONB
- File: `supabase/migrations/003_supporting_tables.sql`
*[Database]*

2.5. **Create database functions**
- `get_previous_workout(p_user_id, p_workout_type)` -- returns last completed workout of same type for comparison
- `compare_workout_metrics(p_current_workout_id, p_previous_workout_id)` -- metric-by-metric comparison
- Trigger: auto-update `daily_workout_summaries` on workout completion
- Trigger: auto-update `users.updated_at`
- File: `supabase/migrations/004_functions.sql`
*[Database]*

2.6. **Apply RLS policies on every table**
```sql
-- Migration: 005_rls_policies.sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
-- Same pattern for workouts, workout_metrics, personal_records, etc.
-- workout_metrics: user_id denormalized for RLS performance (avoids JOIN to workouts)
```
- File: `supabase/migrations/005_rls_policies.sql`
*[Security, Database]*

2.7. **Create AI Proxy Edge Function**
```typescript
// supabase/functions/ai-proxy/index.ts
// - Validates Supabase JWT from Authorization header
// - Creates ephemeral OpenAI Realtime session
// - Returns { url, token, expires_at } for client WebSocket
// - Rate limiting: max 5 sessions/hour per user
// - Never exposes OpenAI API key to client
```
- File: `supabase/functions/ai-proxy/index.ts`
*[Security, Developer]*

2.8. **Create Workout Sync Edge Function**
```typescript
// supabase/functions/workout-sync/index.ts
// - Receives batched workout metrics from client
// - Validates and inserts in bulk
// - Handles conflict resolution for crash recovery
```
- File: `supabase/functions/workout-sync/index.ts`
*[Developer, Performance]*

2.9. **Generate TypeScript types from schema**
- Run `npx supabase gen types typescript --local > src/types/supabase.ts`
- File: `src/types/supabase.ts` (generated)
*[Database]*

2.10. **Configure Supabase client in app**
- Use `@supabase/supabase-js` with `expo-secure-store` as storage adapter (not AsyncStorage)
- Singleton client with environment-aware URL/key
- Files: `src/services/supabase/client.ts`, `src/services/supabase/secure-storage-adapter.ts`
*[Security, Developer]*

2.11. **Run and verify migrations**
- `npx supabase db push` (or `npx supabase migration up` locally)
- Verify all tables, indexes, RLS policies, and functions exist
- Test RLS: confirm unauthorized access is blocked

### Acceptance Criteria
- [ ] All tables exist with correct columns and constraints
- [ ] RLS policies block cross-user data access (tested with 2 test users)
- [ ] `ai-proxy` Edge Function returns ephemeral token (tested via curl)
- [ ] `workout-sync` Edge Function accepts and stores batched metrics
- [ ] TypeScript types generated and importable
- [ ] Supabase client connects from app using secure storage

---

## Phase 3: Core App Shell

**Goal:** Working app with navigation, authentication (sign-up/login), user profile creation, and themed UI shell. User can sign up, log in, and see the main tab navigator.

**Dependencies:** Phase 1, Phase 2
**Complexity:** M

### Steps

3.1. **Install navigation dependencies**
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler
```
*[Developer]*

3.2. **Set up Expo Router file-based navigation**
```
src/app/
  _layout.tsx          # Root layout: providers, error boundaries
  (auth)/
    _layout.tsx
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx        # Tab navigator (4 tabs)
    index.tsx          # Home / Quick Start
    history.tsx        # Training history
    progress.tsx       # Progress & charts
    profile.tsx        # Settings & profile
  workout/
    [id].tsx           # Active workout (modal presentation)
  onboarding/
    _layout.tsx
    index.tsx          # 5-screen onboarding flow
```
- Navigation rule: 2 taps to start workout (Quick Start cards on home)
- Active workout presented as modal (prevents accidental navigation away)
*[UX/Accessibility, Developer]*

3.3. **Create root layout with provider hierarchy**
```typescript
// src/app/_layout.tsx
// Provider order: SafeAreaProvider → ThemeProvider → AuthProvider → ErrorBoundary → Slot
```
- Root error boundary wrapping entire app
- File: `src/app/_layout.tsx`
*[Architect, QA]*

3.4. **Implement authentication flow**
- Supabase Auth with email/password (MVP), extensible to OAuth
- `useAuth` hook: `signUp`, `signIn`, `signOut`, `session`, `loading`
- Auto-create `users` row on first sign-up (via Supabase trigger or client-side)
- Store session token via `expo-secure-store`
- Files: `src/features/auth/hooks/useAuth.ts`, `src/features/auth/components/LoginForm.tsx`, `src/features/auth/components/RegisterForm.tsx`
*[Security, Developer]*

3.5. **Build auth screens**
- Login screen with email/password, link to register
- Register screen with email/password/confirm, link to login
- Dark themed, 56dp touch targets, accessible labels
- Files: `src/app/(auth)/login.tsx`, `src/app/(auth)/register.tsx`
*[UX/Accessibility]*

3.6. **Build tab navigator shell**
- 4 tabs: Home, History, Progress, Profile
- Tab bar: dark themed, haptic feedback on tap
- Placeholder content in each tab
- File: `src/app/(tabs)/_layout.tsx`
*[UX/Accessibility]*

3.7. **Build Home screen with Quick Start**
- Quick Start cards: "Push Day", "Pull Day", "Legs", "Custom Workout" (placeholder data)
- 2 taps to start: tap card → confirm → navigate to workout modal
- Today's summary area (placeholder)
- File: `src/app/(tabs)/index.tsx`, `src/features/workout/components/QuickStartCard.tsx`
*[UX/Accessibility]*

3.8. **Build Profile screen (basic)**
- Display name, fitness level picker, units toggle, voice preference
- Sign out button
- File: `src/app/(tabs)/profile.tsx`, `src/features/profile/components/ProfileForm.tsx`
*[UX/Accessibility]*

3.9. **Set up Zustand stores (empty slices)**
- `realtimeStore`: audio state, current HR, timer, connection status (fast updates)
- `workoutStore`: current exercise, sets, reps, workout metadata (session data)
- `settingsStore`: user preferences, persisted to MMKV
- Slice pattern with `immer` middleware
- Install: `zustand`, `immer`
- Files: `src/stores/realtimeStore.ts`, `src/stores/workoutStore.ts`, `src/stores/settingsStore.ts`, `src/stores/index.ts`
*[Architect, QA]*

3.10. **Install `expo-secure-store` and `expo-haptics`**
```bash
npx expo install expo-secure-store expo-haptics
```
*[Security, UX]*

### Acceptance Criteria
- [ ] User can register, log in, and see the tab navigator
- [ ] Auth state persists across app restart (secure storage)
- [ ] Tab navigation works with haptic feedback
- [ ] Home screen shows Quick Start cards
- [ ] Profile screen reads/writes user settings to Supabase
- [ ] Dark theme applied consistently across all screens
- [ ] All touch targets >= 56dp
- [ ] Zustand stores initialize without errors

---

## Phase 4: Voice Coaching Pipeline

**Goal:** User can talk to the AI voice coach in real-time. Mic input streams to OpenAI Realtime API via WebSocket, AI responds with voice. This is the core differentiating feature.

**Dependencies:** Phase 2 (Edge Function for ephemeral token), Phase 3 (auth + navigation)
**Complexity:** XL

### Steps

4.1. **Install audio dependencies**
```bash
npx expo install expo-av
```
- Requires Development Client build (not Expo Go)
- Trigger first `eas build --profile development --platform android`
*[Developer]*

4.2. **Build audio capture service**
```typescript
// src/services/voice/AudioCaptureService.ts
// - Configure audio session: allowsRecording, playsInSilentMode, staysActiveInBackground
// - Chunked stop-read-restart pattern (250ms chunks)
// - Read recorded file as base64 after each chunk stop
// - Handle earpiece vs speaker routing
// - Cleanup: unload Recording objects to prevent memory leaks
```
- GOTCHA: `expo-av` is file-based, not streaming. Must stop recording to read data.
- File: `src/services/voice/AudioCaptureService.ts`
*[Developer, Performance]*

4.3. **Build WebSocket manager for OpenAI Realtime API**
```typescript
// src/services/voice/RealtimeWebSocket.ts
// - Connect to OpenAI Realtime API using ephemeral token from Edge Function
// - Send audio chunks as base64 `input_audio_buffer.append` events
// - Receive `response.audio.delta` events for TTS playback
// - Handle `conversation.item.created` for transcription
// - Reconnection logic with exponential backoff
// - Heartbeat/keepalive
// - Connection state management
```
- Single WebSocket handles both STT and TTS (~300-500ms latency)
- File: `src/services/voice/RealtimeWebSocket.ts`
*[Developer, Architect]*

4.4. **Build audio playback service**
```typescript
// src/services/voice/AudioPlaybackService.ts
// - Receive base64 audio deltas from WebSocket
// - Buffer and play via expo-av Sound objects
// - Jitter buffer for smooth playback
// - Queue management: interrupt current playback on new response
// - Audio ducking: lower music volume during coach speech
// - Cleanup: unload Sound objects after playback
```
- File: `src/services/voice/AudioPlaybackService.ts`
*[Developer, Performance]*

4.5. **Build PromptEngine (pure function)**
```typescript
// src/utils/prompt-engine.ts
// - Accepts: user profile, current workout state, recent health metrics, conversation history
// - Returns: system prompt string for OpenAI Realtime session
// - Includes: exercise context, rep counts, heart rate zone, encouragement style
// - Debounced context updates: session.update sent at most every 5 seconds
// - Prompt injection defense: system prompt is isolated, user voice is user-role only
```
- File: `src/utils/prompt-engine.ts`
*[Architect, Security]*

4.6. **Build `IVoiceService` interface and adapter**
```typescript
// src/services/voice/IVoiceService.ts
interface IVoiceService {
  connect(token: string): Promise<void>;
  disconnect(): void;
  startListening(): void;
  stopListening(): void;
  updateContext(context: VoiceContext): void;
  onTranscript: (callback: TranscriptCallback) => void;
  onAudioResponse: (callback: AudioCallback) => void;
  onError: (callback: ErrorCallback) => void;
  connectionState: ConnectionState;
}

// src/services/voice/OpenAIRealtimeAdapter.ts
// Implements IVoiceService using AudioCaptureService + RealtimeWebSocket + AudioPlaybackService
```
*[Architect]*

4.7. **Build `useVoiceCoach` orchestrator hook**
```typescript
// src/features/voice-coach/hooks/useVoiceCoach.ts
// THE linchpin hook that orchestrates the voice pipeline:
// 1. Fetches ephemeral token from ai-proxy Edge Function
// 2. Initializes IVoiceService connection
// 3. Manages mic on/off state (push-to-talk or continuous)
// 4. Feeds workout context via PromptEngine (debounced 5s)
// 5. Updates realtimeStore with connection state, transcripts
// 6. Handles errors: network loss, token expiry, mic permission denied
// 7. Cleanup on unmount
//
// State machine: IDLE → CONNECTING → CONNECTED → LISTENING → PROCESSING → SPEAKING → LISTENING
// Error states: DISCONNECTED → RECONNECTING
```
- File: `src/features/voice-coach/hooks/useVoiceCoach.ts`
*[Architect, Developer]*

4.8. **Build voice coach UI components**
```typescript
// src/features/voice-coach/components/VoiceOrb.tsx
// - Animated orb showing coach state (idle, listening, thinking, speaking)
// - Reanimated SharedValue for smooth animation
// - Accessible: announces state changes

// src/features/voice-coach/components/TranscriptOverlay.tsx
// - Shows recent transcript lines (user + coach)
// - Auto-scrolls, fades old lines
// - Can be toggled on/off

// src/features/voice-coach/components/VoiceControls.tsx
// - Mic mute/unmute button
// - End coaching session button
// - 56dp touch targets
```
- Files: `src/features/voice-coach/components/VoiceOrb.tsx`, `TranscriptOverlay.tsx`, `VoiceControls.tsx`
*[UX/Accessibility, Performance]*

4.9. **Request microphone permission with explanation**
- Permission flow: explain why mic is needed → request → handle denial gracefully
- File: `src/features/voice-coach/hooks/useMicPermission.ts`
*[UX/Accessibility, Security]*

4.10. **Save coach conversation to Supabase**
- On session end: batch-insert messages to `coach_messages`
- Create `coach_conversations` record with metadata
- Do NOT stream every message to DB in real-time (batched on end)
- File: `src/features/voice-coach/services/conversationSync.ts`
*[Database, Performance]*

4.11. **Write unit tests for voice pipeline**
- Mock WebSocket with MSW or custom mock
- Test PromptEngine with various workout states
- Test `useVoiceCoach` state machine transitions
- Test reconnection logic
- Files: `src/features/voice-coach/hooks/__tests__/useVoiceCoach.test.ts`, `src/utils/__tests__/prompt-engine.test.ts`
*[Tester]*

### Acceptance Criteria
- [ ] User can tap "Start Coaching" and speak; AI responds with voice within ~500ms
- [ ] Transcript appears on screen (user speech + AI response)
- [ ] Voice orb animates correctly for each state
- [ ] Session survives brief network interruption (auto-reconnect)
- [ ] OpenAI API key is never exposed in client code
- [ ] Mic permission is requested with explanation
- [ ] Conversation is saved to Supabase on session end
- [ ] No audio resource leaks (Sound/Recording objects cleaned up)
- [ ] Unit tests pass for PromptEngine and useVoiceCoach state machine

---

## Phase 5: Health Data Integration

**Goal:** App reads real-time health metrics (heart rate, calories, step count) from HealthKit (iOS) / Health Connect (Android) and surfaces them in the UI and to the AI coach.

**Dependencies:** Phase 3 (auth + stores)
**Complexity:** L

### Steps

5.1. **Install health data packages**
```bash
npx expo install react-native-health        # iOS HealthKit
npx expo install react-native-health-connect # Android Health Connect
```
- Requires Development Client (already built in Phase 4)
*[Developer]*

5.2. **Build `IHealthService` interface**
```typescript
// src/services/health/IHealthService.ts
interface IHealthService {
  requestPermissions(): Promise<PermissionResult>;
  startObserving(metrics: HealthMetric[]): void;
  stopObserving(): void;
  getLatestMetrics(): HealthSnapshot;
  onMetricUpdate: (callback: MetricCallback) => void;
  isAvailable(): Promise<boolean>;
}
```
- File: `src/services/health/IHealthService.ts`
*[Architect]*

5.3. **Build HealthKit adapter (iOS)**
```typescript
// src/services/health/HealthKitAdapter.ios.ts
// - Request permissions: heart rate, active energy, workout type
// - Observer queries (preferred over polling) for real-time HR from Apple Watch
// - Fallback: 5-second polling interval (Watch sends ~5s anyway)
// - Batch native bridge calls to reduce overhead
// - Handle: permission denied, no Watch paired, HealthKit unavailable
```
- GOTCHA: HealthKit requires physical device, not simulator (for real data)
- File: `src/services/health/HealthKitAdapter.ios.ts`
*[Developer, Performance]*

5.4. **Build Health Connect adapter (Android)**
```typescript
// src/services/health/HealthConnectAdapter.android.ts
// - Request permissions via Health Connect SDK
// - Read heart rate, calories, steps
// - Handle: Health Connect not installed, permissions denied
```
- File: `src/services/health/HealthConnectAdapter.android.ts`
*[Developer]*

5.5. **Build `useHealthData` hook**
```typescript
// src/features/health/hooks/useHealthData.ts
// - Initializes IHealthService (platform-specific via .ios.ts/.android.ts)
// - Requests permissions on first use (with explanation screen)
// - Streams metrics to realtimeStore
// - Adaptive intervals: 5s during exercise, 30s during rest
// - Computes derived metrics: HR zone, calories/min, estimated effort
// - Cleanup on unmount
```
- File: `src/features/health/hooks/useHealthData.ts`
*[Developer, Performance]*

5.6. **Build health metrics display components**
```typescript
// src/features/health/components/HeartRateDisplay.tsx
// - Large HR number with zone color indicator
// - Animated pulse effect synced to rate
// - React.memo to prevent unnecessary re-renders

// src/features/health/components/CalorieCounter.tsx
// - Running calorie total
// - Calories/minute rate

// src/features/health/components/HealthMetricsBar.tsx
// - Compact bar showing HR + calories + duration for workout screen
// - Glanceable: high contrast, large numbers
```
- Files: `src/features/health/components/HeartRateDisplay.tsx`, `CalorieCounter.tsx`, `HealthMetricsBar.tsx`
*[UX/Accessibility, Performance]*

5.7. **Build health permission onboarding screen**
- Explain what data is collected and why
- Request permissions one-at-a-time with purpose strings
- Handle denial gracefully (app works without health data, just degraded)
- File: `src/features/health/components/HealthPermissionScreen.tsx`
*[UX/Accessibility, Security]*

5.8. **Feed health data to voice coach context**
- When `useVoiceCoach` is active, pipe `useHealthData` metrics into PromptEngine
- Debounced at 5s intervals (don't flood AI with every HR reading)
- Context includes: current HR, HR zone, calories burned, workout duration
- Update: `src/utils/prompt-engine.ts` to accept health metrics
*[Architect, Performance]*

5.9. **Write tests for health hooks**
- Mock HealthKit/Health Connect native modules
- Test permission flow states
- Test metric aggregation and derived values
- Test adaptive interval switching
- File: `src/features/health/hooks/__tests__/useHealthData.test.ts`
*[Tester]*

### Acceptance Criteria
- [ ] App requests health permissions with clear explanation
- [ ] Heart rate displays in real-time during workout (on device with Apple Watch)
- [ ] Calorie counter increments during active workout
- [ ] Health metrics appear in AI coach context (coach can reference HR)
- [ ] App works gracefully without health permissions (degraded mode)
- [ ] No excessive native bridge calls (batched, adaptive intervals)
- [ ] Platform-specific code correctly loads per platform
- [ ] Unit tests pass with mocked health modules

---

## Phase 6: Active Workout Flow

**Goal:** Complete workout experience combining voice coaching, health metrics, exercise tracking, and workout controls into a unified modal screen. The "main event" of the app.

**Dependencies:** Phase 4 (voice), Phase 5 (health)
**Complexity:** XL

### Steps

6.1. **Build workout data model and store**
```typescript
// Update src/stores/workoutStore.ts
// State: exercises[], currentExerciseIndex, sets[], restTimer, workoutStatus
// Actions: startWorkout, addSet, completeSet, nextExercise, pauseWorkout, resumeWorkout, completeWorkout
// Persist: auto-save to MMKV every 30s for crash recovery
```
- Install: `react-native-mmkv`
- File: `src/stores/workoutStore.ts`
*[Architect, Performance]*

6.2. **Build active workout screen layout**
```
┌──────────────────────────┐
│ Exercise Name       [···]│ ← overflow menu (abandon, notes)
│                          │
│       12:34              │ ← Timer (72sp, Reanimated SharedValue)
│                          │
│   Set 3 of 4  ·  8 reps │ ← Current set info
│                          │
│ ┌────────────────────────┤
│ │ ♥ 142 bpm  │  247 cal ││ ← Health metrics bar
│ └────────────────────────┤
│                          │
│  ┌──────┐   ┌──────────┐│
│  │ ◉    │   │ Complete ││ ← Voice orb + Complete Set button
│  │ Coach│   │   Set    ││
│  └──────┘   └──────────┘│
│                          │
│ [Rest]  [Skip]  [End]   │ ← Bottom controls
└──────────────────────────┘
```
- File: `src/app/workout/[id].tsx`
- Presented as modal (Expo Router modal)
*[UX/Accessibility]*

6.3. **Build timer component with Reanimated**
```bash
npx expo install react-native-reanimated
```
```typescript
// src/features/workout/components/WorkoutTimer.tsx
// - SharedValue for timer (60fps updates without JS thread)
// - Formats as MM:SS or H:MM:SS
// - 72sp font, high contrast
// - Rest timer mode: counts down with color change
```
- File: `src/features/workout/components/WorkoutTimer.tsx`
*[Performance, UX/Accessibility]*

6.4. **Build set tracking components**
```typescript
// src/features/workout/components/SetTracker.tsx
// - Shows current set / total sets
// - Weight and rep input (voice or touch)
// - Swipe to complete set
// - Previous workout comparison (from get_previous_workout())

// src/features/workout/components/ExerciseCard.tsx
// - Exercise name, target sets/reps
// - Progress indicator
// - Swipe to next exercise
```
- Files: `src/features/workout/components/SetTracker.tsx`, `ExerciseCard.tsx`
*[UX/Accessibility]*

6.5. **Build rest timer with haptic feedback**
```typescript
// src/features/workout/components/RestTimer.tsx
// - Countdown timer (configurable duration)
// - Haptic notification when rest is over
// - Voice coach can announce "Rest over, next set"
// - Auto-start on set completion
```
- Haptic patterns: rest-start (light), rest-warning (medium at 10s), rest-end (heavy)
- File: `src/features/workout/components/RestTimer.tsx`
*[UX/Accessibility]*

6.6. **Integrate voice coach into workout screen**
- `useVoiceCoach` activated when workout starts
- Voice orb visible during workout
- Coach context includes: exercise, set number, weight, reps, rest status, HR zone
- Voice commands: "next set", "complete set", "how am I doing", "skip exercise", "end workout"
- File: Update `src/app/workout/[id].tsx`
*[Developer, UX/Accessibility]*

6.7. **Build workout completion flow**
- Summary screen: total duration, exercises completed, total volume, calories, PRs hit
- Save workout to Supabase (workouts table + batch metrics)
- Detect and store personal records
- Coach congratulation (voice)
- File: `src/features/workout/components/WorkoutSummary.tsx`
*[UX/Accessibility, Database]*

6.8. **Implement previous workout comparison**
- Call `get_previous_workout()` on workout start
- Show "last time: 135lbs x 8" next to current set
- Coach references comparison: "You did 8 reps last time, try for 9"
- File: `src/features/workout/hooks/useWorkoutComparison.ts`
*[Database]*

6.9. **Build workout lock mode**
- Prevent accidental touches during exercise
- Swipe-to-unlock gesture
- Screen stays awake during active workout
- Install: `expo-keep-awake`
- File: `src/features/workout/components/LockOverlay.tsx`
*[UX/Accessibility]*

6.10. **Implement workout metrics streaming to Supabase**
- Batch metrics writes every 30 seconds (not per-metric)
- Write to MMKV as intermediate buffer
- On workout complete: final flush to Supabase
- File: `src/features/workout/services/metricsSync.ts`
*[Performance, Database]*

6.11. **Write integration tests for workout flow**
- Test: start workout → complete set → rest → next exercise → complete
- Test: voice commands affect workout state
- Test: crash recovery restores from MMKV
- Test: metrics synced to Supabase on completion
- File: `src/features/workout/hooks/__tests__/useWorkout.test.ts`
*[Tester]*

### Acceptance Criteria
- [ ] User can start workout from Quick Start card (2 taps)
- [ ] Timer runs at 60fps without jank
- [ ] Sets can be completed via touch or voice command
- [ ] Rest timer counts down with haptic alerts
- [ ] Health metrics (HR, calories) display during workout
- [ ] Voice coach references current exercise, set count, and HR
- [ ] Previous workout comparison shown for each exercise
- [ ] Workout summary displays on completion with stats
- [ ] Data saved to Supabase (workout + metrics + PRs)
- [ ] Lock mode prevents accidental touches
- [ ] Screen stays awake during active workout
- [ ] Workout data survives app background/foreground cycle

---

## Phase 7: Training History and Progress

**Goal:** User can view past workouts, see progress charts over time, and track personal records.

**Dependencies:** Phase 6 (workouts must be saved to view history)
**Complexity:** L

### Steps

7.1. **Install charting library**
```bash
npx expo install @shopify/react-native-skia
# or: npm install victory-native (Skia-based)
```
- Skia over SVG for performance
*[Performance]*

7.2. **Build history list screen**
```typescript
// src/app/(tabs)/history.tsx
// - FlatList of past workouts, grouped by date
// - Each row: workout type, duration, date, key stats
// - Pull-to-refresh, infinite scroll (paginated from Supabase)
// - Tap to view workout detail
```
- Use `useCallback` for `renderItem`, `React.memo` for row components
- File: `src/app/(tabs)/history.tsx`, `src/features/history/components/WorkoutHistoryRow.tsx`
*[Performance, UX/Accessibility]*

7.3. **Build workout detail screen**
```typescript
// src/features/history/components/WorkoutDetail.tsx
// - Exercise-by-exercise breakdown
// - Sets, reps, weight for each exercise
// - Heart rate chart over workout duration
// - Comparison to previous same-type workout
// - Coach conversation summary (if available)
```
- File: `src/features/history/components/WorkoutDetail.tsx`
*[UX/Accessibility]*

7.4. **Build progress charts**
```typescript
// src/features/history/components/ProgressChart.tsx
// - Line chart: volume over time, per exercise or total
// - Throttle updates to 1/second
// - Viewport windowing for long history
// - Downsample data points for >90 day views

// src/features/history/components/PRBoard.tsx
// - Personal records grid
// - Recently broken PRs highlighted
```
- Charts query `daily_workout_summaries` and materialized views, never raw `workout_metrics`
- Files: `src/features/history/components/ProgressChart.tsx`, `PRBoard.tsx`
*[Performance, Database]*

7.5. **Build progress screen (tab)**
```typescript
// src/app/(tabs)/progress.tsx
// - Weekly workout frequency
// - Volume trends (30/60/90 day)
// - PR board
// - Streak counter
```
- File: `src/app/(tabs)/progress.tsx`
*[UX/Accessibility]*

7.6. **Implement data fetching hooks**
```typescript
// src/features/history/hooks/useWorkoutHistory.ts
// - Paginated fetch from Supabase
// - Cache in Zustand or React Query

// src/features/history/hooks/useProgressData.ts
// - Aggregated data from daily_workout_summaries
// - Date range selection
```
- Files: `src/features/history/hooks/useWorkoutHistory.ts`, `useProgressData.ts`
*[Developer]*

7.7. **Write tests for history and charts**
- Test: history list renders with mock data
- Test: chart data downsampling correctness
- Test: pagination loads more results
- File: `src/features/history/hooks/__tests__/`
*[Tester]*

### Acceptance Criteria
- [ ] History tab shows past workouts in chronological order
- [ ] Tapping a workout shows full detail with exercise breakdown
- [ ] Progress charts render smoothly for 90+ days of data
- [ ] Personal records board shows current PRs
- [ ] Charts read from aggregated tables (not raw metrics)
- [ ] Infinite scroll works without jank (memo + useCallback)
- [ ] Empty states displayed for new users

---

## Phase 8: Background Audio and Lock Screen

**Goal:** Voice coaching continues when phone is locked or app is backgrounded. Lock screen shows Now Playing controls. WebSocket stays alive.

**Dependencies:** Phase 4 (voice), Phase 6 (workout)
**Complexity:** L

### Steps

8.1. **Configure iOS background audio**
- `UIBackgroundModes: ["audio"]` already in `app.config.ts` (Phase 1)
- Audio session category: `playAndRecord`, mode: `spokenAudio`, options: `allowBluetooth`, `defaultToSpeaker`
- File: Update `src/services/voice/AudioCaptureService.ts`
*[Developer]*

8.2. **Implement silent audio keepalive**
```typescript
// src/services/voice/BackgroundKeepAlive.ts
// - When app backgrounds: play silent audio loop to keep process alive
// - Maintains WebSocket connection
// - Reduces other work: pause chart updates, reduce metric sampling
// - AppState listener: 'active' | 'background' | 'inactive'
```
- File: `src/services/voice/BackgroundKeepAlive.ts`
*[Developer, Performance]*

8.3. **Implement Now Playing / Lock Screen integration**
```typescript
// src/features/workout/services/NowPlayingService.ts
// - Set Now Playing metadata: "Apex Live - Push Day Workout"
// - Lock screen controls: pause/resume coaching
// - Update elapsed time
// - Uses MPNowPlayingInfoCenter (iOS) / MediaSession (Android)
```
- Install: `react-native-track-player` or native module
- File: `src/features/workout/services/NowPlayingService.ts`
*[Developer, UX/Accessibility]*

8.4. **Configure Android foreground service**
```typescript
// - Foreground notification: "Workout in progress - 12:34"
// - Required for background audio on Android
// - Notification actions: pause/resume
```
- File: Update `app.config.ts` for Android permissions
*[Developer]*

8.5. **Handle Bluetooth audio routing**
- Detect BT headphones connection/disconnection
- Route coach audio to BT when available
- Handle mid-workout BT disconnect: fall back to speaker, notify user
- File: `src/services/voice/AudioRoutingService.ts`
*[Developer, UX/Accessibility]*

8.6. **Reduce background work**
- When backgrounded: pause health UI updates, stop chart rendering
- Continue: audio capture, WebSocket, metric recording to MMKV
- When foregrounded: resume UI updates, sync any pending data
- File: `src/hooks/useAppState.ts`
*[Performance]*

8.7. **Test background scenarios**
- Test: lock phone → coach still responds to voice
- Test: switch to other app → workout timer continues
- Test: BT disconnect → audio routes to speaker
- Test: background for 10 minutes → WebSocket still connected
*[Tester]*

### Acceptance Criteria
- [ ] Voice coaching works with phone locked (iOS)
- [ ] Lock screen shows workout info and pause/resume controls
- [ ] WebSocket stays connected during background (at least 10 minutes)
- [ ] Bluetooth audio routing works, handles disconnect gracefully
- [ ] Android foreground service notification displayed during workout
- [ ] Battery impact of background mode is reasonable (< 10%/hour)
- [ ] UI updates pause in background, resume in foreground

---

## Phase 9: Error Handling, Offline Mode, and Crash Recovery

**Goal:** App handles all failure modes gracefully. Workouts never stop due to network issues. Data is never lost.

**Dependencies:** Phase 6 (workout flow must exist to add resilience)
**Complexity:** L

### Steps

9.1. **Implement error boundary hierarchy**
```typescript
// Error boundary architecture (nested):
// Root ErrorBoundary → catches fatal crashes, shows recovery screen
//   └── VoiceErrorBoundary → voice errors don't stop workout
//       └── HealthErrorBoundary → health errors don't stop voice/workout
//           └── ChartErrorBoundary → chart errors don't affect anything
```
- Principle: voice errors NEVER stop the workout; health errors NEVER stop voice
- Files: `src/app/components/RootErrorBoundary.tsx`, `src/features/voice-coach/components/VoiceErrorBoundary.tsx`, etc.
*[QA, Architect]*

9.2. **Implement offline workout mode**
```typescript
// src/features/workout/hooks/useOfflineWorkout.ts
// - Detect network state (NetInfo)
// - If offline: workout continues fully, voice coach degrades to text prompts or disables
// - All metrics buffer to MMKV
// - On reconnect: sync buffered data to Supabase
// - Visual indicator: "Offline mode" badge
// - RULE: NEVER show a blocking error dialog during an active workout
```
- Install: `@react-native-community/netinfo`
- File: `src/features/workout/hooks/useOfflineWorkout.ts`
*[UX/Accessibility, Developer]*

9.3. **Implement crash recovery**
```typescript
// src/features/workout/hooks/useCrashRecovery.ts
// - On app launch: check MMKV for active workout state
// - If found: prompt "Resume workout?" with time elapsed
// - Restore: exercise, sets, timer, metrics from MMKV snapshot
// - MMKV auto-saves every 30s during workout (from Phase 6)
// - Clear recovery state on workout completion or explicit abandon
```
- File: `src/features/workout/hooks/useCrashRecovery.ts`
*[Developer, UX/Accessibility]*

9.4. **Implement WebSocket reconnection strategy**
```typescript
// Update src/services/voice/RealtimeWebSocket.ts
// - On disconnect: exponential backoff (1s, 2s, 4s, 8s, max 30s)
// - Fetch new ephemeral token on reconnect (old one may be expired)
// - Restore session context (system prompt + recent history)
// - Max 5 reconnection attempts, then degrade gracefully
// - User notification: "Coach reconnecting..." → "Coach offline, workout continues"
```
*[Developer]*

9.5. **Handle health data interruptions**
- Apple Watch disconnect: show last known HR with "stale" indicator, retry connection
- HealthKit permission revoked mid-workout: hide health UI, continue workout
- File: Update `src/features/health/hooks/useHealthData.ts`
*[Developer, UX/Accessibility]*

9.6. **Implement data sync queue**
```typescript
// src/services/supabase/SyncQueue.ts
// - Queue all Supabase writes
// - On failure: persist to MMKV, retry on next app open or network restore
// - Conflict resolution: last-write-wins with timestamps
// - Handles: workout completion, metrics batch, conversation save
```
- File: `src/services/supabase/SyncQueue.ts`
*[Developer, Database]*

9.7. **Add user-facing error messages**
- Toast notifications for transient errors (not blocking modals)
- Accessibility: errors announced via `announceForAccessibility`
- File: `src/components/Toast.tsx`
*[UX/Accessibility]*

9.8. **Write tests for error scenarios**
- Test: network loss mid-workout → workout continues
- Test: app kill during workout → recovery on next launch
- Test: WebSocket disconnect → reconnects and restores context
- Test: rapid start/stop workout → no state corruption
- Test: BT disconnect mid-exercise → audio routes correctly
- Files: `src/features/workout/hooks/__tests__/useCrashRecovery.test.ts`, etc.
*[Tester]*

### Acceptance Criteria
- [ ] Active workout NEVER stops due to network/voice/health error
- [ ] Voice errors are caught by VoiceErrorBoundary without affecting workout
- [ ] Offline workout works: timer, sets, metrics all function without network
- [ ] Crash recovery: killed app resumes workout with data intact
- [ ] WebSocket reconnects automatically after brief network loss
- [ ] Sync queue replays failed writes on reconnect
- [ ] No blocking modals during active workout
- [ ] All error scenarios have unit tests

---

## Phase 10: Testing, CI/CD, and Production Readiness

**Goal:** Comprehensive test coverage, automated CI/CD pipeline, crash reporting, and production infrastructure.

**Dependencies:** All feature phases (1-9) complete
**Complexity:** L

### Steps

10.1. **Complete unit test coverage**
- Target: 80%+ line coverage on hooks and services
- Focus: `useVoiceCoach`, `useHealthData`, `useWorkout`, `PromptEngine`, `SyncQueue`
- MSW for API mocking, custom WebSocket mock for voice pipeline
- Files: `src/**/__tests__/`
*[Tester]*

10.2. **Set up E2E tests with Detox**
```bash
npm install --save-dev detox @types/detox
```
- Critical flows:
  1. Sign up → onboarding → first workout
  2. Start workout → complete set → end workout → view in history
  3. Voice coaching session start/stop
- Files: `e2e/` directory
*[Tester]*

10.3. **Set up performance regression tests**
```bash
npm install --save-dev reassure
```
- Benchmark: workout screen render time, chart render time, store update time
- Fail CI if render time regresses by >10%
- Files: `src/**/__perf__/`
*[Tester, Performance]*

10.4. **Set up GitHub Actions CI pipeline**
```yaml
# .github/workflows/pr-quality.yml
# Triggered: on pull request
# Steps: checkout → install → lint → typecheck → unit tests → perf regression

# .github/workflows/deploy.yml
# Triggered: on push to main (preview) or tag (production)
# Steps: checkout → install → test → eas build → eas submit (production only)
```
- Files: `.github/workflows/pr-quality.yml`, `.github/workflows/deploy.yml`
*[DevOps, Tester]*

10.5. **Set up EAS Build and Submit**
- Configure `eas.json` build profiles (already stubbed in Phase 1)
- Set up EAS Secrets for `SENTRY_AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Test: `eas build --profile preview --platform android`
- Test: `eas build --profile preview --platform ios` (cloud build)
*[DevOps]*

10.6. **Set up OTA updates with EAS Update**
- Channel architecture: `development`, `preview`, `production`
- Promotion workflow: preview → production
- Runtime version policy: `appVersion` (compatible updates only)
- File: Update `app.config.ts` with `updates` config
*[DevOps]*

10.7. **Set up Sentry crash reporting**
```bash
npx expo install @sentry/react-native
```
- Source map upload in EAS Build
- Custom breadcrumbs: audio events, voice state changes, workout state changes
- Performance monitoring: transaction traces for workout start, voice connect
- Files: `src/services/sentry.ts`, update `src/app/_layout.tsx`
*[DevOps]*

10.8. **Set up Supabase staging and production projects**
- 3 projects: dev, staging, prod
- Migration promotion: dev → staging → prod via CLI
- Separate Edge Function deployments per environment
*[DevOps, Database]*

10.9. **Production readiness checklist verification**
- [ ] All API keys in EAS Secrets / Edge Function env (never in client)
- [ ] RLS enabled on every table (re-verify)
- [ ] Rate limiting on AI proxy (re-verify)
- [ ] Sentry captures crashes with source maps
- [ ] OTA update channel is correct
- [ ] Bundle size < 50MB
- [ ] App launches in < 2 seconds
- [ ] No `console.log` in production build
- [ ] Privacy policy URL configured
- [ ] App Store screenshots prepared
*[DevOps, Security, QA]*

### Acceptance Criteria
- [ ] Unit tests: 80%+ coverage, all passing
- [ ] E2E tests: critical flows pass on CI
- [ ] Performance tests: baseline established, regression detection works
- [ ] CI runs on every PR: lint + typecheck + tests < 5 minutes
- [ ] EAS Build succeeds for both platforms
- [ ] OTA update deploys and is received by preview app
- [ ] Sentry receives test crash report with correct source maps
- [ ] Production Supabase project has all migrations applied

---

## Phase 11: Polish, Accessibility, and App Store Submission

**Goal:** Final polish, full accessibility audit, onboarding flow, documentation, and app store submission.

**Dependencies:** Phase 10
**Complexity:** M

### Steps

11.1. **Build onboarding flow**
```typescript
// src/app/onboarding/index.tsx
// 5 screens, 90 seconds total:
// 1. Welcome + value prop
// 2. Fitness level selection
// 3. Voice preference (verbosity, encouragement style) + preview
// 4. Permissions (mic, health) — one at a time with explanation
// 5. "Start First Workout" CTA
```
- Permissions requested one-at-a-time with purpose explanation
- Voice preview: play sample coach audio
- Files: `src/app/onboarding/index.tsx`, `src/features/onboarding/components/`
*[UX/Accessibility]*

11.2. **Implement haptic feedback system**
```typescript
// src/utils/haptics.ts
// 10 event types:
// - set_complete: notificationSuccess
// - rest_start: impactLight
// - rest_warning (10s left): impactMedium
// - rest_end: impactHeavy
// - pr_achieved: notificationSuccess × 2
// - workout_complete: notificationSuccess × 3
// - error: notificationError
// - button_press: impactLight
// - voice_activated: impactLight
// - timer_milestone: impactMedium
// Adjustable intensity in settings
```
- File: `src/utils/haptics.ts`
*[UX/Accessibility]*

11.3. **Full accessibility audit and fixes**
- VoiceOver / TalkBack pass on every screen
- Coach audio coexists with VoiceOver (doesn't override)
- `announceForAccessibility` for state changes (set complete, rest start, PR)
- Live regions for updating metrics (HR, timer)
- Motor accessibility: all actions achievable with single tap or voice
- Cognitive: clear language, no jargon, optional simplified mode
- Color vision deficiency: verify all color-coded info has secondary indicator
*[UX/Accessibility]*

11.4. **Implement data deletion flow (GDPR/privacy)**
- Settings → "Delete My Account"
- Confirmation dialog
- Supabase: cascade delete all user data
- Edge Function: revoke any active sessions
- File: `src/features/profile/hooks/useAccountDeletion.ts`
*[Security]*

11.5. **Implement consent and privacy flow**
- Health data consent screen (what is collected, how stored, who accesses)
- Voice data consent (audio is processed by OpenAI, not stored long-term)
- Privacy policy and terms of service links
- Files: `src/features/profile/components/PrivacySettings.tsx`
*[Security, Documentation]*

11.6. **Performance final pass**
- Lazy-load workout screen and chart screen
- Defer Supabase realtime connection until needed
- Pre-warm audio session on app launch (background)
- Remove barrel exports that cause over-importing
- Verify: no inline styles in lists, all list items memo'd
- Verify: startup < 2s, workout screen transition < 300ms
*[Performance]*

11.7. **Write inline documentation (TSDoc)**
- All exported hooks: document parameters, return values, state machines
- All service interfaces: document contracts
- All Zustand stores: document shape and update patterns
- Files: All `src/` TypeScript files
*[Documentation]*

11.8. **Create `.env.example` and setup documentation**
- Environment variables with descriptions and security warnings
- Windows → iOS development workflow notes
- File: `.env.example` (update from Phase 1)
*[Documentation, DevOps]*

11.9. **App Store preparation**
- iOS: App Store Connect setup, screenshots, description, privacy nutrition labels
- Android: Play Console setup, screenshots, description, data safety form
- Both: Privacy policy URL, terms of service URL
- HealthKit usage description strings
- Microphone usage description strings
*[DevOps]*

11.10. **Submit to app stores**
- `eas submit --platform ios`
- `eas submit --platform android`
- Monitor review feedback, address any rejections
*[DevOps]*

### Acceptance Criteria
- [ ] Onboarding completes in < 90 seconds
- [ ] Haptic feedback fires for all 10 event types
- [ ] VoiceOver/TalkBack: every screen fully navigable
- [ ] Account deletion removes all user data
- [ ] Privacy consent shown before health/voice data collection
- [ ] App startup < 2 seconds
- [ ] TSDoc on all exported functions and hooks
- [ ] App submitted to both app stores
- [ ] No accessibility violations (automated + manual audit)

---

## Summary

| Phase | Name | Complexity | Key Deliverable |
|-------|------|-----------|-----------------|
| 1 | Project Scaffold & Tooling | M | Buildable skeleton with strict TS, linting, tests, dark theme |
| 2 | Backend / Database | L | Full Supabase schema, RLS, Edge Functions, AI proxy |
| 3 | Core App Shell | M | Auth, navigation, tabs, Quick Start, Zustand stores |
| 4 | Voice Coaching Pipeline | XL | Real-time voice conversation with AI coach |
| 5 | Health Data Integration | L | Live HR, calories from HealthKit/Health Connect |
| 6 | Active Workout Flow | XL | Complete workout UX: voice + health + tracking + timer |
| 7 | Training History & Progress | L | History list, progress charts, PR board |
| 8 | Background Audio & Lock Screen | L | Voice coaching continues with phone locked |
| 9 | Error Handling & Resilience | L | Offline mode, crash recovery, error boundaries |
| 10 | Testing, CI/CD, Production | L | 80% test coverage, GitHub Actions, Sentry, EAS |
| 11 | Polish & App Store | M | Onboarding, a11y audit, haptics, app store submission |

## Key Technical Decisions

1. **OpenAI Realtime API** (single WebSocket) over ElevenLabs+Whisper (multi-service) — latency: ~400ms vs ~1800ms
2. **expo-av chunked pattern** (250ms) over native streaming module — pragmatic for MVP, upgrade path to native module exists
3. **MMKV** for hot persistence (crash recovery, sync queue) over AsyncStorage — 30x faster
4. **Zustand slice pattern** (3 stores by update frequency) over single store — prevents unnecessary re-renders
5. **Skia-based charts** over SVG — 3x rendering performance for time-series
6. **HealthKit observer queries** over polling — lower battery, faster updates
7. **Development Client** (not Expo Go) — required for native modules (HealthKit, background audio, mic)
8. **EAS cloud builds** for iOS — solves Windows → iOS build limitation

## Risk Register

| Risk | Mitigation | Phase |
|------|-----------|-------|
| Voice latency > 1s | Optimize audio chunking, test on real network; fallback to larger chunks | 4 |
| iOS background audio killed | Silent audio keepalive, test 30-min sessions | 8 |
| HealthKit permission rejection by Apple | Justify with clear usage descriptions, limit requested data types | 5, 11 |
| Workout data loss on crash | MMKV autosave every 30s, crash recovery flow | 6, 9 |
| OpenAI API cost per session | Monitor token usage, implement session time limits, cache system prompts | 4 |
| App Store rejection | Follow HIG, complete privacy labels, test on physical devices | 11 |
| Health data compliance (PHI) | Supabase BAA, encryption at rest, data retention policies, consent flow | 2, 11 |
