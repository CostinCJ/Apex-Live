import { api } from '@/services/api/client';

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
  const { data: convResult, error: convError } = await api.post<{ data: { id: string } }>(
    '/api/conversations',
    {
      workoutId,
      title: `Coaching session ${new Date().toLocaleDateString()}`,
      startedAt: new Date(entries[0]?.timestamp ?? Date.now()).toISOString(),
      endedAt: new Date(entries[entries.length - 1]?.timestamp ?? Date.now()).toISOString(),
      messageCount: entries.length,
    },
  );

  if (convError || !convResult?.data) {
    console.error('Failed to create conversation:', convError);
    return null;
  }

  const conversationId = convResult.data.id;

  // Batch insert messages
  const { error: msgError } = await api.post(
    `/api/conversations/${conversationId}/messages`,
    {
      messages: entries.map((entry) => ({
        role: entry.role,
        content: entry.content,
        audioDurationMs: entry.audioDurationMs ?? null,
      })),
    },
  );

  if (msgError) {
    console.error('Failed to insert messages:', msgError);
  }

  return conversationId;
}
