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
export function initVideoIntro({ onReveal } = {}) {
  try {
    const dialog = $('[data-video-intro]');
    // Sin <dialog> o sin soporte de showModal: revela la página igual (no atrapes).
    if (!dialog || typeof dialog.showModal !== 'function') {
      if (typeof onReveal === 'function') onReveal();
      return;
    }

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
      dialog.classList.remove('is-closing'); // por si venía de un cierre con fundido
      dialog.showModal();
      if (!hasPlayableSource(video)) return;
      video.currentTime = 0;
      video.muted = true;
      safePlay();
    };

    // Revela la página (dispara la entrada del Hero). Solo la PRIMERA vez: las
    // reaperturas de "Repetir video" no la re-animan.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      if (typeof onReveal === 'function') onReveal();
    };

    // Cierre con FUNDIDO: agrega .is-closing (el CSS anima la opacidad del overlay
    // y su ::backdrop) y cierra el <dialog> al terminar la transición. Revela el
    // Hero al ARRANCAR el fundido → crossfade (el Hero entra mientras el overlay
    // sale). Con reduced-motion: cierre directo (el CSS no anima).
    const closeWithFade = () => {
      if (!dialog.open) return;
      if (prefersReducedMotion()) {
        dialog.close();
        return;
      }
      reveal();
      dialog.classList.add('is-closing');
      const onEnd = (event) => {
        if (event.target !== dialog || event.propertyName !== 'opacity') return;
        dialog.removeEventListener('transitionend', onEnd);
        dialog.close();
      };
      dialog.addEventListener('transitionend', onEnd);
    };

    // Todas las rutas de cierre pasan por dialog.close() → este handler limpia y
    // asegura que la página quede revelada (cubre ESC/error/cierres directos).
    dialog.addEventListener('close', () => {
      dialog.classList.remove('is-closing');
      if (video) video.pause();
      setFlag(STORAGE_KEYS.INTRO_SEEN, true);
      reveal();
    });

    // "Ver fenómeno": el audio es opt-in y este click es el gesto que lo permite.
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (!video) return;
        video.muted = false;
        safePlay();
      });
    }

    // "Saltar": cierra con fundido.
    if (skipBtn) {
      skipBtn.addEventListener('click', closeWithFade);
    }

    // ESC (evento `cancel` del <dialog>): también con fundido, no corte seco.
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeWithFade();
    });

    // "Repetir video" (Hero): reabre desde 0 a demanda, ignora el flag.
    if (trigger) {
      trigger.addEventListener('click', open);
    }

    if (video) {
      // Al terminar → cierra con fundido y revela la página. Sin loop.
      video.addEventListener('ended', closeWithFade);
      // Si el video falla con el overlay abierto → cierra en silencio.
      video.addEventListener('error', () => {
        if (dialog.open) dialog.close();
      });
    }

    // Autoplay en primera visita: solo si pasa los fallbacks y existe video.
    // Si NO se abre el overlay, se revela la página de una (el Hero entra al load).
    if (
      !getFlag(STORAGE_KEYS.INTRO_SEEN) &&
      shouldAutoplay() &&
      hasPlayableSource(video)
    ) {
      open();
    } else {
      reveal();
    }
  } catch (error) {
    // Ante cualquier error, revela la página (no la dejes tapada/oculta).
    if (typeof onReveal === 'function') onReveal();
    logError(FILE, 'initVideoIntro', error);
  }
}
