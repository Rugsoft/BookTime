import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/ui/layouts/AppShell';
import { AddBookPage } from '@/ui/pages/AddBookPage';
import { LibraryPage } from '@/ui/pages/LibraryPage';
import { StatsPage } from '@/ui/pages/StatsPage';
import { TimerPage } from '@/ui/pages/TimerPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TimerPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="add" element={<AddBookPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
