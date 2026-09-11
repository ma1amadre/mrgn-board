import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';

export function BoardPage() {
  return (
    <>
      <PageHead title="Доска" />
      <EmptyState>Раздел в разработке.</EmptyState>
    </>
  );
}
