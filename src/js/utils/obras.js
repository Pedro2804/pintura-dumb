/**
 * Helpers de presentación de obras, compartidos por los dos selectores
 * (grid de Dump y carrusel de Trayectoria). Sin estado: solo construyen
 * marcado o cadenas a partir de un objeto de obra.
 *
 * Forma de la obra: ver src/data/obras-dump.js.
 */

/**
 * Construye una miniatura: <li><button.works-thumb><img></button></li>.
 * El botón lleva la etiqueta accesible; la imagen va decorativa (alt vacío)
 * para no duplicar el anuncio en lectores de pantalla.
 *
 * @param {Object} obra
 * @param {number} index  Índice lógico de la obra (data-obra-index).
 * @returns {HTMLLIElement}
 */
export function buildThumb(obra, index) {
  const item = document.createElement('li');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'works-thumb';
  button.dataset.obraThumb = '';
  button.dataset.obraIndex = String(index);
  button.setAttribute('aria-label', `Ver obra: ${obra.nombre}`);

  const img = document.createElement('img');
  img.src = obra.src;
  img.alt = '';
  if (obra.width) img.width = obra.width;
  if (obra.height) img.height = obra.height;
  img.loading = 'lazy';

  button.append(img);
  item.append(button);
  return item;
}

/** alt del escenario: «Obra Nombre, técnica, año» (omite lo ausente). */
export function buildStageAlt(obra) {
  const parts = [`Obra ${obra.nombre}`];
  if (obra.tecnica) parts.push(obra.tecnica);
  if (obra.anio) parts.push(String(obra.anio));
  return parts.join(', ');
}

/**
 * Ficha visible junto al nombre: «, técnica, año.» — SIEMPRE cerrada con punto
 * (petición del cliente 2026-07-27: el pie de cada obra es una frase y se cierra).
 * Si la obra no trae técnica ni año, devuelve solo el punto → el nombre queda
 * igualmente cerrado. El punto vive en la ficha (no en el nombre) para que no se
 * pinte en cursiva junto al título de la obra.
 */
export function buildMeta(obra) {
  const parts = [];
  if (obra.tecnica) parts.push(obra.tecnica);
  if (obra.anio) parts.push(String(obra.anio));
  return parts.length ? `, ${parts.join(', ')}.` : '.';
}
