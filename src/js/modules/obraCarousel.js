import { $, $$, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { buildThumb, buildStageAlt, buildMeta } from '../utils/obras.js';

const FILE = 'obraCarousel.js';

// Copias del juego de obras renderadas en fila. Con 3 copias siempre hay
// vecinos a ambos lados del centro (loop sin huecos). Operamos en la copia
// del MEDIO; al salirnos de su rango re-centramos a la copia equivalente
// (visualmente idéntica → sin salto).
const COPIES = 3;
// Fracción del paso (ancho de slot) que hay que arrastrar para cambiar de obra.
const SWIPE_RATIO = 0.2;

/**
 * Carrusel coverflow de obras (sección Trayectoria).
 *
 * Motor por `transform: translateX` (NO scroll nativo) → loop infinito real,
 * el activo SIEMPRE centrado con vecinos a los lados, mismo mecanismo en
 * desktop (3 visibles) y móvil (1 visible con swipe). El escenario (obra
 * grande, en desktop) queda sincronizado con la miniatura central.
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

    // --- Render: COPIES juegos seguidos (buffer para el loop) ---
    const fragment = document.createDocumentFragment();
    for (let copy = 0; copy < COPIES; copy += 1) {
      obras.forEach((obra, i) => fragment.append(buildThumb(obra, i)));
    }
    track.replaceChildren(fragment);

    // Las miniaturas son afordancia visual: el experiencia accesible es
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
    let currentX = 0;

    // Distancia (en px de layout) para que la miniatura `position` quede
    // centrada en el viewport. offsetLeft no se altera por el transform, así
    // que el cálculo es estable en cualquier posición de la pista.
    const centerOffset = (position) => {
      const li = items[position];
      return viewport.clientWidth / 2 - (li.offsetLeft + li.offsetWidth / 2);
    };

    const applyTransform = (position, animate) => {
      currentX = centerOffset(position);
      if (animate && !reduced) {
        track.style.transform = `translateX(${currentX}px)`;
      } else {
        track.style.transition = 'none';
        track.style.transform = `translateX(${currentX}px)`;
        void track.offsetWidth; // fuerza reflow para "soltar" la transición
        track.style.transition = '';
      }
    };

    const setActive = (position) => {
      buttons.forEach((button, i) => {
        if (i === position) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    };

    const updateStage = (logical) => {
      const obra = obras[logical];
      stageImage.src = obra.src;
      stageImage.alt = buildStageAlt(obra);
      if (obra.width) stageImage.width = obra.width;
      if (obra.height) stageImage.height = obra.height;
      if (nameEl) nameEl.textContent = obra.nombre;
      if (metaEl) metaEl.textContent = buildMeta(obra);
    };

    const render = (position, animate) => {
      setActive(position);
      updateStage(logicalOf(position));
      applyTransform(position, animate);
    };

    // Devuelve `pos` a la copia del medio si se salió de su rango. La copia
    // equivalente luce idéntica y su translateX coincide → re-centrar es
    // imperceptible (la pieza del loop infinito).
    const normalize = () => {
      if (pos < total || pos >= 2 * total) {
        pos = total + logicalOf(pos);
        applyTransform(pos, false);
        setActive(pos);
      }
    };

    const go = (direction) => {
      // Arranca SIEMPRE desde la copia del medio (sin salto) → un paso nunca
      // se sale del buffer aunque el usuario pulse rápido.
      normalize();
      pos += direction;
      render(pos, true);
    };

    const goTo = (position) => {
      if (position === pos) return;
      normalize();
      pos = position;
      render(pos, true);
    };

    // --- Eventos ---
    prevBtn?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));

    // Clic en una miniatura visible (lateral) → la trae al centro.
    track.addEventListener('click', (event) => {
      const button = event.target.closest('[data-obra-thumb]');
      if (!button || !track.contains(button)) return;
      const index = buttons.indexOf(button);
      if (index !== -1) goTo(index);
    });

    // Teclado: ←/→ solo con el foco en una flecha del carrusel.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const active = document.activeElement;
      if (!active || !active.closest('[data-obra-prev],[data-obra-next]')) return;
      event.preventDefault();
      go(event.key === 'ArrowRight' ? 1 : -1);
    });

    // Al terminar el deslizamiento, ordena el buffer (caso reposo).
    track.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'transform') normalize();
    });

    bindDrag({ viewport, track, items, getPos: () => pos, getBaseX: () => currentX, go, snapBack: () => render(pos, true), reduced });

    // --- Estado inicial + recálculo ante cambios de layout ---
    render(pos, false);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => applyTransform(pos, false)).observe(viewport);
    } else {
      window.addEventListener('resize', () => applyTransform(pos, false), { passive: true });
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

/**
 * Arrastre horizontal (puntero/touch). Mueve la pista con el dedo y, al
 * soltar, cambia de obra si se superó el umbral; si no, regresa al centro.
 * `touch-action: pan-y` (CSS) deja el scroll vertical de la página intacto.
 */
function bindDrag({ viewport, track, items, getPos, getBaseX, go, snapBack, reduced }) {
  let dragging = false;
  let startX = 0;
  let baseX = 0;

  const onDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    baseX = getBaseX();
    track.style.transition = 'none';
    viewport.setPointerCapture?.(event.pointerId);
  };

  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    track.style.transform = `translateX(${baseX + dx}px)`;
  };

  const onUp = (event) => {
    if (!dragging) return;
    dragging = false;
    if (!reduced) track.style.transition = '';
    const dx = event.clientX - startX;
    const pos = getPos();
    const step = items[pos].offsetWidth; // ancho de una miniatura ≈ un paso
    const threshold = step * SWIPE_RATIO;
    if (dx <= -threshold) go(1);
    else if (dx >= threshold) go(-1);
    else snapBack();
  };

  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
}
