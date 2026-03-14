import { useRealtimeStore } from '../realtimeStore';

describe('realtimeStore', () => {
  beforeEach(() => useRealtimeStore.getState().reset());

  describe('initial state', () => {
    it('starts disconnected and idle', () => {
      const s = useRealtimeStore.getState();
      expect(s.voiceConnectionState).toBe('disconnected');
      expect(s.coachState).toBe('idle');
      expect(s.isListening).toBe(false);
      expect(s.isSpeaking).toBe(false);
    });

    it('has null health metrics', () => {
      const s = useRealtimeStore.getState();
      expect(s.heartRate).toBeNull();
      expect(s.caloriesBurned).toBeNull();
    });

    it('has timer at zero', () => {
      const s = useRealtimeStore.getState();
      expect(s.elapsedSeconds).toBe(0);
      expect(s.isTimerRunning).toBe(false);
    });
  });

  describe('voice state transitions', () => {
    it('transitions through connection states', () => {
      const store = useRealtimeStore.getState();
      store.setVoiceConnectionState('connecting');
      expect(useRealtimeStore.getState().voiceConnectionState).toBe('connecting');
      store.setVoiceConnectionState('connected');
      expect(useRealtimeStore.getState().voiceConnectionState).toBe('connected');
      store.setVoiceConnectionState('disconnected');
      expect(useRealtimeStore.getState().voiceConnectionState).toBe('disconnected');
    });

    it('sets coach state', () => {
      useRealtimeStore.getState().setCoachState('listening');
      expect(useRealtimeStore.getState().coachState).toBe('listening');
      useRealtimeStore.getState().setCoachState('speaking');
      expect(useRealtimeStore.getState().coachState).toBe('speaking');
    });
  });

  describe('listening and speaking', () => {
    it('toggles listening', () => {
      useRealtimeStore.getState().setListening(true);
      expect(useRealtimeStore.getState().isListening).toBe(true);
    });

    it('updates transcript', () => {
      useRealtimeStore.getState().setTranscript('hello');
      expect(useRealtimeStore.getState().lastTranscript).toBe('hello');
    });

    it('updates coach message', () => {
      useRealtimeStore.getState().setCoachMessage('Great form!');
      expect(useRealtimeStore.getState().lastCoachMessage).toBe('Great form!');
    });
  });

  describe('health metrics', () => {
    it('updates heart rate', () => {
      useRealtimeStore.getState().updateHealthMetrics({ heartRate: 142 });
      expect(useRealtimeStore.getState().heartRate).toBe(142);
    });

    it('updates multiple metrics', () => {
      useRealtimeStore.getState().updateHealthMetrics({ heartRate: 155, caloriesBurned: 420 });
      const s = useRealtimeStore.getState();
      expect(s.heartRate).toBe(155);
      expect(s.caloriesBurned).toBe(420);
    });

    it('preserves existing when updating subset', () => {
      useRealtimeStore.getState().updateHealthMetrics({ heartRate: 120, caloriesBurned: 200 });
      useRealtimeStore.getState().updateHealthMetrics({ heartRate: 135 });
      expect(useRealtimeStore.getState().caloriesBurned).toBe(200);
    });
  });

  describe('timer', () => {
    it('updates elapsed seconds', () => {
      useRealtimeStore.getState().setElapsedSeconds(120);
      expect(useRealtimeStore.getState().elapsedSeconds).toBe(120);
    });

    it('toggles timer running', () => {
      useRealtimeStore.getState().setTimerRunning(true);
      expect(useRealtimeStore.getState().isTimerRunning).toBe(true);
    });
  });

  describe('reset', () => {
    it('restores all to initial', () => {
      const store = useRealtimeStore.getState();
      store.setVoiceConnectionState('connected');
      store.setCoachState('speaking');
      store.updateHealthMetrics({ heartRate: 160, caloriesBurned: 500 });
      store.setElapsedSeconds(3600);
      store.setTimerRunning(true);

      useRealtimeStore.getState().reset();
      const s = useRealtimeStore.getState();
      expect(s.voiceConnectionState).toBe('disconnected');
      expect(s.heartRate).toBeNull();
      expect(s.elapsedSeconds).toBe(0);
    });
  });
});
