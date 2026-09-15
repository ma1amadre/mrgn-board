import type { Database } from '../supabase/database.types';

type PublicTables = Database['public']['Tables'];

export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type Inserts<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type Updates<T extends keyof PublicTables> = PublicTables[T]['Update'];

export type Profile = Tables<'profiles'>;
export type Client = Tables<'clients'>;
export type ClientContact = Tables<'client_contacts'>;
export type Stage = Tables<'stages'>;
export type Task = Tables<'tasks'>;
export type Idea = Tables<'ideas'>;
export type Comment = Tables<'comments'>;
export type IdeaComment = Tables<'idea_comments'>;
export type ChecklistItem = Tables<'task_checklist_items'>;
export type Attachment = Tables<'task_attachments'>;
export type Deal = Tables<'deals'>;
export type Activity = Tables<'task_activity'>;
export type DealActivity = Tables<'deal_activity'>;

export type ProfileRef = Pick<Profile, 'id' | 'name' | 'color'>;
export type ClientRef = Pick<Client, 'id' | 'name'>;
/** Клиент с контактами — то, что лежит в кеше ['clients']. */
export type ClientWithContacts = Client & { contacts: ClientContact[] };

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
  /** Только для счётчика: само обсуждение грузится по запросу. */
  idea_comments: { id: string }[];
};
export type CommentWithAuthor = Comment & { author: ProfileRef | null };
export type ActivityWithActor = Activity & { actor: ProfileRef | null };
export type DealActivityWithActor = DealActivity & { actor: ProfileRef | null };
export type DealWithRefs = Deal & { client: ClientRef | null; owner: ProfileRef | null };
export type IdeaCommentWithAuthor = IdeaComment & { author: ProfileRef | null };
