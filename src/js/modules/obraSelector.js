import gsap from 'gsap';
import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { buildThumb, buildStageAlt, buildMeta } from '../utils/obras.js';

const FILE = 'obraSelector.js';

// Tempo de la entrada de la obra en el escenario. Sobrio, museográfico. Ease
// suave (power2.out, no expo.out que arranca muy seco) y algo más largo para
// que el cambio se sienta gentil (petición del dev).
const DURATION = 0.8;
const EASE = 'power2.out';

// Repertorio de ENTRADAS del escenario. Cada cambio de obra elige UNA al azar
// (decisión del dev: la obra grande "aparece" con animación aleatoria, ya SIN
// la animación de viaje/movimiento del Flip anterior). No se combinan entre sí:
// una sola por cambio. Solo `opacity` + `transform` → sin reflow (regla GSAP).
// Cada entrada es el estado INICIAL (`from`); GSAP anima hacia el natural.
const ENTRANCES = [
  { opacity: 0 }, // fundido puro
  { opacity: 0, y: 28 }, // sube al entrar
  { opacity: 0, y: -28 }, // baja al entrar
  { opacity: 0, scale: 0.94 }, // se acerca
  { opacity: 0, scale: 1.06 }, // se aleja
  { opacity: 0, x: 32 }, // deriva desde la derecha
  { opacity: 0, x: -32 }, // deriva desde la izquierda
];

/**
 * Selector de obras de Dump: GRID 2×2 de miniaturas SIEMPRE visibles + un
 * escenario aparte con la obra completa (sin recorte). La miniatura activa se
 * marca con marco rojo (CSS, vía `aria-current`).
 *
 * Ajuste de cliente (`.ai/ajuste.md` #4 y #5): antes usaba GSAP Flip, donde la
 * miniatura activa VIAJABA al escenario y desaparecía del grid, y el escenario
 * la recortaba (`cover`). El cliente pidió lo contrario: las miniaturas no
 * desaparecen, la activa se distingue por color de marco, y la obra se ve
 * completa. Al volver al `<img>` con `object-fit: contain` el recorte se
 * resuelve solo. La transición de viaje se sustituye por una ENTRADA aleatoria.
 *
 * Progressive enhancement: el HTML aporta el cascarón (grid + `[data-obra-image]`);
 * este módulo lo hidrata. Estado encapsulado por instancia (Dump y Trayectoria
 * no comparten estado).
 *
 * @param {Object}         config
 * @param {string|Element} config.section         Selector CSS o nodo de la <section>.
 * @param {Array}          config.obras           Array de obras (ver src/data/obras-dump.js).
 * @param {number}         [config.initialIndex=0] Obra inicial.
 */
