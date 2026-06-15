import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { STORAGE_KEYS, getFlag, setFlag } from '../utils/storage.js';

const FILE = 'videoIntro.js';

/**
 * ¿Se debe autoreproducir en la primera visita?
 * NO si: movimiento reducido, móvil (<768px) o conexión lenta (2g/slow-2g).
 * En esos casos el ritual queda disponible bajo demanda vía "Repetir video".
 */
function shouldAutoplay() {
  if (prefersReducedMotion()) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;

  const connection = navigator.connection;
  if (connection && /(^|-)2g$/.test(connection.effectiveType || '')) return false;

  return true;
}

/** ¿El <video> tiene una fuente reproducible? */
function hasPlayableSource(video) {
  return Boolean(video && (video.currentSrc || video.getAttribute('src') || video.querySelector('source')));
}

/**
 * Ritual de video de Pintura dump.
 * Usa <dialog> nativo: showModal() aporta focus-trap y cierre con Escape.
 *
 * Flujo (PLAN — COMPORTAMIENTO DEL RITUAL DE VIDEO):
 *  - Overlay previo al Hero. En desktop capaz autoplay MUTED en la 1ª visita.
 *  - "Ver fenómeno"  → activa el audio (opt-in por gesto del usuario) y reproduce.
 *  - "Saltar"        → cierra el overlay y revela la página.
 *  - El video termina → cierra. El video falla → cierra en silencio.
 *  - "Repetir video" (Hero) → reabre y reproduce desde 0.
 *  - Persistencia: flag en localStorage (se ve una vez por dispositivo).
 */
export function initVideoIntro() {
  try {
    const dialog = $('[data-video-intro]');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    const video = $('[data-video-intro-video]', dialog);
    const startBtn = $('[data-video-intro-start]', dialog);
    const skipBtn = $('[data-video-intro-skip]', dialog);
    const trigger = $('[data-video-intro-trigger]');

    // play() devuelve una promesa que el navegador puede rechazar (autoplay
    // bloqueado): la atrapamos para no romper nada ni molestar al usuario.
    const safePlay = () => {
      if (!video) return;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch((error) => logError(FILE, 'safePlay', error));
      }
    };

    // Abre el overlay y arranca el video MUTED desde el inicio.
    const open = () => {
      if (dialog.open) return;
      dialog.showModal();
      if (!hasPlayableSource(video)) return;
      video.currentTime = 0;
      video.muted = true;
      safePlay();
    };

    // Todas las rutas de cierre pasan por dialog.close() → este handler limpia.
    dialog.addEventListener('close', () => {
      if (video) video.pause();
      setFlag(STORAGE_KEYS.INTRO_SEEN, true);
    });

    // "Ver fenómeno": el audio es opt-in y este click es el gesto que lo permite.
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (!video) return;
        video.muted = false;
        safePlay();
      });
    }

    // "Saltar": cierra sin más.
    if (skipBtn) {
      skipBtn.addEventListener('click', () => dialog.close());
    }

    // "Repetir video" (Hero): reabre desde 0 a demanda, ignora el flag.
    if (trigger) {
      trigger.addEventListener('click', open);
    }

    if (video) {
      // Al terminar → revela la página. Sin loop (debe terminar).
      video.addEventListener('ended', () => dialog.close());
      // Si el video falla con el overlay abierto → cierra en silencio.
      video.addEventListener('error', () => {
        if (dialog.open) dialog.close();
      });
    }

    // Autoplay en primera visita: solo si pasa los fallbacks y existe video.
    if (
      !getFlag(STORAGE_KEYS.INTRO_SEEN) &&
      shouldAutoplay() &&
      hasPlayableSource(video)
    ) {
      open();
    }
  } catch (error) {
    logError(FILE, 'initVideoIntro', error);
  }
}
