import '@fontsource-variable/playfair-display';
import '@fontsource-variable/inter';
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
