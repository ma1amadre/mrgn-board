import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { BoardPage } from '../pages/board/BoardPage';
import { ClientPage } from '../pages/clients/ClientPage';
import { ClientsPage } from '../pages/clients/ClientsPage';
import { DealsPage } from '../pages/deals/DealsPage';
import { IdeasPage } from '../pages/ideas/IdeasPage';
import { LoginPage } from '../pages/login/LoginPage';
import { MyTasksPage } from '../pages/my/MyTasksPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ResetPasswordPage } from '../pages/login/ResetPasswordPage';
import { NotificationsPage } from '../pages/settings/NotificationsPage';
import { OverviewPage } from '../pages/overview/OverviewPage';
import { StagesPage } from '../pages/settings/StagesPage';
import { TeamPage } from '../pages/team/TeamPage';
import { RequireAdmin } from './auth/RequireAdmin';
import { useAuth } from './auth/authContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './Layout';

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
          <Route element={<RequireAdmin />}>
            <Route path="settings/stages" element={<StagesPage />} />
            <Route path="settings/notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
