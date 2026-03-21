import { useSettingsStore } from '../settingsStore';

function resetStore() {
  useSettingsStore.setState({
    units: 'metric',
    hapticFeedback: true,
    hapticIntensity: 'default',
    coachVerbosity: 'moderate',
    coachStyle: 'motivational',
    voiceActivation: 'always_on',
    showHeartRate: true,
    showCalories: true,
    showTimer: true,
    hasCompletedOnboarding: false,
    fitnessLevel: null,
  });
}

describe('settingsStore', () => {
  beforeEach(resetStore);

  describe('initial state', () => {
    it('has metric units by default', () => {
      expect(useSettingsStore.getState().units).toBe('metric');
    });

    it('has haptic feedback enabled by default', () => {
      expect(useSettingsStore.getState().hapticFeedback).toBe(true);
    });

    it('has default haptic intensity', () => {
      expect(useSettingsStore.getState().hapticIntensity).toBe('default');
    });

    it('has moderate coach verbosity by default', () => {
      expect(useSettingsStore.getState().coachVerbosity).toBe('moderate');
    });

    it('has motivational coach style by default', () => {
      expect(useSettingsStore.getState().coachStyle).toBe('motivational');
    });

    it('has always_on voice activation by default', () => {
      expect(useSettingsStore.getState().voiceActivation).toBe('always_on');
    });

    it('shows heart rate, calories, and timer by default', () => {
      const s = useSettingsStore.getState();
      expect(s.showHeartRate).toBe(true);
      expect(s.showCalories).toBe(true);
      expect(s.showTimer).toBe(true);
    });

    it('has not completed onboarding by default', () => {
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false);
    });

    it('has null fitness level by default', () => {
      expect(useSettingsStore.getState().fitnessLevel).toBeNull();
    });
  });

  describe('setUnits', () => {
    it('sets units to imperial', () => {
      useSettingsStore.getState().setUnits('imperial');
      expect(useSettingsStore.getState().units).toBe('imperial');
    });

    it('sets units to metric', () => {
      useSettingsStore.getState().setUnits('imperial');
      useSettingsStore.getState().setUnits('metric');
      expect(useSettingsStore.getState().units).toBe('metric');
    });
  });

  describe('setHapticFeedback', () => {
    it('disables haptic feedback', () => {
      useSettingsStore.getState().setHapticFeedback(false);
      expect(useSettingsStore.getState().hapticFeedback).toBe(false);
    });

    it('re-enables haptic feedback', () => {
      useSettingsStore.getState().setHapticFeedback(false);
      useSettingsStore.getState().setHapticFeedback(true);
      expect(useSettingsStore.getState().hapticFeedback).toBe(true);
    });
  });

  describe('setHapticIntensity', () => {
    it('sets intensity to light', () => {
      useSettingsStore.getState().setHapticIntensity('light');
      expect(useSettingsStore.getState().hapticIntensity).toBe('light');
    });

    it('sets intensity to strong', () => {
      useSettingsStore.getState().setHapticIntensity('strong');
      expect(useSettingsStore.getState().hapticIntensity).toBe('strong');
    });
  });

  describe('setCoachVerbosity', () => {
    it('sets verbosity to minimal', () => {
      useSettingsStore.getState().setCoachVerbosity('minimal');
      expect(useSettingsStore.getState().coachVerbosity).toBe('minimal');
    });

    it('sets verbosity to verbose', () => {
      useSettingsStore.getState().setCoachVerbosity('verbose');
      expect(useSettingsStore.getState().coachVerbosity).toBe('verbose');
    });
  });

  describe('setCoachStyle', () => {
    it('sets style to technical', () => {
      useSettingsStore.getState().setCoachStyle('technical');
      expect(useSettingsStore.getState().coachStyle).toBe('technical');
    });

    it('sets style to balanced', () => {
      useSettingsStore.getState().setCoachStyle('balanced');
      expect(useSettingsStore.getState().coachStyle).toBe('balanced');
    });

    it('sets style back to motivational', () => {
      useSettingsStore.getState().setCoachStyle('technical');
      useSettingsStore.getState().setCoachStyle('motivational');
      expect(useSettingsStore.getState().coachStyle).toBe('motivational');
    });
  });

  describe('setVoiceActivation', () => {
    it('sets to push_to_talk', () => {
      useSettingsStore.getState().setVoiceActivation('push_to_talk');
      expect(useSettingsStore.getState().voiceActivation).toBe('push_to_talk');
    });

    it('sets back to always_on', () => {
      useSettingsStore.getState().setVoiceActivation('push_to_talk');
      useSettingsStore.getState().setVoiceActivation('always_on');
      expect(useSettingsStore.getState().voiceActivation).toBe('always_on');
    });
  });

  describe('setShowHeartRate', () => {
    it('hides heart rate', () => {
      useSettingsStore.getState().setShowHeartRate(false);
      expect(useSettingsStore.getState().showHeartRate).toBe(false);
    });
  });

  describe('setShowCalories', () => {
    it('hides calories', () => {
      useSettingsStore.getState().setShowCalories(false);
      expect(useSettingsStore.getState().showCalories).toBe(false);
    });
  });

  describe('setShowTimer', () => {
    it('hides timer', () => {
      useSettingsStore.getState().setShowTimer(false);
      expect(useSettingsStore.getState().showTimer).toBe(false);
    });
  });

  describe('setHasCompletedOnboarding', () => {
    it('marks onboarding as completed', () => {
      useSettingsStore.getState().setHasCompletedOnboarding(true);
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('can reset onboarding state', () => {
      useSettingsStore.getState().setHasCompletedOnboarding(true);
      useSettingsStore.getState().setHasCompletedOnboarding(false);
      expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(false);
    });
  });

  describe('setFitnessLevel', () => {
    it('sets fitness level to beginner', () => {
      useSettingsStore.getState().setFitnessLevel('beginner');
      expect(useSettingsStore.getState().fitnessLevel).toBe('beginner');
    });

    it('sets fitness level to intermediate', () => {
      useSettingsStore.getState().setFitnessLevel('intermediate');
      expect(useSettingsStore.getState().fitnessLevel).toBe('intermediate');
    });

    it('sets fitness level to advanced', () => {
      useSettingsStore.getState().setFitnessLevel('advanced');
      expect(useSettingsStore.getState().fitnessLevel).toBe('advanced');
    });

    it('clears fitness level to null', () => {
      useSettingsStore.getState().setFitnessLevel('advanced');
      useSettingsStore.getState().setFitnessLevel(null);
      expect(useSettingsStore.getState().fitnessLevel).toBeNull();
    });
  });

  describe('setters do not affect unrelated state', () => {
    it('changing units does not affect other settings', () => {
      useSettingsStore.getState().setHapticFeedback(false);
      useSettingsStore.getState().setCoachStyle('technical');
      useSettingsStore.getState().setUnits('imperial');

      const s = useSettingsStore.getState();
      expect(s.units).toBe('imperial');
      expect(s.hapticFeedback).toBe(false);
      expect(s.coachStyle).toBe('technical');
    });
  });
});
