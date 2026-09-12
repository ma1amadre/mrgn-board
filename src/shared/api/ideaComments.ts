import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { IdeaCommentWithAuthor, Inserts } from './types';

const SELECT = '*, author:profiles(id,name,color)';

export async function fetchIdeaComments(ideaId: string): Promise<IdeaCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('idea_comments')
    .select(SELECT)
    .eq('idea_id', ideaId)
    .order('created_at');
  if (error) throw error;
  return data as IdeaCommentWithAuthor[];
}

/** Грузится только когда обсуждение развёрнуто — на странице десятки идей. */
export function useIdeaComments(ideaId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.ideaComments.byIdea(ideaId),
    queryFn: () => fetchIdeaComments(ideaId),
    enabled,
  });
}

export async function addIdeaComment(input: Inserts<'idea_comments'>): Promise<void> {
  const { error } = await supabase.from('idea_comments').insert(input);
  if (error) throw error;
}

export async function deleteIdeaComment(id: string): Promise<void> {
  const { data, error } = await supabase.from('idea_comments').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useIdeaCommentMutations(ideaId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.ideaComments.byIdea(ideaId) });
    // Счётчик комментариев приезжает вместе с идеей.
    void qc.invalidateQueries({ queryKey: keys.ideas.all });
  };
  return {
    add: useMutation({ mutationFn: addIdeaComment, onSettled: invalidate }),
    remove: useMutation({ mutationFn: deleteIdeaComment, onSettled: invalidate }),
  };
}
