import '@fontsource/commissioner/400.css';
import '@fontsource/commissioner/500.css';
import '@fontsource/commissioner/600.css';
import '@fontsource/crimson-pro/600.css';
import '@fontsource/crimson-pro/700.css';
import '@fontsource/source-code-pro/500.css';
import '@fontsource/source-code-pro/600.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
