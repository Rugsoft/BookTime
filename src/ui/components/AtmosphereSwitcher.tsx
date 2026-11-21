import { ATMOSPHERES } from '@/domain/models';
import { useAtmosphereStore } from '@/state/useAtmosphereStore';

export function AtmosphereSwitcher() {
  const atmosphere = useAtmosphereStore((s) => s.atmosphere);
  const setAtmosphere = useAtmosphereStore((s) => s.setAtmosphere);

  return (
    <div
      role="group"
      aria-label="Selector de atmósfera"
      className="flex flex-wrap items-center gap-2"
    >
      {ATMOSPHERES.map((item) => {
        const isActive = atmosphere === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setAtmosphere(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? 'bg-tertiary text-on-tertiary'
                : 'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
