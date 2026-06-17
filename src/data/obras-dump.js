/**
 * Obras de la sección «Del vertedero a la trascendencia.» (#dump).
 *
 * FUENTE DE VERDAD de la galería. El JS (`obraSelector.js`) renderiza
 * miniaturas y escenario a partir de este array — el HTML solo aporta el
 * cascarón. Crecer el catálogo = agregar un `import` + una entrada aquí;
 * la maquinaria no se toca (decisión 2026-06-16, ver memoria).
 *
 * Las rutas se IMPORTAN (no se hardcodean como string): así Vite las
 * procesa, hashea y optimiza en el build (skill /vite: "preferir imports").
 *
 * Campos por obra:
 *   src     {string}  URL resuelta por Vite (import).
 *   nombre  {string}  Título de la obra (se muestra en cursiva).
 *   tecnica {string=} Técnica — OPCIONAL (pendiente de MASSIMO en algunas).
 *   anio    {number=} Año — OPCIONAL (pendiente de MASSIMO en algunas).
 *   width   {number}  Ancho real del archivo (anti-CLS).
 *   height  {number}  Alto real del archivo (anti-CLS).
 */

import fuerteConviccion from '../assets/images/dump/fuerte-conviccion-principal.webp';
import weekendBaby from '../assets/images/dump/weekend-baby-principal.jpg';
import framesUsuarioI from '../assets/images/dump/frames-de-un-usuario-01.jpg';
import framesUsuarioII from '../assets/images/dump/frames-de-un-usuario-02.jpg';

export const obrasDump = [
  {
    src: fuerteConviccion,
    nombre: 'Fuerte convicción',
    tecnica: 'óleo sobre lienzo',
    anio: 2024,
    width: 1300,
    height: 1689,
  },
  {
    src: weekendBaby,
    nombre: 'Weekend baby',
    // tecnica/anio pendientes de MASSIMO (bloqueante) → la ficha los omite.
    width: 4501,
    height: 3133,
  },
  {
    src: framesUsuarioI,
    nombre: 'Frames de un usuario I',
    width: 3428,
    height: 6002,
  },
  {
    src: framesUsuarioII,
    nombre: 'Frames de un usuario II',
    width: 3213,
    height: 5632,
  },
];
