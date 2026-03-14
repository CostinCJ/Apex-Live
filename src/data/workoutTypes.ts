import type { WorkoutType } from '@/types/workout';

export interface WorkoutTypeMeta {
  label: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  color: string;
  emoji: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'other';
}

export const WORKOUT_TYPE_META: Record<WorkoutType, WorkoutTypeMeta> = {
  push: {
    label: 'Push',
    icon: 'arm-flex',
    iconFamily: 'MaterialCommunityIcons',
    color: '#4ADE80',
    emoji: '💪',
    category: 'strength',
  },
  pull: {
    label: 'Pull',
    icon: 'rowing',
    iconFamily: 'MaterialCommunityIcons',
    color: '#60A5FA',
    emoji: '🏋️',
    category: 'strength',
  },
  legs: {
    label: 'Legs',
    icon: 'human-handsdown',
    iconFamily: 'MaterialCommunityIcons',
    color: '#F472B6',
    emoji: '🦵',
    category: 'strength',
  },
  upper: {
    label: 'Upper Body',
    icon: 'arm-flex-outline',
    iconFamily: 'MaterialCommunityIcons',
    color: '#A78BFA',
    emoji: '💪',
    category: 'strength',
  },
  lower: {
    label: 'Lower Body',
    icon: 'human-handsdown',
    iconFamily: 'MaterialCommunityIcons',
    color: '#FB923C',
    emoji: '🦵',
    category: 'strength',
  },
  full_body: {
    label: 'Full Body',
    icon: 'human',
    iconFamily: 'MaterialCommunityIcons',
    color: '#FBBF24',
    emoji: '🔥',
    category: 'strength',
  },
  hiit: {
    label: 'HIIT',
    icon: 'flame-outline',
    iconFamily: 'Ionicons',
    color: '#F87171',
    emoji: '⚡',
    category: 'cardio',
  },
  cardio_run: {
    label: 'Run',
    icon: 'run',
    iconFamily: 'MaterialCommunityIcons',
    color: '#34D399',
    emoji: '🏃',
    category: 'cardio',
  },
  cardio_cycle: {
    label: 'Cycle',
    icon: 'bicycle',
    iconFamily: 'MaterialCommunityIcons',
    color: '#34D399',
    emoji: '🚴',
    category: 'cardio',
  },
  cardio_row: {
    label: 'Row',
    icon: 'rowing',
    iconFamily: 'MaterialCommunityIcons',
    color: '#34D399',
    emoji: '🚣',
    category: 'cardio',
  },
  boxing: {
    label: 'Boxing',
    icon: 'boxing-glove',
    iconFamily: 'MaterialCommunityIcons',
    color: '#F87171',
    emoji: '🥊',
    category: 'cardio',
  },
  mobility: {
    label: 'Mobility',
    icon: 'stretch',
    iconFamily: 'MaterialCommunityIcons',
    color: '#2DD4BF',
    emoji: '🤸',
    category: 'flexibility',
  },
  custom: {
    label: 'Custom',
    icon: 'create-outline',
    iconFamily: 'Ionicons',
    color: '#94A3B8',
    emoji: '✏️',
    category: 'other',
  },
};

export function getWorkoutTypeMeta(type: WorkoutType): WorkoutTypeMeta {
  return WORKOUT_TYPE_META[type];
}

export function getWorkoutTypeLabel(type: WorkoutType): string {
  return WORKOUT_TYPE_META[type].label;
}

export function getWorkoutTypeColor(type: WorkoutType): string {
  return WORKOUT_TYPE_META[type].color;
}
