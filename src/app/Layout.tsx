import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMissingMigrations } from '../shared/api/migrations';
import { useRealtimeInvalidation } from '../shared/api/realtime';
import { Avatar } from '../shared/ui/Avatar';
import { Menu } from '../shared/ui/Menu';
import { useToast } from '../shared/ui/toastContext';
import { useAuth, useProfile } from './auth/authContext';
import { CommandPalette } from './CommandPalette';
import { Hotkeys } from './Hotkeys';
import { NotificationsBell } from './NotificationsBell';
import { THEME_LABEL, nextTheme, useTheme, type Theme } from './theme';

type NavItem = { to: string; label: string; end?: boolean };

/** Ежедневные разделы — плоским списком; служебные — группой «Настройки», свёрнутой по умолчанию. */
const NAV: NavItem[] = [
  { to: '/', label: 'Обзор', end: true },
  { to: '/board', label: 'Доска' },
  { to: '/my', label: 'Мои задачи' },
  { to: '/clients', label: 'Клиенты' },
  { to: '/deals', label: 'Сделки' },
  { to: '/ideas', label: 'Идеи' },
  { to: '/reports', label: 'Отчёты' },
  { to: '/notifications', label: 'Уведомления' },
];
const SETTINGS_NAV: NavItem[] = [
  { to: '/team', label: 'Команда' },
  { to: '/settings/templates', label: 'Шаблоны' },
  { to: '/archive', label: 'Архив' },
];
const ADMIN_NAV: NavItem[] = [
  { to: '/settings/stages', label: 'Стадии' },
  { to: '/settings/notifications', label: 'Telegram' },
  { to: '/settings/errors', label: 'Ошибки' },
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

  const location = useLocation();
  const navigate = useNavigate();
  const settingsNav = isAdmin ? [...SETTINGS_NAV, ...ADMIN_NAV] : SETTINGS_NAV;
  const nav = [...NAV, ...settingsNav];
  const primary = nav.filter((i) => TABBAR.has(i.to));
  const rest = nav.filter((i) => !TABBAR.has(i.to));
  // Группа раскрыта, пока пользователь внутри одного из её разделов.
  const settingsActive = settingsNav.some((i) => location.pathname.startsWith(i.to));
  // <details open> — неконтролируемый: если группу свернули руками, переход между её разделами
  // не меняет проп, и активный пункт остаётся спрятанным. Раскрываем при каждом таком переходе.
  const groupRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (settingsActive && groupRef.current) groupRef.current.open = true;
  }, [settingsActive, location.pathname]);
  const toggleTheme = () => setTheme(nextTheme(theme));

  return (
    <div className="shell">
      <Hotkeys />
      <CommandPalette />
      <aside className="shell-aside">
        <div className="shell-brand">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          MRGN board
        </div>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
              {item.label}
            </NavLink>
          ))}
          <details ref={groupRef} className="nav-group" open={settingsActive}>
            <summary className="nav-group-title">Настройки</summary>
            {settingsNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
                {item.label}
              </NavLink>
            ))}
          </details>
        </nav>
        <div className="shell-user">
          <div className="shell-user-row">
            {/* Аватар — меню: профиль и тема живут здесь, а не занимают постоянное место в подвале. */}
            <Menu
              label="Меню пользователя"
              triggerClassName="avatar-button"
              trigger={<Avatar name={profile.name} color={profile.color} />}
              items={[
                { key: 'profile', label: 'Профиль', onSelect: () => navigate('/team?edit=me') },
                { key: 'theme', label: `Тема: ${THEME_LABEL[theme]}`, onSelect: toggleTheme },
              ]}
            />
            <span className="name grow" title={profile.email}>
              {profile.name}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              aria-label="Поиск по всему (Ctrl K)"
              title="Поиск по всему · Ctrl K"
              onClick={() => window.dispatchEvent(new Event('open-palette'))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="m16 16 4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <NotificationsBell />
          </div>
          <button
            type="button"
            className="btn btn-secondary shell-logout"
            onClick={() => void signOut()}
          >
            Выйти
          </button>
        </div>
        <div className="shell-hint">
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
