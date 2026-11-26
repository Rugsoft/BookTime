import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/ui/layouts/AppShell';
import { AddBookPage } from '@/ui/pages/AddBookPage';
import { LibraryPage } from '@/ui/pages/LibraryPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';
import { StatsPage } from '@/ui/pages/StatsPage';
import { TimerPage } from '@/ui/pages/TimerPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TimerPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="add" element={<AddBookPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
