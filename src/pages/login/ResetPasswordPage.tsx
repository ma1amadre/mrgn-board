import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { errorMessage } from '../../shared/api/errors';
import { Field } from '../../shared/ui/Field';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

const MIN_LENGTH = 8;

/** Новый пароль: сюда ведёт ссылка из письма (сессия восстановления) и «Сменить пароль» в профиле. */
export function ResetPasswordPage() {
  const { status, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Новый пароль');

  if (status === 'loading') return <div className="center-screen muted">Загрузка…</div>;
  if (status === 'signedOut') {
    return (
      <div className="center-screen">
        <div className="card">
          <h3 className="card-title">Ссылка не сработала</h3>
          <p className="card-body">
            Она устарела или уже использована. Запросите новую на странице входа.
          </p>
          <div className="card-footer">
            <Link className="btn btn-secondary" to="/login">
              Ко входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Пароль не короче ${MIN_LENGTH} символов.`);
      return;
    }
    if (password !== repeat) {
      setError('Пароли не совпадают.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="card form" onSubmit={onSubmit}>
        <h3 className="card-title">Новый пароль</h3>
        {error ? (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>
          </div>
        ) : null}
        <Field label="Новый пароль" hint={`Не короче ${MIN_LENGTH} символов.`}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Ещё раз">
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить пароль'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
          Выйти без смены
        </button>
      </form>
    </div>
  );
}
