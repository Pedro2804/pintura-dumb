// La tipografía (Poppins) y la hoja de estilos se cargan vía <link> en el <head>
// de index.html (no por JS) → sin FOUC ni flash de fuente al recargar.
import { initCountdown } from './js/modules/countdown.js';
import { initNav } from './js/modules/nav.js';
import { initMobileMenu } from './js/modules/mobileMenu.js';
import { initVideoIntro } from './js/modules/videoIntro.js';
import { initStaticImages } from './js/modules/staticImages.js';
import { initObraCarousel } from './js/modules/obraCarousel.js';
import { initAnimations, rearmScrollAnimations } from './js/animations/index.js';
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
  // Las DOS galerías comparten motor (carrusel coverflow): mismo comportamiento,
  // un solo lugar que mantener. Cada llamada crea una instancia con su estado.
  initObraCarousel({ section: '#dump', obras: obrasDump });
  initObraCarousel({ section: '#trayectoria', obras: obrasTrayectoria });
  // GSAP: el resto de módulos ya montó su DOM (miniaturas, etc.).
  initAnimations();
  // El ritual de video va AL FINAL, después de GSAP: bloquea el scroll del <html>
  // y, con el scroll bloqueado, ScrollTrigger mide un documento SIN recorrido y
  // quema todas las entradas de golpe. Montando GSAP antes, la medición inicial es
  // buena; y al cerrarse el overlay `onScrollUnlock` re-mide y re-arma.
  // El Hero entra al REVELAR la página: tras cerrar el overlay (crossfade) o
  // directo si el overlay no se muestra.
  initVideoIntro({
    onReveal: playHeroIntro,
    onScrollUnlock: rearmScrollAnimations,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
