import gsap from 'gsap';
import { $, $$ } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'animations/navIndicator.js';
const DESKTOP = '(min-width: 768px)';

/**
 * "Magic line": una sola línea de acento que VIAJA entre los items del nav
 * siguiendo SOLO el estado activo (lo marca nav.js con `aria-current` vía
 * scrollspy). El hover lo dibuja el ::after por-item (CSS, desde el centro);
 * esta línea es exclusivamente el indicador de la sección visible.
 *
 * El movimiento tiene efecto "goma": se estira para cubrir origen + destino y
 * luego se asienta. Solo `transform` (translateX + scaleX sobre base de 1px) →
 * GPU, sin reflow. El guard de reduced-motion vive en initAnimations().
 *
 * Solo desktop: en móvil el menú es un desplegable vertical → fallback al
 * ::after por-item. Desacoplado de nav.js (observa `aria-current`).
 */
export function initNavIndicator() {
  try {
    if (!window.matchMedia(DESKTOP).matches) return;

    const header = $('[data-site-header]');
    const menu = header && $('.site-nav__menu', header);
    if (!menu) return;

    const links = $$('.site-nav__link', menu);
    if (!links.length) return;

    const indicator = document.createElement('span');
    indicator.className = 'site-nav__indicator';
    indicator.setAttribute('aria-hidden', 'true');
    menu.appendChild(indicator);
    gsap.set(indicator, { autoAlpha: 0, x: 0, scaleX: 0 });

    header.dataset.indicator = 'on';

    let drawn = null; // link activo dibujado por la línea (o null = oculta)
    let tween = null;

    const targetFor = (link) =>
      link ? { x: link.offsetLeft, w: link.offsetWidth } : null;

    // Alinea la magic line a la MISMA altura que el ::after del hover, leyendo
    // su geometría real (no a ojo): así coinciden al pixel y parecen una sola
    // línea cuando se sobreponen. El ::after se ancla al link y la magic line al
    // <ul>; este cálculo salva cualquier diferencia de referencia.
    const alignVertically = () => {
      const ref = links[0];
      if (!ref) return;
      const afterBottom = parseFloat(getComputedStyle(ref, '::after').bottom) || 0;
      // Y del borde inferior del ::after relativo al <ul>:
      const underlineBottom = ref.offsetTop + ref.offsetHeight - afterBottom;
      indicator.style.bottom = `${menu.clientHeight - underlineBottom}px`;
    };
    alignVertically();

    const moveTo = (link, { animate = true } = {}) => {
      if (animate && link === drawn) return;

      const target = targetFor(link);
      if (tween) tween.kill();

      if (!target) {
        tween = gsap.to(indicator, { autoAlpha: 0, duration: 0.3 });
        drawn = null;
        return;
      }

      const wasHidden = drawn === null;
      drawn = link;

      if (!animate || wasHidden) {
        // Aparición / reposición: se coloca sin viajar y aparece.
        gsap.set(indicator, { x: target.x, scaleX: target.w });
        tween = gsap.to(indicator, { autoAlpha: 1, duration: 0.25 });
        return;
      }

      // Viaje continuo hacia el destino, SIN estirón. Un tween corto que se
      // redirige con cada cambio de sección (`overwrite`): en saltos largos el
      // scrollspy marca las secciones intermedias y la línea las va barriendo
      // de forma fluida, sobreponiéndose a la línea de hover de cada item.
      tween = gsap.to(indicator, {
        x: target.x,
        scaleX: target.w,
        duration: 0.4,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    const activeLink = () =>
      links.find((link) => link.getAttribute('aria-current') === 'true') || null;

    // El Hero no tiene item en el nav. El scrollspy deja "pegado" el último
    // activo al subir de regreso, así que detectamos el Hero por separado (misma
    // banda que el scrollspy) y, mientras estemos en él, la línea no se dibuja.
    const hero = $('#hero');
    let inHero = Boolean(hero); // al cargar arrancamos arriba (en el Hero)

    const currentTarget = () => (inHero ? null : activeLink());

    if (hero) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            inHero = entry.isIntersecting;
          });
          moveTo(currentTarget());
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
      );
      heroObserver.observe(hero);
    }

    // Posición inicial según el estado actual (sin viajar).
    moveTo(currentTarget(), { animate: false });

    // Las métricas del nav cambian cuando Poppins termina de cargar → recalcular.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        alignVertically();
        moveTo(currentTarget(), { animate: false });
      });
    }

    // Reacciona a los cambios de sección activa (los marca nav.js).
    const observer = new MutationObserver(() => moveTo(currentTarget()));
    links.forEach((link) =>
      observer.observe(link, { attributes: true, attributeFilter: ['aria-current'] })
    );

    // Reposicionar sin animar al cambiar el tamaño (los items se recolocan).
    window.addEventListener(
      'resize',
      () => {
        alignVertically();
        moveTo(currentTarget(), { animate: false });
      },
      { passive: true }
    );
  } catch (error) {
    logError(FILE, 'initNavIndicator', error);
  }
}
