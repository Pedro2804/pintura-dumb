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

// Tempo de las IMÁGENES (reveal-*): más LENTO y con un ease más SUAVE que el
// texto. El wipe con clip-path se sentía abrupto con `expo.out` (muy front-load)
// a 0.8s → el descubrimiento pasaba casi de golpe. `power2.out` reparte el wipe y
// una duración mayor lo vuelve un develado gentil, no un "pop". PERILLAS.
const IMG_DURATION = 1.2;
const IMG_EASE = 'power2.out';

/**
 * Presets de entrada. `hidden` = estado inicial/oculto, `shown` = en posición.
 * Un preset puede fijar su propio `duration`/`ease`; si no, usa los de REVEAL.
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
    duration: IMG_DURATION,
    ease: IMG_EASE,
  },
  // Imagen: se DEVELA de abajo hacia arriba (wipe vertical). Para cards ancladas
  // al pie (p. ej. la fachada del museo): "crece" en su lugar sin desplazarse.
  'reveal-up': {
    hidden: { autoAlpha: 0, clipPath: 'inset(100% 0% 0% 0%)' },
    shown: { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' },
    duration: IMG_DURATION,
    ease: IMG_EASE,
  },
  // Imagen: se DEVELA de derecha a izquierda (wipe + leve zoom). Pareja SIMÉTRICA
  // de 'reveal-left' → regla del sistema: las imágenes full-bleed se develan
  // desde el borde de la página hacia el centro (Artista izq→der · Archivo der→izq).
  'reveal-right': {
    hidden: { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 100%)', scale: 1.06 },
    shown: { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
    duration: IMG_DURATION,
    ease: IMG_EASE,
  },
});

const presetName = (el) => (PRESETS[el.dataset.animate] ? el.dataset.animate : 'fade-up');

/**
 * Instancias de ScrollTrigger creadas (las devuelve `ScrollTrigger.batch`).
 * Se guardan para poder RE-ARMAR el sistema: ver `rearmScrollAnimations()`.
 */
let triggers = [];

export function initScrollAnimations() {
  try {
    const targets = $$('[data-animate]');
    if (!targets.length) return;

    triggers = [];

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
      const preset = PRESETS[type];
      const { hidden, shown } = preset;
      // Duración/ease propios del preset (imágenes) o los de REVEAL (texto).
      const duration = preset.duration ?? REVEAL.duration;
      const ease = preset.ease ?? REVEAL.ease;
      const batch = ScrollTrigger.batch(els, {
        start,
        // Bajando: entra al viewport → revela en cascada (orden del DOM).
        onEnter: (batch) =>
          gsap.to(batch, {
            ...shown,
            duration,
            ease,
            stagger: REVEAL.stagger,
            overwrite: true,
          }),
        // Subiendo: sale por arriba → se oculta en cascada INVERSA (from:'end').
        onLeaveBack: (batch) =>
          gsap.to(batch, {
            ...hidden,
            duration,
            ease,
            stagger: { each: REVEAL.stagger, from: 'end' },
            overwrite: true,
          }),
      });
      if (Array.isArray(batch)) triggers.push(...batch);
    });
  } catch (error) {
    logError(FILE, 'initScrollAnimations', error);
  }
}

/**
 * RE-ARMA el sistema de entradas. Llamar cada vez que el documento vuelve a ser
 * medible (hoy: al liberarse el bloqueo de scroll del overlay del video).
 *
 * EL PROBLEMA que resuelve: mientras el ritual de video está abierto, el
 * `<html>` lleva `overflow: hidden` (bloqueo de scroll) → el documento NO tiene
 * recorrido y ScrollTrigger mide `maxScroll = 0`. Con ese cero, TODOS los
 * triggers colapsan al inicio del scroll y disparan su `onEnter` de una, detrás
 * del overlay: al revelar la página los textos ya están puestos y la entrada
 * "no se ve". Peor: cada `overflow: hidden` cambia el ancho del viewport (se va
 * la barra de scroll) → dispara `resize` → ScrollTrigger se auto-refresca con la
 * medición mala. No es un problema de navegador ni de SO: le pasa a cualquiera
 * que vea el video (1ª visita); quien ya tiene el flag `INTRO_SEEN` no lo nota.
 *
 * QUÉ HACE: re-mide (`refresh`) y luego, trigger por trigger, deja cada elemento
 * en el estado que le corresponde según la posición REAL del scroll — oculto si
 * su punto de disparo aún no se alcanzó, mostrado si ya se pasó. Así la entrada
 * vuelve a estar cargada y se anima cuando el usuario llegue.
 */
export function rearmScrollAnimations() {
  try {
    if (!triggers.length) return;

    ScrollTrigger.refresh();

    triggers.forEach((trigger) => {
      const el = trigger && trigger.trigger;
      if (!el) return;
      const { hidden, shown } = PRESETS[presetName(el)];
      const scroll = typeof trigger.scroll === 'function' ? trigger.scroll() : 0;
      gsap.killTweensOf(el); // corta un tween disparado con la medición mala
      gsap.set(el, scroll < trigger.start ? hidden : shown);
    });
  } catch (error) {
    logError(FILE, 'rearmScrollAnimations', error);
  }
}
