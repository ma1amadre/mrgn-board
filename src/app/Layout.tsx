import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMissingMigrations } from '../shared/api/migrations';
import { useRealtimeInvalidation } from '../shared/api/realtime';
import { Avatar } from '../shared/ui/Avatar';
import { useToast } from '../shared/ui/toastContext';
import { useAuth, useProfile } from './auth/authContext';
import { Hotkeys } from './Hotkeys';
import { NotificationsBell } from './NotificationsBell';
import { THEME_LABEL, nextTheme, useTheme, type Theme } from './theme';

type NavItem = { to: string; label: string; end?: boolean };

const NAV: NavItem[] = [
  { to: '/', label: 'Обзор', end: true },
  { to: '/board', label: 'Доска' },
  { to: '/my', label: 'Мои задачи' },
  { to: '/clients', label: 'Клиенты' },
  { to: '/deals', label: 'Сделки' },
  { to: '/ideas', label: 'Идеи' },
  { to: '/team', label: 'Команда' },
  { to: '/settings/templates', label: 'Шаблоны' },
];
const ADMIN_NAV: NavItem[] = [
  { to: '/settings/stages', label: 'Стадии' },
  { to: '/settings/notifications', label: 'Уведомления' },
];

/** Нижняя панель на телефоне: четыре самых частых раздела, остальное — в «Ещё». */
const TABBAR = new Set(['/', '/board', '/my', '/clients']);
const TABBAR_LABEL: Record<string, string> = { '/my': 'Мои' };

/** Новая версия сервис-воркера уже взяла страницу под контроль — свежий код будет после перезагрузки. */
function useSwUpdateToast() {
  const toast = useToast();
  useEffect(() => {
    const onUpdate = () =>
      toast.show('Приложение обновилось', 'info', {
        ttlMs: 60_000,
        action: { label: 'Перезагрузить', onClick: () => window.location.reload() },
      });
    window.addEventListener('sw-updated', onUpdate);
    return () => window.removeEventListener('sw-updated', onUpdate);
  }, [toast]);
}

function MoreMenu({
  items,
  theme,
  onTheme,
}: {
  items: NavItem[];
  theme: Theme;
  onTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const active = items.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="tabbar-more">
      <button
        type="button"
        className={active ? 'tabbar-item active' : 'tabbar-item'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Ещё
      </button>
      {open ? (
        <div className="popover tabbar-popover" role="menu" aria-label="Остальные разделы">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="popover-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="popover-item" role="menuitem" onClick={onTheme}>
            Тема: {THEME_LABEL[theme]}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Layout() {
  const profile = useProfile();
  const { isAdmin, signOut } = useAuth();
  const missing = useMissingMigrations();
  const [theme, setTheme] = useTheme();
  useRealtimeInvalidation();
  useSwUpdateToast();

  const nav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const primary = nav.filter((i) => TABBAR.has(i.to));
  const rest = nav.filter((i) => !TABBAR.has(i.to));
  const toggleTheme = () => setTheme(nextTheme(theme));

  return (
    <div className="shell">
      <Hotkeys />
      <aside className="shell-aside">
        <div className="shell-brand">MRGN board</div>
        <nav className="nav" aria-label="Разделы">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell-user">
          <Avatar name={profile.name} color={profile.color} />
          <span className="name grow" title={profile.email}>
            {profile.name}
          </span>
          <NotificationsBell />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
            Выйти
          </button>
        </div>
        <div className="shell-hint">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            title="Переключить тему"
          >
            Тема: {THEME_LABEL[theme]}
          </button>
          <div>
            <kbd>?</kbd> — горячие клавиши
          </div>
        </div>
      </aside>
      <main className="shell-main">
        {isAdmin && missing.length > 0 ? (
          <div className="alert alert-warning" role="alert">
            <p>
              База отстаёт от кода: не применены миграции {missing.join(', ')}. Выполните их в SQL
              Editor по порядку.
            </p>
          </div>
        ) : null}
        <Suspense fallback={<div className="muted">Загрузка…</div>}>
          <Outlet />
        </Suspense>
      </main>
      <nav className="tabbar" aria-label="Разделы">
        {primary.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tabbar-item">
            {TABBAR_LABEL[item.to] ?? item.label}
          </NavLink>
        ))}
        <MoreMenu items={rest} theme={theme} onTheme={toggleTheme} />
      </nav>
    </div>
  );
}
