import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext';

export function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
