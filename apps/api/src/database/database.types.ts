export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          document_content_hash: string
          document_id: string
          embedding: string
          embedding_model: string
          heading_path: string
          id: string
          token_count: number
          tsv: unknown
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          document_content_hash: string
          document_id: string
          embedding: string
          embedding_model: string
          heading_path?: string
          id?: string
          token_count: number
          tsv?: never
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          document_content_hash?: string
          document_id?: string
          embedding?: string
          embedding_model?: string
          heading_path?: string
          id?: string
          token_count?: number
          tsv?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'document_chunks_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'document_summaries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_chunks_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      documents: {
        Row: {
          chunk_count: number
          content: string
          content_hash: string
          created_at: string
          embedding_error: string | null
          embedding_model: string | null
          embedding_status: Database['public']['Enums']['embedding_status']
          id: string
          ingestion_attempts: number
          next_attempt_at: string
          processing_started_at: string | null
          source_filename: string | null
          source_type: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_count?: number
          content: string
          content_hash: string
          created_at?: string
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_status?: Database['public']['Enums']['embedding_status']
          id?: string
          ingestion_attempts?: number
          next_attempt_at?: string
          processing_started_at?: string | null
          source_filename?: string | null
          source_type?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          chunk_count?: number
          content?: string
          content_hash?: string
          created_at?: string
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_status?: Database['public']['Enums']['embedding_status']
          id?: string
          ingestion_attempts?: number
          next_attempt_at?: string
          processing_started_at?: string | null
          source_filename?: string | null
          source_type?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          citations: NonNullable<Json>
          completion_tokens: number | null
          content: string
          conversation_id: string
          created_at: string
          finish_reason: string | null
          id: string
          metadata: NonNullable<Json>
          model: string | null
          prompt_tokens: number | null
          provider: string | null
          role: Database['public']['Enums']['message_role']
          usage_estimated: boolean
          user_id: string
        }
        Insert: {
          citations?: NonNullable<Json>
          completion_tokens?: number | null
          content: string
          conversation_id: string
          created_at?: string
          finish_reason?: string | null
          id?: string
          metadata?: NonNullable<Json>
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          role: Database['public']['Enums']['message_role']
          usage_estimated?: boolean
          user_id?: string
        }
        Update: {
          citations?: NonNullable<Json>
          completion_tokens?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          finish_reason?: string | null
          id?: string
          metadata?: NonNullable<Json>
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          role?: Database['public']['Enums']['message_role']
          usage_estimated?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      usage_events: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          created_at: string
          document_id: string | null
          estimated: boolean
          id: string
          kind: Database['public']['Enums']['usage_kind']
          latency_ms: number | null
          message_id: string | null
          model: string
          prompt_tokens: number
          provider: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string
          document_id?: string | null
          estimated?: boolean
          id?: string
          kind: Database['public']['Enums']['usage_kind']
          latency_ms?: number | null
          message_id?: string | null
          model: string
          prompt_tokens?: number
          provider: string
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string
          document_id?: string | null
          estimated?: boolean
          id?: string
          kind?: Database['public']['Enums']['usage_kind']
          latency_ms?: number | null
          message_id?: string | null
          model?: string
          prompt_tokens?: number
          provider?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_events_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_events_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'document_summaries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_events_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      document_summaries: {
        Row: {
          chunk_count: number | null
          content_length: number | null
          content_preview: string | null
          created_at: string | null
          embedding_error: string | null
          embedding_model: string | null
          embedding_status: Database['public']['Enums']['embedding_status'] | null
          id: string | null
          ingestion_attempts: number | null
          next_attempt_at: string | null
          source_filename: string | null
          source_type: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          chunk_count?: number | null
          content_length?: never
          content_preview?: never
          created_at?: string | null
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_status?: Database['public']['Enums']['embedding_status'] | null
          id?: string | null
          ingestion_attempts?: number | null
          next_attempt_at?: string | null
          source_filename?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          chunk_count?: number | null
          content_length?: never
          content_preview?: never
          created_at?: string | null
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_status?: Database['public']['Enums']['embedding_status'] | null
          id?: string | null
          ingestion_attempts?: number | null
          next_attempt_at?: string | null
          source_filename?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_pending_documents: {
        Args: { p_batch_size?: number; p_max_attempts?: number; p_stale_after_minutes?: number }
        Returns: {
          content: string
          content_hash: string
          id: string
          ingestion_attempts: number
          title: string
          user_id: string
        }[]
      }
      embedding_column_dimensions: { Args: Record<PropertyKey, never>; Returns: number }
      finalize_document_ingestion: {
        Args: { p_content_hash: string; p_document_id: string; p_embedding_model: string }
        Returns: number
      }
      mark_document_ingestion_failed: {
        Args: { p_document_id: string; p_error: string; p_retry_in_seconds?: number }
        Returns: undefined
      }
      match_chunks: {
        Args: {
          p_document_ids?: string[]
          p_embedding_model: string
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_user_id?: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          heading_path: string
          similarity: number
        }[]
      }
      requeue_documents: { Args: { p_document_id?: string }; Returns: number }
      requeue_documents_for_model: { Args: { p_embedding_model: string }; Returns: number }
      search_chunks_keyword: {
        Args: {
          p_document_ids?: string[]
          p_embedding_model: string
          p_match_count?: number
          p_query_text: string
          p_user_id?: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          heading_path: string
          keyword_rank: number
        }[]
      }
      upsert_document_chunks: {
        Args: {
          p_chunks: Json
          p_content_hash: string
          p_document_id: string
          p_embedding_model: string
        }
        Returns: number
      }
      usage_summary: {
        Args: { p_from?: string; p_timezone?: string; p_to?: string }
        Returns: Json
      }
    }
    Enums: {
      embedding_status: 'pending' | 'processing' | 'ready' | 'failed'
      message_role: 'user' | 'assistant'
      usage_kind: 'chat' | 'embedding' | 'query_rewrite'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      embedding_status: ['pending', 'processing', 'ready', 'failed'],
      message_role: ['user', 'assistant'],
      usage_kind: ['chat', 'embedding', 'query_rewrite'],
    },
  },
} as const
