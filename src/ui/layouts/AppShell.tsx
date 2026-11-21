import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  applyAtmosphereToDocument,
  useAtmosphereStore,
} from '@/state/useAtmosphereStore';

const NAV_ITEMS = [
  { to: '/', label: 'Temporizador', mobileLabel: 'Timer', icon: 'timer' },
  { to: '/library', label: 'Biblioteca', mobileLabel: 'Biblioteca', icon: 'library_books' },
  { to: '/stats', label: 'Estadísticas', mobileLabel: 'Stats', icon: 'bar_chart' },
] as const;

export function AppShell() {
  const atmosphere = useAtmosphereStore((s) => s.atmosphere);

  useEffect(() => {
    applyAtmosphereToDocument(atmosphere);
  }, [atmosphere]);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      {/* Desktop persistent left rail (Stitch: 256px) */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col justify-between border-r border-outline-variant bg-surface-container-low p-6 lg:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              aria-hidden="true"
            >
              menu_book
            </span>
            <div className="flex flex-col">
              <span className="font-headline text-xl font-semibold leading-tight text-on-surface">
                BookTime
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                Lectura local-first
              </span>
            </div>
          </div>

          <nav aria-label="Navegación principal" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-symbols-outlined text-xl"
                      style={
                        isActive
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/add"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              add
            </span>
            <span>Añadir libro</span>
          </Link>
        </div>

        {/* Streak card footer */}
        <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-on-surface-variant">
              Racha actual
            </span>
            <span className="font-headline text-base font-semibold tabular-nums text-tertiary">
              0 días
            </span>
          </div>
          <span
            className="material-symbols-outlined text-2xl text-tertiary"
            aria-hidden="true"
          >
            local_fire_department
          </span>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-xl text-primary"
              aria-hidden="true"
            >
              menu_book
            </span>
            <span className="font-headline text-lg font-semibold text-on-surface">
              BookTime
            </span>
          </div>
          <Link
            to="/add"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            <span>Añadir</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-outline-variant bg-surface-container-low px-2 py-2 lg:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-full px-4 py-1 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-xl"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span>{item.mobileLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
