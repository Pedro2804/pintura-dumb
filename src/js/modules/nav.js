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

    // Override responsive del tema del nav por sección: algunas secciones cambian
    // de fondo según el ancho (ej. Fenómeno lleva un velo azul fuerte < 1280px que
    // vuelve oscuro su fondo claro). data-nav-theme-narrow declara el tema a usar
    // mientras esta media query coincide; fuera de ella manda data-nav-theme.
    const narrowNav = window.matchMedia('(max-width: 1279px)');

    // Color de la nav según el fondo de la sección que queda BAJO la barra:
    // fondo claro (data-nav-theme="light") → letras oscuras; oscuro (default) → blancas.
    // La MARCA ("Pintura dump.", arriba-izq) puede caer sobre un fondo distinto al
    // de los links (arriba-der). data-brand-theme la controla por separado; si no
    // se declara, la marca sigue al tema del nav.
    const updateNavTheme = () => {
      const line = header.offsetHeight / 2; // punto de referencia dentro de la barra fija
      let navTheme = 'dark';
      let brandTheme = 'dark';
      for (const section of themeSections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) {
          // Tema base de la sección; si hay override "narrow" y la media query
          // coincide, ese manda (solo para el color de los LINKS del nav).
          let sectionNavTheme = section.dataset.navTheme === 'light' ? 'light' : 'dark';
          if (narrowNav.matches && section.dataset.navThemeNarrow) {
            sectionNavTheme = section.dataset.navThemeNarrow === 'light' ? 'light' : 'dark';
          }
          navTheme = sectionNavTheme;
          brandTheme = section.dataset.brandTheme || navTheme; // override por sección
          break;
        }
      }
      header.dataset.navOn = navTheme;
      header.dataset.brandOn = brandTheme;
    };

    const onScroll = () => {
      updateScrolled();
      updateNavTheme();
    };

    updateScrolled();
    updateNavTheme();
    // El color de la nav ya está calculado → se revela (anti-flash del blanco por
    // defecto al recargar sobre una sección clara). Ver `.anim .site-header` en CSS.
    header.dataset.navReady = 'true';
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateNavTheme, { passive: true });
    // Recalcula el tema al cruzar el umbral (ej. entrar/salir del override narrow).
    narrowNav.addEventListener('change', updateNavTheme);

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
