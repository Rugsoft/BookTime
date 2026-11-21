export function LibraryPage() {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
          Biblioteca
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tus libros en lectura y completados aparecerán aquí.
        </p>
      </header>
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
        Pendiente de conectar con Dexie.js en el siguiente paso.
      </div>
    </section>
  );
}
