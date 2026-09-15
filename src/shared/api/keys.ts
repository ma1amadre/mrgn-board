/** Фабрика ключей TanStack Query — единственное место, где они определяются. */
export const keys = {
  profiles: {
    all: ['profiles'] as const,
    me: (id: string | null) => ['profiles', 'me', id] as const,
  },
  clients: { all: ['clients'] as const, archived: ['clients', 'archived'] as const },
  stages: { all: ['stages'] as const },
  tasks: { all: ['tasks'] as const, archived: ['tasks', 'archived'] as const },
  ideas: { all: ['ideas'] as const },
  deals: { all: ['deals'] as const },
  comments: {
    all: ['comments'] as const,
    byTask: (taskId: string) => ['comments', taskId] as const,
  },
  ideaComments: {
    all: ['idea-comments'] as const,
    byIdea: (ideaId: string) => ['idea-comments', ideaId] as const,
  },
  activity: {
    all: ['activity'] as const,
    byTask: (taskId: string) => ['activity', taskId] as const,
  },
  dealActivity: {
    all: ['deal-activity'] as const,
    byDeal: (dealId: string) => ['deal-activity', dealId] as const,
  },
  attachmentUrls: (taskId: string, ids: string) => ['attachment-urls', taskId, ids] as const,
  settings: ['settings'] as const,
  invites: ['invites'] as const,
  templates: ['templates'] as const,
  recurrences: ['recurrences'] as const,
  boardViews: ['board-views'] as const,
  clientErrors: ['client-errors'] as const,
  notifyStatus: ['notify-status'] as const,
  notifications: {
    all: ['notifications'] as const,
    recent: ['notifications', 'recent'] as const,
    unread: ['notifications', 'unread'] as const,
    history: (onlyUnread: boolean) => ['notifications', 'history', onlyUnread] as const,
  },
  migrations: ['migrations'] as const,
};
