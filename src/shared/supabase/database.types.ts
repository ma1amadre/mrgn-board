export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_migrations: {
        Row: {
          applied_at: string;
          name: string;
        };
        Insert: {
          applied_at?: string;
          name: string;
        };
        Update: {
          applied_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          contact: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string;
          direction: Database['public']['Enums']['client_direction'];
          id: string;
          name: string;
          notes: string | null;
          status: Database['public']['Enums']['client_status'];
          updated_at: string;
        };
        Insert: {
          contact?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by: string;
          direction?: Database['public']['Enums']['client_direction'];
          id?: string;
          name: string;
          notes?: string | null;
          status?: Database['public']['Enums']['client_status'];
          updated_at?: string;
        };
        Update: {
          contact?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string;
          direction?: Database['public']['Enums']['client_direction'];
          id?: string;
          name?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['client_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      idea_votes: {
        Row: {
          created_at: string;
          idea_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          idea_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          idea_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'idea_votes_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'ideas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'idea_votes_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ideas: {
        Row: {
          author_id: string;
          body: string | null;
          created_at: string;
          id: string;
          status: Database['public']['Enums']['idea_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          status?: Database['public']['Enums']['idea_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          status?: Database['public']['Enums']['idea_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ideas_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          color: string;
          created_at: string;
          email: string;
          id: string;
          is_active: boolean;
          name: string;
          role: Database['public']['Enums']['profile_role'];
          telegram: string | null;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          email: string;
          id: string;
          is_active?: boolean;
          name: string;
          role?: Database['public']['Enums']['profile_role'];
          telegram?: string | null;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          role?: Database['public']['Enums']['profile_role'];
          telegram?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      stages: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          is_terminal: boolean;
          name: string;
          position: number;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_terminal?: boolean;
          name: string;
          position: number;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_terminal?: boolean;
          name?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          client_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          done_at: string | null;
          due_date: string | null;
          id: string;
          idea_id: string | null;
          position: number;
          priority: Database['public']['Enums']['task_priority'];
          stage_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          idea_id?: string | null;
          position?: number;
          priority?: Database['public']['Enums']['task_priority'];
          stage_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          idea_id?: string | null;
          position?: number;
          priority?: Database['public']['Enums']['task_priority'];
          stage_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'ideas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_stage_id_fkey';
            columns: ['stage_id'];
            isOneToOne: false;
            referencedRelation: 'stages';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      convert_idea_to_task: { Args: { p_idea_id: string }; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      is_member: { Args: never; Returns: boolean };
      renumber_stage: { Args: { p_stage_id: string }; Returns: undefined };
      swap_stage_positions: {
        Args: { p_a: string; p_b: string };
        Returns: undefined;
      };
    };
    Enums: {
      client_direction: 'cdn' | 'site' | 'bot' | 'app' | 'other';
      client_status: 'lead' | 'active' | 'support' | 'closed';
      idea_status: 'new' | 'discussing' | 'accepted' | 'rejected';
      profile_role: 'admin' | 'member';
      task_priority: 'low' | 'normal' | 'high' | 'urgent';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      client_direction: ['cdn', 'site', 'bot', 'app', 'other'],
      client_status: ['lead', 'active', 'support', 'closed'],
      idea_status: ['new', 'discussing', 'accepted', 'rejected'],
      profile_role: ['admin', 'member'],
      task_priority: ['low', 'normal', 'high', 'urgent'],
    },
  },
} as const;
