// La tipografía (Poppins) y la hoja de estilos se cargan vía <link> en el <head>
// de index.html (no por JS) → sin FOUC ni flash de fuente al recargar.
import { initCountdown } from './js/modules/countdown.js';
import { initNav } from './js/modules/nav.js';
import { initMobileMenu } from './js/modules/mobileMenu.js';
import { initVideoIntro } from './js/modules/videoIntro.js';
import { initStaticImages } from './js/modules/staticImages.js';
import { initObraSelector } from './js/modules/obraSelector.js';
import { initObraCarousel } from './js/modules/obraCarousel.js';
import { initAnimations } from './js/animations/index.js';
import { playHeroIntro } from './js/animations/heroIntro.js';
import { obrasDump } from './data/obras-dump.js';
import { obrasTrayectoria } from './data/obras-trayectoria.js';

function init() {
  // El bundle cargó: cancela el failsafe del <head> (que revelaría el Hero si el
  // JS no llegaba). A partir de aquí, la reveal la controla el ritual de video.
  if (window.__heroReveal) clearTimeout(window.__heroReveal);

  // Primero: hidrata las imágenes estáticas del HTML (fondos/columnas) con su
  // versión WebP optimizada, cuanto antes para minimizar el hueco sin `src`.
  initStaticImages();
  initCountdown();
  initNav();
  initMobileMenu();
  // El Hero entra al REVELAR la página: tras cerrar el overlay del video
  // (crossfade) o directo si el overlay no se muestra.
  initVideoIntro({ onReveal: playHeroIntro });
  initObraSelector({ section: '#dump', obras: obrasDump });
  initObraCarousel({ section: '#trayectoria', obras: obrasTrayectoria });
  // GSAP al final: el resto de módulos ya montó su DOM (miniaturas, etc.).
  initAnimations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
