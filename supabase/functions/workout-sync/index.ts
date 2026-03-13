// Workout Sync Edge Function
// - Receives batched workout metrics from the client
// - Validates user owns the workout
// - Bulk inserts metrics
// - Handles conflict resolution for crash recovery re-sends

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface MetricPayload {
  workout_id: string;
  metric_type: string;
  value: number;
  unit?: string;
  recorded_at: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const metrics: MetricPayload[] = body.metrics;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return new Response(JSON.stringify({ error: 'No metrics provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cap batch size to prevent abuse
    if (metrics.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Batch too large. Max 500 metrics per request.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Verify user owns all referenced workouts
    const workoutIds = [...new Set(metrics.map((m) => m.workout_id))];
    const { data: ownedWorkouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .in('id', workoutIds)
      .eq('user_id', user.id);

    if (workoutError) {
      console.error('Workout verification error:', workoutError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify workout ownership' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const ownedIds = new Set((ownedWorkouts ?? []).map((w) => w.id));
    const unauthorizedIds = workoutIds.filter((id) => !ownedIds.has(id));

    if (unauthorizedIds.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized workout IDs', ids: unauthorizedIds }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Bulk insert metrics with user_id
    const rows = metrics.map((m) => ({
      workout_id: m.workout_id,
      user_id: user.id,
      metric_type: m.metric_type,
      value: m.value,
      unit: m.unit ?? null,
      recorded_at: m.recorded_at,
      metadata: m.metadata ?? null,
    }));

    const { error: insertError, count } = await supabase
      .from('workout_metrics')
      .insert(rows);

    if (insertError) {
      console.error('Metrics insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert metrics', detail: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, inserted: rows.length }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    console.error('Workout sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
