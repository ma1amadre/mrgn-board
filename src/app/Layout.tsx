import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Обзор', end: true },
  { to: '/board', label: 'Доска' },
  { to: '/clients', label: 'Клиенты' },
  { to: '/ideas', label: 'Идеи' },
  { to: '/team', label: 'Команда' },
];

export function Layout() {
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
        </nav>
        <div className="shell-user">
          <span className="avatar" aria-hidden="true">
            ?
          </span>
          <span className="name muted">не авторизован</span>
        </div>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
