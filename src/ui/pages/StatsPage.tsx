export function StatsPage() {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
          Estadísticas
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tiempo leído hoy, resumen semanal, racha y libros completados.
        </p>
      </header>
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
        Métricas conectadas al historial de sesiones en el siguiente paso.
      </div>
    </section>
  );
}
