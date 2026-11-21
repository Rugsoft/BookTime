export function AddBookPage() {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
          Añadir libro
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Busca un libro por título o autor, o cárgalo manualmente con el tiempo
          restante de tu e-reader.
        </p>
      </header>
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
        Formulario de alta y búsqueda en API pendiente del siguiente paso.
      </div>
    </section>
  );
}
