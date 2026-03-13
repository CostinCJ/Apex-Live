import type { VoiceContext } from '@/types/voice';

interface UserProfile {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  coachingStyle: 'motivational' | 'technical' | 'balanced';
  verbosity: 'minimal' | 'moderate' | 'verbose';
  units: 'imperial' | 'metric';
}

export function buildSystemPrompt(
  profile: UserProfile,
  context: VoiceContext,
): string {
  const lines: string[] = [];

  lines.push('You are Apex, an expert AI fitness coach providing real-time voice guidance during workouts.');
  lines.push(`The user is ${profile.fitnessLevel} level. Use ${profile.units} units.`);

  // Coaching style
  if (profile.coachingStyle === 'motivational') {
    lines.push('Be encouraging, energetic, and celebratory. Use phrases like "Great job!", "Keep pushing!"');
  } else if (profile.coachingStyle === 'technical') {
    lines.push('Focus on form cues, breathing technique, and biomechanics. Be precise and instructional.');
  } else {
    lines.push('Balance motivation with technical cues. Encourage while providing form guidance.');
  }

  // Verbosity
  if (profile.verbosity === 'minimal') {
    lines.push('Keep responses very short (1-2 sentences). Only speak when important.');
  } else if (profile.verbosity === 'verbose') {
    lines.push('Provide detailed guidance, explanations, and encouragement. Be conversational.');
  } else {
    lines.push('Keep responses concise but informative (2-3 sentences).');
  }

  // Workout context
  if (context.workoutType) {
    lines.push(`\nCurrent workout: ${context.workoutType}`);
  }
  if (context.currentExercise) {
    lines.push(`Current exercise: ${context.currentExercise}`);
    if (context.currentSet != null && context.totalSets != null) {
      lines.push(`Set ${context.currentSet} of ${context.totalSets}`);
    }
  }

  // Timer
  if (context.elapsedSeconds > 0) {
    const mins = Math.floor(context.elapsedSeconds / 60);
    const secs = context.elapsedSeconds % 60;
    lines.push(`Elapsed time: ${mins}:${secs.toString().padStart(2, '0')}`);
  }

  // Health metrics
  if (context.heartRate != null) {
    lines.push(`Current heart rate: ${context.heartRate} BPM`);
    if (context.heartRateZone) {
      lines.push(`Heart rate zone: ${context.heartRateZone}`);
    }
  }
  if (context.caloriesBurned != null) {
    lines.push(`Calories burned: ${Math.round(context.caloriesBurned)}`);
  }

  // Previous session comparison
  if (context.previousSessionSummary) {
    lines.push(`\nPrevious session: ${context.previousSessionSummary}`);
    lines.push('Compare performance and mention improvements or areas to focus on when relevant.');
  }

  // Safety
  lines.push('\nIMPORTANT RULES:');
  lines.push('- Never provide medical advice. If the user reports pain or dizziness, advise them to stop and consult a doctor.');
  lines.push('- If heart rate exceeds safe limits for their fitness level, proactively suggest slowing down.');
  lines.push('- You are a fitness coach, not a doctor or nutritionist. Stay in your lane.');
  lines.push('- Keep responses suitable for audio playback — no markdown, bullet lists, or long paragraphs.');

  return lines.join('\n');
}

export function shouldUpdateContext(
  prev: VoiceContext | null,
  next: VoiceContext,
): boolean {
  if (!prev) return true;

  // Always update if exercise changed
  if (prev.currentExercise !== next.currentExercise) return true;
  if (prev.currentSet !== next.currentSet) return true;

  // Update if HR zone changed
  if (prev.heartRateZone !== next.heartRateZone) return true;

  // Update if significant time passed (handled by debounce timer externally)
  return false;
}
