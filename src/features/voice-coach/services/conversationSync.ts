import { supabase } from '@/services/supabase/client';
import type { InsertDto } from '@/types/database';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioDurationMs?: number;
}

export async function saveConversation(
  userId: string,
  workoutId: string | null,
  entries: TranscriptEntry[],
): Promise<string | null> {
  if (entries.length === 0) return null;

  // Create conversation record
  const conversationInsert: InsertDto<'coach_conversations'> = {
    user_id: userId,
    workout_id: workoutId,
    title: `Coaching session ${new Date().toLocaleDateString()}`,
    started_at: new Date(entries[0]?.timestamp ?? Date.now()).toISOString(),
    ended_at: new Date(entries[entries.length - 1]?.timestamp ?? Date.now()).toISOString(),
    message_count: entries.length,
  };

  const { data: conversation, error: convError } = await supabase
    .from('coach_conversations')
    .insert(conversationInsert)
    .select('id')
    .single();

  if (convError || !conversation) {
    console.error('Failed to create conversation:', convError);
    return null;
  }

  // Batch insert messages
  const messages: InsertDto<'coach_messages'>[] = entries.map((entry) => ({
    conversation_id: conversation.id,
    role: entry.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: entry.content,
    audio_duration_ms: entry.audioDurationMs ?? null,
  }));

  const { error: msgError } = await supabase
    .from('coach_messages')
    .insert(messages);

  if (msgError) {
    console.error('Failed to insert messages:', msgError);
  }

  return conversation.id;
}
