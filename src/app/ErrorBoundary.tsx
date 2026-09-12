import { Component, type ErrorInfo, type ReactNode } from 'react';

type State = { error: Error | null };

/** Ошибка рендера показывает карточку с кнопкой вместо белого экрана. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ошибка рендера', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center-screen">
        <div className="card">
          <h3 className="card-title">Что-то сломалось</h3>
          <p className="card-body">
            Страница не смогла отрисоваться. Перезагрузите её; если повторяется — сообщите
            администратору и назовите, что делали перед этим.
          </p>
          <p className="small muted prewrap">{this.state.error.message}</p>
          <div className="card-footer">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Перезагрузить
            </button>
          </div>
        </div>
      </div>
    );
  }
}
