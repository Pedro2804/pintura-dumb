/**
 * Helpers de DOM. Funciones pequeñas y reutilizables.
 */

/** Selecciona el primer elemento que coincida con el selector. */
export const $ = (selector, scope = document) => scope.querySelector(selector);

/** Selecciona todos los elementos que coincidan, como array. */
export const $$ = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

/** ¿El usuario solicitó movimiento reducido en su sistema? */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
