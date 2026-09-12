import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { IdeaWithRefs, Inserts, Updates } from './types';

/** tasks(id) — есть ли уже задача из этой идеи (FK tasks.idea_id, уникальный). */
// profiles!ideas_author_id_fkey: idea_votes — junction-таблица, и PostgREST видит второй путь ideas↔profiles.
const IDEA_SELECT =
  '*, author:profiles!ideas_author_id_fkey(id,name,color), idea_votes(profile_id), tasks(id), idea_comments(id)';

export async function fetchIdeas(): Promise<IdeaWithRefs[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select(IDEA_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as IdeaWithRefs[];
}

export function useIdeas() {
  return useQuery({ queryKey: keys.ideas.all, queryFn: fetchIdeas });
}

export async function createIdea(input: Inserts<'ideas'>): Promise<void> {
  const { error } = await supabase.from('ideas').insert(input);
  if (error) throw error;
}

export async function updateIdea(id: string, patch: Updates<'ideas'>): Promise<void> {
  const { data, error } = await supabase.from('ideas').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteIdea(id: string): Promise<void> {
  const { data, error } = await supabase.from('ideas').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

/** Голос — строка (idea_id, profile_id): toggle без гонок, RLS не даёт голосовать за другого. */
export async function toggleVote(
  ideaId: string,
  profileId: string,
  hasVote: boolean,
): Promise<void> {
  if (hasVote) {
    const { error } = await supabase
      .from('idea_votes')
      .delete()
      .eq('idea_id', ideaId)
      .eq('profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('idea_votes')
      .insert({ idea_id: ideaId, profile_id: profileId });
    if (error) throw error;
  }
}

export async function convertIdea(ideaId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convert_idea_to_task', { p_idea_id: ideaId });
  if (error) throw error;
  return data;
}

export function useIdeaMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.ideas.all });
  return {
    create: useMutation({ mutationFn: createIdea, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'ideas'> }) => updateIdea(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteIdea, onSettled: invalidate }),
    vote: useMutation({
      mutationFn: ({
        ideaId,
        profileId,
        hasVote,
      }: {
        ideaId: string;
        profileId: string;
        hasVote: boolean;
      }) => toggleVote(ideaId, profileId, hasVote),
      onSettled: invalidate,
    }),
    convert: useMutation({
      mutationFn: convertIdea,
      onSettled: () => {
        void invalidate();
        void qc.invalidateQueries({ queryKey: keys.tasks.all });
      },
    }),
  };
}
