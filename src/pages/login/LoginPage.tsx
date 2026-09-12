import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { errorMessage } from '../../shared/api/errors';
import { Field } from '../../shared/ui/Field';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Вход');

  if (status === 'signedIn') {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="card form" onSubmit={onSubmit}>
        <h3 className="card-title">MRGN board</h3>
        <p className="card-body">
          Вход для участников команды. Нет доступа или забыли пароль? Напишите администратору: он
          выдаёт аккаунты и сбрасывает пароли.
        </p>
        {error ? (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>
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
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || status === 'loading'}
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
