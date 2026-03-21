import { buildSystemPrompt, shouldUpdateContext } from '../prompt-engine';
import type { VoiceContext } from '@/types/voice';

const defaultProfile = {
  fitnessLevel: 'intermediate' as const,
  coachingStyle: 'motivational' as const,
  verbosity: 'moderate' as const,
  units: 'metric' as const,
};

const emptyContext: VoiceContext = {
  workoutType: null,
  currentExercise: null,
  currentSet: null,
  totalSets: null,
  elapsedSeconds: 0,
  heartRate: null,
  heartRateZone: null,
  caloriesBurned: null,
  previousSessionSummary: null,
};

describe('buildSystemPrompt', () => {
  describe('basic output', () => {
    it('returns a non-empty string', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes the Apex coach identity', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(result).toContain('Apex');
      expect(result).toContain('fitness coach');
    });

    it('includes progressive overload goal', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(result).toContain('progressive overload');
    });

    it('includes safety rules', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(result).toContain('IMPORTANT RULES');
      expect(result).toContain('medical advice');
    });
  });

  describe('user profile context', () => {
    it('includes fitness level', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, fitnessLevel: 'beginner' },
        emptyContext,
      );
      expect(result).toContain('beginner');
    });

    it('includes units preference', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, units: 'imperial' },
        emptyContext,
      );
      expect(result).toContain('imperial');
    });

    it('includes motivational coaching style instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, coachingStyle: 'motivational' },
        emptyContext,
      );
      expect(result).toContain('encouraging');
    });

    it('includes technical coaching style instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, coachingStyle: 'technical' },
        emptyContext,
      );
      expect(result).toContain('form cues');
    });

    it('includes balanced coaching style instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, coachingStyle: 'balanced' },
        emptyContext,
      );
      expect(result).toContain('Balance motivation');
    });

    it('includes minimal verbosity instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, verbosity: 'minimal' },
        emptyContext,
      );
      expect(result).toContain('very short');
    });

    it('includes verbose verbosity instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, verbosity: 'verbose' },
        emptyContext,
      );
      expect(result).toContain('detailed guidance');
    });

    it('includes moderate verbosity instructions', () => {
      const result = buildSystemPrompt(
        { ...defaultProfile, verbosity: 'moderate' },
        emptyContext,
      );
      expect(result).toContain('concise but informative');
    });
  });

  describe('workout context', () => {
    it('includes workout type when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        workoutType: 'push',
      });
      expect(result).toContain('Current workout: push');
    });

    it('includes current exercise when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        currentExercise: 'Bench Press',
      });
      expect(result).toContain('Current exercise: Bench Press');
    });

    it('includes set progress when both current and total are provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        currentExercise: 'Squat',
        currentSet: 3,
        totalSets: 5,
      });
      expect(result).toContain('Set 3 of 5');
    });

    it('includes set number without total when totalSets is null', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        currentExercise: 'Deadlift',
        currentSet: 2,
        totalSets: null,
      });
      expect(result).toContain('On set 2');
    });

    it('does not include set info when no exercise is set', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        currentSet: 3,
        totalSets: 5,
      });
      expect(result).not.toContain('Set 3');
    });
  });

  describe('elapsed time', () => {
    it('includes elapsed time when greater than zero', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        elapsedSeconds: 125, // 2:05
      });
      expect(result).toContain('Elapsed time: 2:05');
    });

    it('does not include elapsed time when zero', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(result).not.toContain('Elapsed time');
    });

    it('formats single-digit seconds with leading zero', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        elapsedSeconds: 63, // 1:03
      });
      expect(result).toContain('1:03');
    });
  });

  describe('health metrics', () => {
    it('includes heart rate when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        heartRate: 145,
      });
      expect(result).toContain('Current heart rate: 145 BPM');
    });

    it('includes heart rate zone when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        heartRate: 170,
        heartRateZone: 'Zone 4',
      });
      expect(result).toContain('Heart rate zone: Zone 4');
    });

    it('does not include heart rate zone without heart rate', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        heartRateZone: 'Zone 3',
      });
      expect(result).not.toContain('Heart rate zone');
    });

    it('includes calories burned when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        caloriesBurned: 342.7,
      });
      expect(result).toContain('Calories burned: 343');
    });
  });

  describe('previous session summary', () => {
    it('includes previous session data when provided', () => {
      const result = buildSystemPrompt(defaultProfile, {
        ...emptyContext,
        previousSessionSummary: 'Bench Press: 4x8 @ 135 lbs',
      });
      expect(result).toContain('PREVIOUS SESSION DATA');
      expect(result).toContain('Bench Press: 4x8 @ 135 lbs');
      expect(result).toContain('COACHING STRATEGY');
    });

    it('includes baseline message when no previous session', () => {
      const result = buildSystemPrompt(defaultProfile, emptyContext);
      expect(result).toContain('No previous session data available');
      expect(result).toContain('set a strong baseline');
    });
  });
});

describe('shouldUpdateContext', () => {
  it('returns true when prev is null', () => {
    expect(shouldUpdateContext(null, emptyContext)).toBe(true);
  });

  it('returns true when exercise changed', () => {
    const prev = { ...emptyContext, currentExercise: 'Squat' };
    const next = { ...emptyContext, currentExercise: 'Bench Press' };
    expect(shouldUpdateContext(prev, next)).toBe(true);
  });

  it('returns true when set changed', () => {
    const prev = { ...emptyContext, currentSet: 1 };
    const next = { ...emptyContext, currentSet: 2 };
    expect(shouldUpdateContext(prev, next)).toBe(true);
  });

  it('returns true when heart rate zone changed', () => {
    const prev = { ...emptyContext, heartRateZone: 'Zone 2' };
    const next = { ...emptyContext, heartRateZone: 'Zone 4' };
    expect(shouldUpdateContext(prev, next)).toBe(true);
  });

  it('returns true when previous session summary becomes available', () => {
    const prev = { ...emptyContext, previousSessionSummary: null };
    const next = { ...emptyContext, previousSessionSummary: 'Bench: 4x8 @ 135' };
    expect(shouldUpdateContext(prev, next)).toBe(true);
  });

  it('returns false when nothing significant changed', () => {
    const prev = { ...emptyContext, elapsedSeconds: 60 };
    const next = { ...emptyContext, elapsedSeconds: 90 };
    expect(shouldUpdateContext(prev, next)).toBe(false);
  });

  it('returns false when only heart rate value changed (same zone)', () => {
    const prev = { ...emptyContext, heartRate: 140, heartRateZone: 'Zone 3' };
    const next = { ...emptyContext, heartRate: 145, heartRateZone: 'Zone 3' };
    expect(shouldUpdateContext(prev, next)).toBe(false);
  });

  it('returns false when only calories changed', () => {
    const prev = { ...emptyContext, caloriesBurned: 200 };
    const next = { ...emptyContext, caloriesBurned: 250 };
    expect(shouldUpdateContext(prev, next)).toBe(false);
  });
});
