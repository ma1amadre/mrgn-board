import type { Database } from '../supabase/database.types';

type PublicTables = Database['public']['Tables'];

export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type Inserts<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type Updates<T extends keyof PublicTables> = PublicTables[T]['Update'];

export type Profile = Tables<'profiles'>;
export type Client = Tables<'clients'>;
export type Stage = Tables<'stages'>;
export type Task = Tables<'tasks'>;
export type Idea = Tables<'ideas'>;
export type Comment = Tables<'comments'>;
export type ChecklistItem = Tables<'task_checklist_items'>;
export type Attachment = Tables<'task_attachments'>;
export type Deal = Tables<'deals'>;
export type Activity = Tables<'task_activity'>;

export type ProfileRef = Pick<Profile, 'id' | 'name' | 'color'>;
export type ClientRef = Pick<Client, 'id' | 'name'>;

/** Задача с подтянутыми исполнителем и клиентом — то, что лежит в кеше ['tasks']. */
export type TaskWithRefs = Task & {
  assignee: ProfileRef | null;
  client: ClientRef | null;
  checklist: ChecklistItem[];
  attachments: Attachment[];
};
export type IdeaWithRefs = Idea & {
  author: ProfileRef | null;
  idea_votes: { profile_id: string }[];
  /** Задача, созданная из идеи (уникальный FK) — пустой массив, если ещё нет. */
  tasks: { id: string }[];
};
export type CommentWithAuthor = Comment & { author: ProfileRef | null };
export type ActivityWithActor = Activity & { actor: ProfileRef | null };
export type DealWithRefs = Deal & { client: ClientRef | null; owner: ProfileRef | null };
