import { useRef, useState, type ChangeEvent } from 'react';
import { BackupError, parseBackup, type BookTimeBackup } from '@/domain/backup';
import { db } from '@/infrastructure/db';
import {
  downloadBackup,
  importBackup,
  type ImportMode,
} from '@/infrastructure/backupRepository';
import { useTimerStore } from '@/state/useTimerStore';

interface PendingImport {
  backup: BookTimeBackup;
  fileName: string;
}

interface StatusMessage {
  text: string;
  error: boolean;
}

export function SettingsPage() {
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const { books, sessions } = await downloadBackup();
      setMessage({
        text: `Backup descargado: ${books} ${books === 1 ? 'libro' : 'libros'} y ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}.`,
        error: false,
      });
    } catch {
      setMessage({ text: 'No se pudo generar el backup.', error: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMessage(null);
    setConfirmReplace(false);
    try {
      const backup = parseBackup(await file.text());
      setPending({ backup, fileName: file.name });
    } catch (error) {
      setPending(null);
      setMessage({
        text:
          error instanceof BackupError
            ? error.message
            : 'No se pudo leer el archivo seleccionado.',
        error: true,
      });
    }
  }

  async function handleImport(mode: ImportMode) {
    if (!pending) return;

    setBusy(true);
    setMessage(null);
    try {
      const result = await importBackup(pending.backup, mode);
      const activeBookId = useTimerStore.getState().activeBookId;
      if (activeBookId) {
        const books = await db.books.toArray();
        if (!books.some((book) => book.id === activeBookId)) {
          useTimerStore.getState().selectBook(null);
        }
      }
      setPending(null);
      setConfirmReplace(false);
      setMessage({
        text:
          mode === 'replace'
            ? `Backup restaurado: ${result.books} ${result.books === 1 ? 'libro' : 'libros'} y ${result.sessions} ${result.sessions === 1 ? 'sesión' : 'sesiones'}.`
            : `Importados ${result.books} ${result.books === 1 ? 'libro' : 'libros'} y ${result.sessions} ${result.sessions === 1 ? 'sesión' : 'sesiones'} nuevos (${result.skipped} omitidos).`,
        error: false,
      });
    } catch {
      setMessage({
        text: 'No se pudo importar el backup. No se realizaron cambios.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Preferencias de BookTime
        </p>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
          Ajustes
        </h1>
      </header>

      <article className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined text-2xl text-primary"
            aria-hidden="true"
          >
            backup
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-xl font-semibold text-on-surface">
              Copia de seguridad
            </h2>
            <p className="max-w-2xl text-sm text-on-surface-variant">
              Tus libros y sesiones se guardan solo en este navegador. Exporta un
              archivo JSON para conservarlos o importarlo en otro dispositivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              download
            </span>
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-outline px-4 py-2.5 text-sm font-medium text-on-surface transition-colors duration-150 hover:bg-surface-container disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              upload
            </span>
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="hidden"
            aria-label="Archivo de backup JSON"
          />
        </div>

        {message && (
          <p
            role={message.error ? 'alert' : 'status'}
            className={`text-sm ${message.error ? 'text-error' : 'text-tertiary'}`}
          >
            {message.text}
          </p>
        )}

        {pending && (
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-4">
            <p className="text-sm text-on-surface">
              <span className="font-medium">{pending.fileName}</span>:{' '}
              {pending.backup.books.length}{' '}
              {pending.backup.books.length === 1 ? 'libro' : 'libros'} y{' '}
              {pending.backup.sessions.length}{' '}
              {pending.backup.sessions.length === 1 ? 'sesión' : 'sesiones'}.
            </p>

            {confirmReplace ? (
              <>
                <p className="text-sm font-medium text-error">
                  Esto borrará todos tus libros y sesiones actuales y los
                  sustituirá por los del archivo. No se puede deshacer.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleImport('replace')}
                    disabled={busy}
                    className="rounded-full bg-error px-4 py-2.5 text-sm font-medium text-on-error transition-colors duration-150 disabled:opacity-60"
                  >
                    Confirmar reemplazo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReplace(false)}
                    disabled={busy}
                    className="rounded-full border border-outline px-4 py-2.5 text-sm font-medium text-on-surface"
                  >
                    Volver
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleImport('merge')}
                  disabled={busy}
                  className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container disabled:opacity-60"
                >
                  Fusionar (conservar lo actual)
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReplace(true)}
                  disabled={busy}
                  className="rounded-full border border-outline px-4 py-2.5 text-sm font-medium text-on-surface transition-colors duration-150 hover:bg-surface-container-high"
                >
                  Reemplazar (borrar lo actual)
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={busy}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-on-surface-variant"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
