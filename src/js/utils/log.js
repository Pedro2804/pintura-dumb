/**
 * Logger de desarrollo.
 * Solo emite en entorno de desarrollo (import.meta.env.DEV).
 * En producción es silencioso (regla de manejo de errores del CLAUDE.md).
 *
 * Formato: fecha - archivo@funcion - descripcion_del_error
 */
export function logError(fileName, fnName, error) {
  if (!import.meta.env.DEV) return;

  const description = error instanceof Error ? error.message : String(error);
  console.error(
    `${new Date().toISOString()} - ${fileName}@${fnName} - ${description}`
  );
}
