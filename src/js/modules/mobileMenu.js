import { $, $$ } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'mobileMenu.js';

/**
 * Menú hamburguesa móvil.
 * El CSS muestra/oculta el menú según `aria-expanded` del toggle.
 * Aquí: conmutar el estado, cerrar (enlace / fuera / Escape),
 * atrapar el foco y bloquear el scroll del body.
 */
export function initMobileMenu() {
  try {
    const toggle = $('[data-mobile-menu-toggle]');
    const menu = $('#site-nav-menu');
    if (!toggle || !menu) return;

    const label = $('.visually-hidden', toggle);
    const body = document.body;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    // Elementos enfocables: el propio toggle + los enlaces del menú.
    const getTrapItems = () => [
      toggle,
      ...$$('a[href], button:not([disabled])', menu),
    ];

    const open = () => {
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Cerrar menú';
      body.classList.add('has-menu-open');

      const items = getTrapItems();
      if (items[1]) items[1].focus(); // primer enlace del menú
    };

    const close = ({ returnFocus = false } = {}) => {
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Abrir menú';
      body.classList.remove('has-menu-open');
      if (returnFocus) toggle.focus();
    };

    // Botón hamburguesa
    toggle.addEventListener('click', () => {
      if (isOpen()) close({ returnFocus: true });
      else open();
    });

    // Cerrar al elegir un enlace del menú
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
    });

    // Cerrar al hacer click fuera del menú/toggle
    document.addEventListener('click', (event) => {
      if (!isOpen()) return;
      if (
        event.target.closest('#site-nav-menu') ||
        event.target.closest('[data-mobile-menu-toggle]')
      ) {
        return;
      }
      close();
    });

    // Teclado: Escape cierra; Tab atrapa el foco dentro del menú
    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        close({ returnFocus: true });
        return;
      }

      if (event.key === 'Tab') {
        const items = getTrapItems();
        if (items.length < 2) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // Si se pasa a desktop con el menú abierto, restaurar el estado
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    desktopQuery.addEventListener('change', (event) => {
      if (event.matches && isOpen()) close();
    });
  } catch (error) {
    logError(FILE, 'initMobileMenu', error);
  }
}
