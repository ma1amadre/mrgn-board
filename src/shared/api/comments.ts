import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { CommentWithAuthor, Inserts } from './types';

const COMMENT_SELECT = '*, author:profiles(id,name,color)';

export async function fetchComments(taskId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw error;
  return data as CommentWithAuthor[];
}

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: keys.comments.byTask(taskId ?? ''),
    queryFn: () => fetchComments(taskId as string),
    enabled: taskId !== null,
  });
}

export async function addComment(input: Inserts<'comments'>): Promise<void> {
  const { error } = await supabase.from('comments').insert(input);
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { data, error } = await supabase.from('comments').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useCommentMutations(taskId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.comments.byTask(taskId) });
  return {
    add: useMutation({ mutationFn: addComment, onSettled: invalidate }),
    remove: useMutation({ mutationFn: deleteComment, onSettled: invalidate }),
  };
}
