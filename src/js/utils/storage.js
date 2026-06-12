/**
 * Wrapper seguro alrededor de localStorage.
 * En modo incógnito o con storage bloqueado, falla en silencio
 * (no rompe la página).
 */

const PREFIX = 'pinturaDump_';

export const STORAGE_KEYS = {
  INTRO_SEEN: `${PREFIX}introSeen`,
};

/** Devuelve true solo si la bandera está guardada como 'true'. */
export function getFlag(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/** Guarda una bandera booleana. */
export function setFlag(key, value = true) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage no disponible (incógnito): se ignora */
  }
}
