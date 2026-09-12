import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { errorMessage } from '../../shared/api/errors';
import { Field } from '../../shared/ui/Field';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

type Mode = 'signin' | 'reset';

export function LoginPage() {
  const { status, signIn, resetPassword } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(mode === 'reset' ? 'Сброс пароля' : 'Вход');

  if (status === 'signedIn') {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setSent(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSent(false);
  };

  return (
    <div className="center-screen">
      <form className="card form" onSubmit={onSubmit}>
        <h3 className="card-title">{mode === 'reset' ? 'Сброс пароля' : 'MRGN board'}</h3>
        <p className="card-body">
          {mode === 'reset'
            ? 'Пришлём на почту ссылку, по ней можно задать новый пароль.'
            : 'Вход для участников команды. Нет доступа? Напишите администратору: аккаунты выдаёт он.'}
        </p>
        {error ? (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>
          </div>
        ) : null}
        {sent ? (
          <div className="alert alert-success" role="status">
            <p>Если такой аккаунт есть, письмо уже в пути. Проверьте почту, в том числе спам.</p>
          </div>
        ) : null}
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {mode === 'signin' ? (
          <Field label="Пароль">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        ) : null}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || status === 'loading' || sent}
        >
          {mode === 'reset'
            ? busy
              ? 'Отправляем…'
              : 'Отправить ссылку'
            : busy
              ? 'Входим…'
              : 'Войти'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => switchMode(mode === 'reset' ? 'signin' : 'reset')}
        >
          {mode === 'reset' ? 'Назад ко входу' : 'Забыли пароль?'}
        </button>
      </form>
    </div>
  );
}
