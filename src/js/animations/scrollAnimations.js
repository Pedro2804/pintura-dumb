import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$ } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'animations/scrollAnimations.js';

/**
 * Sistema DECLARATIVO de entradas por scroll.
 *
 * El HTML declara QUÉ anima con `[data-animate]`; este módulo es dueño del CÓMO.
 * El VALOR del atributo elige el PRESET (ver PRESETS); vacío → 'fade-up'.
 * Agregar una sección/imagen = marcar el markup, cero JS nuevo.
 *
 * Motor: `ScrollTrigger.batch` agrupa los elementos por (punto de disparo +
 * preset). Al bajar (onEnter) revela; al subir y salir por arriba (onLeaveBack)
 * oculta en cascada INVERSA (`from:'end'`). Reversible, se repite cada vez. Un
 * observer por grupo → barato en móvil (la skill pide no sembrar triggers sueltos).
 *
 * Disparo por defecto: `top 85%`. Override por elemento con `data-animate-start`
 * (ej. un bloque anclado al fondo de una sección 100dvh → "top bottom"; una
 * imagen full-height que debe develarse ya en vista → "top 55%").
 *
 * Resiliencia: el estado inicial (oculto) se fija con `gsap.set` EN JS, no
 * ocultando en CSS. Si GSAP falla o no corre, el contenido queda visible — nunca
 * atrapamos contenido detrás de una animación rota. El guard de
 * `prefers-reduced-motion` vive en initAnimations(): si está activo, ni se llama.
 */
const REVEAL = Object.freeze({
  duration: 0.8,
  ease: 'expo.out', // ≈ --ease-out del CSS (cubic-bezier(0.16,1,0.3,1))
  stagger: 0.12, // cascada entre elementos que entran juntos
  start: 'top 85%', // dispara cuando el elemento asoma 15% en el viewport
});

/**
 * Presets de entrada. `hidden` = estado inicial/oculto, `shown` = en posición.
 * Solo propiedades sin reflow (transform/opacity/clip-path).
 */
const PRESETS = Object.freeze({
  // Texto/contenido: sube y se desvanece ("marcado pero elegante", y:48).
  'fade-up': {
    hidden: { autoAlpha: 0, y: 48 },
    shown: { autoAlpha: 1, y: 0 },
  },
  // Imagen: se DEVELA de izquierda a derecha (wipe por clip-path) con leve zoom
  // que se asienta. Sin hueco (la imagen no se desplaza, se descubre).
  'reveal-left': {
    hidden: { autoAlpha: 0, clipPath: 'inset(0% 100% 0% 0%)', scale: 1.06 },
    shown: { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
  },
  // Imagen: se DEVELA de abajo hacia arriba (wipe vertical). Para cards ancladas
  // al pie (p. ej. la fachada del museo): "crece" en su lugar sin desplazarse.
  'reveal-up': {
    hidden: { autoAlpha: 0, clipPath: 'inset(100% 0% 0% 0%)' },
    shown: { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' },
  },
  // Imagen: se DEVELA de derecha a izquierda (wipe + leve zoom). Pareja SIMÉTRICA
  // de 'reveal-left' → regla del sistema: las imágenes full-bleed se develan
  // desde el borde de la página hacia el centro (Artista izq→der · Archivo der→izq).
  'reveal-right': {
    hidden: { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 100%)', scale: 1.06 },
    shown: { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
  },
});

const presetName = (el) => (PRESETS[el.dataset.animate] ? el.dataset.animate : 'fade-up');

export function initScrollAnimations() {
  try {
    const targets = $$('[data-animate]');
    if (!targets.length) return;

    // Estado inicial por preset (evita parpadeos al asentar la animación).
    targets.forEach((el) => gsap.set(el, PRESETS[presetName(el)].hidden));

    // Agrupar por (punto de disparo + preset): un batch por grupo.
    const groups = new Map();
    targets.forEach((el) => {
      const start = el.dataset.animateStart || REVEAL.start;
      const type = presetName(el);
      const key = `${start}::${type}`;
      if (!groups.has(key)) groups.set(key, { start, type, els: [] });
      groups.get(key).els.push(el);
    });

    groups.forEach(({ start, type, els }) => {
      const { hidden, shown } = PRESETS[type];
      ScrollTrigger.batch(els, {
        start,
        // Bajando: entra al viewport → revela en cascada (orden del DOM).
        onEnter: (batch) =>
          gsap.to(batch, {
            ...shown,
            duration: REVEAL.duration,
            ease: REVEAL.ease,
            stagger: REVEAL.stagger,
            overwrite: true,
          }),
        // Subiendo: sale por arriba → se oculta en cascada INVERSA (from:'end').
        onLeaveBack: (batch) =>
          gsap.to(batch, {
            ...hidden,
            duration: REVEAL.duration,
            ease: REVEAL.ease,
            stagger: { each: REVEAL.stagger, from: 'end' },
            overwrite: true,
          }),
      });
    });
  } catch (error) {
    logError(FILE, 'initScrollAnimations', error);
  }
}
