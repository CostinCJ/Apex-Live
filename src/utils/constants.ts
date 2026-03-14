/** Health data polling interval during active workout (ms) */
export const HEALTH_POLL_INTERVAL_ACTIVE = 5000;

/** Health data polling interval during rest (ms) */
export const HEALTH_POLL_INTERVAL_REST = 15000;

/** How often to send updated context to the AI coach (ms) */
export const COACH_CONTEXT_UPDATE_INTERVAL = 5000;

/** Audio recording chunk duration (ms) */
export const AUDIO_CHUNK_DURATION = 250;

/** Maximum WebSocket reconnection attempts */
export const MAX_WS_RECONNECT_ATTEMPTS = 5;

/** Base delay for exponential backoff (ms) */
export const WS_RECONNECT_BASE_DELAY = 1000;

/** WebSocket keepalive ping interval (ms) */
export const WS_KEEPALIVE_INTERVAL = 25000;

/** MMKV workout autosave interval (ms) */
export const WORKOUT_AUTOSAVE_INTERVAL = 30000;

/** Batch size for metric writes */
export const METRICS_BATCH_SIZE = 50;

/** Metrics flush interval (ms) */
export const METRICS_FLUSH_INTERVAL = 10000;

/** Max workout duration before auto-warning (hours) */
export const MAX_WORKOUT_HOURS = 4;
