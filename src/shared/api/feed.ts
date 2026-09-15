import { useQuery } from '@tanstack/react-query';
import { fetchActivityForTasks } from './activity';
import { fetchCommentsForTasks } from './comments';
import { fetchDealActivityForDeals } from './dealActivity';
import { keys } from './keys';
import type { ActivityWithActor, CommentWithAuthor, DealActivityWithActor } from './types';

export type ClientFeedData = {
  activity: ActivityWithActor[];
  comments: CommentWithAuthor[];
  dealActivity: DealActivityWithActor[];
};

/** Три запроса по спискам id задач и сделок клиента; realtime сбрасывает по любому из источников. */
export function useClientFeed(
  clientId: string,
  taskIds: string[],
  dealIds: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: keys.clientFeed.of(clientId, taskIds, dealIds),
    queryFn: async (): Promise<ClientFeedData> => {
      const [activity, comments, dealActivity] = await Promise.all([
        fetchActivityForTasks(taskIds),
        fetchCommentsForTasks(taskIds),
        fetchDealActivityForDeals(dealIds),
      ]);
      return { activity, comments, dealActivity };
    },
    enabled,
  });
}
