import { Link, useLocation } from 'react-router-dom';
import { PageHead } from '../shared/ui/PageHead';
import { useDocumentTitle } from '../shared/ui/useDocumentTitle';

export function NotFoundPage() {
  const { pathname } = useLocation();
  useDocumentTitle('Страница не найдена');
  return (
    <>
      <PageHead title="Страница не найдена" />
      <p className="muted">
        Адреса <code>{pathname}</code> нет. Возможно, ссылка устарела или в ней опечатка.
      </p>
      <div className="row">
        <Link className="btn btn-secondary" to="/">
          На обзор
        </Link>
        <Link className="btn btn-ghost" to="/board">
          К доске
        </Link>
      </div>
    </>
  );
}
