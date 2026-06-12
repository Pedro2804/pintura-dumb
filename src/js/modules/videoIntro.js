import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { STORAGE_KEYS, getFlag, setFlag } from '../utils/storage.js';

const FILE = 'videoIntro.js';

/**
 * ¿Se debe autoreproducir en la primera visita?
 * NO si: movimiento reducido, móvil (<768px) o conexión lenta (2g/slow-2g).
 * (ver nota para el cliente en PLAN.md — RNF-3)
 */
function shouldAutoplay() {
  if (prefersReducedMotion()) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;

  const connection = navigator.connection;
  if (connection && /(^|-)2g$/.test(connection.effectiveType || '')) return false;

  return true;
}

/** ¿El <video> tiene una fuente reproducible? (hoy aún no: bloqueado por material del cliente) */
function hasPlayableSource(video) {
  return Boolean(video && (video.currentSrc || video.querySelector('source')));
}

/**
 * Video intro del artista.
 * Usa <dialog> nativo: showModal() aporta focus-trap y cierre con Escape.
 */
export function initVideoIntro() {
  try {
    const dialog = $('[data-video-intro]');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    const video = $('[data-video-intro-video]', dialog);
    const closeBtn = $('[data-video-intro-close]', dialog);
    const unmuteBtn = $('[data-video-intro-unmute]', dialog);
    const trigger = $('[data-video-intro-trigger]');

    const open = () => {
      if (dialog.open) return;
      dialog.showModal();

      if (hasPlayableSource(video)) {
        video.currentTime = 0;
        const playback = video.play();
        if (playback && typeof playback.catch === 'function') {
          // Si el navegador bloquea el play, no rompemos nada.
          playback.catch((error) => logError(FILE, 'open/play', error));
        }
      }
    };

    // Todas las rutas de cierre pasan por dialog.close() → este handler limpia.
    dialog.addEventListener('close', () => {
      if (video) video.pause();
      setFlag(STORAGE_KEYS.INTRO_SEEN, true);
    });

    if (trigger) {
      trigger.addEventListener('click', open);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }

    if (video) {
      video.addEventListener('ended', () => dialog.close());
    }

    // Toggle de audio (aria-pressed = "audio activo")
    if (unmuteBtn && video) {
      const unmuteLabel = $('.visually-hidden', unmuteBtn);

      unmuteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        const audioOn = !video.muted;
        unmuteBtn.setAttribute('aria-pressed', String(audioOn));
        if (unmuteLabel) {
          unmuteLabel.textContent = audioOn ? 'Silenciar audio' : 'Activar audio';
        }
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
