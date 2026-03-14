import {
  MAX_WS_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY,
  WS_KEEPALIVE_INTERVAL,
} from '@/utils/constants';

export interface RealtimeEventMap {
  'session.created': { session: { id: string } };
  'session.updated': Record<string, never>;
  'input_audio_buffer.speech_started': Record<string, never>;
  'input_audio_buffer.speech_stopped': Record<string, never>;
  'response.audio.delta': { delta: string };
  'response.audio.done': Record<string, never>;
  'response.audio_transcript.delta': { delta: string };
  'response.audio_transcript.done': { transcript: string };
  'conversation.item.input_audio_transcription.completed': { transcript: string };
  'error': { error: { message: string; code?: string } };
}

export type RealtimeEventType = keyof RealtimeEventMap;

export type RealtimeEvent = {
  [K in RealtimeEventType]: { type: K } & RealtimeEventMap[K];
}[RealtimeEventType];

type EventHandler = (event: RealtimeEvent) => void;
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type StateChangeHandler = (state: ConnectionState) => void;

export class RealtimeWebSocket {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts = 0;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Set<EventHandler> = new Set();
  private stateHandlers: Set<StateChangeHandler> = new Set();
  private _state: ConnectionState = 'disconnected';
  private intentionalClose = false;

  get state(): ConnectionState {
    return this._state;
  }

  private setState(state: ConnectionState) {
    this._state = state;
    this.stateHandlers.forEach((h) => h(state));
  }

  connect(url: string, token: string): void {
    this.url = url;
    this.token = token;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.setState('disconnected');
  }

  sendAudioChunk(base64Audio: string): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  commitAudioBuffer(): void {
    this.send({ type: 'input_audio_buffer.commit' });
  }

  clearAudioBuffer(): void {
    this.send({ type: 'input_audio_buffer.clear' });
  }

  updateSession(instructions: string): void {
    this.send({
      type: 'session.update',
      session: { instructions },
    });
  }

  createResponse(): void {
    this.send({ type: 'response.create', response: {} });
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  private createConnection(): void {
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.url, [
        'realtime',
        `openai-insecure-api-key.${this.token}`,
      ]);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.startKeepalive();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as RealtimeEvent;
          this.eventHandlers.forEach((h) => h(data));
        } catch {
          // Ignore unparseable messages
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };

      this.ws.onclose = () => {
        this.stopKeepalive();
        if (!this.intentionalClose) {
          this.attemptReconnect();
        }
      };
    } catch {
      this.setState('error');
    }
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      this.send({ type: 'input_audio_buffer.clear' });
    }, WS_KEEPALIVE_INTERVAL);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_WS_RECONNECT_ATTEMPTS) {
      this.setState('error');
      return;
    }

    this.setState('reconnecting');
    const delay = WS_RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.intentionalClose) return;
      this.createConnection();
    }, delay);
  }

  private cleanup(): void {
    this.stopKeepalive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}
