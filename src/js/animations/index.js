import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../utils/dom.js';
import { logError } from '../utils/log.js';
import { initNavIndicator } from './navIndicator.js';

const FILE = 'animations/index.js';

/**
 * Defaults editoriales del sistema de animación.
 * Empatan con los tokens de motion del CSS para mantener una sola voz:
 *   --duration-base: 300ms  ·  --duration-slow: 600ms
 *   --ease-out: cubic-bezier(0.16, 1, 0.3, 1)  ≈  'expo.out' de GSAP
 * Así, lo que anima JS y lo que anima CSS se sienten del mismo material.
 */
export const MOTION = Object.freeze({
  duration: 0.6,
  ease: 'expo.out',
});

let registered = false;

/**
 * Punto de entrada ÚNICO de GSAP.
 *  - Registra ScrollTrigger una sola vez (la skill lo exige).
 *  - Guard global de `prefers-reduced-motion`: si el usuario lo pide, NINGUNA
 *    animación corre (el sitio queda 100% funcional, solo sin movimiento).
 *  - Fija los defaults editoriales para que cada submódulo herede el mismo
 *    tempo/ease sin repetirlo.
 *
 * Cada efecto vive en su propio módulo y se invoca desde aquí.
 */
export function initAnimations() {
  try {
    if (prefersReducedMotion()) return;

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.defaults({ duration: MOTION.duration, ease: MOTION.ease });
      registered = true;
    }

    // Submódulos (se suman por fase). FASE 6-BIS:
    initNavIndicator(); // magic line: subrayado activo que viaja entre items
  } catch (error) {
    logError(FILE, 'initAnimations', error);
  }
}
