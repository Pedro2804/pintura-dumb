import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { $, prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { buildThumb, buildStageAlt, buildMeta } from '../utils/obras.js';

const FILE = 'obraSelector.js';

// Tempo de la transición de obra. Más lento que el default del sistema y con
// ease inOut (no expo.out): el VIAJE debe verse suave, no un latigazo. Tuneable.
const DURATION = 0.9;
const EASE = 'power2.inOut';

let flipRegistered = false;

/**
 * Selector de obras de Dump con transición de ELEMENTO COMPARTIDO (GSAP Flip).
 *
 * Mecánica (idea del dev): cada obra tiene una CELDA FIJA en el grid. La obra
 * activa NO está en el grid: su botón-miniatura VIAJA al escenario y se muestra
 * en grande (por eso se ven 3 miniaturas, no 4; su celda queda vacía y reservada
 * por CSS). Al seleccionar otra:
 *   - la entrante viaja desde su celda al escenario (crece),
 *   - la saliente viaja del escenario de regreso a su celda (encoge),
 *   - se cruzan en el aire.
 * Flip mide el antes/después y anima el viaje, incluso entre contenedores.
 *
 * El MISMO botón `.works-thumb` es el elemento que viaja; su tamaño/encuadre los
 * dicta el CSS según el contenedor (celda = cuadrado recortado · escenario =
 * obra completa). Progressive enhancement: el HTML aporta el cascarón (grid +
 * `[data-obra-stage-media]`); este módulo lo hidrata.
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

    const thumbsContainer = $('[data-obra-thumbs]', root);
    const stageMedia = $('[data-obra-stage-media]', root);
    const nameEl = $('[data-obra-name]', root);
    const metaEl = $('[data-obra-meta]', root);
    const prevBtn = $('[data-obra-prev]', root);
    const nextBtn = $('[data-obra-next]', root);

    // Sin grid de miniaturas o sin escenario no hay nada que hidratar.
    if (!thumbsContainer || !stageMedia) return;

    if (!flipRegistered) {
      gsap.registerPlugin(Flip);
      flipRegistered = true;
    }

    // --- Construcción: una CELDA fija por obra (su botón viajará al escenario) ---
    const slots = [];
    const buttons = [];
    const fragment = document.createDocumentFragment();
    obras.forEach((obra, index) => {
      const li = buildThumb(obra, index); // <li><button.works-thumb><img></button></li>
      li.classList.add('works-slot'); // reserva su cuadro aunque quede vacío (CSS)
      const button = $('.works-thumb', li);
      // Proporción real de la obra: el CSS la usa SOLO en el escenario para que
      // la caja grande tenga el aspecto de la obra. Así el `cover` abre el
      // recorte gradualmente durante el viaje (la forma se adapta suave).
      if (obra.width && obra.height) {
        button.style.setProperty('--obra-ratio', `${obra.width} / ${obra.height}`);
      }
      slots.push(li);
      buttons.push(button);
      fragment.append(li);
    });
    thumbsContainer.replaceChildren(fragment);

    const wrap = (index) => (index + obras.length) % obras.length;
    const reduced = prefersReducedMotion();
    let current = -1;

    const select = (index) => {
      const i = wrap(index);
      if (i === current) return;

      const incoming = buttons[i]; // va al escenario (crece)
      const outgoing = current >= 0 ? buttons[current] : null; // vuelve a su celda (encoge)

      // Captura las posiciones ANTES de mover. Solo animamos en cambios REALES
      // (hay saliente): en la colocación inicial la obra nace en el escenario
      // sin viaje, y con reduced-motion el cambio es instantáneo.
      const state = reduced || !outgoing ? null : Flip.getState([incoming, outgoing]);

      // Reparenta: saliente → su celda · entrante → escenario.
      if (outgoing) slots[current].append(outgoing);
      stageMedia.append(incoming);

      // alt: la obra grande describe la pieza; la que vuelve a miniatura, decorativa.
      const incomingImg = $('img', incoming);
      if (incomingImg) incomingImg.alt = buildStageAlt(obras[i]);
      if (outgoing) {
        const outgoingImg = $('img', outgoing);
        if (outgoingImg) outgoingImg.alt = '';
      }

      // Marca de obra activa (la del escenario) para a11y/estilos.
      buttons.forEach((button) => button.removeAttribute('aria-current'));
      incoming.setAttribute('aria-current', 'true');

      if (nameEl) nameEl.textContent = obras[i].nombre;
      if (metaEl) metaEl.textContent = buildMeta(obras[i]);

      current = i;

      // Anima el viaje (entrante crece / saliente encoge, se cruzan).
      if (state) {
        Flip.from(state, { duration: DURATION, ease: EASE, absolute: true });
      }
    };

    // --- Eventos ---
    // Clic en una miniatura de su celda → la trae al escenario.
    thumbsContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-obra-thumb]');
      if (!button || !thumbsContainer.contains(button)) return;
      select(Number(button.dataset.obraIndex));
    });

    // Flechas: ciclan (wrap-around) con el mismo viaje.
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
    });

    // --- Estado inicial: la obra inicial nace en el escenario (sin viaje). ---
    select(wrap(initialIndex));
  } catch (error) {
    logError(FILE, 'initObraSelector', error);
  }
}
