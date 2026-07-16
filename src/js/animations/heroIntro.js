import gsap from 'gsap';
import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'animations/heroIntro.js';

/**
 * Entrada CINEMÁTICA del Hero (sabor elegido por el dev): el fondo hace un
 * "settle" sutil (scale 1.06 → 1) mientras el contenido aparece junto en un
 * fade-up. De paso ENMASCARA el swap de fuente al recargar: el texto nace oculto
 * (CSS bajo `.anim`), así que cuando aparece Poppins ya cargó → sin salto visible.
 *
 * El estado inicial (contenido oculto + fondo acercado) lo fija el CSS bajo
 * `.anim` (solo si hay JS y no se pide menos movimiento) → sin flash y sin
 * atrapar contenido. Se dispara al REVELAR la página: tras cerrar el overlay del
 * video (crossfade) o directo si el overlay no se muestra.
 *
 * Idempotente: si ya se reveló, no re-anima (lo controla el llamador con su flag).
 */
export function playHeroIntro() {
  const hero = $('#hero');
  if (!hero) return;
  const media = $('.hero__media', hero);
  const content = $('.hero__content', hero);

  // Cierra `.anim`: quita el estado inicial del CSS. Se hace SIEMPRE (con o sin
  // animación) para no dejar el Hero atrapado si algo falla.
  const clearAnimFlag = () => document.documentElement.classList.remove('anim');

  // Sin animación (reduced-motion): revela el Hero de una y sal.
  if (prefersReducedMotion()) {
    clearAnimFlag();
    return;
  }

  try {
    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: clearAnimFlag,
    });

    // Fondo: asienta de 1.06 (CSS) a 1. Sin clearProps (dejamos scale:1 inline;
    // si limpiáramos, volvería al 1.06 del CSS mientras `.anim` siga puesto).
    if (media) {
      tl.to(media, { scale: 1, duration: 1.1 }, 0);
    }

    // Contenido: bloque completo en un solo fade-up. autoAlpha casa con el
    // opacity:0 del CSS; clearProps del transform quita la `y` al terminar.
    if (content) {
      tl.fromTo(
        content,
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.9, clearProps: 'transform' },
        0.15,
      );
    }
  } catch (error) {
    // Si la animación falla, revela el Hero a mano (nunca atrapado).
    if (content) gsap.set(content, { clearProps: 'opacity,visibility' });
    if (media) gsap.set(media, { clearProps: 'transform' });
    clearAnimFlag();
    logError(FILE, 'playHeroIntro', error);
  }
}
