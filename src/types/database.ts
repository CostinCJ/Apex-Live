// Generated from server/prisma/schema.prisma
// These types mirror the Prisma-generated types but are kept for client-side compatibility.
// Re-generate with: npx prisma generate (in server/) then copy relevant types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkoutTypeEnum =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'hiit'
  | 'cardio_run'
  | 'cardio_cycle'
  | 'cardio_row'
  | 'yoga'
  | 'mobility'
  | 'custom';

export type MetricTypeEnum =
  | 'heart_rate'
  | 'calories'
  | 'distance'
  | 'pace'
  | 'speed'
  | 'cadence'
  | 'power'
  | 'elevation'
  | 'rep_count'
  | 'weight'
  | 'rpe';

export type ConversationRoleEnum = 'user' | 'assistant' | 'system';

export type WorkoutStatusEnum = 'active' | 'paused' | 'completed' | 'abandoned';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          fitness_level: string;
          preferences: Json;
          voice_settings: Json;
          timezone: string;
          units: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          fitness_level?: string;
          preferences?: Json;
          voice_settings?: Json;
          timezone?: string;
          units?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          fitness_level?: string;
          preferences?: Json;
          voice_settings?: Json;
          timezone?: string;
          units?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_type: WorkoutTypeEnum;
          status: WorkoutStatusEnum;
          title: string | null;
          started_at: string;
          completed_at: string | null;
          duration_seconds: number | null;
          plan: Json | null;
          exercises: Json;
          metrics_summary: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_type: WorkoutTypeEnum;
          status?: WorkoutStatusEnum;
          title?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          plan?: Json | null;
          exercises?: Json;
          metrics_summary?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_type?: WorkoutTypeEnum;
          status?: WorkoutStatusEnum;
          title?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          plan?: Json | null;
          exercises?: Json;
          metrics_summary?: Json;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_metrics: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          metric_type: MetricTypeEnum;
          value: number;
          unit: string | null;
          recorded_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          metric_type: MetricTypeEnum;
          value: number;
          unit?: string | null;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          workout_id?: string;
          user_id?: string;
          metric_type?: MetricTypeEnum;
          value?: number;
          unit?: string | null;
          recorded_at?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      workout_metrics_downsampled: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          metric_type: MetricTypeEnum;
          bucket_start: string;
          bucket_seconds: number;
          avg_value: number;
          min_value: number;
          max_value: number;
          sample_count: number;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          metric_type: MetricTypeEnum;
          bucket_start: string;
          bucket_seconds?: number;
          avg_value: number;
          min_value: number;
          max_value: number;
          sample_count?: number;
        };
        Update: {
          id?: string;
          workout_id?: string;
          user_id?: string;
          metric_type?: MetricTypeEnum;
          bucket_start?: string;
          bucket_seconds?: number;
          avg_value?: number;
          min_value?: number;
          max_value?: number;
          sample_count?: number;
        };
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_name: string;
          record_type: string;
          value: number;
          unit: string;
          achieved_at: string;
          workout_id: string | null;
          previous_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_name: string;
          record_type: string;
          value: number;
          unit: string;
          achieved_at?: string;
          workout_id?: string | null;
          previous_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_name?: string;
          record_type?: string;
          value?: number;
          unit?: string;
          achieved_at?: string;
          workout_id?: string | null;
          previous_value?: number | null;
        };
        Relationships: [];
      };
      coach_conversations: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string | null;
          title: string | null;
          started_at: string;
          ended_at: string | null;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_id?: string | null;
          title?: string | null;
          started_at?: string;
          ended_at?: string | null;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_id?: string | null;
          title?: string | null;
          started_at?: string;
          ended_at?: string | null;
          message_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: ConversationRoleEnum;
          content: string;
          audio_duration_ms: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: ConversationRoleEnum;
          content: string;
          audio_duration_ms?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: ConversationRoleEnum;
          content?: string;
          audio_duration_ms?: number | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      daily_workout_summaries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          workout_count: number;
          total_duration: number;
          total_calories: number;
          total_distance: number;
          total_volume: number;
          workout_types: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          workout_count?: number;
          total_duration?: number;
          total_calories?: number;
          total_distance?: number;
          total_volume?: number;
          workout_types?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          workout_count?: number;
          total_duration?: number;
          total_calories?: number;
          total_distance?: number;
          total_volume?: number;
          workout_types?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_previous_workout: {
        Args: {
          p_user_id: string;
          p_workout_type: WorkoutTypeEnum;
          p_current_workout_id?: string;
        };
        Returns: {
          workout_id: string;
          started_at: string;
          completed_at: string | null;
          duration_seconds: number | null;
          metrics_summary: Json;
        }[];
      };
      compare_workout_metrics: {
        Args: {
          p_current_workout_id: string;
          p_previous_workout_id: string;
          p_metric: MetricTypeEnum;
          p_bucket_seconds?: number;
        };
        Returns: {
          elapsed_seconds: number;
          current_value: number;
          previous_value: number;
          delta: number;
        }[];
      };
      export_user_data: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      workout_type: WorkoutTypeEnum;
      metric_type: MetricTypeEnum;
      conversation_role: ConversationRoleEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
