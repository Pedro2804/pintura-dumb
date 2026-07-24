import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { STORAGE_KEYS, getFlag, setFlag } from '../utils/storage.js';

const FILE = 'videoIntro.js';

/**
 * ¿Se puede AUTOREPRODUCIR el loop muteado de la previsualización?
 * El gate (overlay + botón play) SIEMPRE aparece en la 1ª visita — el video es la
 * entrada a la exposición. Esto solo decide si el loop arranca solo o queda en
 * pausa esperando el play (poster).
 * NO auto-arranca si: movimiento reducido o conexión lenta (2g/slow-2g) — ahí no
 * cargamos ~6MB sin que el usuario lo pida.
 */
function shouldAutoplayPreview() {
  if (prefersReducedMotion()) return false;

  const connection = navigator.connection;
  if (connection && /(^|-)2g$/.test(connection.effectiveType || '')) return false;

  return true;
}

/** ¿El <video> tiene una fuente reproducible? */
function hasPlayableSource(video) {
  return Boolean(video && (video.currentSrc || video.getAttribute('src') || video.querySelector('source')));
}

/**
 * Ritual/gate de video de Pintura dump.
 * Usa <dialog> nativo: showModal() aporta focus-trap y cierre con Escape.
 *
 * Flujo:
 *  PREVIEW (data-state="preview"): video en LOOP MUTEADO como previsualización
 *    infinita, capa azul a pantalla completa y botón "Ver fenómeno" (play) centrado.
 *  "Ver fenómeno" → PLAYING: reinicia desde 0, CON sonido, sin loop; se quita la
 *    capa y el play, aparece la X para saltar.
 *  "Saltar" (X)   → cierra el overlay y revela la página.
 *  El video termina (solo en PLAYING) → cierra. El video falla → cierra en silencio.
 *  "Repetir video" (Hero) → reabre entrando DIRECTO a PLAYING (con sonido desde 0).
 *  Persistencia: flag en localStorage (el gate se ve una vez por dispositivo).
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

    const setState = (state) => {
      dialog.dataset.state = state;
    };

    // play() devuelve una promesa que el navegador puede rechazar (autoplay
    // bloqueado): la atrapamos para no romper nada ni molestar al usuario.
    const safePlay = () => {
      if (!video) return;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch((error) => logError(FILE, 'safePlay', error));
      }
    };

    // Abre el overlay en PREVIEW: loop muteado desde el inicio. En reduced-motion o
    // 2g no auto-arranca (queda el poster esperando el play).
    const openPreview = () => {
      if (dialog.open) return;
      dialog.classList.remove('is-closing'); // por si venía de un cierre con fundido
      setState('preview');
      dialog.showModal();
      // showModal() enfoca el primer elemento focusable (el CTA) y su indicador de
      // foco se vería como si estuviera "activo". Movemos el foco al propio diálogo
      // (tabindex="-1"): el teclado sigue alcanzando el play con Tab.
      dialog.focus();
      if (!hasPlayableSource(video)) return;
      video.loop = true;
      video.muted = true;
      video.currentTime = 0;
      if (shouldAutoplayPreview()) safePlay();
    };

    // Pasa a PLAYING: reproducción real desde 0, CON sonido, sin loop. El click que
    // dispara esto (botón "Ver fenómeno" o "Repetir video") es el gesto de usuario
    // que autoriza el audio.
    const enterPlaying = () => {
      setState('playing');
      if (skipBtn) skipBtn.focus(); // el CTA se ocultó: lleva el foco a la X
      if (!hasPlayableSource(video)) return;
      video.loop = false;
      video.muted = false;
      video.currentTime = 0;
      safePlay();
    };

    // Reabre el overlay entrando DIRECTO a PLAYING ("Repetir video" del Hero).
    const openPlaying = () => {
      if (dialog.open) return;
      dialog.classList.remove('is-closing');
      dialog.showModal();
      enterPlaying();
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
    // Hero al ARRANCAR el fundido → crossfade. Con reduced-motion: cierre directo.
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

    // "Ver fenómeno": entra a la reproducción real (con audio).
    if (startBtn) {
      startBtn.addEventListener('click', enterPlaying);
    }

    // "Saltar" (X): cierra con fundido.
    if (skipBtn) {
      skipBtn.addEventListener('click', closeWithFade);
    }

    // ESC (evento `cancel` del <dialog>): también con fundido, no corte seco.
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeWithFade();
    });

    // "Repetir video" (Hero): reabre directo a PLAYING, ignora el flag.
    if (trigger) {
      trigger.addEventListener('click', openPlaying);
    }

    if (video) {
      // Al terminar → cierra con fundido y revela la página. En PREVIEW el loop
      // está activo, así que `ended` solo dispara en la reproducción real.
      video.addEventListener('ended', closeWithFade);
      // Si el video falla con el overlay abierto → cierra en silencio.
      video.addEventListener('error', () => {
        if (dialog.open) dialog.close();
      });
    }

    // Gate de primera visita: se abre SIEMPRE en preview (el video es la entrada).
    // Si ya se vio o no hay fuente reproducible, revela la página de una.
    if (!getFlag(STORAGE_KEYS.INTRO_SEEN) && hasPlayableSource(video)) {
      openPreview();
    } else {
      reveal();
    }
  } catch (error) {
    // Ante cualquier error, revela la página (no la dejes tapada/oculta).
    if (typeof onReveal === 'function') onReveal();
    logError(FILE, 'initVideoIntro', error);
  }
}
