import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  // User preferences
  units: 'imperial' | 'metric';
  hapticFeedback: boolean;
  hapticIntensity: 'light' | 'default' | 'strong';

  // Voice coach preferences
  coachVerbosity: 'minimal' | 'moderate' | 'verbose';
  coachStyle: 'motivational' | 'technical' | 'balanced';
  voiceActivation: 'push_to_talk' | 'always_on';

  // Display
  showHeartRate: boolean;
  showCalories: boolean;
  showTimer: boolean;

  // Onboarding
  hasCompletedOnboarding: boolean;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
}

interface SettingsActions {
  setUnits: (units: SettingsState['units']) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setHapticIntensity: (intensity: SettingsState['hapticIntensity']) => void;
  setCoachVerbosity: (verbosity: SettingsState['coachVerbosity']) => void;
  setCoachStyle: (style: SettingsState['coachStyle']) => void;
  setVoiceActivation: (mode: SettingsState['voiceActivation']) => void;
  setShowHeartRate: (show: boolean) => void;
  setShowCalories: (show: boolean) => void;
  setShowTimer: (show: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setFitnessLevel: (level: SettingsState['fitnessLevel']) => void;
}

const initialState: SettingsState = {
  units: 'imperial',
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
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,

      setUnits: (units) => set({ units }),
      setHapticFeedback: (hapticFeedback) => set({ hapticFeedback }),
      setHapticIntensity: (hapticIntensity) => set({ hapticIntensity }),
      setCoachVerbosity: (coachVerbosity) => set({ coachVerbosity }),
      setCoachStyle: (coachStyle) => set({ coachStyle }),
      setVoiceActivation: (voiceActivation) => set({ voiceActivation }),
      setShowHeartRate: (showHeartRate) => set({ showHeartRate }),
      setShowCalories: (showCalories) => set({ showCalories }),
      setShowTimer: (showTimer) => set({ showTimer }),
      setHasCompletedOnboarding: (hasCompletedOnboarding) =>
        set({ hasCompletedOnboarding }),
      setFitnessLevel: (fitnessLevel) => set({ fitnessLevel }),
    }),
    {
      name: 'apex-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
