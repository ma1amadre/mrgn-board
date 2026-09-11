import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { errorMessage } from '../../shared/api/errors';
import { useAuth } from './authContext';

function Blocked({
  title,
  text,
  onSignOut,
}: {
  title: string;
  text: string;
  onSignOut: () => void;
}) {
  return (
    <div className="center-screen">
      <div className="card">
        <h3 className="card-title">{title}</h3>
        <p className="card-body">{text}</p>
        <div className="card-footer">
          <button type="button" className="btn btn-secondary" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { status, profile, profileError, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <div className="center-screen muted">Загрузка…</div>;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile) {
    return (
      <Blocked
        title="Профиль не найден"
        text={
          profileError
            ? errorMessage(profileError)
            : 'Аккаунт есть, а строки в profiles нет. Обратитесь к администратору.'
        }
        onSignOut={signOut}
      />
    );
  }
  if (!profile.is_active) {
    return (
      <Blocked
        title="Доступ отключён"
        text="Ваш аккаунт деактивирован. Обратитесь к администратору."
        onSignOut={signOut}
      />
    );
  }
  return <Outlet />;
}
