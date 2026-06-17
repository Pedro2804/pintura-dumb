import { $, $$ } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { buildThumb, buildStageAlt, buildMeta } from '../utils/obras.js';

const FILE = 'obraSelector.js';

/**
 * Selector de obras (grid 2×2 de Dump).
 *
 * Renderiza miniaturas + escenario desde un array de datos (fuente de verdad)
 * y conecta la interacción: clic en miniatura, flechas prev/next y teclado.
 * Progressive enhancement: el HTML aporta solo el cascarón (contenedores con
 * hooks `data-obra-*`); este módulo lo hidrata.
 *
 * Estado encapsulado por instancia → Dump y Trayectoria no comparten estado.
 *
 * @param {Object}        config
 * @param {string|Element} config.section      Selector CSS o nodo de la <section>.
 * @param {Array}         config.obras         Array de obras (ver src/data/obras-dump.js).
 * @param {number}        [config.initialIndex=0] Obra inicial.
 */
export function initObraSelector({ section, obras, initialIndex = 0 } = {}) {
  try {
    const root = typeof section === 'string' ? $(section) : section;
    if (!root) return;
    if (!Array.isArray(obras) || obras.length === 0) return;

    // --- Hooks del DOM (cacheados una vez) ---
    const thumbsContainer = $('[data-obra-thumbs]', root);
    const stageImage = $('[data-obra-image]', root);
    const nameEl = $('[data-obra-name]', root);
    const metaEl = $('[data-obra-meta]', root);
    const prevBtn = $('[data-obra-prev]', root);
    const nextBtn = $('[data-obra-next]', root);

    // Sin contenedor de miniaturas o escenario no hay nada que hidratar.
    if (!thumbsContainer || !stageImage) return;

    // --- Render de miniaturas (una sola vez) ---
    const fragment = document.createDocumentFragment();
    obras.forEach((obra, index) => fragment.append(buildThumb(obra, index)));
    thumbsContainer.replaceChildren(fragment);
    const thumbs = $$('[data-obra-thumb]', thumbsContainer);

    // --- Estado ---
    let current = -1;
    const wrap = (index) => (index + obras.length) % obras.length;

    const render = (index) => {
      const i = wrap(index);
      if (i === current) return;
      current = i;
      const obra = obras[i];

      stageImage.src = obra.src;
      stageImage.alt = buildStageAlt(obra);
      if (obra.width) stageImage.width = obra.width;
      if (obra.height) stageImage.height = obra.height;

      if (nameEl) nameEl.textContent = obra.nombre;
      if (metaEl) metaEl.textContent = buildMeta(obra);

      thumbs.forEach((thumb, ti) => {
        if (ti === i) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      });
    };

    // --- Eventos ---
    // Clic en miniatura (delegado: una sola escucha para todas).
    thumbsContainer.addEventListener('click', (event) => {
      const thumb = event.target.closest('[data-obra-thumb]');
      if (!thumb || !thumbsContainer.contains(thumb)) return;
      render(Number(thumb.dataset.obraIndex));
    });

    // Flechas: ciclan (wrap-around).
    prevBtn?.addEventListener('click', () => render(current - 1));
    nextBtn?.addEventListener('click', () => render(current + 1));

    // Teclado: ←/→ solo cuando el foco está en un control del selector,
    // para no secuestrar las flechas del resto de la página.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const active = document.activeElement;
      if (!active || !active.closest('[data-obra-thumb],[data-obra-prev],[data-obra-next]')) {
        return;
      }
      event.preventDefault();
      render(event.key === 'ArrowRight' ? current + 1 : current - 1);
      // Si navegabas desde una miniatura, el foco sigue a la nueva activa.
      if (active.matches('[data-obra-thumb]')) thumbs[current]?.focus();
    });

    // --- Estado inicial ---
    render(wrap(initialIndex));
  } catch (error) {
    logError(FILE, 'initObraSelector', error);
  }
}
