// Poppins — única tipografía del sistema (guía MASSIMO).
// Subset latin: suficiente para es-MX (acentos, ñ, ¿¡). Evita cargar
// cirílico/devanagari/latin-ext que no se usan. Pesos: 400/500/600/900.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-900.css';
import './style.css';

import { initCountdown } from './js/modules/countdown.js';
import { initNav } from './js/modules/nav.js';
import { initMobileMenu } from './js/modules/mobileMenu.js';
import { initVideoIntro } from './js/modules/videoIntro.js';

function init() {
  initCountdown();
  initNav();
  initMobileMenu();
  initVideoIntro();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
