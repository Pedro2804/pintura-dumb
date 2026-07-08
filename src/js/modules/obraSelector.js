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

    const wrap = (index) => (index + obras.length) % obras.length;
    const reduced = prefersReducedMotion();
    let current = -1;
    let lastEntrance = -1;

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

      if (nameEl) nameEl.textContent = obra.nombre;
      if (metaEl) metaEl.textContent = buildMeta(obra);

      const isInitial = current < 0;
      current = i;

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

    // --- Eventos ---
    // Clic en una miniatura → la muestra en el escenario.
    thumbsContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-obra-thumb]');
      if (!button || !thumbsContainer.contains(button)) return;
      select(Number(button.dataset.obraIndex));
    });

    // Flechas: ciclan (wrap-around).
    prevBtn?.addEventListener('click', () => select(current - 1));
    nextBtn?.addEventListener('click', () => select(current + 1));

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
      // El foco SIGUE a la obra activa: si no, se quedaba en la miniatura que se
      // clicó con el mouse y el anillo de teclado aparecía HUÉRFANO sobre una
      // obra que ya no es la mostrada. `preventScroll` evita saltos de página.
      buttons[current]?.focus({ preventScroll: true });
    });

    // --- Estado inicial: la obra inicial nace en el escenario (sin entrada). ---
    select(wrap(initialIndex));
  } catch (error) {
    logError(FILE, 'initObraSelector', error);
  }
}
