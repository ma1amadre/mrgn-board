import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/onest/600.css';
import '@fontsource/onest/700.css';
import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';
import { envError } from './shared/supabase/env';

const root = createRoot(document.getElementById('root')!);

if (envError) {
  root.render(
    <div className="center-screen">
      <div className="card">
        <h3 className="card-title">Приложение не настроено</h3>
        <p className="card-body">{envError}</p>
      </div>
    </div>,
  );
} else {
  // Клиент Supabase создаётся при импорте — грузим приложение только с валидным окружением.
  const { App } = await import('./app/App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
