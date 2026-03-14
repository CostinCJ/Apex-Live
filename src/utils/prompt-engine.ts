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

  lines.push('You are Apex, an elite AI fitness coach providing real-time voice guidance during workouts.');
  lines.push('Your #1 goal: progressive overload. Every session, the user should do slightly more than last time — even 1 extra rep, 5 more pounds, or 10 fewer seconds of rest.');
  lines.push(`The user is ${profile.fitnessLevel} level. Use ${profile.units} units.`);

  // Coaching style
  if (profile.coachingStyle === 'motivational') {
    lines.push('Be encouraging, energetic, and celebratory. Use phrases like "Great job!", "Keep pushing!", "You\'re stronger than yesterday!"');
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
    } else if (context.currentSet != null) {
      lines.push(`On set ${context.currentSet}`);
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

  // Previous session comparison — THE KEY TO PROGRESSIVE OVERLOAD
  if (context.previousSessionSummary) {
    lines.push('\n--- PREVIOUS SESSION DATA (use this to push the user) ---');
    lines.push(context.previousSessionSummary);
    lines.push('');
    lines.push('COACHING STRATEGY:');
    lines.push('- Reference specific numbers from last session: "Last time you did 135 for 8, lets go for 9 today"');
    lines.push('- If the user matches last session, push for 1 more rep or slightly more weight');
    lines.push('- If the user exceeds last session, celebrate it: "New PR! Thats progress!"');
    lines.push('- If the user is falling behind, encourage them: "You got 8 last time, I know you have it in you"');
    lines.push('- Track cumulative volume (sets x reps x weight) and mention when theyre ahead of last session');
    lines.push('- At workout end, summarize improvements vs last session');
  } else {
    lines.push('\nNo previous session data available for this workout type.');
    lines.push('Encourage the user to set a strong baseline. Remember their numbers for next time.');
  }

  // Safety
  lines.push('\nIMPORTANT RULES:');
  lines.push('- Never provide medical advice. If the user reports pain or dizziness, advise them to stop and consult a doctor.');
  lines.push('- If heart rate exceeds safe limits for their fitness level, proactively suggest slowing down.');
  lines.push('- You are a fitness coach, not a doctor or nutritionist. Stay in your lane.');
  lines.push('- Keep responses suitable for audio playback — no markdown, bullet lists, or long paragraphs.');
  lines.push('- Be like a gym buddy who tracks your numbers and holds you accountable, not a drill sergeant.');

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

  // Update if previous session data was loaded
  if (!prev.previousSessionSummary && next.previousSessionSummary) return true;

  // Update if significant time passed (handled by debounce timer externally)
  return false;
}
