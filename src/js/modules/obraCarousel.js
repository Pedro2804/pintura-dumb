import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { $, $$, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { buildThumb, buildStageAlt, buildMeta } from '../utils/obras.js';

const FILE = 'obraCarousel.js';

// Copias del juego de obras renderadas en fila. Con 3 copias siempre hay
// vecinos a ambos lados del centro (loop sin huecos). Operamos en la copia
// del MEDIO; al salirnos de su rango re-centramos a la copia equivalente
// (visualmente idéntica → sin salto).
const COPIES = 3;

// Tempo del cross-fade de la obra grande (escenario). Salida rápida + entrada
// más lenta: la disolvencia debe SENTIRSE, no parpadear. Tempo local (mismo
// criterio que obraSelector.js de Dump → no acoplar a animations/index.js).
const STAGE_FADE_OUT = 0.22;
const STAGE_FADE_IN = 0.45;
const STAGE_EASE = 'power2.out';

// Tempo del viaje del carrusel por flecha/clic/teclado (el arrastre lo maneja
// la inercia de Draggable, no esto).
const SETTLE_DUR = 0.5;
const SETTLE_EASE = 'power3.out';

let pluginsRegistered = false;

/**
 * Carrusel coverflow de obras (sección Trayectoria).
 *
 * Motor por `transform: x` controlado con GSAP → loop infinito real, el activo
 * SIEMPRE centrado con vecinos a los lados, mismo mecanismo en desktop (3
 * visibles) y móvil (1 visible). El arrastre lo lleva **GSAP Draggable +
 * InertiaPlugin**: se suelta con envión, desacelera natural y cae (snap) en la
 * miniatura más cercana — no siempre a la de junto. El escenario (obra grande)
 * hace cross-fade a la miniatura central al asentarse.
 *
 * Estado encapsulado por instancia → independiente de Dump.
 *
 * @param {Object}        config
 * @param {string|Element} config.section        Selector CSS o nodo de la <section>.
 * @param {Array}         config.obras           Array de obras.
 * @param {number}        [config.initialIndex=0]
 */
export function initObraCarousel({ section, obras, initialIndex = 0 } = {}) {
  try {
    const root = typeof section === 'string' ? $(section) : section;
    if (!root) return;
    const total = Array.isArray(obras) ? obras.length : 0;
    if (total === 0) return;

    const track = $('[data-obra-thumbs]', root);
    const viewport = track ? track.closest('[data-obra-viewport]') : null;
    const stageImage = $('[data-obra-image]', root);
    const nameEl = $('[data-obra-name]', root);
    const metaEl = $('[data-obra-meta]', root);
    const prevBtn = $('[data-obra-prev]', root);
    const nextBtn = $('[data-obra-next]', root);

    if (!track || !viewport) return;

    if (!pluginsRegistered) {
      gsap.registerPlugin(Draggable, InertiaPlugin);
      pluginsRegistered = true;
    }

    // --- Render: COPIES juegos seguidos (buffer para el loop) ---
    const fragment = document.createDocumentFragment();
    for (let copy = 0; copy < COPIES; copy += 1) {
      obras.forEach((obra, i) => fragment.append(buildThumb(obra, i)));
    }
    track.replaceChildren(fragment);

    // Las miniaturas son afordancia visual: la experiencia accesible es
    // «flechas + región viva del escenario». Se sacan del orden de tabulación
    // y del árbol de accesibilidad (evita anunciar las obras 3 veces).
    track.setAttribute('aria-hidden', 'true');
    const buttons = $$('[data-obra-thumb]', track);
    buttons.forEach((button) => {
      button.tabIndex = -1;
    });
    const items = buttons.map((button) => button.closest('li'));

    const reduced = prefersReducedMotion();
    const logicalOf = (position) => ((position % total) + total) % total;

    // --- Estado ---
    let pos = total + clampInitial(initialIndex, total); // copia del medio
    let draggable = null;

    // --- Geometría de la pista ---
    // Las miniaturas son uniformes (mismo ancho + gap), así que la posición x
    // que centra una miniatura es LINEAL: xForPos(p) = origin − p·step. Eso hace
    // que ir de px → índice (y al revés) sea aritmética simple y estable.
    let step = 0; // distancia entre centros de miniaturas consecutivas
    let originX = 0; // x que centra la miniatura de índice 0
    const measure = () => {
      step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth;
      originX = viewport.clientWidth / 2 - (items[0].offsetLeft + items[0].offsetWidth / 2);
    };
    const xForPos = (p) => originX - p * step;
    const posForX = (x) => Math.round((originX - x) / step);

    const setActive = (position) => {
      buttons.forEach((button, i) => {
        if (i === position) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    };

    // Aplica la obra al escenario SIN animar (cambia src, alt, dimensiones y ficha).
    const swapStage = (obra) => {
      stageImage.src = obra.src;
      stageImage.alt = buildStageAlt(obra);
      if (obra.width) stageImage.width = obra.width;
      if (obra.height) stageImage.height = obra.height;
      if (nameEl) nameEl.textContent = obra.nombre;
      if (metaEl) metaEl.textContent = buildMeta(obra);
    };

    // Token anti-carrera: si el usuario cambia de obra antes de que termine la
    // transición (clics/flechas rápidas), solo la ÚLTIMA petición pinta.
    let stageReq = 0;

    // Cross-fade del escenario: la obra actual se disuelve (opacity→0) y, cuando
    // la nueva YA está precargada (sin flash vacío), entra (opacity→1). El swap
    // ocurre en opacity 0 → el cambio se ve suave, no brusco.
    const updateStage = (logical, animate) => {
      const obra = obras[logical];

      // Colocación inicial o reduced-motion → cambio directo, sin disolvencia.
      if (!animate || reduced) {
        gsap.killTweensOf(stageImage);
        swapStage(obra);
        gsap.set(stageImage, { opacity: 1 });
        return;
      }

      const req = (stageReq += 1);
      gsap.killTweensOf(stageImage);

      // El swap+entrada solo procede cuando AMBOS terminan: el fade-out y la
      // precarga de la nueva imagen. Así nunca se ve un hueco ni una a medio cargar.
      let fadedOut = false;
      let preloaded = false;
      const commit = () => {
        if (!fadedOut || !preloaded || req !== stageReq) return;
        swapStage(obra);
        gsap.to(stageImage, { opacity: 1, duration: STAGE_FADE_IN, ease: STAGE_EASE });
      };

      gsap.to(stageImage, {
        opacity: 0,
        duration: STAGE_FADE_OUT,
        ease: 'power1.in',
        onComplete: () => {
          fadedOut = true;
          commit();
        },
      });

      const preload = new Image();
      preload.onload = preload.onerror = () => {
        preloaded = true;
        commit();
      };
      preload.src = obra.src;
      if (preload.complete) preloaded = true; // ya cacheada: no esperamos onload
    };

    // Re-centra `pos` a la copia del MEDIO si se salió de su rango. La copia
    // equivalente luce idéntica y su x coincide salvo un múltiplo de copias →
    // el reposicionamiento instantáneo es imperceptible (la pieza del loop).
    const recenter = () => {
      if (pos < total || pos >= 2 * total) {
        pos = total + logicalOf(pos);
        gsap.set(track, { x: xForPos(pos) });
        setActive(pos);
        draggable && draggable.update();
      }
    };

    // Coverflow visual mientras la pista se mueve (arrastre/inercia): marca la
    // miniatura central según la x en vivo. Es solo CSS (borde + escala) → barato;
    // la obra grande NO se toca aquí (su cross-fade es al asentar).
    const syncActive = () => {
      const p = posForX(draggable.x);
      if (p !== pos) {
        pos = p;
        setActive(p);
      }
    };

    // Viaje programático (flecha / clic en miniatura / teclado) hasta centrar `p`.
    const goToPos = (p) => {
      pos = p;
      setActive(p);
      updateStage(logicalOf(p), true); // cross-fade de la obra grande al cambiar

      if (reduced) {
        gsap.set(track, { x: xForPos(p) });
        draggable && draggable.update();
        recenter();
        return;
      }

      gsap.to(track, {
        x: xForPos(p),
        duration: SETTLE_DUR,
        ease: SETTLE_EASE,
        overwrite: true, // un nuevo viaje redirige al anterior (sin encimar)
        onUpdate: () => draggable && draggable.update(),
        onComplete: recenter,
      });
    };

    const go = (direction) => goToPos(pos + direction);

    // Al soltar el arrastre (fin de la inercia, o al instante si reduced): fija
    // el centrado exacto, hace cross-fade a la obra final y ordena el buffer.
    const finalizeDrag = (instance) => {
      pos = posForX(instance.x);
      setActive(pos);
      updateStage(logicalOf(pos), true);
      gsap.set(track, { x: xForPos(pos) }); // centrado exacto (sobre todo en reduced)
      instance.update();
      recenter();
    };

    // --- Estado inicial (sin viaje ni disolvencia) ---
    measure();
    gsap.set(track, { x: xForPos(pos) });
    setActive(pos);
    updateStage(logicalOf(pos), false);

    // --- Arrastre con inercia (GSAP Draggable + InertiaPlugin) ---
    draggable = Draggable.create(track, {
      type: 'x',
      inertia: !reduced,
      dragClickables: true, // se puede agarrar desde una miniatura; el clic limpio sigue vivo
      cursor: 'grab',
      activeCursor: 'grabbing',
      // Snap del LANZAMIENTO al centro de la miniatura más cercana al punto donde
      // termina el envión → cae donde lo soltaste (multi-paso), sin rebotes.
      snap: { x: (value) => xForPos(posForX(value)) },
      onPress() {
        gsap.killTweensOf(track); // corta un viaje de flecha en curso para agarre inmediato
      },
      onDragStart() {
        viewport.classList.add('is-dragging'); // cursor: grabbing en toda la zona (CSS)
      },
      onDrag: syncActive,
      onThrowUpdate: syncActive,
      onRelease() {
        viewport.classList.remove('is-dragging');
      },
      onDragEnd() {
        if (reduced) finalizeDrag(this); // sin inercia: asienta al soltar
      },
      onThrowComplete() {
        finalizeDrag(this); // con inercia: asienta al terminar el envión
      },
    })[0];

    // --- Eventos de navegación discreta ---
    prevBtn?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));

    // Clic en una miniatura visible (lateral) → la trae al centro.
    track.addEventListener('click', (event) => {
      const button = event.target.closest('[data-obra-thumb]');
      if (!button || !track.contains(button)) return;
      const index = buttons.indexOf(button);
      if (index !== -1 && index !== pos) goToPos(index);
    });

    // Teclado: ←/→ solo con el foco en una flecha del carrusel.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const active = document.activeElement;
      if (!active || !active.closest('[data-obra-prev],[data-obra-next]')) return;
      event.preventDefault();
      go(event.key === 'ArrowRight' ? 1 : -1);
    });

    // --- Recálculo ante cambios de layout/breakpoint ---
    const reflow = () => {
      measure();
      gsap.set(track, { x: xForPos(pos) });
      draggable && draggable.update();
    };
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(reflow).observe(viewport);
    } else {
      window.addEventListener('resize', reflow, { passive: true });
    }
  } catch (error) {
    logError(FILE, 'initObraCarousel', error);
  }
}

/** Índice inicial saneado al rango [0, total). */
function clampInitial(index, total) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= total) return 0;
  return i;
}