export function initObraSelector({ section, obras, initialIndex = 0 } = {}) {
  try {
    const root = typeof section === 'string' ? $(section) : section;
    if (!root) return;
    if (!Array.isArray(obras) || obras.length === 0) return;

    const thumbsContainer = $('[data-obra-thumbs]', root);
    const stageImg = $('[data-obra-image]', root);
    const stageEl = $('[data-obra-stage]', root);
    const dotsContainer = $('[data-obra-dots]', root);
    const nameEl = $('[data-obra-name]', root);
    const metaEl = $('[data-obra-meta]', root);
    const prevBtn = $('[data-obra-prev]', root);
    const nextBtn = $('[data-obra-next]', root);

    // Sin grid de miniaturas o sin escenario no hay nada que hidratar.
    if (!thumbsContainer || !stageImg) return;

    // --- Miniaturas: TODAS permanecen visibles; la activa la marca el CSS. ---
    const buttons = [];
    const fragment = document.createDocumentFragment();
    obras.forEach((obra, index) => {
      const li = buildThumb(obra, index); // <li><button.works-thumb><img></button></li>
      buttons.push($('.works-thumb', li));
      fragment.append(li);
    });
    thumbsContainer.replaceChildren(fragment);

    // --- Puntos indicadores (visibles en MÓVIL, donde las miniaturas se ocultan):
    //     afordancia de "cuántas obras y en cuál voy". Fuera del tab order
    //     (tabIndex -1) y en un contenedor aria-hidden → la a11y la dan la figura
    //     viva y las flechas (no se anuncian las obras dos veces). ---
    const dots = [];
    if (dotsContainer) {
      const dotsFragment = document.createDocumentFragment();
      obras.forEach((obra, index) => {
        const li = document.createElement('li');
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'works-selector__dot';
        dot.dataset.obraDot = '';
        dot.dataset.obraIndex = String(index);
        dot.tabIndex = -1;
        dot.setAttribute('aria-label', `Ver obra ${index + 1} de ${obras.length}`);
        li.append(dot);
        dots.push(dot);
        dotsFragment.append(li);
      });
      dotsContainer.replaceChildren(dotsFragment);
    }

    const wrap = (index) => (index + obras.length) % obras.length;
    const reduced = prefersReducedMotion();
    let current = -1;
    let lastEntrance = -1;

    // ============================================================
    // TIRA COVERFLOW CON LOOP (solo TABLET) — motor por transform
    // Se renderizan STRIP_COPIES juegos seguidos de miniaturas para que la
    // activa SIEMPRE tenga vecinos a los lados → el wrap (última→primera) es un
    // paso corto, no un viaje largo. La activa se centra con translateX
    // (transición CSS = deslizamiento suave). Al ACABAR la transición, si la
    // posición se acerca a un extremo se re-centra a la copia del medio en seco:
    // como las copias son idénticas, el salto es imperceptible. Es una tira
    // DEDICADA (.dump__strip), separada del 2×2; oculta salvo en tablet, por eso
    // se mide/posiciona cuando el viewport adquiere tamaño (ResizeObserver).
    // ============================================================
    const stripViewport = $('[data-obra-strip-viewport]', root);
    const stripTrack = $('[data-obra-strip]', root);
    const STRIP_COPIES = 5;
    const stripButtons = [];
    let stripItems = [];
    let stripStep = 0;
    let stripOrigin = 0;
    let stripPos = 0;

    if (stripViewport && stripTrack) {
      const stripFrag = document.createDocumentFragment();
      for (let copy = 0; copy < STRIP_COPIES; copy += 1) {
        obras.forEach((obra, index) => {
          const li = buildThumb(obra, index);
          const button = li.querySelector('.works-thumb');
          if (button) {
            button.tabIndex = -1; // afordancia visual; la a11y la dan las flechas
            stripButtons.push(button);
          }
          stripFrag.append(li);
        });
      }
      stripTrack.replaceChildren(stripFrag);
      stripItems = stripButtons.map((button) => button.closest('li'));
      stripPos = Math.floor(STRIP_COPIES / 2) * obras.length; // arranca en la copia del medio
    }

    const stripLogicalOf = (p) => ((p % obras.length) + obras.length) % obras.length;
    const stripX = (p) => stripOrigin - p * stripStep;

    const measureStrip = () => {
      if (!stripViewport || stripItems.length < 2) return;
      stripStep = stripItems[1].offsetLeft - stripItems[0].offsetLeft;
      stripOrigin =
        stripViewport.clientWidth / 2 -
        (stripItems[0].offsetLeft + stripItems[0].offsetWidth / 2);
    };

    // Aplica el transform. `animate:false` = sin transición (posicionar/recentrar):
    // se quita la transición, se mueve y se restaura tras un reflow para que el
    // PRÓXIMO cambio sí anime.
    const setStripTransform = (animate) => {
      if (!stripTrack) return;
      if (animate) {
        stripTrack.style.transform = `translateX(${stripX(stripPos)}px)`;
        return;
      }
      stripTrack.style.transition = 'none';
      stripTrack.style.transform = `translateX(${stripX(stripPos)}px)`;
      void stripTrack.offsetWidth;
      stripTrack.style.transition = '';
    };

    const markStrip = () => {
      if (!stripButtons.length) return;
      stripButtons.forEach((button) => button.removeAttribute('aria-current'));
      const idx =
        ((stripPos % stripButtons.length) + stripButtons.length) % stripButtons.length;
      stripButtons[idx]?.setAttribute('aria-current', 'true');
    };

    // Distancia con signo más CORTA en el anillo → el wrap es un paso corto.
    const ringDelta = (from, to) => {
      const n = obras.length;
      let d = (to - from) % n;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    };

    // Re-centra a la copia del medio si la posición se acerca a un extremo (deja
    // buffer a ambos lados). El destino es una copia idéntica → imperceptible.
    const recenterStrip = () => {
      if (!stripButtons.length || !stripStep) return;
      const mid = Math.floor(STRIP_COPIES / 2) * obras.length;
      if (stripPos < obras.length || stripPos >= stripButtons.length - obras.length) {
        stripPos = mid + stripLogicalOf(stripPos);
        setStripTransform(false);
        markStrip();
      }
    };

    const centerStrip = (logical, animate) => {
      if (!stripTrack || !stripStep) return; // aún no medido / no visible (no-tablet)
      stripPos += ringDelta(stripLogicalOf(stripPos), logical);
      setStripTransform(animate && !reduced);
      markStrip();
    };

    // El re-centrado se hace al TERMINAR el deslizamiento (no a media animación,
    // que cortaría el movimiento).
    stripTrack?.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'transform') recenterStrip();
    });

    // Mide y posiciona cuando el viewport adquiere tamaño (al hacerse visible en
    // tablet o al cambiar el ancho) y sincroniza con la obra actual.
    if (stripViewport && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        measureStrip();
        if (stripStep && current >= 0) centerStrip(current, false);
      }).observe(stripViewport);
    }

    // Elige una entrada al azar SIN repetir la anterior (más variedad percibida).
    const pickEntrance = () => {
      let idx;
      do {
        idx = Math.floor(Math.random() * ENTRANCES.length);
      } while (ENTRANCES.length > 1 && idx === lastEntrance);
      lastEntrance = idx;
      return ENTRANCES[idx];
    };

    // Vuelca los datos de la obra al escenario (src/alt/ficha + dimensiones anti-CLS).
    const paintStage = (obra) => {
      stageImg.src = obra.src;
      stageImg.alt = buildStageAlt(obra);
      if (obra.width) stageImg.width = obra.width;
      if (obra.height) stageImg.height = obra.height;
    };

    const select = (index) => {
      const i = wrap(index);
      if (i === current) return;
      const obra = obras[i];

      // Marca de obra activa (marco rojo por CSS) + a11y.
      buttons.forEach((button) => button.removeAttribute('aria-current'));
      buttons[i].setAttribute('aria-current', 'true');

      // Punto activo (rojo por CSS) en sincronía con la obra.
      dots.forEach((dot) => dot.removeAttribute('aria-current'));
      dots[i]?.setAttribute('aria-current', 'true');

      if (nameEl) nameEl.textContent = obra.nombre;
      if (metaEl) metaEl.textContent = buildMeta(obra);

      const isInitial = current < 0;
      current = i;

      // TIRA coverflow (tablet): centra la copia de la obra activa deslizándola
      // (loop). No-op en teléfono/desktop (la tira no está medida/visible).
      centerStrip(i, !isInitial);

      paintStage(obra);

      // La colocación inicial y `prefers-reduced-motion` van SIN entrada: el
      // escenario nace con la obra puesta. La miniatura ya trae la imagen en
      // caché (mismo `src`) → el swap es instantáneo, sin parpadeo.
      if (isInitial || reduced) return;

      // Entrada aleatoria del repertorio (una sola, no combinada). `overwrite`
      // evita solapes si el usuario cambia de obra a media animación.
      const from = pickEntrance();
      gsap.fromTo(
        stageImg,
        from,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: DURATION,
          ease: EASE,
          overwrite: 'auto',
          clearProps: 'transform',
        },
      );
    };

    // --- Autoplay: la obra avanza SOLA cada AUTOPLAY_MS. Se PAUSA con el mouse
    //     encima, al enfocar un control (teclado) o con la pestaña oculta, y se
    //     REINICIA el conteo tras navegar a mano (para no saltar de inmediato).
    //     Respeta prefers-reduced-motion (sin autoplay). ---
    const AUTOPLAY_MS = 5000;
    const canAutoplay = !reduced && obras.length > 1;
    let hovering = false;
    let focused = false;
    let autoplayId = null;
    const scheduleAutoplay = () => {
      if (autoplayId) {
        clearInterval(autoplayId);
        autoplayId = null;
      }
      if (!canAutoplay || hovering || focused || document.hidden) return;
      autoplayId = window.setInterval(() => select(current + 1), AUTOPLAY_MS);
    };

    // mouseenter/leave son SOLO de mouse (no disparan en táctil) → el hover-pausa
    // no interfiere en móvil. focusin/out cubren el teclado.
    root.addEventListener('mouseenter', () => {
      hovering = true;
      scheduleAutoplay();
    });
    root.addEventListener('mouseleave', () => {
      hovering = false;
      scheduleAutoplay();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      scheduleAutoplay();
    });
    root.addEventListener('focusout', () => {
      focused = false;
      scheduleAutoplay();
    });
    document.addEventListener('visibilitychange', scheduleAutoplay);

    // --- Eventos ---
    // Clic en una miniatura → la muestra en el escenario.
    thumbsContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-obra-thumb]');
      if (!button || !thumbsContainer.contains(button)) return;
      select(Number(button.dataset.obraIndex));
      scheduleAutoplay();
    });

    // Clic en un punto → va directo a esa obra (y reinicia el autoplay).
    dotsContainer?.addEventListener('click', (event) => {
      const dot = event.target.closest('[data-obra-dot]');
      if (!dot || !dotsContainer.contains(dot)) return;
      select(Number(dot.dataset.obraIndex));
      scheduleAutoplay();
    });

    // Flechas: ciclan (wrap-around) y reinician el conteo del autoplay.
    prevBtn?.addEventListener('click', () => {
      select(current - 1);
      scheduleAutoplay();
    });
    nextBtn?.addEventListener('click', () => {
      select(current + 1);
      scheduleAutoplay();
    });

    // Teclado: ←/→ solo cuando el foco está en un control del selector,
    // para no secuestrar las flechas del resto de la página.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const active = document.activeElement;
      if (!active || !active.closest('[data-obra-thumb],[data-obra-prev],[data-obra-next]')) {
        return;
      }
      event.preventDefault();
      select(event.key === 'ArrowRight' ? current + 1 : current - 1);
      scheduleAutoplay(); // reinicia el conteo tras navegar con teclado
      // El foco SIGUE a la obra activa: si no, se quedaba en la miniatura que se
      // clicó con el mouse y el anillo de teclado aparecía HUÉRFANO sobre una
      // obra que ya no es la mostrada. `preventScroll` evita saltos de página.
      buttons[current]?.focus({ preventScroll: true });
    });

    // --- Swipe táctil sobre la obra (MÓVIL, sin miniaturas): deslizar cambia de
    //     pintura, la forma natural de navegar cuando no hay miniaturas. Solo
    //     gestos táctiles/lápiz (el mouse usa flechas/miniaturas) y solo
    //     horizontales claros → el scroll vertical de la página sigue vivo
    //     (apoyado por `touch-action: pan-y` en CSS). ---
    if (stageEl && typeof window !== 'undefined' && window.PointerEvent) {
      const SWIPE_MIN = 40; // px: umbral para contar como swipe (no un toque)
      let startX = 0;
      let startY = 0;
      let swiping = false;

      stageEl.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse') return;
        startX = event.clientX;
        startY = event.clientY;
        swiping = true;
      });

      stageEl.addEventListener('pointerup', (event) => {
        if (!swiping) return;
        swiping = false;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        // Gesto horizontal claro (no una deriva de scroll vertical).
        if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
        select(dx < 0 ? current + 1 : current - 1); // izq→siguiente, der→anterior
        scheduleAutoplay(); // reinicia el conteo tras el swipe
      });

      stageEl.addEventListener('pointercancel', () => {
        swiping = false;
      });
    }

    // --- Estado inicial: la obra inicial nace en el escenario (sin entrada). ---
    select(wrap(initialIndex));

    // Arranca el autoplay (no-op si reduced-motion / 1 sola obra / pestaña oculta).
    scheduleAutoplay();
  } catch (error) {
    logError(FILE, 'initObraSelector', error);
  }
}
