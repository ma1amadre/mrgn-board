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
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      board_views: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          profile_id: string;
          query: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          profile_id: string;
          query: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          profile_id?: string;
          query?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_views_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      client_contacts: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string;
          email: string | null;
          id: string;
          is_primary: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string | null;
          telegram: string | null;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          created_by: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          telegram?: string | null;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string;
          email?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          telegram?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_contacts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_contacts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      client_errors: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          profile_id: string | null;
          stack: string | null;
          url: string | null;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          profile_id?: string | null;
          stack?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          profile_id?: string | null;
          stack?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_errors_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          archived_at: string | null;
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
          archived_at?: string | null;
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
          archived_at?: string | null;
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
      deals: {
        Row: {
          amount: number | null;
          client_id: string;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          expected_close: string | null;
          id: string;
          notes: string | null;
          owner_id: string | null;
          stage: Database['public']['Enums']['deal_stage'];
          title: string;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          client_id: string;
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          expected_close?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          stage?: Database['public']['Enums']['deal_stage'];
          title: string;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          client_id?: string;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          expected_close?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          stage?: Database['public']['Enums']['deal_stage'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deals_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deals_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      idea_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          idea_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          idea_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          idea_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'idea_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'idea_comments_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'ideas';
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
      invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          invited_by: string;
          role: Database['public']['Enums']['profile_role'];
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          invited_by: string;
          role?: Database['public']['Enums']['profile_role'];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          invited_by?: string;
          role?: Database['public']['Enums']['profile_role'];
        };
        Relationships: [
          {
            foreignKeyName: 'invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          profile_id: string;
          read_at: string | null;
          title: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          link?: string | null;
          profile_id: string;
          read_at?: string | null;
          title: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          profile_id?: string;
          read_at?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_profile_id_fkey';
            columns: ['profile_id'];
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
          notify_assigned: boolean;
          notify_comments: boolean;
          notify_digest: boolean;
          notify_mentions: boolean;
          role: Database['public']['Enums']['profile_role'];
          telegram: string | null;
          telegram_chat_id: number | null;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          email: string;
          id: string;
          is_active?: boolean;
          name: string;
          notify_assigned?: boolean;
          notify_comments?: boolean;
          notify_digest?: boolean;
          notify_mentions?: boolean;
          role?: Database['public']['Enums']['profile_role'];
          telegram?: string | null;
          telegram_chat_id?: number | null;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          notify_assigned?: boolean;
          notify_comments?: boolean;
          notify_digest?: boolean;
          notify_mentions?: boolean;
          role?: Database['public']['Enums']['profile_role'];
          telegram?: string | null;
          telegram_chat_id?: number | null;
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
      task_activity: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_value: string | null;
          id: string;
          kind: string;
          task_id: string;
          to_value: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: string;
          kind: string;
          task_id: string;
          to_value?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_value?: string | null;
          id?: string;
          kind?: string;
          task_id?: string;
          to_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_activity_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_activity_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_attachments: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          mime: string | null;
          name: string;
          path: string;
          size: number;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          mime?: string | null;
          name: string;
          path: string;
          size: number;
          task_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          mime?: string | null;
          name?: string;
          path?: string;
          size?: number;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_checklist_items: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_done: boolean;
          task_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          is_done?: boolean;
          task_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_done?: boolean;
          task_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_checklist_items_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_checklist_items_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_recurrences: {
        Row: {
          active: boolean;
          assignee_id: string | null;
          checklist: string[];
          client_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_offset_days: number;
          id: string;
          labels: string[];
          next_run: string;
          period: Database['public']['Enums']['recurrence_period'];
          priority: Database['public']['Enums']['task_priority'];
          run_day: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          assignee_id?: string | null;
          checklist?: string[];
          client_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_offset_days?: number;
          id?: string;
          labels?: string[];
          next_run: string;
          period: Database['public']['Enums']['recurrence_period'];
          priority?: Database['public']['Enums']['task_priority'];
          run_day: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          assignee_id?: string | null;
          checklist?: string[];
          client_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_offset_days?: number;
          id?: string;
          labels?: string[];
          next_run?: string;
          period?: Database['public']['Enums']['recurrence_period'];
          priority?: Database['public']['Enums']['task_priority'];
          run_day?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_recurrences_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_recurrences_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_recurrences_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_templates: {
        Row: {
          checklist: string[];
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          labels: string[];
          name: string;
          priority: Database['public']['Enums']['task_priority'];
          title: string;
          updated_at: string;
        };
        Insert: {
          checklist?: string[];
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          labels?: string[];
          name: string;
          priority?: Database['public']['Enums']['task_priority'];
          title?: string;
          updated_at?: string;
        };
        Update: {
          checklist?: string[];
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          labels?: string[];
          name?: string;
          priority?: Database['public']['Enums']['task_priority'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          archived_at: string | null;
          assignee_id: string | null;
          client_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          done_at: string | null;
          due_date: string | null;
          id: string;
          idea_id: string | null;
          labels: string[];
          position: number;
          priority: Database['public']['Enums']['task_priority'];
          stage_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          assignee_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          idea_id?: string | null;
          labels?: string[];
          position?: number;
          priority?: Database['public']['Enums']['task_priority'];
          stage_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          assignee_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          idea_id?: string | null;
          labels?: string[];
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
      activity_label: {
        Args: { p_id: string; p_name: string };
        Returns: string;
      };
      convert_idea_to_task: { Args: { p_idea_id: string }; Returns: string };
      html_escape: { Args: { p: string }; Returns: string };
      idea_link: { Args: { p_idea_id: string }; Returns: string };
      invite_member: {
        Args: {
          p_email: string;
          p_role?: Database['public']['Enums']['profile_role'];
        };
        Returns: string;
      };
      is_admin: { Args: never; Returns: boolean };
      is_member: { Args: never; Returns: boolean };
      log_client_error: {
        Args: {
          p_message: string;
          p_stack: string;
          p_url: string;
          p_user_agent: string;
        };
        Returns: undefined;
      };
      notify: {
        Args: {
          p_body: string;
          p_kind: string;
          p_link: string;
          p_profile: string;
          p_title: string;
        };
        Returns: undefined;
      };
      notify_due_digest: { Args: never; Returns: number };
      notify_status: { Args: never; Returns: Json };
      notify_test: { Args: never; Returns: string };
      recurrence_next: {
        Args: {
          p_from: string;
          p_period: Database['public']['Enums']['recurrence_period'];
          p_run_day: number;
        };
        Returns: string;
      };
      renumber_stage: { Args: { p_stage_id: string }; Returns: undefined };
      setting: { Args: { p_key: string }; Returns: string };
      spawn_recurring_tasks: { Args: never; Returns: number };
      swap_stage_positions: {
        Args: { p_a: string; p_b: string };
        Returns: undefined;
      };
      task_link: { Args: { p_task_id: string }; Returns: string };
      telegram_send: {
        Args: { p_chat_id: number; p_text: string };
        Returns: undefined;
      };
    };
    Enums: {
      client_direction: 'cdn' | 'site' | 'bot' | 'app' | 'other';
      client_status: 'lead' | 'active' | 'support' | 'closed';
      deal_stage: 'new' | 'contact' | 'proposal' | 'negotiation' | 'won' | 'lost';
      idea_status: 'new' | 'discussing' | 'accepted' | 'rejected';
      profile_role: 'admin' | 'member';
      recurrence_period: 'week' | 'month';
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
      deal_stage: ['new', 'contact', 'proposal', 'negotiation', 'won', 'lost'],
      idea_status: ['new', 'discussing', 'accepted', 'rejected'],
      profile_role: ['admin', 'member'],
      recurrence_period: ['week', 'month'],
      task_priority: ['low', 'normal', 'high', 'urgent'],
    },
  },
} as const;
