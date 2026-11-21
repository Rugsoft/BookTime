import { AtmosphereSwitcher } from '@/ui/components/AtmosphereSwitcher';

export function TimerPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Sesión de lectura
        </p>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
          Temporizador activo
        </h1>
        <AtmosphereSwitcher />
      </header>

      <article className="flex flex-col items-center gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <div className="flex h-52 w-52 flex-col items-center justify-center rounded-full border-4 border-outline-variant bg-surface-container-low">
          <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-on-surface lg:text-5xl">
            30:00
          </span>
          <span className="mt-1 text-xs font-medium text-on-surface-variant">
            Meta diaria · Vista base
          </span>
        </div>

        <p className="max-w-md text-sm text-on-surface-variant">
          Shell base y sistema de atmósferas listos. En el siguiente paso
          conectamos el temporizador real por timestamps, la meta diaria y tu
          biblioteca local en IndexedDB.
        </p>
      </article>
    </section>
  );
}
