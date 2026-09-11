import { NavLink, Outlet } from 'react-router-dom';
import { useRealtimeInvalidation } from '../shared/api/realtime';
import { Avatar } from '../shared/ui/Avatar';
import { useAuth, useProfile } from './auth/authContext';

const NAV = [
  { to: '/', label: 'Обзор', end: true },
  { to: '/board', label: 'Доска' },
  { to: '/clients', label: 'Клиенты' },
  { to: '/ideas', label: 'Идеи' },
  { to: '/team', label: 'Команда' },
];

export function Layout() {
  const profile = useProfile();
  const { isAdmin, signOut } = useAuth();
  useRealtimeInvalidation();

  return (
    <div className="shell">
      <aside className="shell-aside">
        <div className="shell-brand">MRGN board</div>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
              {item.label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink to="/settings/stages" className="nav-item">
              Стадии
            </NavLink>
          ) : null}
        </nav>
        <div className="shell-user">
          <Avatar name={profile.name} color={profile.color} />
          <span className="name grow" title={profile.email}>
            {profile.name}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
