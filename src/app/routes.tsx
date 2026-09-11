import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { BoardPage } from '../pages/board/BoardPage';
import { ClientPage } from '../pages/clients/ClientPage';
import { ClientsPage } from '../pages/clients/ClientsPage';
import { IdeasPage } from '../pages/ideas/IdeasPage';
import { LoginPage } from '../pages/login/LoginPage';
import { OverviewPage } from '../pages/overview/OverviewPage';
import { StagesPage } from '../pages/settings/StagesPage';
import { TeamPage } from '../pages/team/TeamPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientPage />} />
        <Route path="ideas" element={<IdeasPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="settings/stages" element={<StagesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
