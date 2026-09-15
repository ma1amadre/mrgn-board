import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireAuth } from './auth/RequireAuth';
import { useAuth } from './auth/authContext';
import { Layout } from './Layout';

// Разделы грузятся по требованию: иначе первый заход тянул весь код одним чанком.
const OverviewPage = lazy(() =>
  import('../pages/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const BoardPage = lazy(() =>
  import('../pages/board/BoardPage').then((m) => ({ default: m.BoardPage })),
);
const MyTasksPage = lazy(() =>
  import('../pages/my/MyTasksPage').then((m) => ({ default: m.MyTasksPage })),
);
const ClientsPage = lazy(() =>
  import('../pages/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const ClientPage = lazy(() =>
  import('../pages/clients/ClientPage').then((m) => ({ default: m.ClientPage })),
);
const DealsPage = lazy(() =>
  import('../pages/deals/DealsPage').then((m) => ({ default: m.DealsPage })),
);
const IdeasPage = lazy(() =>
  import('../pages/ideas/IdeasPage').then((m) => ({ default: m.IdeasPage })),
);
const TeamPage = lazy(() =>
  import('../pages/team/TeamPage').then((m) => ({ default: m.TeamPage })),
);
const StagesPage = lazy(() =>
  import('../pages/settings/StagesPage').then((m) => ({ default: m.StagesPage })),
);
const NotificationsPage = lazy(() =>
  import('../pages/settings/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const TemplatesPage = lazy(() =>
  import('../pages/settings/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const RecurringPage = lazy(() =>
  import('../pages/settings/RecurringPage').then((m) => ({ default: m.RecurringPage })),
);
const LoginPage = lazy(() =>
  import('../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ResetPasswordPage = lazy(() =>
  import('../pages/login/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/** Ссылка из письма о сбросе пароля может привести на любой адрес (site_url) — уводим на форму. */
function useRecoveryRedirect() {
  const { recovery } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (recovery) navigate('/reset-password', { replace: true });
  }, [recovery, navigate]);
}

export function AppRoutes() {
  useRecoveryRedirect();
  return (
    <Suspense fallback={<div className="center-screen muted">Загрузка…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="my" element={<MyTasksPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings/templates" element={<TemplatesPage />} />
            <Route path="settings/recurring" element={<RecurringPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="settings/stages" element={<StagesPage />} />
              <Route path="settings/notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
