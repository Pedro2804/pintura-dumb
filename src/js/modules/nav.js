import { $, $$ } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'nav.js';
const SCROLL_THRESHOLD = 80;

/**
 * Comportamiento de la navegación fija:
 *  - marca `data-scrolled` en el header al pasar el umbral (fondo + blur por CSS)
 *  - resalta el enlace de la sección visible (scrollspy con IntersectionObserver)
 *
 * El scroll suave lo resuelve el CSS (`scroll-behavior: smooth`).
 */
export function initNav() {
  try {
    const header = $('[data-site-header]');
    if (!header) return;

    // --- 1) Estado scrolled (compacta el padding) + color de la nav según fondo ---
    const themeSections = $$('main section[id]');

    const updateScrolled = () => {
      header.dataset.scrolled = String(window.scrollY > SCROLL_THRESHOLD);
    };

    // Color de la nav según el fondo de la sección que queda BAJO la barra:
    // fondo claro (data-nav-theme="light") → letras oscuras; oscuro (default) → blancas.
    const updateNavTheme = () => {
      const line = header.offsetHeight / 2; // punto de referencia dentro de la barra fija
      let theme = 'dark';
      for (const section of themeSections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) {
          theme = section.dataset.navTheme === 'light' ? 'light' : 'dark';
          break;
        }
      }
      header.dataset.navOn = theme;
    };

    const onScroll = () => {
      updateScrolled();
      updateNavTheme();
    };

    updateScrolled();
    updateNavTheme();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateNavTheme, { passive: true });

    // --- 2) Scrollspy: enlace activo según la sección visible ---
    const links = $$('.site-nav__link', header);
    if (!links.length) return;

    const linkBySection = new Map();
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        linkBySection.set(href.slice(1), link);
      }
    });

    const sections = $$('main section[id]').filter((section) =>
      linkBySection.has(section.id)
    );
    if (!sections.length) return;

    const setActive = (id) => {
      linkBySection.forEach((link, sectionId) => {
        if (sectionId === id) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      {
        // La sección se considera activa cuando cruza la banda central-superior.
        rootMargin: '-45% 0px -50% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  } catch (error) {
    logError(FILE, 'initNav', error);
  }
}
